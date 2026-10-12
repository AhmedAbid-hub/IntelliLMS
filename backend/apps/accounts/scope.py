from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Institute, Membership
from apps.academics.models import Offering


class Scope:
    def __init__(self, request):
        cached = getattr(request, "_intellilms_scope", None)
        if cached is not None:
            self.__dict__.update(cached.__dict__)
            return
        self.user = request.user
        selected = request.session.get("institute_id")
        self.institute = (
            Institute.objects.filter(id=selected, active=True).first()
            if selected
            else None
        )
        if not self.institute:
            raise PermissionDenied("Select an active institute first.")
        self.membership = Membership.objects.filter(
            user=self.user, institute=self.institute, active=True
        ).first()
        if self.user.is_superuser:
            self.role = "superadmin"
        elif self.membership:
            self.role = self.membership.role
        else:
            raise PermissionDenied("No active membership in this institute.")
        request._intellilms_scope = self

    def require(self, *roles):
        if self.role not in roles and self.role != "superadmin":
            raise PermissionDenied("Your role cannot perform this action.")

    def offerings(self):
        if self.role == "superadmin":
            raise PermissionDenied("Platform accounts have aggregate oversight, not routine access to individual academic records.")
        qs = Offering.objects.filter(institute=self.institute)
        if self.role == "head":
            qs = (
                qs.filter(course__unit_id=self.membership.unit_id)
                if self.membership.unit_id
                else qs.none()
            )
        elif self.role == "teacher":
            qs = qs.filter(teachers=self.user)
        elif self.role == "student":
            qs = qs.filter(enrollments__student=self.user, enrollments__active=True)
        return qs.distinct()

    def check_offering(self, offering, write=False):
        if not self.offerings().filter(pk=offering.pk).exists():
            raise PermissionDenied("Course offering is outside your permitted scope.")
        if write and offering.archived:
            raise ValidationError("Archived course offerings cannot be changed.")

    def people(self):
        qs = Membership.objects.filter(institute=self.institute, active=True)
        if self.role == "head":
            qs = (
                qs.filter(Q(unit_id=self.membership.unit_id) | Q(appointments__unit_id=self.membership.unit_id, appointments__active=True))
                if self.membership.unit_id
                else qs.none()
            )
        elif self.role == "teacher":
            qs = qs.filter(
                Q(
                    user__enrollment__offering__in=self.offerings(),
                    user__enrollment__active=True,
                )
                | Q(user=self.user)
            )
        elif self.role == "student":
            qs = qs.filter(user=self.user)
        return qs.distinct()

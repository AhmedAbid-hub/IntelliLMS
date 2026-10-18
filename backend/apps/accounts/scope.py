"""Institute-scoped authorization helpers for IntelliLMS.

Platform superusers may operate without an institute selected in the session.
Institute-bound operations must still explicitly validate their target institute.
"""

from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Institute, Membership, TeacherAppointment
from .institution import require_departments
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

        # A platform Super Administrator is not required to select an institute
        # simply to manage platform accounts or provision institute admins.
        if self.user.is_superuser:
            self.role = "superadmin"
            self.membership = None
        else:
            if self.institute is None:
                raise PermissionDenied("Select an active institute first.")
            self.membership = Membership.objects.filter(
                user=self.user, institute=self.institute, active=True
            ).first()
            if self.membership is None:
                raise PermissionDenied("No active membership in this institute.")
            self.role = self.membership.role
            if self.role == "head":
                require_departments(self.institute)
            if self.role == "head" and request.session.get("academic_workspace") == "teaching":
                if not self.membership.can_teach:
                    raise PermissionDenied("Teaching access was revoked. Return to department management.")
                # The stored role remains Head; this workspace has teacher permissions only.
                self.role = "teacher"

        request._intellilms_scope = self

    def require(self, *roles):
        if self.role not in roles and self.role != "superadmin":
            raise PermissionDenied("Your role cannot perform this action.")

    def _require_institute(self):
        if self.institute is None:
            raise PermissionDenied("Select an active institute first.")
        return self.institute

    def offerings(self):
        if self.role == "superadmin":
            raise PermissionDenied(
                "Platform accounts have aggregate oversight, not routine access "
                "to individual academic records."
            )
        qs = Offering.objects.filter(institute=self._require_institute())
        if self.role == "head":
            qs = (
                qs.filter(course__unit_id=self.membership.unit_id)
                if self.membership.unit_id
                else qs.none()
            )
        elif self.role == "teacher":
            return self.teaching_offerings()
        elif self.role == "student":
            qs = qs.filter(
                enrollments__student=self.user, enrollments__active=True
            )
        return qs.distinct()

    def teaching_offerings(self):
        qs = Offering.objects.filter(institute=self._require_institute())
        member = self.membership
        if not member or not (member.role == "teacher" or member.role == "head" and member.can_teach):
            return qs.none()
        # Explicit withdrawals revoke even stale/historical assignments. Existing
        # reasoned Admin overrides without a departmental appointment stay valid.
        withdrawn = TeacherAppointment.objects.filter(
            institute=self.institute, membership=member, active=False
        ).values("unit_id")
        return qs.filter(teachers=self.user).exclude(course__unit_id__in=withdrawn).distinct()

    def check_offering(self, offering, write=False):
        if not self.offerings().filter(pk=offering.pk).exists():
            raise PermissionDenied("Course offering is outside your permitted scope.")
        if write and offering.term.status == "closed":
            raise ValidationError("This academic period is closed. Reopen it explicitly or use an audited academic correction.")
        if write and offering.archived:
            raise ValidationError("Archived course offerings cannot be changed.")

    def people(self):
        # This helper represents a specific institute's roster. Superusers
        # without a selected institute must not receive an unbounded roster.
        qs = Membership.objects.filter(
            institute=self._require_institute(), active=True
        )
        if self.role == "head":
            qs = (
                qs.filter(
                    Q(unit_id=self.membership.unit_id)
                    | Q(
                        appointments__unit_id=self.membership.unit_id,
                        appointments__active=True,
                    )
                )
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

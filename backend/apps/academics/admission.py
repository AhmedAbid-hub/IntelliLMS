"""Institute-admin admission and explicit, history-preserving academic transfers."""
import hashlib
import json
from django.db import transaction, IntegrityError
from django.db.models import Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, generics
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.accounts.models import Institute, Membership, User
from apps.accounts.scope import Scope
from apps.accounts.contracts import Text, payload
from apps.accounts.invitations import send_invitation
from apps.insights.models import Audit
from .models import Program, AdmissionBatch, Section, Year, Term, Offering, Enrollment, CurriculumItem, StudentPlacement, AdmissionReceipt
from .serializers import serializer_for


class PlacementInput(serializers.Serializer):
    program = serializers.UUIDField()
    batch = serializers.UUIDField(required=False, allow_null=True, default=None)
    year = serializers.UUIDField()
    section = serializers.UUIDField(required=False, allow_null=True, default=None)
    offerings = serializers.ListField(child=serializers.UUIDField(), max_length=100, default=list)


class AdmissionInput(PlacementInput):
    key = serializers.UUIDField()
    preview = serializers.BooleanField(default=True)
    username = Text(max_length=150, validators=[User.username_validator])
    email = serializers.EmailField(max_length=254)
    first_name = Text(max_length=150)
    last_name = Text(max_length=150)
    student_identifier = Text(max_length=64)


class TransferInput(PlacementInput):
    reason = Text(min_length=5, max_length=1000)
    withdraw = serializers.ListField(child=serializers.UUIDField(), max_length=100, default=list)


class AdmissionResult(serializers.Serializer):
    preview = serializers.BooleanField()
    membership = serializers.UUIDField(allow_null=True)
    replayed = serializers.BooleanField()
    identity = serializers.DictField(child=serializers.CharField())
    placement = serializers.DictField(child=serializers.CharField(allow_null=True))
    offerings = serializers.ListField(child=serializers.DictField())
    invitation = serializers.CharField()


def admin_scope(request):
    scope = Scope(request)
    if scope.role != "admin":
        raise PermissionDenied("Student admission and placement are managed by the Institute Admin.")
    return scope


def validate_placement(scope, values):
    def related(model, key, **filters):
        pk=values.get(key)
        if not pk:
            return None
        obj=model.objects.filter(institute=scope.institute,pk=pk,**filters).first()
        if not obj:
            raise ValidationError({key:"Choose an active record in this institute."})
        return obj
    program=related(Program,"program",active=True)
    batch=related(AdmissionBatch,"batch",active=True)
    year=related(Year,"year")
    section=related(Section,"section",active=True)
    if batch and (batch.program_id != program.pk or year.start < batch.year.start):
        raise ValidationError({"batch":"Batch must belong to the program and cannot start after the selected academic year."})
    if section and (section.program_id != program.pk or section.batch_id and section.batch_id != getattr(batch,"pk",None)):
        raise ValidationError({"section":"Section must match the selected program and admission batch."})
    ids=values["offerings"]
    if len(set(ids)) != len(ids):
        raise ValidationError({"offerings":"Select each offering once."})
    courses=list(Offering.objects.filter(institute=scope.institute,pk__in=ids,archived=False,course__active=True,term__year=year).exclude(term__status="closed").select_related("course","term","section"))
    if len(courses)!=len(ids):
        raise ValidationError({"offerings":"Every offering must be active in this institute and academic year."})
    for course in courses:
        if course.section_id and course.section_id != getattr(section,"pk",None):
            raise ValidationError({"offerings":"Select offerings for the student's section, or a shared offering without a section."})
        if course.course.unit_id and program.unit_id != course.course.unit_id:
            # A curriculum can deliberately include a shared subject from another department.
            if not CurriculumItem.objects.filter(institute=scope.institute,program=program,course=course.course,active=True).exists():
                raise ValidationError({"offerings":"A cross-department subject must be part of this program's curriculum."})
    return dict(program=program,batch=batch,year=year,section=section),courses


def result(values, placement, courses, member=None, replayed=False):
    return dict(preview=values["preview"],membership=str(member.pk) if member else None,replayed=replayed,
        identity={key:values[key] for key in ["username","email","first_name","last_name","student_identifier"]},
        placement={key:getattr(value,"name",None) for key,value in placement.items()},
        offerings=[dict(id=str(course.pk),title=course.title) for course in courses],
        invitation="View the saved membership's Invitation action for transport status." if member else "A 48-hour password-setup invitation will be sent after successful creation.")


@extend_schema(request=AdmissionInput,responses=AdmissionResult)
@api_view(["POST"])
@transaction.atomic
def admit_student(request):
    scope=admin_scope(request)
    Institute.objects.select_for_update().get(pk=scope.institute.pk)
    values=payload(AdmissionInput,request.data)
    digest=hashlib.sha256(json.dumps({key:value for key,value in values.items() if key not in ["key","preview"]},sort_keys=True,default=str).encode()).hexdigest()
    receipt=AdmissionReceipt.objects.filter(institute=scope.institute,key=values["key"]).select_related("membership").first()
    if receipt:
        if receipt.digest!=digest:
            raise ValidationError("This submission key was already used for different admission details. Start a new admission.")
        saved=receipt.membership.placements.order_by("created_at").first()
        placement={key:getattr(saved,key) for key in ["program","batch","year","section"]}
        courses=list(Offering.objects.filter(institute=scope.institute,pk__in=values["offerings"]))
        return Response(result(values,placement,courses,receipt.membership,True))
    placement,courses=validate_placement(scope,values)
    if User.objects.filter(Q(username=values["username"])|Q(email__iexact=values["email"])).exists():
        raise ValidationError("An account already uses this username or email. Do not create a duplicate; use the existing institute membership where applicable.")
    if Membership.objects.filter(institute=scope.institute,student_identifier=values["student_identifier"]).exists():
        raise ValidationError({"student_identifier":"This student ID is already used in this institute."})
    if values["preview"]:
        return Response(result(values,placement,courses))
    try:
        with transaction.atomic():
            user=User.objects.create_user(username=values["username"],email=values["email"],first_name=values["first_name"],last_name=values["last_name"],password=None)
    except IntegrityError:
        raise ValidationError("Account details were registered by another request. Review the existing record before retrying.")
    member=Membership.objects.create(institute=scope.institute,user=user,role="student",unit=placement["program"].unit,section=placement["section"],student_identifier=values["student_identifier"])
    placed=StudentPlacement.objects.create(institute=scope.institute,membership=member,actor=request.user,reason="Initial student admission",**placement)
    Enrollment.objects.bulk_create([Enrollment(institute=scope.institute,offering=course,student=user) for course in courses])
    AdmissionReceipt.objects.create(institute=scope.institute,key=values["key"],membership=member,digest=digest)
    Audit.objects.create(institute=scope.institute,actor=request.user,action="Student.admit",object_id=str(member.pk),detail={"placement":str(placed.pk),"offerings":[str(course.pk) for course in courses]})
    from apps.learning.notifications import notify_event
    notify_event(scope.institute,[user.pk],"Welcome to your learning workspace",f"Your student admission and {len(courses)} course enrollments are saved.",event_key=f"admission:{member.pk}",destination="/offerings")
    transaction.on_commit(lambda:send_invitation(user))
    return Response(result(values,placement,courses,member),status=201)


class OfferingSuggestion(serializers.ModelSerializer):
    required_subject=serializers.BooleanField()
    class Meta:
        model=Offering
        fields=["id","title","course","term","section","required_subject"]


class AdmissionSuggestions(generics.ListAPIView):
    serializer_class=OfferingSuggestion
    search_fields=["title","course__code","course__name"]
    def get_queryset(self):
        if getattr(self,"swagger_fake_view",False):return Offering.objects.none()
        scope=admin_scope(self.request)
        values=payload(PlacementInput,{**self.request.query_params.dict(),"offerings":[]})
        placement,_=validate_placement(scope,values)
        term=self.request.query_params.get("term")
        stage=serializers.IntegerField(min_value=1,max_value=40).run_validation(self.request.query_params.get("stage",1))
        mappings=CurriculumItem.objects.filter(institute=scope.institute,program=placement["program"],stage=stage,active=True)
        qs=Offering.objects.filter(institute=scope.institute,archived=False,course__active=True,term__year=placement["year"],course_id__in=mappings.values("course_id")).exclude(term__status="closed")
        qs=qs.filter(Q(section=placement["section"])|Q(section__isnull=True))
        if term:
            term_id=serializers.UUIDField().run_validation(term)
            if not Term.objects.filter(pk=term_id,institute=scope.institute,year=placement["year"]).exists():raise ValidationError("Choose a term in the selected academic year.")
            qs=qs.filter(term_id=term_id)
        return qs.annotate(required_subject=Exists(mappings.filter(course_id=OuterRef("course_id"),required=True))).order_by("title","pk")


class PlacementHistory(generics.ListAPIView):
    serializer_class=serializer_for(StudentPlacement)
    def get_queryset(self):
        if getattr(self,"swagger_fake_view",False):return StudentPlacement.objects.none()
        scope=Scope(self.request)
        if scope.role=="superadmin":raise PermissionDenied()
        people=Membership.objects.filter(institute=scope.institute) if scope.role=="admin" else scope.people()
        member=get_object_or_404(people,pk=self.kwargs["pk"],role="student")
        return StudentPlacement.objects.filter(institute=scope.institute,membership=member).select_related("program","batch","year","section").order_by("-created_at")


@extend_schema(request=TransferInput,responses=serializer_for(StudentPlacement))
@api_view(["POST"])
@transaction.atomic
def transfer_student(request,pk):
    scope=admin_scope(request)
    Institute.objects.select_for_update().get(pk=scope.institute.pk)
    member=get_object_or_404(Membership.objects.select_for_update(),institute=scope.institute,pk=pk,role="student",active=True,user__is_active=True)
    values=payload(TransferInput,request.data)
    placement,courses=validate_placement(scope,values)
    withdrawn=Enrollment.objects.filter(institute=scope.institute,student=member.user,offering_id__in=values["withdraw"],offering__archived=False,active=True)
    if withdrawn.count()!=len(set(values["withdraw"])) or set(values["withdraw"]) & set(values["offerings"]):
        raise ValidationError("Withdraw only this student's current active-course enrollments; do not also select them for enrollment.")
    previous=member.placements.filter(ended_at__isnull=True).first()
    if not previous and member.section_id:
        previous=StudentPlacement.objects.create(institute=scope.institute,membership=member,program=member.section.program,batch=member.section.batch,section=member.section,reason="Preserved legacy placement before transfer",actor=request.user)
    if previous:previous.ended_at=timezone.now();previous.save(update_fields=["ended_at"])
    current=StudentPlacement.objects.create(institute=scope.institute,membership=member,actor=request.user,reason=values["reason"],**placement)
    member.section=placement["section"];member.unit=placement["program"].unit;member.save(update_fields=["section","unit"])
    withdrawn.update(active=False)
    for course in courses:
        Enrollment.objects.update_or_create(institute=scope.institute,offering=course,student=member.user,defaults={"active":True})
    Audit.objects.create(institute=scope.institute,actor=request.user,action="Student.transfer",object_id=str(member.pk),detail={"reason":values["reason"],"previous_placement":str(previous.pk) if previous else None,"placement":str(current.pk),"withdrawn":[str(pk) for pk in values["withdraw"]],"enrolled":[str(course.pk) for course in courses]})
    from apps.learning.notifications import notify_event
    notify_event(scope.institute,[member.user_id],"Your academic placement has changed","Your institute has updated your placement. Review your current courses or contact your administrator.",event_key=f"placement:{current.pk}",destination="/offerings")
    return Response(serializer_for(StudentPlacement)(current).data)

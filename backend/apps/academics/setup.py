from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.accounts.models import Membership, TeacherAppointment
from apps.accounts.scope import Scope
from .models import Unit, Program, Course, CurriculumItem, Year, Term, AdmissionBatch, Section, Offering, Enrollment


class SetupStep(serializers.Serializer):
    key = serializers.CharField()
    title = serializers.CharField()
    complete = serializers.BooleanField()
    optional = serializers.BooleanField()
    owner = serializers.CharField()
    path = serializers.CharField()


class SetupResult(serializers.Serializer):
    steps = SetupStep(many=True)
    completed = serializers.IntegerField()
    total = serializers.IntegerField()
    ready = serializers.BooleanField()


@extend_schema(responses=SetupResult)
@api_view(["GET"])
def institute_setup(request):
    scope = Scope(request)
    if scope.role != "admin":
        raise PermissionDenied("Institute setup is managed by the Institute Admin.")
    institute = scope.institute
    def exists(model, **filters):
        return model.objects.filter(institute=institute, **filters).exists()
    steps = []
    def step(key, title, complete, path, optional=False, owner="Institute Admin"):
        steps.append(dict(key=key, title=title, complete=bool(complete), path=path, optional=optional, owner=owner))
    school = institute.kind == "school"
    step("profile", "Review institute profile", institute.name and institute.kind, "/institute-settings")
    step("units", "Create departments (optional for schools)" if school else "Create departments", exists(Unit), "/units", school)
    step("programs", "Create programs or grades", exists(Program, active=True), "/programs")
    step("subjects", "Add reusable subjects", exists(Course, active=True), "/courses")
    step("curriculum", "Map subjects to program semesters or years", exists(CurriculumItem, active=True), "/curriculum")
    step("calendar", "Create academic years and terms", exists(Year) and exists(Term), "/terms")
    step("batches", "Create admission batches", exists(AdmissionBatch, active=True), "/batches")
    step("sections", "Create class sections", exists(Section, active=True), "/sections")
    step("offerings", "Create course offerings", exists(Offering, archived=False), "/offerings")
    step("teachers", "Provision teacher accounts", exists(Membership, role="teacher", active=True, user__is_active=True), "/memberships?role=teacher")
    step("heads", "Appoint Department Heads", exists(Membership, role="head", active=True, user__is_active=True), "/memberships?role=head", school)
    step("appointments", "Department Head appoints eligible teachers", exists(TeacherAppointment, active=True, membership__active=True, membership__user__is_active=True), "/teacher-appointments", school, "Department Head")
    step("assignments", "Assign teachers to course offerings", exists(Offering, archived=False, teachers__membership__institute=institute, teachers__membership__active=True, teachers__is_active=True), "/offerings", owner="Department Head / authorized Admin override")
    step("students", "Admit students", exists(Membership, role="student", active=True, user__is_active=True), "/memberships?role=student")
    step("enrollments", "Enroll students into offerings", exists(Enrollment, active=True, offering__archived=False), "/offerings")
    step("policies", "Save academic grading policies", bool(institute.grading_rules), "/institute-settings")
    required = [item for item in steps if not item["optional"]]
    completed = sum(item["complete"] for item in required)
    return Response(dict(steps=steps, completed=completed, total=len(required), ready=completed == len(required)))

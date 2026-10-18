from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from apps.accounts.models import Membership, TeacherAppointment
from apps.accounts.scope import Scope
from apps.accounts.institution import academic_config
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
    config = academic_config(institute)
    step("profile", "Review institute profile", institute.name and institute.kind, "/institute-settings")
    if config["departments"]:
        step("units", "Create departments", exists(Unit), "/units")
    step("programs", "Create classes / grades" if school else "Create programs", exists(Program, active=True), "/programs")
    step("subjects", "Add reusable subjects", exists(Course, active=True), "/courses")
    step("curriculum", "Map class subjects" if school else "Map subjects to study years" if institute.kind == "college" else "Map subjects to program semesters", exists(CurriculumItem, active=True), "/curriculum")
    step("calendar", "Create academic years and annual periods" if config["structure"] == "annual" else "Create academic years and semesters", exists(Year) and exists(Term), "/terms")
    if config["batches"]:
        step("batches", "Create admission batches", exists(AdmissionBatch, active=True), "/batches")
    step("sections", "Create class sections", exists(Section, active=True), "/sections")
    step("offerings", "Create course offerings", exists(Offering, archived=False), "/offerings")
    step("teachers", "Provision teacher accounts", exists(Membership, role="teacher", active=True, user__is_active=True), "/memberships?role=teacher")
    if config["departments"]:
        step("heads", "Appoint Department Heads", exists(Membership, role="head", active=True, user__is_active=True), "/memberships?role=head", school)
        step("appointments", "Department Head appoints eligible teachers", exists(TeacherAppointment, active=True, membership__active=True, membership__user__is_active=True), "/teacher-appointments", school, "Department Head")
    step("assignments", "Assign teachers to course offerings", exists(Offering, archived=False, teachers__membership__institute=institute, teachers__membership__active=True, teachers__is_active=True), "/offerings", owner="Institute Admin" if school else "Department Head / authorized Admin override")
    step("students", "Admit students", exists(Membership, role="student", active=True, user__is_active=True), "/memberships?role=student")
    step("enrollments", "Enroll students into offerings", exists(Enrollment, active=True, offering__archived=False), "/offerings")
    step("policies", "Save academic grading policies", bool(institute.grading_rules), "/institute-settings")
    required = [item for item in steps if not item["optional"]]
    completed = sum(item["complete"] for item in required)
    return Response(dict(steps=steps, completed=completed, total=len(required), ready=completed == len(required)))

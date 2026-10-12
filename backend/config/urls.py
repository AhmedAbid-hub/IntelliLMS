from django.contrib import admin
from django.http import JsonResponse
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.accounts import auth
from apps.accounts.profile import avatar
from apps.academics.setup import institute_setup
from apps.academics.admission import admit_student, AdmissionSuggestions, PlacementHistory, transfer_student
from apps.accounts.appointments import TeacherAppointmentViewSet
from .health import readiness
from apps.accounts.views import InstituteViewSet, MembershipViewSet
from apps.accounts.platform import (
    PlatformUserViewSet,
    PlatformAuditViewSet,
    platform_settings,
)
from apps.academics.views import (
    STRUCTURES,
    StructureViewSet,
    OfferingViewSet,
    EnrollmentViewSet,
    TimetableViewSet,
)
from apps.learning import views as learning
from apps.learning.governance import CorrectionViewSet, record_control, finalize_record
from apps.insights import views as insights

router = DefaultRouter()
router.register("corrections",CorrectionViewSet,basename="correction")
router.register("teacher-appointments", TeacherAppointmentViewSet, basename="teacher-appointment")
router.register("platform-users", PlatformUserViewSet, basename="platform-user")
router.register("platform-audit", PlatformAuditViewSet, basename="platform-audit")
router.register("institutes", InstituteViewSet, basename="institute")
router.register("memberships", MembershipViewSet, basename="membership")
router.register("audit", insights.AuditViewSet, basename="audit")
for resource, model in STRUCTURES.items():
    view = type(
        model.__name__ + "ViewSet",
        (StructureViewSet,),
        {"model": model, "search_fields": ["course__name", "course__code", "program__name"] if resource == "curriculum" else ["name"],
         "filterset_fields": {"curriculum": ["program", "course", "stage", "required", "active"], "batches": ["program", "year", "active"], "programs": ["unit", "active"], "sections": ["program", "batch", "active"], "courses": ["unit", "active"], "terms": ["year", "status"]}.get(resource, [])},
    )
    router.register(resource, view, basename=resource)
router.register("offerings", OfferingViewSet, basename="offering")
router.register("enrollments", EnrollmentViewSet, basename="enrollment")
router.register("timetable", TimetableViewSet, basename="timetable")
router.register("manual-grades", learning.ManualGradeViewSet, basename="manual-grades")
router.register("question-bank", learning.BankQuestionViewSet, basename="question-bank")
for name, view in [
    ("modules", learning.ModuleViewSet),
    ("lessons", learning.LessonViewSet),
    ("materials", learning.MaterialViewSet),
    ("assignments", learning.AssignmentViewSet),
    ("submissions", learning.SubmissionViewSet),
    ("quizzes", learning.QuizViewSet),
    ("questions", learning.QuestionViewSet),
    ("attempts", learning.AttemptViewSet),
    ("attendance-sessions", learning.AttendanceSessionViewSet),
    ("attendance", learning.AttendanceViewSet),
    ("announcements", learning.AnnouncementViewSet),
    ("notifications", learning.NotificationViewSet),
]:
    router.register(name, view, basename=name)

urlpatterns = [
    path("admin/", admin.site.urls),
    path("health/", lambda request: JsonResponse({"status": "ok"})),
    path("ready/", readiness),
    path("api/v1/academic-control/",record_control),
    path("api/v1/academic-control/finalize/",finalize_record),
    path("api/v1/admissions/", admit_student),
    path("api/v1/admissions/offerings/", AdmissionSuggestions.as_view()),
    path("api/v1/memberships/<uuid:pk>/placements/", PlacementHistory.as_view()),
    path("api/v1/memberships/<uuid:pk>/transfer/", transfer_student),
    path("api/v1/institute-setup/", institute_setup),
    path("api/v1/auth/csrf/", auth.csrf),
    path("api/v1/platform-settings/", platform_settings),
    path("api/v1/auth/login/", auth.login_view),
    path("api/v1/auth/logout/", auth.logout_view),
    path("api/v1/auth/me/", auth.me),
    path("api/v1/auth/avatar/", avatar),
    path("api/v1/auth/select-institute/", auth.select_institute),
    path("api/v1/auth/password-change/", auth.password_change),
    path("api/v1/auth/password-reset/", auth.password_reset),
    path("api/v1/auth/password-confirm/", auth.password_confirm),
    path("api/v1/", include(router.urls)),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema")),
]
urlpatterns += [
    path("api/v1/analytics/", insights.analytics),
    path("api/v1/platform/", insights.platform),
    path("api/v1/grades/", insights.grades),
    path("api/v1/reports/", insights.report),
    path("api/v1/model-status/", insights.model_status),
    path("api/v1/predictions/", insights.predictions),
]

from apps.insights.reporting import trends, risk_summary
from apps.insights.workload import WorkloadView
from apps.insights.batch import start_analysis, analysis_detail, analysis_items, advance_analysis
from apps.insights.agenda import student_agenda

urlpatterns += [
    path("api/v1/my-agenda/", student_agenda),
    path("api/v1/class-analysis/", start_analysis),
    path("api/v1/class-analysis/<uuid:pk>/", analysis_detail),
    path("api/v1/class-analysis/<uuid:pk>/items/", analysis_items),
    path("api/v1/class-analysis/<uuid:pk>/advance/", advance_analysis),
    path("api/v1/analytics/workload/", WorkloadView.as_view()),
    path("api/v1/analytics/trends/", trends),
    path("api/v1/predictions/summary/", risk_summary),
]

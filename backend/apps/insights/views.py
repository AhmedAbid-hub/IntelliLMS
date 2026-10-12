import csv

from django.db.models import (
    Case,
    Count,
    IntegerField,
    Q,
    Value,
    When,
)
from django.http import StreamingHttpResponse

from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema

from rest_framework.decorators import api_view
from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError,
)
from rest_framework.response import Response

from apps.accounts.models import Institute, Membership, User
from apps.accounts.scope import Scope

from apps.academics.models import Enrollment
from apps.academics.views import TenantViewSet

from apps.learning.models import (
    Attendance,
    Assignment,
    Submission,
    Lesson,
    Completion,
)

from .models import Audit, Activity, Prediction
from .services import gradebook, student_features
from .gradebook import iter_gradebook
from .filters import (
    enrollment_queryset,
    query_values,
    ReportPagination,
    ReportQuery,
)
from .contracts import (
    PredictionInput,
    PredictionResult,
    PredictionPage,
)
from .report_contracts import (
    DashboardResult,
    PlatformResult,
    GradePage,
    ModelStatusResult,
)


def prediction_risk_order():
    """
    Database-level ordering for prediction categories.

    Priority:
        1. High
        2. Moderate / Medium
        3. Low
        4. Unknown or unsupported categories

    This annotation must be applied before pagination.
    """
    return Case(
        When(
            category__iexact="high",
            then=Value(0),
        ),
        When(
            category__iexact="moderate",
            then=Value(1),
        ),
        When(
            category__iexact="medium",
            then=Value(1),
        ),
        When(
            category__iexact="low",
            then=Value(2),
        ),
        default=Value(3),
        output_field=IntegerField(),
    )


def require_prediction_instructor(scope, user, offering):
    """
    Restrict prediction generation to a teacher who is
    personally assigned to the requested course offering.

    Institute administrators may inspect predictions but
    cannot generate them.

    Department heads may generate predictions only when
    they personally teach the offering.
    """
    scope.require("head", "teacher")

    scope.check_offering(offering, write=True)

    if not offering.teachers.filter(pk=user.pk).exists():
        raise PermissionDenied(
            "Only assigned instructors can generate "
            "predictions for this class."
        )


@extend_schema(responses=DashboardResult)
@api_view(["GET"])
def analytics(request):
    scope = Scope(request)

    offerings = scope.offerings()

    enrollments = Enrollment.objects.filter(
        offering__in=offerings,
        active=True,
    )

    attendance = Attendance.objects.filter(
        session__offering__in=offerings,
    ).exclude(
        status="excused",
    )

    submissions = Submission.objects.filter(
        assignment__offering__in=offerings,
    )

    activity = Activity.objects.filter(
        offering__in=offerings,
    )

    if scope.role == "student":
        enrollments = enrollments.filter(
            student=request.user,
        )

        attendance = attendance.filter(
            student=request.user,
        )

        submissions = submissions.filter(
            student=request.user,
        )

        activity = activity.filter(
            user=request.user,
        )

    attendance_count = attendance.count()

    present_count = attendance.filter(
        status__in=["present", "late"],
    ).count()

    attendance_pct = (
        round(
            present_count / attendance_count * 100,
            1,
        )
        if attendance_count
        else None
    )

    return Response(
        {
            "active_courses": offerings.filter(
                archived=False,
            ).count(),
            "students": (
                enrollments.values("student")
                .distinct()
                .count()
            ),
            "teachers": (
                User.objects.filter(
                    teaching__in=offerings,
                )
                .distinct()
                .count()
            ),
            "enrollments": enrollments.count(),
            "attendance_pct": attendance_pct,
            "submissions": submissions.count(),
            "activity_events": activity.count(),
            "gradebook": gradebook(
                scope,
                enrollment_queryset(scope)[:5],
            ),
            "gradebook_preview_limit": 5,
            "activity_by_kind": list(
                activity.values("kind").annotate(
                    count=Count("id"),
                )
            ),
            "institute": scope.institute.name,
            "role": scope.role,
        }
    )


@extend_schema(responses=PlatformResult)
@api_view(["GET"])
def platform(request):
    if not request.user.is_superuser:
        raise PermissionDenied()

    return Response(
        {
            "institutes": Institute.objects.count(),
            "active_institutes": Institute.objects.filter(
                active=True,
            ).count(),
            "users": User.objects.count(),
            "memberships": Membership.objects.filter(
                active=True,
            ).count(),
        }
    )


@extend_schema(
    parameters=[ReportQuery],
    responses=GradePage,
)
@api_view(["GET"])
def grades(request):
    scope = Scope(request)

    queryset = enrollment_queryset(
        scope,
        query_values(request),
    )

    paginator = ReportPagination()

    page = paginator.paginate_queryset(
        queryset,
        request,
    )

    return paginator.get_paginated_response(
        gradebook(scope, page),
    )


@extend_schema(
    parameters=[ReportQuery],
    responses={
        (200, "text/csv"): OpenApiTypes.STR,
    },
)
@api_view(["GET"])
def report(request):
    scope = Scope(request)

    scope.require(
        "admin",
        "head",
        "teacher",
    )

    queryset = enrollment_queryset(
        scope,
        query_values(request),
    )

    keys = [
        "student_label",
        "offering_label",
        "score",
        "letter_grade",
        "grade_points",
        "attendance_pct",
        "assignment_pct",
        "quiz_pct",
        "manual_pct",
        "completion_pct",
    ]

    class Echo:
        def write(self, value):
            return value

    writer = csv.writer(Echo())

    def stream():
        yield writer.writerow(keys)

        for row in iter_gradebook(
            scope,
            queryset,
        ):
            values = [
                row.get(key, "")
                for key in keys
            ]

            safe_values = []

            for value in values:
                if (
                    isinstance(value, str)
                    and value.startswith(
                        (
                            "=",
                            "+",
                            "-",
                            "@",
                            "\t",
                            "\r",
                        )
                    )
                ):
                    value = "'" + value

                safe_values.append(value)

            yield writer.writerow(safe_values)

    response = StreamingHttpResponse(
        stream(),
        content_type="text/csv",
    )

    response["Content-Disposition"] = (
        'attachment; filename="course-progress.csv"'
    )

    return response


@extend_schema(responses=ModelStatusResult)
@api_view(["GET"])
def model_status(request):
    if not request.user.is_superuser:
        scope = Scope(request)

        scope.require(
            "admin",
            "head",
            "teacher",
        )

    from ml.inference import status

    return Response(status())


@extend_schema(
    methods=["GET"],
    parameters=[ReportQuery],
    responses=PredictionPage,
)
@extend_schema(
    methods=["POST"],
    request=PredictionInput,
    responses=PredictionResult,
)
@api_view(["GET", "POST"])
def predictions(request):
    scope = Scope(request)

    scope.require(
        "admin",
        "head",
        "teacher",
    )

    if request.method == "GET":
        queryset = (
            Prediction.objects.filter(
                institute=scope.institute,
                offering__in=scope.offerings(),
            )
            .select_related(
                "student",
                "offering",
            )
        )

        values = query_values(request)

        filters = [
            ("offering", "offering_id"),
            ("student", "student_id"),
            ("term", "offering__term_id"),
            ("unit", "offering__course__unit_id"),
            ("archived", "offering__archived"),
        ]

        for parameter, field in filters:
            if parameter in values:
                queryset = queryset.filter(
                    **{
                        field: values[parameter],
                    }
                )

        search = values.get("search")

        if search:
            queryset = queryset.filter(
                Q(
                    student__username__icontains=search,
                )
                | Q(
                    offering__title__icontains=search,
                )
            )

        # Important:
        # Sort in the database BEFORE pagination.
        #
        # High -> Moderate -> Low
        #
        # Within each category, show the newest
        # generated predictions first.
        queryset = (
            queryset.annotate(
                risk_priority=prediction_risk_order(),
            )
            .order_by(
                "risk_priority",
                "-created_at",
                "-pk",
            )
        )

        paginator = ReportPagination()

        page = paginator.paginate_queryset(
            queryset,
            request,
        )

        results = []

        for prediction in page:
            results.append(
                {
                    "id": str(prediction.pk),
                    "student_label": (
                        prediction.student.get_full_name()
                        or prediction.student.username
                    ),
                    "offering_label": (
                        prediction.offering.title
                    ),
                    "probability": (
                        prediction.probability
                    ),
                    "category": prediction.category,
                    "version": prediction.version,
                    "created_at": prediction.created_at,
                    "features": prediction.features,
                    "warning": prediction.warning,
                }
            )

        return paginator.get_paginated_response(
            results,
        )

    # POST:
    # Institute administrators have read-only
    # access to prediction results.
    scope.require(
        "head",
        "teacher",
    )

    payload = PredictionInput(
        data=request.data,
    )

    payload.is_valid(
        raise_exception=True,
    )

    student_id = payload.validated_data[
        "student"
    ]

    offering_id = payload.validated_data[
        "offering"
    ]

    enrollment = (
        Enrollment.objects.filter(
            offering__in=scope.offerings(),
            active=True,
            student_id=student_id,
            offering_id=offering_id,
        )
        .select_related(
            "offering",
            "student",
        )
        .first()
    )

    if not enrollment:
        raise ValidationError(
            "Select an enrolled student in "
            "an authorized offering."
        )

    require_prediction_instructor(
        scope,
        request.user,
        enrollment.offering,
    )

    from ml.inference import infer

    features, counts = student_features(
        enrollment.offering,
        enrollment.student,
    )

    result = infer(
        features,
        counts,
    )

    if result["status"] == "ready":
        prediction = Prediction.objects.create(
            institute=scope.institute,
            offering=enrollment.offering,
            student=enrollment.student,
            **{
                key: result[key]
                for key in [
                    "probability",
                    "category",
                    "version",
                    "features",
                    "warning",
                ]
            },
        )

        result["created_at"] = (
            prediction.created_at
        )

    return Response(result)


class AuditViewSet(TenantViewSet):
    model = Audit

    http_method_names = [
        "get",
        "head",
        "options",
    ]

    def get_queryset(self):
        if getattr(
            self,
            "swagger_fake_view",
            False,
        ):
            return self.model.objects.none()

        self.scope.require("admin")

        return super().get_queryset()
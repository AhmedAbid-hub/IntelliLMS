"""Insights predictions API; extracted without changing behavior."""
from django.db.models import Case, IntegerField, Q, Value, When
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from apps.accounts.models import Membership
from apps.accounts.scope import Scope
from apps.academics.models import Enrollment
from ..models import Prediction
from ..filters import enrollment_queryset, query_values, ReportPagination, ReportQuery
from ..contracts import PredictionInput, PredictionResult, PredictionPage
from ..report_contracts import ModelStatusResult


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
    # A Head must enter the capability-checked teaching workspace; department
    # oversight (including a stale teacher link after revocation) is read-only.
    scope.require("teacher")

    scope.check_offering(offering, write=True)

    if not offering.teachers.filter(pk=user.pk).exists():
        raise PermissionDenied(
            "Only assigned instructors can generate "
            "predictions for this class."
        )


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
            ("course", "offering__course_id"),
            ("program", "offering__section__program_id"),
            ("year", "offering__term__year_id"),
            ("section", "offering__section_id"),
            ("batch", "offering__section__batch_id"),
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

        if "stage" in values:
            from ..filters import restrict_report_pairs
            queryset = restrict_report_pairs(queryset, enrollment_queryset(scope, values))

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
                    **prediction.context,
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

    from ml.inference import infer, status
    from ..prediction_inputs import prediction_inputs
    from apps.accounts.models import Membership
    if not Membership.objects.filter(institute=scope.institute, user=enrollment.student,
            active=True, role="student", user__is_active=True).exists():
        raise ValidationError("Select an actively enrolled student with an active student membership.")
    metadata = status()
    features, counts, evidence = prediction_inputs(enrollment.offering, enrollment.student, metadata)
    result = infer(features, counts, runtime={"metadata": metadata})

    if result["status"] == "ready":
        prediction = Prediction.objects.create(
            institute=scope.institute,
            offering=enrollment.offering,
            student=enrollment.student,
            context={"model_info": result.get("model_info", {}), "observations": evidence},
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
        result["observations"] = evidence

    return Response(result)

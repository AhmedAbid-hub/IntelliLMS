"""Insights grade reports API; extracted without changing behavior."""
import csv
from django.http import StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from apps.accounts.scope import Scope
from ..services import gradebook
from ..gradebook import iter_gradebook
from ..filters import enrollment_queryset, query_values, ReportPagination, ReportQuery
from ..report_contracts import GradePage


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

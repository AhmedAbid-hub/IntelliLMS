from rest_framework.response import Response
from apps.insights.models import Audit


def grade_history(view, obj):
    """Staff-only history after the view has retrieved an authorized assessment."""
    view.scope.require("admin", "head", "teacher")
    events = Audit.objects.filter(
        institute=view.scope.institute,
        object_id=str(obj.pk),
        action__in=["Submission.grade", "ManualGrade.history", "Attempt.grade", "Academic.emergency_override", "Academic.finalization", "Academic.correction_rejected"],
    )
    page = view.paginate_queryset(
        events.select_related("actor").order_by("-created_at", "-pk")
    )
    return view.get_paginated_response(
        [
            {
                "id": str(event.pk),
                "created_at": event.created_at,
                "actor": (
                    event.actor.get_full_name() or event.actor.username
                    if event.actor
                    else "Deleted account"
                ),
                "action": event.action,
                "detail": event.detail,
            }
            for event in page
        ]
    )

"""A bounded personal agenda based on actual submissions, never model labels."""
from urllib.parse import urlencode
from django.db.models import Exists, OuterRef
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.accounts.scope import Scope
from apps.learning.models import Assignment, Submission, Quiz, Attempt


class TaskItem(serializers.Serializer):
    id = serializers.UUIDField()
    kind = serializers.CharField()
    title = serializers.CharField()
    course = serializers.CharField()
    deadline = serializers.DateTimeField()
    opens_at = serializers.DateTimeField(allow_null=True)
    overdue = serializers.BooleanField()
    action = serializers.CharField()
    url = serializers.CharField()


class AgendaResult(serializers.Serializer):
    pending_assignments = serializers.IntegerField()
    overdue_assignments = serializers.IntegerField()
    pending_quizzes = serializers.IntegerField()
    missed_quizzes = serializers.IntegerField()
    tasks = TaskItem(many=True)
    preview_limit = serializers.IntegerField()
    generated_at = serializers.DateTimeField()


@extend_schema(responses=AgendaResult)
@api_view(['GET'])
def student_agenda(request):
    scope = Scope(request)
    scope.require('student')
    offerings = scope.offerings().filter(archived=False)
    now = timezone.now()
    assignments = Assignment.objects.filter(institute=scope.institute, offering__in=offerings, published=True).annotate(
        submitted=Exists(Submission.objects.filter(assignment_id=OuterRef('pk'), student=request.user))
    ).filter(submitted=False).select_related('offering')
    quizzes = Quiz.objects.filter(institute=scope.institute, offering__in=offerings, published=True).annotate(
        completed=Exists(Attempt.objects.filter(quiz_id=OuterRef('pk'), student=request.user, submitted_at__isnull=False))
    ).filter(completed=False).select_related('offering')
    tasks = []
    # Keep both overdue and upcoming work visible, with at most ten of each type.
    assignment_preview = list(assignments.filter(due_at__lt=now).order_by('-due_at', 'pk')[:5]) + list(assignments.filter(due_at__gte=now).order_by('due_at', 'pk')[:5])
    quiz_preview = list(quizzes.filter(closes_at__lt=now).order_by('-closes_at', 'pk')[:5]) + list(quizzes.filter(closes_at__gte=now).order_by('closes_at', 'pk')[:5])
    for kind, rows in [('assignment', assignment_preview), ('quiz', quiz_preview)]:
        for row in rows:
            deadline = row.due_at if kind == 'assignment' else row.closes_at
            overdue = deadline < now
            if kind == 'assignment':
                action = 'Submit overdue work' if overdue and row.allow_late else 'Ask your teacher about the missed deadline' if overdue else 'Prepare your submission'
            else:
                action = 'Ask your teacher about the missed quiz' if overdue else 'Prepare before the quiz opens' if row.opens_at > now else 'Start or continue your quiz'
            tasks.append(dict(id=row.pk, kind=kind, title=row.title, course=row.offering.title,
                deadline=deadline, opens_at=row.opens_at if kind == 'quiz' else None,
                overdue=overdue, action=action,
                url='/' + ('assignments' if kind == 'assignment' else 'quizzes') + '?' + urlencode({'offering': row.offering_id, 'search': row.title})))
    tasks.sort(key=lambda task: (not task['overdue'], task['deadline'], str(task['id'])))
    return Response(dict(pending_assignments=assignments.count(), overdue_assignments=assignments.filter(due_at__lt=now).count(),
        pending_quizzes=quizzes.filter(closes_at__gte=now).count(), missed_quizzes=quizzes.filter(closes_at__lt=now).count(),
        tasks=tasks, preview_limit=20, generated_at=now))

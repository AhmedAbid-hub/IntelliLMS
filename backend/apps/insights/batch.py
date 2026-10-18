"""Resumable class analysis: one active run per offering, ten learners per request."""
import hashlib
import json
import logging
from django.db import transaction
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from apps.accounts.models import Membership
from apps.accounts.scope import Scope
from apps.academics.models import Enrollment, Offering
from .models import AnalysisRun, AnalysisItem, Prediction, Audit
from .filters import ReportPagination, ReportQuery
from .gradebook import gradebook

logger = logging.getLogger(__name__)
WARNING = 'EXPERIMENTAL: inspect each result for its dataset, prediction target and model version. Not validated for academic decisions.'
BATCH_SIZE = 10


class StartInput(serializers.Serializer):
    offering = serializers.UUIDField()


class ItemResult(serializers.Serializer):
    student = serializers.UUIDField()
    student_label = serializers.CharField()
    status = serializers.CharField()
    result = serializers.DictField()


class ItemPage(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = ItemResult(many=True)


class RunResult(serializers.Serializer):
    id = serializers.UUIDField()
    offering = serializers.UUIDField()
    status = serializers.CharField()
    total = serializers.IntegerField()
    processed = serializers.IntegerField()
    counts = serializers.DictField(child=serializers.IntegerField())
    created_at = serializers.DateTimeField()
    finished_at = serializers.DateTimeField(allow_null=True)
    warning = serializers.CharField()


def summary(run):
    counts = dict(run.items.values_list('status').annotate(total=Count('id')))
    total = sum(counts.values())
    return dict(id=run.pk, offering=run.offering_id, status=run.status,
                total=total, processed=total-counts.get('pending', 0), counts=counts,
                created_at=run.created_at, finished_at=run.finished_at, warning=WARNING)


def authorized(request):
    scope = Scope(request)
    scope.require('admin', 'head', 'teacher')
    return scope, scope.offerings()


def eligible_enrollments(scope, offering):
    members = Membership.objects.filter(institute=scope.institute, active=True,
                                        role='student', user__is_active=True).values('user_id')
    return Enrollment.objects.filter(institute=scope.institute, offering=offering,
        active=True, student_id__in=members).select_related('student', 'offering', 'offering__course__unit')


@extend_schema(request=StartInput, responses=RunResult)
@api_view(['POST'])
@transaction.atomic
def start_analysis(request):
    scope, offerings = authorized(request)
    payload = StartInput(data=request.data)
    payload.is_valid(raise_exception=True)
    offering = get_object_or_404(offerings, pk=payload.validated_data['offering'])
    from .views import require_prediction_instructor
    require_prediction_instructor(scope, request.user, offering)
    # Serialize starts without using SELECT DISTINCT FOR UPDATE on PostgreSQL.
    Offering.objects.select_for_update().get(pk=offering.pk)
    scope.check_offering(offering, write=True)
    run = AnalysisRun.objects.filter(offering=offering, status='active').first()
    if run:
        return Response(summary(run))
    students = list(eligible_enrollments(scope, offering).values_list('student_id', flat=True)[:10001])
    if len(students) > 10000:
        raise ValidationError('Analyze course sections separately; a run supports up to 10,000 students.')
    if not students:
        raise ValidationError('There are no active student memberships enrolled in this course.')
    run = AnalysisRun.objects.create(institute=scope.institute, offering=offering, requested_by=request.user)
    AnalysisItem.objects.bulk_create([AnalysisItem(institute=scope.institute, run=run, student_id=student) for student in students], batch_size=500)
    Audit.objects.create(institute=scope.institute, actor=request.user, action='AnalysisRun.start',
                         object_id=str(run.pk), detail={'offering': str(offering.pk), 'students': len(students)})
    return Response(summary(run), status=201)


def scoped_run(request, pk, lock=False):
    scope, offerings = authorized(request)
    query = AnalysisRun.objects.filter(institute=scope.institute, offering__in=offerings)
    if lock:
        query = query.select_for_update()
    return scope, get_object_or_404(query, pk=pk)


@extend_schema(responses=RunResult)
@api_view(['GET'])
def analysis_detail(request, pk):
    _, run = scoped_run(request, pk)
    return Response(summary(run))


@extend_schema(parameters=[ReportQuery], responses=ItemPage)
@api_view(['GET'])
def analysis_items(request, pk):
    _, run = scoped_run(request, pk)
    query = ReportQuery(data=request.query_params.dict())
    query.is_valid(raise_exception=True)
    items = run.items.select_related('student').order_by('student__username', 'pk')
    search = query.validated_data.get('search')
    if search:
        items = items.filter(Q(student__username__icontains=search) | Q(student__first_name__icontains=search) | Q(student__last_name__icontains=search))
    paginator = ReportPagination()
    page = paginator.paginate_queryset(items, request)
    return paginator.get_paginated_response([dict(student=item.student_id,
        student_label=item.student.get_full_name() or item.student.username,
        status=item.status, result=item.result) for item in page])


def estimate_row(scope, offering, row, runtime):
    from ml.inference import infer, insufficient
    from .prediction_inputs import prediction_inputs
    metadata = runtime['metadata']
    if metadata['status'] != 'ready':
        return {'status': 'model_unavailable', 'detail': metadata.get('detail', 'Model unavailable.')}
    features, counts, evidence = prediction_inputs(offering, row['student'], metadata, row=row)
    reason = insufficient(metadata, features, counts)
    if reason:
        return {'status': 'insufficient_data', 'detail': reason, 'counts': counts}
    digest = hashlib.sha256(json.dumps({'features': features, 'counts': counts, 'evidence': evidence,
        'version': metadata['version'], 'sha256': metadata['sha256']}, sort_keys=True).encode()).hexdigest()
    saved = Prediction.objects.filter(offering=offering, student_id=row['student'], input_digest=digest).first()
    if saved:
        return {'status': 'ready', 'reused': True, 'probability': saved.probability,
                'category': saved.category, 'version': saved.version, 'features': saved.features,
                'warning': saved.warning, 'created_at': saved.created_at.isoformat(), **saved.context}
    result = infer(features, counts, runtime=runtime)
    if result['status'] == 'ready':
        result['observations'] = evidence
        # A model replacement during inference must not bind the new output to the old digest.
        if result['version'] != metadata['version']:
            return {'status': 'failed', 'detail': 'Model changed during analysis; retry this student.'}
        saved, created = Prediction.objects.get_or_create(offering=offering,
            student_id=row['student'], input_digest=digest,
            defaults={'institute': scope.institute, 'context': {'model_info': result.get('model_info', {}), 'observations': evidence}, **{key: result[key] for key in ['probability', 'category', 'version', 'features', 'warning']}})
        result.update(created_at=saved.created_at.isoformat(), reused=not created)
    return result


@extend_schema(request=None, responses=RunResult)
@api_view(['POST'])
@transaction.atomic
def advance_analysis(request, pk):
    scope, run = scoped_run(request, pk, lock=True)
    from .views import require_prediction_instructor
    require_prediction_instructor(scope, request.user, run.offering)
    # Authorization is re-evaluated on every chunk, including after staff removal.
    scope.check_offering(run.offering, write=True)
    if run.status != 'active':
        return Response(summary(run))
    items = list(run.items.filter(status='pending').order_by('pk')[:BATCH_SIZE])
    enrollments = eligible_enrollments(scope, run.offering).filter(student_id__in=[item.student_id for item in items])
    rows = {row['student']: row for row in gradebook(scope, enrollments)}
    from ml.inference import status
    runtime = {'metadata': status()}
    for item in items:
        row = rows.get(str(item.student_id))
        try:
            with transaction.atomic():
                result = estimate_row(scope, run.offering, row, runtime) if row else {'status': 'withdrawn', 'detail': 'Student is no longer actively enrolled with an active membership.'}
        except Exception:
            # One learner/model failure cannot discard completed classmates. Never expose paths or exception contents.
            logger.exception('Class analysis item failed: %s', item.pk)
            result = {'status': 'failed', 'detail': 'Analysis failed for this student. Retry in a new run.'}
        result['academic'] = {key: row[key] for key in ['attendance_pct', 'assignment_completion_pct', 'quiz_pct', 'score', 'completion_pct']} if row else {}
        item.status, item.result = result['status'], result
        item.save(update_fields=['status', 'result'])
    if not run.items.filter(status='pending').exists():
        run.status, run.finished_at = 'completed', timezone.now()
        run.save(update_fields=['status', 'finished_at'])
    Audit.objects.create(institute=scope.institute, actor=request.user, action='AnalysisRun.advance',
                         object_id=str(run.pk), detail={'processed': len(items), 'status': run.status})
    return Response(summary(run))

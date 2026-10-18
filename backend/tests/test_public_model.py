"""Public-model schema, actual artifact integration and permission regressions."""
from datetime import timedelta
import json
from unittest.mock import patch
import pandas as pd
import pytest
from django.utils import timezone
from apps.accounts.models import Membership
from apps.learning.models import Assignment, Submission
from apps.insights.models import Prediction
from apps.insights.prediction_inputs import prediction_inputs
from ml import inference, oulad


def records(a):
    now = timezone.now()
    entries = []
    for index, score in enumerate([30, 55]):
        assignment = Assignment.objects.create(institute=a['institute'], offering=a['offering'],
            title=f'Real observed fixture {index}', due_at=now-timedelta(days=20-index*7), max_marks=50, published=True)
        entries.append(Submission.objects.create(institute=a['institute'], student=a['student'], assignment=assignment,
            marks=score/2, released=True, submitted_at=assignment.due_at-timedelta(days=1)))
    upcoming = Assignment.objects.create(institute=a['institute'], offering=a['offering'], title='Next unsubmitted work', due_at=now+timedelta(days=7), published=True)
    return entries, upcoming


def test_public_artifact_contract_and_missing_values():
    metadata = inference.status()
    assert metadata['status'] == 'ready' and metadata['mode'] == 'external_public'
    assert metadata['features'] == oulad.FEATURES
    assert metadata['target'] == oulad.TARGET and metadata['rows'] == 50815
    assert metadata['source']['unique_students'] == 18136
    assert sum(map(sum, metadata['test_metrics']['confusion_matrix'])) == metadata['split_sizes']['test']
    assert metadata['test_metrics']['f1'] > metadata['test_baseline_metrics']['f1']
    counts = {'eligible_assignments': 2, 'future_assignments': 1}
    features = dict(zip(oulad.FEATURES, [30., 55.]))
    result = inference.infer(features, counts)
    assert result['status'] == 'ready' and 0 <= result['probability'] <= 1
    for invalid in [None, float('nan'), 101, -1]:
        assert inference.infer({**features, oulad.FEATURES[0]: invalid}, counts)['status'] == 'insufficient_data'
    assert inference.infer(features, {**counts, 'future_assignments': 0})['status'] == 'insufficient_data'
    with patch('ml.inference.joblib.load', side_effect=RuntimeError('private path')):
        broken = inference.infer(features, counts)
    assert broken['status'] == 'model_unavailable' and 'private path' not in str(broken)


def test_public_data_cutoffs_and_group_manifest():
    frame, source = oulad.prepare()
    assert len(frame) == source['snapshot_rows'] == 50815
    assert (frame.feature_cutoff_day < frame.outcome_day).all()
    assert frame[oulad.FEATURES].notna().all().all()
    assert set(frame.target.unique()) == {0, 1}
    metadata = inference.status()
    assert sum(metadata['split_sizes'].values()) == len(frame)
    assert sum(metadata['split_students'].values()) == frame.student_id.nunique()
    assert len(set(metadata['split_hashes'].values())) == 3


def test_public_schema_rejects_mismatched_metadata(tmp_path, monkeypatch):
    metadata = inference.status()
    metadata['features'] = ['attendance_pct', 'activity_count']
    (tmp_path / 'metadata.json').write_text(json.dumps(metadata), encoding='utf-8')
    monkeypatch.setattr(inference, 'ARTIFACTS', tmp_path)
    assert inference.status()['status'] == 'model_unavailable'


def test_preparation_excludes_future_banked_missing_and_tied_scores(tmp_path):
    assessments = pd.DataFrame([{'id_assessment': i, 'code_module': 'X', 'code_presentation': '2014J',
        'assessment_type': 'TMA', 'date': 10*i} for i in range(1, 6)])
    submissions = pd.DataFrame([{'id_assessment': i, 'id_student': 1, 'date_submitted': 10*i,
        'is_banked': 0, 'score': 70 if i < 3 else 30} for i in range(1, 6)])
    assessments.to_csv(tmp_path/'assessments.csv', index=False)
    (tmp_path/'anonymisedData.zip').write_bytes(b'fixture; no download')
    submissions.to_csv(tmp_path/'studentAssessment.csv', index=False)
    frame, _ = oulad.prepare(tmp_path)
    assert len(frame) == 3 and frame.iloc[0].previous_assignment_pct == 70
    submissions.loc[submissions.id_assessment == 2, 'date_submitted'] = 45
    submissions.to_csv(tmp_path/'studentAssessment.csv', index=False)
    frame, _ = oulad.prepare(tmp_path)
    assert frame.outcome_assessment.tolist() == [5]  # future-known second score never leaks into target 3/4
    submissions.loc[submissions.id_assessment == 2, 'is_banked'] = 1
    submissions.loc[submissions.id_assessment == 3, 'score'] = None
    submissions.to_csv(tmp_path/'studentAssessment.csv', index=False)
    frame, _ = oulad.prepare(tmp_path)
    assert frame.outcome_assessment.tolist() == [5] and frame.iloc[0].previous_assignment_pct == 70
    assessments.loc[assessments.id_assessment == 4, 'date'] = 50
    assessments.to_csv(tmp_path/'assessments.csv', index=False)
    with pytest.raises(ValueError, match='No valid'):
        oulad.prepare(tmp_path)


@pytest.mark.django_db
def test_public_inputs_do_not_fabricate_or_leak(world):
    a, b = world['a'], world['b']
    submissions, next_assignment = records(a)
    records(b)
    metadata = inference.status()
    features, counts, evidence = prediction_inputs(a['offering'], a['student'], metadata)
    assert features == {'previous_assignment_pct': 30., 'latest_assignment_pct': 55.}
    assert counts == {'eligible_assignments': 2, 'future_assignments': 1}
    assert evidence['next_assignment']['id'] == str(next_assignment.pk)
    # A private/future grade is never silently used to manufacture two observations.
    submissions[1].released = False
    submissions[1].save()
    features, counts, _ = prediction_inputs(a['offering'], a['student'], metadata)
    assert counts['eligible_assignments'] == 0 and all(v is None for v in features.values())
    submissions[1].released = True
    submissions[1].submitted_at = timezone.now() + timedelta(days=1)
    submissions[1].save()
    assert prediction_inputs(a['offering'], a['student'], metadata)[1]['eligible_assignments'] == 0


@pytest.mark.django_db
def test_public_model_individual_class_history_and_permissions(world, client_for):
    a, b = world['a'], world['b']
    records(a)
    teacher = client_for(a, 'teacher')
    payload = {'offering': str(a['offering'].pk), 'student': str(a['student'].pk)}
    old = Prediction.objects.create(institute=a['institute'], offering=a['offering'], student=a['student'],
        probability=.5, category='moderate', version='legacy-demo', features={'attendance_pct': 75}, warning='DEMO — SYNTHETIC DATA')
    result = teacher.post('/api/v1/predictions/', payload)
    assert result.status_code == 200 and result.data['status'] == 'ready'
    assert result.data['features'] == {'previous_assignment_pct': 30., 'latest_assignment_pct': 55.}
    assert result.data['model_info']['target'] == oulad.TARGET
    from apps.insights.report_contracts import ModelStatusResult
    from apps.insights.contracts import PredictionResult, PredictionPage
    status_response = teacher.get('/api/v1/model-status/').data
    contract = ModelStatusResult(data=status_response)
    assert contract.is_valid(), contract.errors
    assert set(status_response) <= set(contract.fields)
    contract = PredictionResult(data=result.data)
    assert contract.is_valid(), contract.errors
    assert set(result.data) <= set(contract.fields)
    contract = PredictionPage(data=teacher.get('/api/v1/predictions/').data)
    assert contract.is_valid(), contract.errors
    assert teacher.get('/api/v1/predictions/').data['count'] == 2
    old.refresh_from_db()
    assert old.version == 'legacy-demo' and old.context == {}
    start = teacher.post('/api/v1/class-analysis/', {'offering': payload['offering']})
    url = f'/api/v1/class-analysis/{start.data["id"]}/'
    assert teacher.post(url+'advance/').data['counts'] == {'ready': 1}
    items = teacher.get(url+'items/').data['results']
    assert items[0]['result']['probability'] == result.data['probability']
    assert items[0]['result']['academic']['attendance_pct'] is None
    count = Prediction.objects.count()
    again = teacher.post('/api/v1/class-analysis/', {'offering': payload['offering']})
    again_url = f'/api/v1/class-analysis/{again.data["id"]}/'
    assert teacher.post(again_url+'advance/').data['counts'] == {'ready': 1}
    assert teacher.get(again_url+'items/').data['results'][0]['result']['reused']
    assert Prediction.objects.count() == count
    summary = teacher.get('/api/v1/predictions/summary/').data
    assert summary['learner_course_pairs'] == 1 and 'Older/different-target' in summary['basis']
    for role in ['admin', 'head', 'student']:
        client = client_for(a, role)
        assert client.post('/api/v1/predictions/', payload).status_code == 403
        assert client.post('/api/v1/class-analysis/', {'offering': payload['offering']}).status_code == 403
        assert client.post(url+'advance/').status_code == 403
    assert client_for(b, 'teacher').get('/api/v1/predictions/').data['count'] == 0
    assert client_for(b, 'teacher').post(url+'advance/').status_code == 404
    assert teacher.post('/api/v1/predictions/', {**payload, 'student': str(b['student'].pk)}).status_code == 400
    Membership.objects.filter(institute=a['institute'], user=a['student']).update(active=False)
    assert teacher.post('/api/v1/predictions/', payload).status_code == 400
    a['offering'].teachers.clear()
    assert teacher.post(url+'advance/').status_code == 404


@pytest.mark.django_db
def test_head_requires_teaching_workspace_and_current_capability(world, client_for):
    a = world['a']
    records(a)
    a['offering'].teachers.add(a['head'])
    head = client_for(a, 'head')
    payload = {'offering': str(a['offering'].pk), 'student': str(a['student'].pk)}
    assert head.post('/api/v1/predictions/', payload).status_code == 403
    assert head.post('/api/v1/class-analysis/', {'offering': payload['offering']}).status_code == 403
    Membership.objects.filter(institute=a['institute'], user=a['head']).update(can_teach=True)
    session = head.session
    session['academic_workspace'] = 'teaching'
    session.save()
    assert head.post('/api/v1/predictions/', payload).data['status'] == 'ready'
    started = head.post('/api/v1/class-analysis/', {'offering': payload['offering']})
    assert started.status_code == 201
    Membership.objects.filter(institute=a['institute'], user=a['head']).update(can_teach=False)
    assert head.post(f'/api/v1/class-analysis/{started.data["id"]}/advance/').status_code == 403

from datetime import timedelta
from unittest.mock import patch
import pytest
from django.utils import timezone
from apps.accounts.models import User, Membership
from apps.academics.models import Enrollment, Offering
from apps.learning.models import AttendanceSession, Attendance, Assignment, Submission
from apps.insights.models import AnalysisRun, AnalysisItem, Prediction


def observations(a, student):
    for n in range(3):
        session, _ = AttendanceSession.objects.get_or_create(institute=a['institute'], offering=a['offering'], date=timezone.now().date()-timedelta(days=n))
        Attendance.objects.create(institute=a['institute'], session=session, student=student, status='present')
    for n in range(2):
        assignment, _ = Assignment.objects.get_or_create(institute=a['institute'], offering=a['offering'], title=f'Assessment {n}', defaults={'due_at': timezone.now(), 'published': True})
        Submission.objects.create(institute=a['institute'], assignment=assignment, student=student, marks=75, released=True)


def mock_infer(features, counts, **kwargs):
    return dict(status='ready', probability=.2, category='low', version='test-v1', warning='DEMO SYNTHETIC DATA', features=features)


@pytest.mark.django_db
def test_analysis_resume_dedup_and_partial_failures(world, client_for):
    a=world['a']; client=client_for(a,'teacher')
    observations(a,a['student'])
    users=[]
    for i in range(12):
        user=User.objects.create_user(username=f'batch{i}',email=f'batch{i}@example.test')
        Membership.objects.create(institute=a['institute'],user=user,role='student',unit=a['unit'])
        Enrollment.objects.create(institute=a['institute'],offering=a['offering'],student=user)
        users.append(user)
    observations(a, users[0])
    run=client.post('/api/v1/class-analysis/',{'offering':str(a['offering'].pk)})
    assert run.status_code==201 and run.data['total']==13
    duplicate=client.post('/api/v1/class-analysis/',{'offering':str(a['offering'].pk)})
    assert duplicate.data['id']==run.data['id'] and AnalysisRun.objects.count()==1
    url=f'/api/v1/class-analysis/{run.data["id"]}/'
    Enrollment.objects.filter(student=users[1]).update(active=False)
    with patch('ml.inference.status',return_value={'status':'ready','version':'test-v1','sha256':'checksum'}), patch('ml.inference.infer',side_effect=mock_infer) as infer:
        first=client.post(url+'advance/')
        assert first.status_code==200 and first.data['processed']==10 and first.data['status']=='active'
        last=client.post(url+'advance/')
        assert last.data['status']=='completed' and last.data['processed']==13
        assert last.data['counts']=={'ready':2,'insufficient_data':10,'withdrawn':1}
        assert infer.call_count==2
        assert client.post(url+'advance/').data['processed']==13
        rerun=client.post('/api/v1/class-analysis/',{'offering':str(a['offering'].pk)})
        rerun_url=f'/api/v1/class-analysis/{rerun.data["id"]}/advance/'
        while client.post(rerun_url).data['status']=='active': pass
        assert Prediction.objects.count()==2 and infer.call_count==2
    page=client.get(url+'items/?page_size=5&search=batch')
    assert page.status_code==200 and page.data['count']==12 and len(page.data['results'])==5
    assert page.data['results'][0]['result']['academic'] is not None


@pytest.mark.django_db
def test_analysis_role_tenant_revocation_and_archive(world, client_for):
    a,b=world['a'],world['b']; teacher=client_for(a,'teacher')
    assert client_for(a,'student').post('/api/v1/class-analysis/',{'offering':str(a['offering'].pk)}).status_code==403
    assert teacher.post('/api/v1/class-analysis/',{'offering':str(b['offering'].pk)}).status_code==404
    run=teacher.post('/api/v1/class-analysis/',{'offering':str(a['offering'].pk)}).data
    url=f'/api/v1/class-analysis/{run["id"]}/'
    for suffix in ['', 'items/']:
        assert client_for(b,'admin').get(url+suffix).status_code==404
        assert client_for(a,'student').get(url+suffix).status_code==403
    assert client_for(b,'admin').post(url+'advance/').status_code==404
    a['offering'].teachers.clear()
    assert teacher.post(url+'advance/').status_code==404
    assert AnalysisItem.objects.filter(status='pending').count()==1
    a['offering'].archived=True; a['offering'].save()
    assert client_for(a,'admin').post(url+'advance/').status_code==400
    assert client_for(a,'admin').post('/api/v1/class-analysis/',{'offering':str(a['offering'].pk)}).status_code==400


@pytest.mark.django_db
def test_analysis_model_failure_does_not_discard_run(world, client_for):
    a=world['a']; client=client_for(a,'head'); observations(a,a['student'])
    for failure,expected in [(RuntimeError('private path'), 'failed'), (None, 'model_unavailable')]:
        run=client.post('/api/v1/class-analysis/',{'offering':str(a['offering'].pk)}).data
        url=f'/api/v1/class-analysis/{run["id"]}/'
        with patch('ml.inference.status',return_value={'status':'ready','version':'test-v1','sha256':'checksum'} if failure else {'status':'model_unavailable'}), patch('ml.inference.infer',side_effect=failure):
            response=client.post(url+'advance/')
        assert response.status_code==200 and response.data['counts']=={expected:1}
        result=client.get(url+'items/').data['results'][0]
        assert 'private path' not in str(result) and result['result']['academic']['score']==75
    assert Prediction.objects.count()==0

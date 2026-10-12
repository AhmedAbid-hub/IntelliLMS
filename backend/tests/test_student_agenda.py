from datetime import timedelta
import pytest
from django.utils import timezone
from apps.accounts.models import User, Membership
from apps.academics.models import Enrollment
from apps.learning.models import Assignment, Submission, Quiz, Attempt


@pytest.mark.django_db
def test_student_agenda_only_own_unfinished_published_work(world, client_for):
    a,b=world['a'],world['b']; now=timezone.now(); student=client_for(a,'student')
    overdue=Assignment.objects.create(institute=a['institute'],offering=a['offering'],title='Missed',published=True,due_at=now-timedelta(days=1))
    upcoming=Assignment.objects.create(institute=a['institute'],offering=a['offering'],title='Upcoming',published=True,due_at=now+timedelta(days=1))
    Assignment.objects.create(institute=a['institute'],offering=a['offering'],title='Draft hidden',due_at=now)
    Assignment.objects.create(institute=b['institute'],offering=b['offering'],title='Foreign hidden',published=True,due_at=now)
    other=User.objects.create_user(username='classmate',email='classmate@example.test')
    Membership.objects.create(user=other,institute=a['institute'],role='student')
    Enrollment.objects.create(institute=a['institute'],offering=a['offering'],student=other)
    Submission.objects.create(institute=a['institute'],student=other,assignment=upcoming)
    quiz=Quiz.objects.create(institute=a['institute'],offering=a['offering'],title='Quiz',published=True,opens_at=now-timedelta(hours=1),closes_at=now+timedelta(hours=1))
    response=student.get('/api/v1/my-agenda/')
    assert response.status_code==200
    assert response.data['pending_assignments']==2 and response.data['overdue_assignments']==1 and response.data['pending_quizzes']==1
    assert {item['title'] for item in response.data['tasks']}=={'Missed','Upcoming','Quiz'}
    assert response.data['tasks'][0]['action']=='Ask your teacher about the missed deadline'
    Submission.objects.create(institute=a['institute'],student=a['student'],assignment=upcoming)
    Attempt.objects.create(institute=a['institute'],student=a['student'],quiz=quiz,submitted_at=now,deadline=now+timedelta(minutes=30))
    updated=student.get('/api/v1/my-agenda/').data
    assert updated['pending_assignments']==1 and updated['pending_quizzes']==0
    Enrollment.objects.filter(student=a['student']).update(active=False)
    assert student.get('/api/v1/my-agenda/').data['tasks']==[]


@pytest.mark.django_db
def test_agenda_bounded_and_staff_denied(world,client_for):
    a=world['a']; now=timezone.now()
    Assignment.objects.bulk_create([Assignment(institute=a['institute'],offering=a['offering'],title=f'Task {i}',published=True,due_at=now+timedelta(days=1)) for i in range(40)])
    response=client_for(a,'student').get('/api/v1/my-agenda/').data
    assert response['pending_assignments']==40 and len(response['tasks'])==5
    for role in ['teacher','head','admin']:
        assert client_for(a,role).get('/api/v1/my-agenda/').status_code==403
    a['admin'].is_superuser=True; a['admin'].save()
    assert client_for(a,'admin').get('/api/v1/my-agenda/').status_code==403
    a['offering'].archived=True; a['offering'].save()
    assert client_for(a,'student').get('/api/v1/my-agenda/').data['pending_assignments']==0

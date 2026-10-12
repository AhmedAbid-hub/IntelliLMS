from datetime import timedelta
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
import pytest
from apps.learning.models import Quiz, Question, Attempt, BankQuestion
from apps.insights.models import Audit


def make_quiz(a):
    return Quiz.objects.create(institute=a['institute'], offering=a['offering'], title='Authoring quiz', opens_at=timezone.now() - timedelta(hours=1), closes_at=timezone.now() + timedelta(days=1), published=True)


def row(**changes):
    return {'prompt': 'Two plus two?', 'kind': 'mcq', 'options': ['3', '4'], 'answer': '4', 'marks': 2, **changes}


@pytest.mark.django_db
def test_bulk_questions_atomic_preview_scope_and_attempt_lock(world, client_for):
    a = world['a']; quiz = make_quiz(a)
    teacher = client_for(a, 'teacher'); url = f'/api/v1/quizzes/{quiz.pk}/bulk-questions/'
    assert client_for(a, 'student').post(url, {'questions': [row()]}, format='json').status_code == 403
    assert client_for(world['b'], 'teacher').post(url, {'questions': [row()]}, format='json').status_code == 404
    result = teacher.post(url, {'questions': [row(), row(answer='5')]}, format='json')
    assert result.status_code == 400 and result.data['errors'][0]['row'] == 2
    assert not quiz.questions.exists()
    assert teacher.post(url, {'questions': [row()], 'preview': True}, format='json').status_code == 200
    assert not quiz.questions.exists()
    result = teacher.post(url, {'questions': [row(), row(kind='short', options=[], answer='Reference')]}, format='json')
    assert result.status_code == 201, result.data
    assert list(quiz.questions.values_list('position', flat=True)) == [1, 2]
    assert Audit.objects.filter(action='Quiz.bulk_questions').exists()
    assert teacher.post(url, {'questions': [row()] * 101}, format='json').status_code == 400
    assert client_for(a, 'student').post(f'/api/v1/quizzes/{quiz.pk}/start/').status_code == 201
    assert teacher.post(url, {'questions': [row()]}, format='json').status_code == 400
    assert quiz.questions.count() == 2


@pytest.mark.django_db
def test_question_csv_bank_order_and_safe_duplicate(world, client_for):
    a = world['a']; quiz = make_quiz(a); teacher = client_for(a, 'teacher')
    base = f'/api/v1/quizzes/{quiz.pk}'
    template = teacher.get(base + '/question-template/')
    assert template.status_code == 200 and b'prompt,kind,options,answer,marks' in template.content
    preview = teacher.post(base + '/import-questions/', {'file': SimpleUploadedFile('questions.csv', template.content)}, format='multipart')
    assert preview.status_code == 200, preview.data
    assert len(preview.data['questions']) == 3 and not quiz.questions.exists()
    commit = teacher.post(base + '/import-questions/', {'file': SimpleUploadedFile('questions.csv', template.content), 'preview': 'false'}, format='multipart')
    assert commit.status_code == 201, commit.data
    bank = BankQuestion.objects.create(institute=a['institute'], author=a['teacher'], unit=a['unit'], **row(prompt='Bank prompt'))
    foreign = BankQuestion.objects.create(institute=world['b']['institute'], author=world['b']['teacher'], **row())
    other_author = BankQuestion.objects.create(institute=a['institute'], author=a['head'], unit=a['unit'], **row())
    for unauthorized in [foreign, other_author]:
        assert teacher.post(base + '/add-bank-questions/', {'questions': [str(bank.pk), str(unauthorized.pk)]}, format='json').status_code == 400
        assert quiz.questions.count() == 3
    assert teacher.post(base + '/add-bank-questions/', {'questions': [str(bank.pk)]}, format='json').status_code == 201
    ids = [str(id) for id in quiz.questions.values_list('pk', flat=True)][::-1]
    assert teacher.post(base + '/order-questions/', {'questions': ids[:-1]}, format='json').status_code == 400
    assert teacher.post(base + '/order-questions/', {'questions': ids}, format='json').status_code == 200
    assert [str(id) for id in quiz.questions.values_list('pk', flat=True)] == ids
    assert client_for(a, 'student').post(base + '/start/').status_code == 201
    assert teacher.post(base + '/order-questions/', {'questions': ids}, format='json').status_code == 400
    result = teacher.post(base + '/duplicate/', {'title': 'New draft'}, format='json')
    assert result.status_code == 201, result.data
    copy = Quiz.objects.get(pk=result.data['id'])
    assert not copy.published and not copy.released and not copy.attempt_set.exists()
    assert copy.questions.count() == 4 and quiz.attempt_set.count() == 1
    assert list(copy.questions.values_list('prompt', flat=True)) == list(quiz.questions.values_list('prompt', flat=True))
    student = client_for(a, 'student')
    assert student.get(f'/api/v1/quizzes/{copy.pk}/').status_code == 404
    assert student.get(base + '/question-template/').status_code == 403


@pytest.mark.django_db
def test_csv_and_question_choice_validation(world, client_for):
    a = world['a']; quiz = make_quiz(a); teacher = client_for(a, 'teacher')
    url = f'/api/v1/quizzes/{quiz.pk}/bulk-questions/'
    for options in [['x', 'x'], ['', 'x'], [1, 2], {'x': 'y'}]:
        assert teacher.post(url, {'questions': [row(options=options)]}, format='json').status_code == 400
    result = teacher.post(f'/api/v1/quizzes/{quiz.pk}/import-questions/', {'file': SimpleUploadedFile('bad.csv', b'prompt,kind,options,answer,marks\nQuestion,mcq,not-json,yes,1')}, format='multipart')
    assert result.status_code == 400 and result.data['errors'][0]['row'] == 1
    assert not quiz.questions.exists()

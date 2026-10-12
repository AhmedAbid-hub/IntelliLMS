"""Bounded, atomic quiz authoring. Every write shares the quiz attempt lock."""
import csv
import io
import json
from django.db import transaction
from django.db.models import Max
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from apps.academics.serializers import serializer_for
from .models import Quiz, Question, BankQuestion
from .serializers import LearningSerializer

FIELDS = ['prompt', 'kind', 'options', 'answer', 'marks']


class QuestionBatchInput(serializers.Serializer):
    questions = serializers.ListField(child=serializers.DictField(), min_length=1, max_length=100)
    preview = serializers.BooleanField(default=False)


class QuestionCSVInput(serializers.Serializer):
    file = serializers.FileField()
    preview = serializers.BooleanField(default=True)


class BankBatchInput(serializers.Serializer):
    questions = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=100)


class OrderInput(serializers.Serializer):
    questions = serializers.ListField(child=serializers.UUIDField(), min_length=1, max_length=500)


class DuplicateInput(serializers.Serializer):
    title = serializers.CharField(max_length=180)


class QuestionBatchResult(serializers.Serializer):
    created = serializers.IntegerField()
    valid = serializers.BooleanField()
    errors = serializers.ListField(child=serializers.DictField())
    questions = serializers.ListField(child=serializers.DictField())


class QuizAuthoringActions:
    def authoring_quiz(self, pk, *, editable=True):
        self.scope.require('admin', 'head', 'teacher')
        quiz = get_object_or_404(self.get_queryset().select_for_update(), pk=pk)
        self.check_object_permissions(self.request, quiz)
        self.scope.check_offering(quiz.offering, write=True)
        if editable and quiz.attempt_set.exists():
            raise ValidationError('Questions are locked after attempts begin. Duplicate the quiz to author a new version.')
        return quiz

    def append_questions(self, quiz, rows, preview=False):
        if quiz.questions.count() + len(rows) > 500:
            raise ValidationError('A quiz may contain at most 500 questions.')
        validated, errors = [], []
        for index, row in enumerate(rows, 1):
            data = {key: row[key] for key in FIELDS if key in row}
            data['quiz'] = str(quiz.pk)
            serializer = serializer_for(Question, LearningSerializer)(data=data, context={'request': self.request})
            if serializer.is_valid():
                validated.append(serializer)
            else:
                errors.append({'row': index, 'errors': serializer.errors})
        if errors:
            return Response({'created': 0, 'valid': False, 'errors': errors, 'questions': []}, status=400)
        if preview:
            return Response({'created': 0, 'valid': True, 'errors': [], 'questions': [{key: item.validated_data.get(key, [] if key == 'options' else '') for key in FIELDS} for item in validated]})
        position = (quiz.questions.aggregate(value=Max('position'))['value'] or 0) + 1
        for index, serializer in enumerate(validated):
            serializer.save(institute=self.scope.institute, position=position + index)
        self.audit(quiz, 'bulk_questions')
        return Response({'created': len(validated), 'valid': True, 'errors': [], 'questions': []}, status=201)

    @extend_schema(request=QuestionBatchInput, responses=QuestionBatchResult)
    @action(detail=True, methods=['post'], url_path='bulk-questions')
    @transaction.atomic
    def bulk_questions(self, request, pk=None):
        quiz = self.authoring_quiz(pk)
        values = QuestionBatchInput(data=request.data)
        values.is_valid(raise_exception=True)
        return self.append_questions(quiz, values.validated_data['questions'], values.validated_data['preview'])

    @extend_schema(request=QuestionCSVInput, responses=QuestionBatchResult)
    @action(detail=True, methods=['post'], url_path='import-questions')
    @transaction.atomic
    def import_questions(self, request, pk=None):
        quiz = self.authoring_quiz(pk)
        values = QuestionCSVInput(data=request.data)
        values.is_valid(raise_exception=True)
        upload = values.validated_data['file']
        if upload.size > 1024 * 1024 or not upload.name.lower().endswith('.csv'):
            raise ValidationError('Upload a UTF-8 CSV file up to 1 MB.')
        try:
            reader = csv.DictReader(io.StringIO(upload.read().decode('utf-8-sig')))
            if not set(FIELDS).issubset(reader.fieldnames or []):
                raise ValidationError('CSV requires prompt,kind,options,answer,marks headers.')
            rows = []
            for number, row in enumerate(reader, 1):
                if number > 100:
                    raise ValidationError('Import at most 100 questions per batch.')
                try:
                    row['options'] = json.loads(row.get('options') or '[]')
                except (json.JSONDecodeError, TypeError):
                    return Response({'created': 0, 'valid': False, 'questions': [], 'errors': [{'row': number, 'errors': {'options': ['Use a JSON array of answer choices.']}}]}, status=400)
                rows.append(row)
        except (UnicodeDecodeError, csv.Error):
            raise ValidationError('Invalid UTF-8 CSV.')
        if not rows:
            raise ValidationError('Include at least one question.')
        return self.append_questions(quiz, rows, values.validated_data['preview'])

    @extend_schema(responses={(200, 'text/csv'): OpenApiTypes.BINARY})
    @action(detail=True, methods=['get'], url_path='question-template')
    def question_template(self, request, pk=None):
        self.scope.require('admin', 'head', 'teacher')
        self.get_object()
        result = HttpResponse(content_type='text/csv')
        result['Content-Disposition'] = 'attachment; filename="quiz-questions-template.csv"'
        writer = csv.writer(result)
        writer.writerow(FIELDS)
        writer.writerow(['What is 2 + 2?', 'mcq', json.dumps(['3', '4']), '4', 1])
        writer.writerow(['Water is a liquid.', 'boolean', '[]', 'true', 1])
        writer.writerow(['Explain your reasoning.', 'short', '[]', '', 5])
        return result

    @extend_schema(request=BankBatchInput, responses=QuestionBatchResult)
    @action(detail=True, methods=['post'], url_path='add-bank-questions')
    @transaction.atomic
    def add_bank_questions(self, request, pk=None):
        quiz = self.authoring_quiz(pk)
        values = BankBatchInput(data=request.data)
        values.is_valid(raise_exception=True)
        ids = values.validated_data['questions']
        if len(set(ids)) != len(ids):
            raise ValidationError('Choose each bank question once.')
        bank = BankQuestion.objects.filter(institute=self.scope.institute, pk__in=ids)
        if self.scope.role == 'teacher':
            bank = bank.filter(author=request.user)
        elif self.scope.role == 'head':
            bank = bank.filter(unit_id=self.scope.membership.unit_id) if self.scope.membership.unit_id else bank.none()
        records = {item.pk: item for item in bank}
        if len(records) != len(ids):
            raise ValidationError('One or more bank questions are outside your authorized scope.')
        return self.append_questions(quiz, [{key: getattr(records[id], key) for key in FIELDS} for id in ids])

    @extend_schema(request=OrderInput, responses=QuestionBatchResult)
    @action(detail=True, methods=['post'], url_path='order-questions')
    @transaction.atomic
    def order_questions(self, request, pk=None):
        quiz = self.authoring_quiz(pk)
        values = OrderInput(data=request.data)
        values.is_valid(raise_exception=True)
        ids = values.validated_data['questions']
        questions = {item.pk: item for item in quiz.questions.all()}
        if len(ids) != len(set(ids)) or set(ids) != questions.keys():
            raise ValidationError('Include every question in this quiz exactly once.')
        for index, id in enumerate(ids, 1):
            questions[id].position = index
        Question.objects.bulk_update(questions.values(), ['position'])
        self.audit(quiz, 'order_questions')
        return Response({'created': 0, 'valid': True, 'errors': [], 'questions': []})

    @extend_schema(request=DuplicateInput, responses={201: serializer_for(Quiz, LearningSerializer)})
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def duplicate(self, request, pk=None):
        source = self.authoring_quiz(pk, editable=False)
        values = DuplicateInput(data=request.data)
        values.is_valid(raise_exception=True)
        if source.questions.count() > 500:
            raise ValidationError('Duplicate supports quizzes with at most 500 questions.')
        quiz = Quiz.objects.create(institute=self.scope.institute, offering=source.offering, title=values.validated_data['title'], opens_at=source.opens_at, closes_at=source.closes_at, minutes=source.minutes, attempt_limit=source.attempt_limit, published=False, released=False)
        Question.objects.bulk_create([Question(institute=self.scope.institute, quiz=quiz, position=index, **{key: getattr(question, key) for key in FIELDS}) for index, question in enumerate(source.questions.all(), 1)])
        self.audit(quiz, 'duplicate')
        return Response(self.get_serializer(quiz).data, status=201)

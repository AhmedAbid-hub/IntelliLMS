"""Public reporting shapes, shared by OpenAPI and response contract tests."""
from rest_framework import serializers


class GradeRow(serializers.Serializer):
    student = serializers.UUIDField()
    student_label = serializers.CharField()
    offering = serializers.UUIDField()
    offering_label = serializers.CharField()
    unit = serializers.UUIDField(allow_null=True)
    unit_label = serializers.CharField()
    score = serializers.FloatField(allow_null=True)
    provisional = serializers.BooleanField()
    letter_grade = serializers.CharField(allow_null=True)
    grade_points = serializers.FloatField(allow_null=True)
    pass_mark = serializers.FloatField()
    meeting_pass_mark = serializers.BooleanField(allow_null=True)
    assignment_pct = serializers.FloatField(allow_null=True)
    quiz_pct = serializers.FloatField(allow_null=True)
    manual_pct = serializers.FloatField(allow_null=True)
    attendance_pct = serializers.FloatField(allow_null=True)
    completion_pct = serializers.FloatField(allow_null=True)
    activity_count = serializers.IntegerField()
    attendance_records = serializers.IntegerField()
    graded_assignments = serializers.IntegerField()
    graded_quizzes = serializers.IntegerField()
    published_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    available_assignments = serializers.IntegerField()
    submitted_assignments = serializers.IntegerField()
    assignment_completion_pct = serializers.FloatField(allow_null=True)


class GradePage(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = GradeRow(many=True)


class ActivityKind(serializers.Serializer):
    kind = serializers.CharField()
    count = serializers.IntegerField()


class DashboardResult(serializers.Serializer):
    structure_counts = serializers.DictField(child=serializers.IntegerField())
    active_courses = serializers.IntegerField()
    students = serializers.IntegerField()
    teachers = serializers.IntegerField()
    enrollments = serializers.IntegerField()
    attendance_pct = serializers.FloatField(allow_null=True)
    submissions = serializers.IntegerField()
    activity_events = serializers.IntegerField()
    gradebook = GradeRow(many=True)
    gradebook_preview_limit = serializers.IntegerField()
    activity_by_kind = ActivityKind(many=True)
    institute = serializers.CharField()
    role = serializers.CharField()


class PlatformResult(serializers.Serializer):
    institutes = serializers.IntegerField()
    active_institutes = serializers.IntegerField()
    institute_administrators = serializers.IntegerField()
    users = serializers.IntegerField()
    memberships = serializers.IntegerField()


class ActivityDay(serializers.Serializer):
    date = serializers.DateField()
    count = serializers.IntegerField()


class AttendanceDay(serializers.Serializer):
    date = serializers.DateField()
    percentage = serializers.FloatField()
    records = serializers.IntegerField()


class AssignmentDay(serializers.Serializer):
    date = serializers.DateField()
    percentage = serializers.FloatField()
    assessments = serializers.IntegerField()


class DepartmentResult(serializers.Serializer):
    unit_id = serializers.UUIDField(allow_null=True)
    unit = serializers.CharField()
    learners = serializers.IntegerField()
    courses = serializers.IntegerField()
    average_score = serializers.FloatField(allow_null=True)
    average_attendance = serializers.FloatField(allow_null=True)


class WorkloadPreview(serializers.Serializer):
    teacher = serializers.CharField()
    courses = serializers.IntegerField()
    learners = serializers.IntegerField()


class TrendsResult(serializers.Serializer):
    window_days = serializers.IntegerField()
    activity = ActivityDay(many=True)
    attendance = AttendanceDay(many=True)
    assignment_scores = AssignmentDay(many=True)
    departments = DepartmentResult(many=True)
    instructor_workload = WorkloadPreview(many=True)
    instructor_workload_preview_limit = serializers.IntegerField()
    assignment_completion_pct = serializers.FloatField(allow_null=True)
    score_basis = serializers.CharField()


class PredictionReadiness(serializers.Serializer):
    courses = serializers.IntegerField()
    open_courses = serializers.IntegerField()
    learner_course_pairs = serializers.IntegerField()
    eligible_pairs = serializers.IntegerField(allow_null=True)
    insufficient_history_pairs = serializers.IntegerField(allow_null=True)
    no_upcoming_pairs = serializers.IntegerField(allow_null=True)
    historical_estimates = serializers.IntegerField()
    model_status = serializers.CharField()
    can_generate = serializers.BooleanField()
    generation_reason = serializers.CharField(allow_blank=True)


class RiskResult(serializers.Serializer):
    distribution = serializers.DictField(child=serializers.IntegerField())
    learner_course_pairs = serializers.IntegerField()
    basis = serializers.CharField()
    warning = serializers.CharField()
    readiness = PredictionReadiness()


class EvaluationMetrics(serializers.Serializer):
    accuracy = serializers.FloatField()
    precision = serializers.FloatField()
    recall = serializers.FloatField()
    f1 = serializers.FloatField()
    roc_auc = serializers.FloatField(allow_null=True)
    brier_score = serializers.FloatField()
    confusion_matrix = serializers.ListField(child=serializers.ListField(child=serializers.IntegerField()))
    average_precision = serializers.FloatField(required=False)


class ModelStatusResult(serializers.Serializer):
    status = serializers.CharField(help_text="ready or model_unavailable")
    detail = serializers.CharField(required=False)
    version = serializers.CharField(required=False)
    target = serializers.CharField(required=False)
    features = serializers.ListField(child=serializers.CharField(), required=False)
    mode = serializers.CharField(required=False)
    warning = serializers.CharField(required=False)
    selected_model = serializers.CharField(required=False)
    seed = serializers.IntegerField(required=False)
    rows = serializers.IntegerField(required=False)
    split_sizes = serializers.DictField(child=serializers.IntegerField(), required=False)
    split_strategy = serializers.CharField(required=False)
    validation_metrics = serializers.DictField(child=EvaluationMetrics(), required=False)
    test_metrics = EvaluationMetrics(required=False)
    thresholds = serializers.DictField(child=serializers.FloatField(), required=False)
    artifact = serializers.CharField(required=False)
    sha256 = serializers.CharField(required=False)
    target_label = serializers.CharField(required=False)
    feature_schema = serializers.CharField(required=False)
    source = serializers.JSONField(required=False)
    training_configuration = serializers.JSONField(required=False)
    preprocessing = serializers.CharField(required=False)
    feature_units = serializers.JSONField(required=False)
    split_students = serializers.JSONField(required=False)
    split_positive_rows = serializers.JSONField(required=False)
    split_hashes = serializers.JSONField(required=False)
    validation_thresholds = serializers.JSONField(required=False)
    test_baseline_metrics = serializers.JSONField(required=False)
    test_majority_metrics = serializers.JSONField(required=False)
    decision_threshold = serializers.FloatField(required=False)
    category_note = serializers.CharField(required=False)

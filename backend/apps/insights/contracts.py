from rest_framework import serializers


class PredictionInput(serializers.Serializer):
    student = serializers.UUIDField()
    offering = serializers.UUIDField()


class PredictionFactor(serializers.Serializer):
    feature = serializers.CharField()
    value = serializers.FloatField(allow_null=True)
    context = serializers.CharField()


class PredictionResult(serializers.Serializer):
    status = serializers.CharField(
        help_text="ready, insufficient_data or model_unavailable"
    )
    detail = serializers.CharField(required=False)
    counts = serializers.DictField(child=serializers.IntegerField(), required=False)
    probability = serializers.FloatField(required=False, min_value=0, max_value=1)
    category = serializers.CharField(required=False)
    version = serializers.CharField(required=False)
    warning = serializers.CharField(required=False)
    features = serializers.DictField(
        child=serializers.FloatField(allow_null=True), required=False
    )
    factors = PredictionFactor(many=True, required=False)
    created_at = serializers.DateTimeField(required=False)
    model_info = serializers.JSONField(required=False)
    observations = serializers.JSONField(required=False)


class PredictionHistory(serializers.Serializer):
    id = serializers.UUIDField()
    student_label = serializers.CharField()
    offering_label = serializers.CharField()
    probability = serializers.FloatField()
    category = serializers.CharField()
    version = serializers.CharField()
    created_at = serializers.DateTimeField()
    features = serializers.DictField(child=serializers.FloatField(allow_null=True))
    warning = serializers.CharField()
    model_info = serializers.JSONField(required=False)
    observations = serializers.JSONField(required=False)


class PredictionPage(serializers.Serializer):
    count = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = PredictionHistory(many=True)

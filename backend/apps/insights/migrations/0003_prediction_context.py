from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("insights", "0002_analysisitem_analysisrun_prediction_input_digest_and_more")]
    operations = [migrations.AddField(model_name="prediction", name="context", field=models.JSONField(default=dict, blank=True))]

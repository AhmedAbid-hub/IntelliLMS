from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0008_accountinvitation")]
    operations = [
        migrations.AlterField(
            model_name="accountinvitation",
            name="email_status",
            field=models.CharField(
                max_length=12, default="pending",
                choices=[("pending", "Sending"), ("accepted", "Submitted to email provider"),
                         ("local", "Captured locally; not delivered"),
                         ("sent", "Legacy backend acceptance; transport unverified"),
                         ("failed", "Email sending failed")],
            ),
        ),
    ]

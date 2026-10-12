from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.learning.models import Assignment, Submission, Notification
from apps.academics.models import Enrollment


class Command(BaseCommand):
    help = "Create idempotent reminders for unsubmitted assignments due in the next 24 hours."

    def handle(self, *args, **kwargs):
        now = timezone.now()
        created = 0
        assignments = Assignment.objects.filter(
            published=True,
            offering__archived=False,
            institute__active=True,
            due_at__gte=now,
            due_at__lte=now + timedelta(hours=24),
        )
        for assignment in assignments:
            submitted = Submission.objects.filter(assignment=assignment).values(
                "student_id"
            )
            enrollments = Enrollment.objects.filter(
                offering=assignment.offering,
                active=True,
                student__is_active=True,
                student__notify_academic=True,
                student__membership__institute=assignment.institute,
                student__membership__active=True,
            ).exclude(student_id__in=submitted)
            for enrollment in enrollments:
                _, added = Notification.objects.get_or_create(
                    institute=assignment.institute,
                    user=enrollment.student,
                    event_key=f"deadline:{assignment.pk}:{assignment.due_at.isoformat()}",
                    defaults={
                        "title": ("Due soon: " + assignment.title)[:180],
                        "destination": f"/assignments?offering={assignment.offering_id}",
                        "body": "Your assignment deadline is "
                        + assignment.due_at.isoformat(),
                    },
                )
                created += added
        self.stdout.write(f"Created {created} deadline reminders.")

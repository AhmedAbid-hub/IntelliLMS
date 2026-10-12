from datetime import date, timedelta, time
import random
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from apps.accounts.models import Institute, User, Membership, TeacherAppointment
from apps.academics.models import (
    Unit,
    Year,
    Term,
    Program,
    Section,
    Course,
    Offering,
    Enrollment,
    Timetable,
)
from apps.learning.models import (
    Module,
    Lesson,
    Completion,
    Assignment,
    Submission,
    Quiz,
    Question,
    Attempt,
    AttendanceSession,
    Attendance,
    Announcement,
    Notification,
)
from apps.insights.models import Activity

PASSWORD = "LearnTogether42!"


class Command(BaseCommand):
    help = (
        "Explicitly create fictional local demo accounts. Refuses production settings."
    )

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError(
                "Demo seeding requires DEBUG=True. Never seed production."
            )
        rng = random.Random(42)
        now = timezone.now()
        admin, created = User.objects.get_or_create(
            username="superadmin",
            defaults={
                "email": "superadmin@example.test",
                "is_superuser": True,
                "is_staff": True,
                "first_name": "Platform",
            },
        )
        if created:
            admin.set_password(PASSWORD)
            admin.save()
        for code, name, kind in [
            ("university", "Northstar University", "university"),
            ("school", "Willow International School", "school"),
            ("college", "Horizon College", "college"),
        ]:
            inst, created = Institute.objects.get_or_create(
                code=code,
                defaults={
                    "name": name,
                    "kind": kind,
                    "terminology": {
                        "term": "Semester" if kind == "university" else "Term"
                    },
                },
            )
            if not created:
                self.stdout.write(f"{code}: already seeded; left unchanged.")
                continue
            unit = Unit.objects.create(
                institute=inst,
                name="School of Computing" if kind == "university" else "Sciences",
                kind="department",
            )
            year = Year.objects.create(
                institute=inst,
                name=str(now.year),
                start=date(now.year, 1, 1),
                end=date(now.year, 12, 31),
            )
            term = Term.objects.create(
                institute=inst,
                year=year,
                name="Academic term",
                start=year.start,
                end=year.end,
            )
            program = Program.objects.create(
                institute=inst,
                unit=unit,
                name={
                    "university": "BS Computer Science",
                    "school": "Grade 9",
                    "college": "Intermediate Science",
                }[kind],
            )
            section = Section.objects.create(
                institute=inst, program=program, name="Section A"
            )
            users = {}
            for role, first in [
                ("admin", "Samira"),
                ("head", "Omar"),
                ("teacher", "Amina"),
            ]:
                user = User.objects.create_user(
                    username=f"{code}.{role}",
                    email=f"{code}.{role}@example.test",
                    password=PASSWORD,
                    first_name=first,
                    last_name="Demo",
                )
                Membership.objects.create(
                    institute=inst, user=user, role=role, unit=unit
                )
                users[role] = user
            students = []
            for i, first in enumerate(
                [
                    "Zara",
                    "Ayaan",
                    "Maya",
                    "Rohan",
                    "Nora",
                    "Leo",
                    "Sara",
                    "Adam",
                    "Hana",
                    "Noah",
                    "Lina",
                    "Arun",
                ]
            ):
                username = f"{code}.student" if i == 0 else f"{code}.student{i+1}"
                user = User.objects.create_user(
                    username=username,
                    email=username + "@example.test",
                    password=PASSWORD,
                    first_name=first,
                    last_name="Demo",
                )
                Membership.objects.create(
                    institute=inst, user=user, role="student", unit=unit
                )
                students.append(user)
            names = (
                [
                    "Introduction to Computing",
                    "Applied Mathematics",
                    "Scientific Writing",
                ]
                if kind == "university"
                else ["Mathematics", "General Science", "English Language"]
            )
            for index, title in enumerate(names):
                course = Course.objects.create(
                    institute=inst,
                    unit=unit,
                    code=f"CS{101+index}",
                    name=title,
                    description="A practical introduction with guided exercises, discussions and regular feedback.",
                )
                offering = Offering.objects.create(
                    institute=inst,
                    course=course,
                    term=term,
                    section=section,
                    title=title + " · A",
                )
                offering.teachers.add(users["teacher"])
                TeacherAppointment.objects.get_or_create(institute=inst, membership=Membership.objects.get(institute=inst, user=users["teacher"]), unit=unit, defaults={"reason": "Explicit fictional demo teaching appointment"})
                for student in students:
                    Enrollment.objects.create(
                        institute=inst, offering=offering, student=student
                    )
                module = Module.objects.create(
                    institute=inst, offering=offering, title="Foundations", position=1
                )
                lessons = []
                for j, lesson_title in enumerate(
                    [
                        "Welcome and learning outcomes",
                        "Core concepts",
                        "Worked examples",
                        "Practice and reflection",
                    ]
                ):
                    lessons.append(
                        Lesson.objects.create(
                            institute=inst,
                            offering=offering,
                            module=module,
                            title=lesson_title,
                            position=j,
                            published=True,
                            body=f"{title}\n\nIn this lesson, connect the core ideas to a practical problem. Read the explanation, write down your reasoning, and compare approaches.\n\nLearning objectives\n• Explain the central concept in your own words.\n• Apply it to a new example.\n• Identify one question to discuss in class.",
                        )
                    )
                assignments = []
                for j in range(3):
                    assignments.append(
                        Assignment.objects.create(
                            institute=inst,
                            offering=offering,
                            title=[
                                "Foundations reflection",
                                "Practical exercise",
                                "Independent project",
                            ][j],
                            description="Explain your approach, show your work, and reflect on what you learned. Submit a written answer or a PDF.",
                            published=True,
                            due_at=now + timedelta(days=3 + j * 4),
                            allow_late=True,
                        )
                    )
                quiz = Quiz.objects.create(
                    institute=inst,
                    offering=offering,
                    title="Foundations check",
                    published=True,
                    opens_at=now - timedelta(days=5),
                    closes_at=now + timedelta(days=30),
                    minutes=20,
                    attempt_limit=2,
                    released=True,
                )
                question = Question.objects.create(
                    institute=inst,
                    quiz=quiz,
                    prompt="Which approach best supports learning a new concept?",
                    kind="mcq",
                    options=[
                        "Practice with feedback",
                        "Memorize without practice",
                        "Skip reflection",
                    ],
                    answer="Practice with feedback",
                    marks=5,
                )
                Question.objects.create(
                    institute=inst,
                    quiz=quiz,
                    prompt="Reviewing feedback can improve your next attempt.",
                    kind="boolean",
                    answer="true",
                    marks=5,
                )
                for n, student in enumerate(students):
                    for lesson in lessons[: rng.randint(1, 4)]:
                        Completion.objects.create(
                            institute=inst, lesson=lesson, student=student
                        )
                        Activity.objects.create(
                            institute=inst,
                            user=student,
                            offering=offering,
                            kind="lesson_complete",
                        )
                    for assignment in assignments[:2]:
                        Submission.objects.create(
                            institute=inst,
                            assignment=assignment,
                            student=student,
                            text="Fictional demonstration answer: I worked through the example and checked my reasoning.",
                            marks=rng.randint(35, 96),
                            feedback="Review the worked examples and explain each step clearly.",
                            released=True,
                        )
                        Activity.objects.create(
                            institute=inst,
                            user=student,
                            offering=offering,
                            kind="assignment_submit",
                        )
                    if n > 0:
                        attempt = Attempt.objects.create(
                            institute=inst,
                            quiz=quiz,
                            student=student,
                            deadline=now - timedelta(days=1),
                            submitted_at=now - timedelta(days=1, minutes=5),
                            answers={str(question.id): "Practice with feedback"},
                            marks=5,
                        )
                        Attempt.objects.filter(pk=attempt.pk).update(
                            started_at=now - timedelta(days=1, minutes=20)
                        )
                for d in range(5):
                    session = AttendanceSession.objects.create(
                        institute=inst,
                        offering=offering,
                        date=now.date() - timedelta(days=d + 1),
                    )
                    for student in students:
                        Attendance.objects.create(
                            institute=inst,
                            session=session,
                            student=student,
                            status=rng.choice(
                                ["present", "present", "present", "late", "absent"]
                            ),
                        )
                Timetable.objects.create(
                    institute=inst,
                    offering=offering,
                    day=index,
                    start=time(9 + index, 0),
                    end=time(10 + index, 0),
                    location=f"Room {201+index}",
                )
            Announcement.objects.create(
                institute=inst,
                title="Welcome to your learning community",
                body="Explore your courses, review upcoming assignments, and use feedback to plan your next steps. All records in this local demo are fictional.",
                published=True,
            )
            for student in students:
                Notification.objects.create(
                    institute=inst,
                    user=student,
                    title="Your courses are ready",
                    body="Open My courses to begin your first lesson.",
                )
        self.stdout.write(
            self.style.SUCCESS(
                "Demo ready. Password for newly created accounts: " + PASSWORD
            )
        )

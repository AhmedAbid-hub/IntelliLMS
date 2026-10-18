from pathlib import Path
from zipfile import ZipFile, BadZipFile
from xml.etree import ElementTree
from rest_framework import serializers
from apps.academics.serializers import TenantSerializer
from apps.accounts.scope import Scope
from .models import (
    Lesson,
    Material,
    Assignment,
    Submission,
    Quiz,
    Question,
    Attendance,
    AttendanceSession,
    Announcement,
    ManualGrade,
    BankQuestion,
)
from apps.academics.models import Enrollment


def validate_upload(file):
    suffix = Path(file.name).suffix.lower()
    allowed = {
        ".pdf": ["application/pdf"],
        ".txt": ["text/plain"],
        ".png": ["image/png"],
        ".jpg": ["image/jpeg"],
        ".jpeg": ["image/jpeg"],
        ".docx": [
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
    }
    if suffix not in allowed or file.size > 10 * 1024 * 1024:
        raise serializers.ValidationError(
            "Allowed: PDF, TXT, PNG, JPEG, DOCX; maximum 10 MB."
        )
    if getattr(file, "content_type", None) not in allowed[suffix]:
        raise serializers.ValidationError(
            "File content type does not match its extension."
        )
    header = file.read(8)
    file.seek(0)
    magic = {
        ".pdf": b"%PDF-",
        ".png": b"\x89PNG\r\n\x1a\n",
        ".jpg": b"\xff\xd8\xff",
        ".jpeg": b"\xff\xd8\xff",
        ".docx": b"PK\x03\x04",
    }
    if suffix in magic and not header.startswith(magic[suffix]):
        raise serializers.ValidationError("Invalid file signature.")
    if suffix == ".docx":
        try:
            with ZipFile(file) as archive:
                entries = archive.infolist()
                names = {entry.filename for entry in entries}
                if (
                    len(entries) > 1000
                    or len(names) != len(entries)
                    or sum(entry.file_size for entry in entries) > 50 * 1024 * 1024
                    or not {"[Content_Types].xml", "word/document.xml"}.issubset(names)
                ):
                    raise ValueError()
                for entry in entries:
                    parts = entry.filename.replace("\\", "/").split("/")
                    if (
                        entry.flag_bits & 1
                        or ".." in parts
                        or entry.filename.startswith(("/", "\\"))
                        or ":" in entry.filename
                        or "vbaproject" in entry.filename.lower()
                        or Path(entry.filename).suffix.lower()
                        in {".exe", ".dll", ".js", ".vbs", ".bat", ".cmd"}
                    ):
                        raise ValueError()
                for name in ["[Content_Types].xml", "word/document.xml"]:
                    if archive.getinfo(name).file_size > 10 * 1024 * 1024:
                        raise ValueError()
                    raw = archive.read(name)
                    if b"<!DOCTYPE" in raw or b"<!ENTITY" in raw:
                        raise ValueError()
                    root = ElementTree.fromstring(raw)
                    if (
                        name == "word/document.xml"
                        and root.tag
                        != "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document"
                    ):
                        raise ValueError()
        except (BadZipFile, KeyError, ValueError, ElementTree.ParseError, RuntimeError):
            raise serializers.ValidationError(
                "Invalid or unsafe DOCX document structure."
            )
        finally:
            file.seek(0)
    return file


class LearningSerializer(TenantSerializer):
    def get_fields(self):
        fields = super().get_fields()
        if "finalized" in fields:
            fields["finalized"].read_only = True
        if self.Meta.model == Quiz:
            fields["has_attempts"] = serializers.SerializerMethodField()
        return fields

    def get_has_attempts(self, obj) -> bool:
        if Scope(self.context["request"]).role == "student":
            return False
        return obj.attempt_set.exists()

    def validate(self, attrs):
        attrs = super().validate(attrs)

        def val(k, d=None):
            return attrs.get(k, getattr(self.instance, k, d))

        model = self.Meta.model
        scope = Scope(self.context["request"])
        if model == AttendanceSession and (not self.instance or "date" in attrs and attrs["date"] != self.instance.date):
            period = val("offering").term
            if not period.start <= val("date") <= period.end:
                raise serializers.ValidationError({"date": "Attendance date must lie within the course's academic period."})
        if "file" in attrs:
            validate_upload(attrs["file"])
        if model in [Lesson, Material]:
            related = val("module") if model == Lesson else val("lesson")
            if related and related.offering_id != val("offering").id:
                raise serializers.ValidationError(
                    "Content must belong to the same offering."
                )
        if model == Assignment and val("max_marks", 100) < 1:
            raise serializers.ValidationError("Marks must be positive.")
        if (
            model == Assignment
            and self.instance
            and self.instance.submission_set.exists()
            and "max_marks" in attrs
        ):
            if attrs["max_marks"] != self.instance.max_marks:
                raise serializers.ValidationError(
                    "Maximum marks are locked after submissions."
                )
        if model == Quiz:
            if val("opens_at") >= val("closes_at"):
                raise serializers.ValidationError("Quiz close must follow opening.")
            if val("minutes", 30) < 1 or val("attempt_limit", 1) < 1:
                raise serializers.ValidationError(
                    "Time and attempt limit must be positive."
                )
            if (
                self.instance
                and self.instance.attempt_set.exists()
                and set(attrs) - {"released"}
            ):
                raise serializers.ValidationError(
                    "Only release status can change after attempts begin."
                )
        if model in [Question, BankQuestion]:
            if model == Question:
                quiz = val("quiz")
                scope.check_offering(quiz.offering, write=True)
                if quiz.attempt_set.exists():
                    raise serializers.ValidationError(
                        "Questions are locked after attempts begin."
                    )
            elif (
                scope.role in ["head", "teacher"]
                and val("unit")
                and val("unit").pk != scope.membership.unit_id
            ):
                raise serializers.ValidationError(
                    "Question bank unit must match your assigned academic unit."
                )
            if val("marks", 1) < 1:
                raise serializers.ValidationError("Marks must be positive.")
            options = val("options", [])
            if not isinstance(options, list) or len(options) > 20 or any(not isinstance(option, str) or not option.strip() or len(option) > 2000 for option in options):
                raise serializers.ValidationError({"options": "Use at most 20 non-empty text choices, each up to 2,000 characters."})
            if len(set(options)) != len(options):
                raise serializers.ValidationError({"options": "Answer choices must be unique."})
            if val("kind") == "mcq" and (
                not isinstance(val("options", []), list)
                or len(val("options", [])) < 2
                or val("answer") not in val("options")
            ):
                raise serializers.ValidationError(
                    "MCQ needs at least two choices and a matching answer."
                )
            if val("kind") == "boolean" and val("answer") not in ["true", "false"]:
                raise serializers.ValidationError(
                    "Boolean answer must be true or false."
                )
        if model == Announcement:
            if scope.role == "head" and (
                not val("unit") or val("unit").id != scope.membership.unit_id
            ):
                raise serializers.ValidationError(
                    "Department heads must select their unit."
                )
            if scope.role == "teacher" and not val("offering"):
                raise serializers.ValidationError(
                    "Teachers must select an assigned course offering."
                )
            if (
                val("unit")
                and val("offering")
                and val("offering").course.unit_id != val("unit").id
            ):
                raise serializers.ValidationError(
                    "Announcement unit and offering do not match."
                )
        if model == ManualGrade:
            if not Enrollment.objects.filter(
                offering=val("offering"), student=val("student"), active=True
            ).exists():
                raise serializers.ValidationError(
                    "Student must be actively enrolled in this offering."
                )
            if (
                val("max_marks", 100) < 1
                or val("marks") < 0
                or val("marks") > val("max_marks", 100)
            ):
                raise serializers.ValidationError(
                    "Marks must be within the assessment maximum."
                )
        return attrs

    def to_representation(self, obj):
        data = super().to_representation(obj)
        role = Scope(self.context["request"]).role
        if isinstance(obj, Material):
            data["file"] = f"/api/v1/materials/{obj.id}/download/"
        if isinstance(obj, Assignment):
            data["file"] = (
                f"/api/v1/assignments/{obj.id}/download/" if obj.file else None
            )
        if isinstance(obj, Quiz) and role == "student":
            data.pop("has_attempts", None)
        if isinstance(obj, Submission):
            data["file"] = (
                f"/api/v1/submissions/{obj.id}/download/" if obj.file else None
            )
            if role == "student" and not obj.released:
                data["marks"] = None
                data["feedback"] = ""
        if isinstance(obj, Question) and role == "student":
            data.pop("answer", None)
        return data

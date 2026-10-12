import re
from smtplib import SMTPException
from unittest.mock import patch

import pytest
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework.test import APIClient

from apps.accounts.models import Membership, User
from apps.academics.models import Course, Program, Section, Unit
from apps.learning.models import Module


@pytest.mark.django_db
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
def test_invitation_acceptance_password_replay_and_disabled_account(world, client_for, django_capture_on_commit_callbacks):
    cache.clear()
    admin = client_for(world["a"], "admin")
    with django_capture_on_commit_callbacks(execute=True):
        response = admin.post("/api/v1/memberships/", {
            "username": "invited-student", "email": "invited@example.test", "role": "student",
        }, format="json")
        assert len(mail.outbox) == 0  # Email never precedes commit.
    assert response.status_code == 201
    user = User.objects.get(username="invited-student")
    assert len(mail.outbox) == 1
    uid, token = re.search(r"/reset/([^/\s]+)/([^/\s]+)", mail.outbox[0].body).groups()
    anonymous = APIClient(enforce_csrf_checks=True)
    anonymous.get("/api/v1/auth/csrf/")
    headers = {"HTTP_X_CSRFTOKEN": anonymous.cookies["csrftoken"].value}
    data = {"uid": uid, "token": token, "new_password": "Invited-Complex-Password82!"}
    assert anonymous.post("/api/v1/auth/password-confirm/", data, format="json").status_code == 403
    assert anonymous.post("/api/v1/auth/password-confirm/", {**data, "new_password": "weak"}, format="json", **headers).status_code == 400
    assert anonymous.post("/api/v1/auth/password-confirm/", data, format="json", **headers).status_code == 200
    assert anonymous.post("/api/v1/auth/password-confirm/", data, format="json", **headers).status_code == 400
    assert anonymous.post("/api/v1/auth/login/", {"username": user.username, "password": data["new_password"]}, format="json", **headers).status_code == 200
    assert anonymous.get("/api/v1/auth/me/").data["institute_id"] == str(world["a"]["institute"].pk)
    user.is_active = False
    user.save(update_fields=["is_active"])
    assert anonymous.get("/api/v1/auth/me/").status_code == 403
    cache.clear()


@pytest.mark.django_db
def test_mail_failure_preserves_committed_invites_and_continues_csv(world, client_for, django_capture_on_commit_callbacks, caplog):
    admin = client_for(world["a"], "admin")
    csv = b"username,email,role\nmail-first,first@example.test,student\nmail-second,second@example.test,teacher\n"
    with patch("apps.accounts.auth.send_mail", side_effect=[SMTPException("private SMTP detail"), 1]) as send:
        with django_capture_on_commit_callbacks(execute=True):
            response = admin.post("/api/v1/memberships/import-csv/", {"file": SimpleUploadedFile("people.csv", csv, content_type="text/csv")}, format="multipart")
        assert response.status_code == 201
        assert response.data["created"] == 2 and send.call_count == 2
    assert Membership.objects.filter(institute=world["a"]["institute"], user__username__in=["mail-first", "mail-second"]).count() == 2
    assert "delivery failed" in caplog.text
    assert "private SMTP detail" not in caplog.text and "first@example.test" not in caplog.text
    with patch("apps.accounts.auth.send_mail", side_effect=OSError("private connection detail")):
        with django_capture_on_commit_callbacks(execute=True):
            response = admin.post("/api/v1/memberships/", {"username": "mail-third", "email": "third@example.test", "role": "student"}, format="json")
        assert response.status_code == 201
    # Same response for existing/missing accounts during an SMTP outage; retry recovers.
    cache.clear()
    anonymous = APIClient()
    with patch("apps.accounts.auth.send_mail", side_effect=SMTPException("unavailable")):
        known = anonymous.post("/api/v1/auth/password-reset/", {"email": "third@example.test"})
        unknown = anonymous.post("/api/v1/auth/password-reset/", {"email": "absent@example.test"})
    assert known.status_code == unknown.status_code == 200
    assert known.data == unknown.data
    with patch("apps.accounts.auth.send_mail", return_value=1) as send:
        assert anonymous.post("/api/v1/auth/password-reset/", {"email": "third@example.test"}).status_code == 200
        send.assert_called_once()
    cache.clear()


@pytest.mark.django_db
def test_head_reads_own_structure_but_admin_creates_offerings(world, client_for):
    a = world["a"]
    own_course = Course.objects.create(institute=a["institute"], unit=a["unit"], code="NEW", name="Unused course")
    own_program = Program.objects.create(institute=a["institute"], unit=a["unit"], name="New program")
    own_section = Section.objects.create(institute=a["institute"], program=own_program, name="New section")
    other_unit = Unit.objects.create(institute=a["institute"], name="Other department")
    other_course = Course.objects.create(institute=a["institute"], unit=other_unit, code="OTHER", name="Other course")
    other_program = Program.objects.create(institute=a["institute"], unit=other_unit, name="Other program")
    other_section = Section.objects.create(institute=a["institute"], program=other_program, name="Other section")
    head = client_for(a, "head")
    for endpoint, own, other in [("courses", own_course, other_course), ("programs", own_program, other_program), ("sections", own_section, other_section)]:
        response = head.get(f"/api/v1/{endpoint}/")
        assert str(own.pk) in {row["id"] for row in response.data["results"]}
        assert head.get(f"/api/v1/{endpoint}/{other.pk}/").status_code == 404
        assert client_for(a, "student").get(f"/api/v1/{endpoint}/{own.pk}/").status_code == 404
        assert client_for(world["b"], "head").get(f"/api/v1/{endpoint}/{own.pk}/").status_code == 404
    data = {"title": "First offering", "course": str(own_course.pk), "section": str(own_section.pk), "term": str(a["term"].pk), "teachers": [str(a["teacher"].pk)]}
    assert head.post("/api/v1/offerings/", data, format="json").status_code == 403
    assert client_for(a, "admin").post("/api/v1/offerings/", {**data, "teachers": []}, format="json").status_code == 201
    denied = head.post("/api/v1/offerings/", {**data, "course": str(other_course.pk), "section": str(other_section.pk)}, format="json")
    assert denied.status_code in [400, 403]


@pytest.mark.django_db
def test_module_position_order_is_used_and_updates_are_scoped(world, client_for):
    a = world["a"]
    modules = [Module.objects.create(institute=a["institute"], offering=a["offering"], title=f"Module {n}", position=n) for n in [2, 0, 1]]
    student = client_for(a, "student")
    assert [row["position"] for row in student.get("/api/v1/modules/").data["results"]] == [0, 1, 2]
    endpoint = f"/api/v1/modules/{modules[0].pk}/"
    assert student.patch(endpoint, {"position": 0}, format="json").status_code == 403
    assert client_for(world["b"], "teacher").patch(endpoint, {"position": 0}, format="json").status_code == 404
    assert client_for(a, "teacher").patch(endpoint, {"position": 0}, format="json").status_code == 200
    assert [row["position"] for row in student.get("/api/v1/modules/").data["results"]] == [0, 0, 1]

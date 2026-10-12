import pytest
from django.core.cache import cache
from rest_framework.test import APIClient
from apps.accounts.models import User


@pytest.mark.django_db
def test_malformed_auth_payloads_are_validation_errors(world, client_for):
    cache.clear()
    client = APIClient(enforce_csrf_checks=True)
    client.get("/api/v1/auth/csrf/")
    headers = {"HTTP_X_CSRFTOKEN": client.cookies["csrftoken"].value}
    invalid = [
        ("login", {"username": [], "password": "secret"}),
        ("login", {"username": "astudent", "password": {"object": True}}),
        ("password-reset", {"email": ["not-a-string"]}),
        (
            "password-confirm",
            {"uid": {}, "token": "token", "new_password": "A-strong-pass42!"},
        ),
        (
            "password-confirm",
            {"uid": "encoded", "token": ["invalid"], "new_password": None},
        ),
    ]
    for endpoint, data in invalid:
        assert (
            client.post(
                f"/api/v1/auth/{endpoint}/", data, format="json", **headers
            ).status_code
            == 400
        )
    signed = client_for(world["a"], "student")
    for data in [
        {"old_password": []},
        {"old_password": "Strong-demo-pass42!", "new_password": {}},
        {"old_password": "Strong-demo-pass42!", "new_password": "x" * 4097},
    ]:
        assert (
            signed.post(
                "/api/v1/auth/password-change/", data, format="json"
            ).status_code
            == 400
        )
    assert (
        signed.post(
            "/api/v1/auth/select-institute/", {"institute_id": {}}, format="json"
        ).status_code
        == 400
    )
    assert (
        signed.patch("/api/v1/auth/me/", {"first_name": 123}, format="json").status_code
        == 400
    )
    assert (
        signed.patch(
            "/api/v1/auth/me/",
            {"first_name": "Updated", "is_superuser": True},
            format="json",
        ).status_code
        == 200
    )
    world["a"]["student"].refresh_from_db()
    assert not world["a"]["student"].is_superuser
    assert world["a"]["student"].check_password("Strong-demo-pass42!")
    cache.clear()


@pytest.mark.django_db
def test_invitation_payloads_are_atomic_and_not_silently_truncated(world, client_for):
    admin = client_for(world["a"], "admin")
    data = {"username": "new-person", "email": "new@example.test", "role": "student"}
    for patch in [
        {"username": []},
        {"email": {}},
        {"first_name": {"bad": True}},
        {"first_name": "x" * 151},
        {"unit": "invalid"},
    ]:
        assert (
            admin.post(
                "/api/v1/memberships/", {**data, **patch}, format="json"
            ).status_code
            == 400
        )
        assert not User.objects.filter(username="new-person").exists()
    assert (
        client_for(world["a"], "student")
        .post("/api/v1/memberships/", data, format="json")
        .status_code
        == 403
    )
    response = admin.post(
        "/api/v1/memberships/", {**data, "first_name": "New person"}, format="json"
    )
    assert response.status_code == 201
    assert response.data["first_name"] == "New person" and response.data["active"]

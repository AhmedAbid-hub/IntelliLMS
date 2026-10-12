import pytest
from rest_framework.test import APIClient
from django.contrib.admin.models import LogEntry
from apps.accounts.models import User, PlatformConfiguration


@pytest.mark.django_db
def test_public_configuration_superadmin_write_validation_and_audit(world, client_for):
    anonymous = APIClient()
    url = "/api/v1/platform-settings/"
    assert anonymous.get(url).data["platform_name"] == "IntelliLMS"
    assert PlatformConfiguration.objects.count() == 0
    assert anonymous.patch(url, {"platform_name": "Bad"}).status_code == 403
    assert (
        client_for(world["a"], "admin").patch(url, {"platform_name": "Bad"}).status_code
        == 403
    )
    root = User.objects.create_superuser(
        username="settings-root", email="settings@test.invalid", password="secret"
    )
    client = client_for({**world["a"], "superadmin": root}, "superadmin")
    for data in [
        {"platform_name": ""},
        {"platform_name": "x" * 33},
        {"support_email": "invalid"},
        {"login_notice": "x" * 401},
    ]:
        assert client.patch(url, data, format="json").status_code == 400
    result = client.patch(
        url,
        {
            "platform_name": "Learning Network",
            "support_email": "help@example.test",
            "login_notice": "Contact your institute for access.",
        },
    )
    assert result.status_code == 200
    assert anonymous.get(url).data == result.data
    assert set(result.data) == {
        "platform_name",
        "support_email",
        "login_notice",
        "updated_at",
    }
    assert PlatformConfiguration.objects.count() == 1
    assert LogEntry.objects.get(object_repr="Platform configuration").user == root

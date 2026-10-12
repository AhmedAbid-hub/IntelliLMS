import pytest
from django.contrib.admin.models import LogEntry, CHANGE
from django.contrib.contenttypes.models import ContentType
from rest_framework.test import APIClient
from apps.accounts.models import User


@pytest.mark.django_db
def test_global_audit_permissions_pagination_and_filtering(world, client_for):
    root = User.objects.create_superuser(
        username="auditroot", password="Secure-pass42!"
    )
    entries = LogEntry.objects.bulk_create(
        [
            LogEntry(
                user=root,
                content_type=ContentType.objects.get_for_model(User),
                object_id=str(world["b"]["student"].pk),
                object_repr=f"Account {i}",
                action_flag=CHANGE,
                change_message="Active status changed",
            )
            for i in range(56)
        ]
    )
    url = "/api/v1/platform-audit/"
    assert APIClient().get(url).status_code == 403
    for role in ["admin", "head", "teacher", "student"]:
        client = client_for(world["a"], role)
        assert client.get(url).status_code == 403
        assert client.get(f"{url}{entries[0].pk}/").status_code == 403
    client = APIClient()
    client.force_login(
        root
    )  # Global events can be reviewed without selecting an institute.
    response = client.get(url)
    assert response.status_code == 200
    assert response.data["count"] == 56
    assert len(response.data["results"]) < 56
    second = client.get(response.data["next"])
    assert second.status_code == 200
    assert not (
        {row["id"] for row in response.data["results"]}
        & {row["id"] for row in second.data["results"]}
    )
    assert (
        client.get(
            url + "?search=Account%2055&action_flag=2&content_type__model=user"
        ).data["count"]
        == 1
    )
    assert client.get(url + "?action_flag=1").data["count"] == 0
    assert client.get(url + "?action_flag=invalid").status_code == 400
    row = response.data["results"][0]
    assert row["actor"] == "auditroot" and row["model"] == "user"
    assert set(row) == {
        "id",
        "action_time",
        "actor",
        "action",
        "model",
        "object_repr",
        "change_message",
    }
    detail = f"{url}{entries[0].pk}/"
    assert (
        client.patch(detail, {"change_message": "tampered"}, format="json").status_code
        == 405
    )
    assert client.delete(detail).status_code == 405

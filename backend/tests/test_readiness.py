from unittest.mock import patch
from django.db import OperationalError
import pytest


@pytest.mark.django_db
def test_readiness_checks_database_and_hides_errors(client):
    assert client.get("/ready/").json() == {"status": "ready"}
    with patch(
        "config.health.connection.cursor",
        side_effect=OperationalError("private database hostname"),
    ):
        response = client.get("/ready/")
    assert response.status_code == 503
    assert response.json() == {"status": "unavailable"}
    assert client.get("/health/").status_code == 200

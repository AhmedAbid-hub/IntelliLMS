import csv
import io
from unittest.mock import patch

import pytest
from apps.accounts.models import User
from apps.academics.models import Enrollment
from apps.insights.gradebook import gradebook
from apps.insights.models import Prediction


@pytest.mark.django_db
def test_grade_pages_filters_stream_and_tenant_scope(world, client_for):
    a = world["a"]
    users = User.objects.bulk_create(
        [
            User(username=f"learner{i:03}", email=f"learner{i}@test.invalid")
            for i in range(105)
        ]
    )
    Enrollment.objects.bulk_create(
        [
            Enrollment(institute=a["institute"], offering=a["offering"], student=user)
            for user in users
        ]
    )
    client = client_for(a, "teacher")
    first = client.get("/api/v1/grades/").data
    second = client.get("/api/v1/grades/?page=2").data
    assert first["count"] == 106
    assert len(first["results"]) == len(second["results"]) == 25
    assert not (
        {row["student"] for row in first["results"]}
        & {row["student"] for row in second["results"]}
    )
    assert len(client.get("/api/v1/analytics/").data["gradebook"]) == 5
    assert client_for(a, "student").get("/api/v1/grades/").data["count"] == 1
    for parameter in ["offering", "term", "unit", "student"]:
        response = client.get(
            "/api/v1/grades/", {parameter: str(world["b"][parameter].pk)}
        )
        assert response.data["count"] == 0
    assert client.get("/api/v1/grades/?search=learner104").data["count"] == 1
    for query in ["offering=bad", "page_size=101", "page=0", "archived=bad"]:
        assert client.get("/api/v1/grades/?" + query).status_code == 400
    a["offering"].title = '=HYPERLINK("bad")'
    a["offering"].save()
    with patch("apps.insights.gradebook.gradebook", wraps=gradebook) as build:
        response = client.get("/api/v1/reports/")
        assert response.streaming
        body = b"".join(response.streaming_content).decode()
        rows = list(csv.DictReader(io.StringIO(body)))
        assert len(rows) == 106
        assert all(row["offering_label"].startswith("'=") for row in rows)
        assert max(len(call.args[1]) for call in build.call_args_list) <= 100
    response = client.get("/api/v1/reports/?search=learner104")
    assert (
        len(
            list(
                csv.DictReader(
                    io.StringIO(b"".join(response.streaming_content).decode())
                )
            )
        )
        == 1
    )


@pytest.mark.django_db
def test_prediction_history_pagination_and_authorization(world, client_for):
    for data, count in [(world["a"], 103), (world["b"], 2)]:
        Prediction.objects.bulk_create(
            [
                Prediction(
                    institute=data["institute"],
                    offering=data["offering"],
                    student=data["student"],
                    probability=0.5,
                    category="moderate",
                    version="test",
                    features={},
                    warning="test",
                )
                for _ in range(count)
            ]
        )
    client = client_for(world["a"], "teacher")
    first = client.get("/api/v1/predictions/").data
    last = client.get("/api/v1/predictions/?page=5").data
    assert first["count"] == 103
    assert len(first["results"]) == 25
    assert len(last["results"]) == 3
    assert last["next"] is None
    assert (
        client.get(
            "/api/v1/predictions/", {"offering": str(world["b"]["offering"].pk)}
        ).data["count"]
        == 0
    )
    assert client.get("/api/v1/predictions/?student=invalid").status_code == 400
    offering = world["a"]["offering"]
    offering.archived = True
    offering.save()
    assert client.get("/api/v1/predictions/").data["count"] == 103
    assert client.get("/api/v1/predictions/?archived=false").data["count"] == 0
    assert client.get("/api/v1/predictions/?archived=true").data["count"] == 103
    assert (
        client.post(
            "/api/v1/predictions/", {"student": [], "offering": {}}, format="json"
        ).status_code
        == 400
    )
    assert (
        client_for(world["a"], "student").get("/api/v1/predictions/").status_code == 403
    )

import pytest
from apps.accounts.models import User, Membership
from apps.academics.models import Enrollment
from apps.insights.models import Audit


@pytest.mark.django_db
def test_bulk_enrollment_is_idempotent_scoped_and_preserves_withdrawals(world, client_for):
    a = world["a"]
    admin = client_for(a, "admin")
    new = User.objects.create_user(username="new-student", email="new-student@example.test")
    Membership.objects.create(institute=a["institute"], user=new, role="student", unit=a["unit"], student_identifier="ST002")
    url = f"/api/v1/offerings/{a['offering'].pk}/bulk-enrollment/"
    data = {"students": [str(new.pk), str(world["b"]["student"].pk)], "operation": "enroll", "reason": "New term admissions"}
    assert admin.post(url, data, format="json").status_code == 400
    assert not Enrollment.objects.filter(student=new).exists()
    data["students"] = [str(new.pk), str(a["student"].pk)]
    for role in ["teacher", "student"]:
        assert client_for(a, role).post(url, data, format="json").status_code == 403
    assert client_for(world["b"], "admin").post(url, data, format="json").status_code == 404
    response = admin.post(url, data, format="json")
    assert response.status_code == 200 and response.data == {"changed": 1, "unchanged": 1}
    assert admin.post(url, data, format="json").data == {"changed": 0, "unchanged": 2}
    data["operation"] = "withdraw"
    assert admin.post(url, data, format="json").data["changed"] == 2
    assert Enrollment.objects.filter(offering=a["offering"]).count() == 2
    assert not Enrollment.objects.filter(offering=a["offering"], active=True).exists()
    assert client_for(a, "student").get("/api/v1/offerings/").data["count"] == 0
    data["operation"] = "reactivate"
    assert admin.post(url, data, format="json").data["changed"] == 2
    assert Audit.objects.filter(action="Enrollment.bulk_reactivate").exists()
    candidates = admin.get(f"/api/v1/offerings/{a['offering'].pk}/enrollment-candidates/?search=ST002").data
    assert candidates["count"] == 1 and candidates["results"][0]["enrollment_active"] is True
    assert client_for(a, "teacher").get(f"/api/v1/offerings/{a['offering'].pk}/enrollment-candidates/").status_code == 403


@pytest.mark.django_db
def test_historical_course_and_enrollment_cannot_be_deleted(world, client_for):
    a = world["a"]
    admin = client_for(a, "admin")
    enrollment = Enrollment.objects.get(offering=a["offering"], student=a["student"])
    assert admin.delete(f"/api/v1/offerings/{a['offering'].pk}/").status_code == 400
    assert admin.delete(f"/api/v1/enrollments/{enrollment.pk}/").status_code == 400
    assert Enrollment.objects.filter(pk=enrollment.pk).exists()

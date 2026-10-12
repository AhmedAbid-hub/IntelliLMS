import pytest
from apps.accounts.models import User, Membership
from apps.academics.models import Offering, Course, Unit, Enrollment


@pytest.mark.django_db
def test_workload_pagination_scope_counts_and_filters(world, client_for):
    a, b = world["a"], world["b"]
    # The same learner appears in two courses and must count only once.
    extra = Offering.objects.create(
        institute=a["institute"],
        course=a["course"],
        term=a["term"],
        title="Second",
        archived=True,
    )
    extra.teachers.add(a["teacher"])
    Enrollment.objects.create(
        institute=a["institute"], offering=extra, student=a["student"]
    )
    Enrollment.objects.create(
        institute=a["institute"], offering=extra, student=a["admin"], active=False
    )
    for i in range(27):
        teacher = User.objects.create(
            username=f"extra_teacher_{i:02}", email=f"extra{i}@example.test"
        )
        Membership.objects.create(
            institute=a["institute"], user=teacher, unit=a["unit"], role="teacher"
        )
        a["offering"].teachers.add(teacher)
    unit = Unit.objects.create(institute=a["institute"], name="Hidden department")
    course = Course.objects.create(
        institute=a["institute"], unit=unit, code="HIDDEN", name="Hidden"
    )
    other = Offering.objects.create(
        institute=a["institute"], course=course, term=a["term"], title="Hidden"
    )
    other.teachers.add(a["admin"])
    url = "/api/v1/analytics/workload/"
    assert client_for(a, "student").get(url).status_code == 403
    head = client_for(a, "head")
    response = head.get(url)
    assert response.status_code == 200 and response.data["count"] == 28
    assert len(response.data["results"]) == 25
    assert len(head.get(url + "?page=2").data["results"]) == 3
    assert head.get(url + "?search=extra_teacher_26").data["count"] == 1
    assert head.get(url + f"?unit={unit.pk}").data["count"] == 0
    assert head.get(url + f"?term={b['term'].pk}").data["count"] == 0
    assert client_for(a, "admin").get(url).data["count"] == 29
    teacher = client_for(a, "teacher")
    row = teacher.get(url).data["results"][0]
    assert teacher.get(url).data["count"] == 1
    assert row["teacher"] == "ateacher" and row["courses"] == 2 and row["learners"] == 1
    assert teacher.get(url + "?archived=false").data["results"][0]["courses"] == 1
    assert teacher.get("/api/v1/grades/").data["count"] == 2
    assert teacher.get("/api/v1/grades/?archived=false").data["count"] == 1
    assert teacher.get("/api/v1/grades/?archived=true").data["count"] == 1
    for query in [
        "page=0",
        "page_size=101",
        "term=invalid",
        "archived=invalid",
        "search=" + "x" * 121,
    ]:
        assert head.get(url + "?" + query).status_code == 400
    preview = head.get("/api/v1/analytics/trends/").data
    assert len(preview["instructor_workload"]) == 5
    assert preview["instructor_workload_preview_limit"] == 5

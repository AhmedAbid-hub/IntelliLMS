import { test, expect, type Page } from "@playwright/test";
import { chooseRelation } from "./helpers";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(`college.${role}`);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
async function write(page: Page, path: string, data: unknown, method = "POST") {
  const csrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === "csrftoken",
  )!.value;
  return page.request.fetch(`/api/v1/${path}/`, {
    method,
    data,
    headers: { "X-CSRFToken": csrf },
  });
}

test("academic protection policy saves with a reason and requires an independent correction", async ({
  page,
}) => {
  await login(page, "admin");
  const identity = await (await page.request.get("/api/v1/auth/me/")).json();
  const institute = await (
    await page.request.get(`/api/v1/institutes/${identity.institute_id}/`)
  ).json();
  await page.goto("/institute-settings");
  await page
    .getByLabel("Require an audited correction for released grades")
    .check();
  await page.getByLabel(/Attendance editing window/).fill("7");
  await page
    .getByLabel("Reason for protection policy change")
    .fill("Reviewed institution protection policy");
  await page.getByRole("button", { name: "Save institute settings" }).click();
  await expect(
    page.getByText("Settings saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "teacher");
  const offerings = await (await page.request.get("/api/v1/offerings/")).json();
  const course = offerings.results[0];
  const enrollments = await (
    await page.request.get(
      `/api/v1/enrollments/?offering=${course.id}&active=true`,
    )
  ).json();
  const title = `Policy review ${Date.now()}`;
  const created = await write(page, "manual-grades", {
    offering: course.id,
    student: enrollments.results[0].student,
    title,
    marks: 40,
    max_marks: 100,
    released: true,
  });
  expect(created.status()).toBe(201);
  const grade = await created.json();
  expect(
    (
      await write(page, `manual-grades/${grade.id}`, { marks: 90 }, "PATCH")
    ).status(),
  ).toBe(400);
  await page.goto(`/manual-grades?offering=${course.id}`);
  await page
    .getByRole("row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Request correction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "Institute policy protects released grades",
  );
  await page.getByLabel("Proposed marks").fill("55.50");
  await page.getByLabel("Reason for this academic action").fill(title);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Request correction", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Correction requested");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "admin");
  await page.goto(`/offerings?search=${encodeURIComponent(course.title)}`);
  await page.getByRole("button", {name: `Edit ${course.title}`, exact: true}).click();
  await page.getByRole("checkbox", {name: "Delegate grade and attendance correction review to this course's Department Head"}).check();
  await page.getByRole("button", {name: "Save changes", exact: true}).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "head");
  await page.goto("/academic-reviews");
  await page
    .getByRole("row")
    .filter({ hasText: title })
    .getByRole("button", { name: "Review request" })
    .click();
  await page
    .getByLabel("Decision reason")
    .fill("Independently checked original work");
  await page
    .getByRole("button", { name: "Approve correction", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const saved = await (
    await page.request.get(`/api/v1/manual-grades/${grade.id}/`)
  ).json();
  expect(saved.marks).toBe("55.50");
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "admin");
  expect((await write(page, `offerings/${course.id}`, { head_correction_review: course.head_correction_review }, "PATCH")).ok()).toBe(true);
  expect(
    (
      await write(
        page,
        `institutes/${institute.id}`,
        {
          grading_rules: institute.grading_rules,
          terminology: institute.terminology,
          policy_change_reason: "Restore isolated acceptance fixture policy",
        },
        "PATCH",
      )
    ).ok(),
  ).toBe(true);
});

test("course comparisons offer scoped filters, sorting, workspace links and a usable mobile table", async ({
  page,
}) => {
  await login(page, "teacher");
  await page.goto("/analytics");
  await page
    .getByRole("button", { name: "Compare courses", exact: true })
    .click();
  await expect(page.getByRole("table")).toBeVisible();
  const region = page.getByRole("region", { name: "Course comparisons" });
  await expect(region).toContainText(
    "not weighted course grades or model estimates",
  );
  await page.getByLabel("Sort courses").selectOption("-learners");
  await expect(page.getByLabel("Study year number")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Academic year", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Sort courses").scrollIntoViewIfNeeded();
  await expect(page.getByLabel("Sort courses")).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await region.getByRole("link").first().click();
  await expect(
    page.getByRole("tablist", { name: "Course content" }),
  ).toBeVisible();
});

test("teacher and enrolled student inspect recorded learner progress and missing assignments", async ({
  page,
}) => {
  await login(page, "teacher");
  const course = (await (await page.request.get("/api/v1/offerings/")).json())
    .results[0];
  const title = `Missing work ${Date.now()}`;
  expect(
    (
      await write(page, "assignments", {
        offering: course.id,
        title,
        due_at: new Date(Date.now() - 86400000).toISOString(),
        published: true,
      })
    ).status(),
  ).toBe(201);
  await page.goto(`/course/${course.id}`);
  await page
    .getByRole("tab", { name: "Learner progress", exact: true })
    .click();
  const roster = (
    await (
      await page.request.get(
        `/api/v1/enrollments/?offering=${course.id}&search=college.student`,
      )
    ).json()
  ).results;
  const learner = roster.find(
    (row: { student_label: string }) => row.student_label === "college.student",
  );
  expect(learner).toBeTruthy();
  await chooseRelation(page, "Enrolled learner", "college.student");
  await page.getByLabel("Only overdue missing assignments").check();
  await expect(page.getByRole("row").filter({ hasText: title })).toContainText(
    "Discuss the missed deadline",
  );
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "student");
  await page.goto(`/course/${course.id}`);
  await page.getByRole("tab", { name: "My progress", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Enrolled learner", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Only overdue missing assignments").check();
  await expect(page.getByRole("row").filter({ hasText: title })).toContainText(
    "No released grade",
  );
});

import { test, expect } from "@playwright/test";
import { chooseRelation } from "./helpers";
import { password, login, logout, write, activate } from "./lifecycle-helpers";

for (const kind of ["college", "university"] as const) {
test(`fresh ${kind} connects invitations, teaching, admission, assessment, transfer and progression`, async ({
  page,
}) => {
  test.setTimeout(240000);
  page.setDefaultTimeout(15000);
  const stamp = Date.now(),
    prefix = `fresh-${stamp}`;
  const adminName = `${prefix}-admin`,
    headName = `${prefix}-head`,
    teacherName = `${prefix}-teacher`,
    studentName = `${prefix}-student`;
  await login(page, "superadmin", "LearnTogether42!");
  await page.goto("/institutes");
  await page.getByRole("button", { name: "Add new" }).click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill(`Fresh Learning Institute ${stamp}`);
  await page.getByLabel("Unique code").fill(prefix);
  await page.getByRole("combobox", { name: "Type", exact: true }).selectOption(kind);
  const instituteSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/institutes/") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Create record" }).click();
  const instituteResponse = await instituteSaved;
  expect(instituteResponse.status()).toBe(201);
  const institute = await instituteResponse.json();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await write(page, "memberships", {
    institute: institute.id,
    username: adminName,
    email: `${adminName}@example.test`,
    role: "admin",
  });
  expect((await page.request.get("/api/v1/offerings/")).status()).toBe(403);
  await logout(page);
  await activate(page, adminName);
  await expect(
    page.getByRole("heading", { name: "Institute overview", exact: true }),
  ).toBeVisible();
  await page.goto("/institute-settings");
  await page.getByRole("button", { name: "Save institute settings" }).click();
  await expect(
    page.getByText("Settings saved.", { exact: true }),
  ).toBeVisible();

  // Provision this journey's hierarchy through the authenticated browser API.
  // Dedicated setup/admission specs also exercise every corresponding form.
  const unit = await write(page, "units", { name: "Learning department" });
  const program = await write(page, "programs", {
    name: "Skills certificate",
    unit: unit.id,
    duration_terms: 2,
  });
  const year = await write(page, "years", {
    name: "2026",
    start: "2026-01-01",
    end: "2026-12-31",
  });
  const term = await write(page, "terms", {
    name: "Learning period",
    year: year.id,
    start: "2026-01-01",
    end: "2026-12-31",
  });
  const subject = await write(page, "courses", {
    name: "Reasoning",
    code: "RS101",
    credit_hours: 3,
    unit: unit.id,
  });
  await write(page, "curriculum", {
    program: program.id,
    course: subject.id,
    stage: 1,
  });
  const batch = await write(page, "batches", {
    program: program.id,
    year: year.id,
    name: "First intake",
  });
  const section = await write(page, "sections", {
    program: program.id,
    batch: batch.id,
    name: "Group A",
  });
  const sectionB = await write(page, "sections", {
    program: program.id,
    batch: batch.id,
    name: "Group B",
  });
  const course = await write(page, "offerings", {
    title: "Reasoning A",
    course: subject.id,
    term: term.id,
    section: section.id,
  });
  const courseB = await write(page, "offerings", {
    title: "Reasoning B",
    course: subject.id,
    term: term.id,
    section: sectionB.id,
  });
  const teacher = await write(page, "memberships", {
    username: teacherName,
    email: `${teacherName}@example.test`,
    role: "teacher",
    eligible_units: [unit.id],
  });
  await write(page, "memberships", {
    username: headName,
    email: `${headName}@example.test`,
    role: "head",
    unit: unit.id,
  });
  await logout(page);
  await activate(page, headName);
  await expect(
    page.getByRole("heading", { name: "Department overview", exact: true }),
  ).toBeVisible();
  await write(page, "teacher-appointments", {
    membership: teacher.id,
    unit: unit.id,
    reason: "Department approved teaching appointment",
  });
  await write(
    page,
    `offerings/${course.id}`,
    { teachers: [teacher.user] },
    "PATCH",
  );
  await page.goto(`/course/${course.id}`);
  await expect(
    page.getByRole("button", { name: "Create quiz", exact: true }),
  ).toHaveCount(0);
  await logout(page);
  await activate(page, teacherName);
  await expect(
    page.getByRole("heading", { name: "Teaching overview", exact: true }),
  ).toBeVisible();
  await page.goto(`/course/${course.id}`);
  await expect(
    page.getByRole("button", { name: "Create quiz", exact: true }),
  ).toBeVisible();
  expect(
    (await page.request.get(`/api/v1/offerings/${courseB.id}/`)).status(),
  ).toBe(404);
  const lesson = await write(page, "lessons", {
    offering: course.id,
    title: "First lesson",
    body: "Explain and check your reasoning.",
    published: true,
  });
  const assignment = await write(page, "assignments", {
    offering: course.id,
    title: "First assignment",
    published: true,
    due_at: "2030-12-01T12:00:00Z",
    max_marks: 100,
  });
  await logout(page);
  await login(page, adminName);
  await page.goto("/student-admission");
  await page.getByLabel("Username", { exact: true }).fill(studentName);
  await page
    .getByLabel("Email", { exact: true })
    .fill(`${studentName}@example.test`);
  await page.getByLabel("First name", { exact: true }).fill("Fresh");
  await page.getByLabel("Last name", { exact: true }).fill("Learner");
  await page.getByLabel("Student ID / roll number").fill("F001");
  await page.getByRole("button", { name: "Continue to placement" }).click();
  await chooseRelation(page, "Program", program.name);
  await chooseRelation(page, "Academic year", year.name);
  await chooseRelation(page, "Admission batch (optional)", batch.name);
  await chooseRelation(page, "Class section", section.name);
  await chooseRelation(page, kind === "college" ? "Study year" : "Semester", term.name);
  await page.getByText(/^Suggested course enrollments/).click();
  await page
    .getByRole("checkbox", { name: `Enroll in ${course.title}`, exact: true })
    .check();
  await page
    .getByRole("button", { name: "Review admission", exact: true })
    .click();
  const admissionSaved = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/v1/admissions/") &&
      response.status() === 201,
  );
  await page
    .getByRole("button", { name: "Create student and invite", exact: true })
    .click();
  const admission = await (await admissionSaved).json();
  await expect(page.getByRole("status")).toContainText(
    "Student admitted successfully",
  );
  await logout(page);
  const activation = await activate(page, studentName);
  await expect(
    page.getByRole("heading", { name: "My learning", exact: true }),
  ).toBeVisible();
  await page.goto(`/course/${course.id}`);
  await page
    .getByRole("row")
    .filter({ hasText: lesson.title })
    .getByRole("button", { name: "Read lesson" })
    .click();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.getByRole("tab", { name: "Assignments", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: assignment.title })
    .getByRole("button", { name: "Submit work" })
    .click();
  await page
    .getByLabel("Your answer")
    .fill("I checked the reasoning against a counterexample.");
  await page.getByRole("button", { name: "Submit assignment" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await logout(page);
  await page.goto(activation);
  await page.getByLabel("New password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid or expired invitation",
  );
  await login(page, teacherName);
  await page.goto(`/submissions?assignment=${assignment.id}`);
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await page.getByLabel("Marks", { exact: true }).fill("82.50");
  await page
    .getByLabel("Feedback", { exact: true })
    .fill("Clear reasoning; compare another example.");
  await page.getByLabel("Release grade to student").check();
  await page.getByRole("button", { name: "Save grade" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const submitted = (
    await (
      await page.request.get(`/api/v1/submissions/?assignment=${assignment.id}`)
    ).json()
  ).results[0];
  const attendance = await write(page, "attendance-sessions", {offering: course.id, date: "2026-10-14", title: "Attendance evidence"});
  const learner = (await (await page.request.get(`/api/v1/enrollments/?offering=${course.id}`)).json()).results[0].student;
  await write(page, `attendance-sessions/${attendance.id}/mark`, {records: [{student: learner, status: "present"}]});
  const correction = await write(page, "corrections", {
    kind: "submission",
    target: submitted.id,
    proposed: { marks: "84.25" },
    reason: "Checked the final rubric calculation",
  });
  await logout(page);
  await login(page, adminName);
  await write(page, `corrections/${correction.id}/decide`, {
    decision: "approved",
    reason: "Independent assessment review completed",
  });
  await logout(page);
  await login(page, studentName);
  await page.goto(`/course/${course.id}`);
  await page.getByRole("tab", { name: "My progress", exact: true }).click();
  await expect(
    page.getByRole("row").filter({ hasText: assignment.title }),
  ).toContainText("84.25 / 100");
  await expect(
    page.getByRole("row").filter({ hasText: assignment.title }),
  ).toContainText("Clear reasoning");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.setViewportSize({ width: 1280, height: 900 });
  await logout(page);
  await login(page, adminName);
  await write(page, `memberships/${admission.membership}/transfer`, {
    program: program.id,
    batch: batch.id,
    year: year.id,
    section: sectionB.id,
    stage: 1,
    term: term.id,
    offerings: [courseB.id],
    withdraw: [course.id],
    reason: "Approved move to the next class group",
  });
  const member = await (
    await page.request.get(`/api/v1/memberships/${admission.membership}/`)
  ).json();
  const history = await (
    await page.request.get(`/api/v1/enrollments/?student=${member.user}`)
  ).json();
  expect(history.count).toBe(2);
  expect(
    history.results.find(
      (row: { offering: string }) => row.offering === course.id,
    ).active,
  ).toBe(false);
  expect(
    (
      await (
        await page.request.get(`/api/v1/submissions/${submitted.id}/`)
      ).json()
    ).marks,
  ).toBe("84.25");
  await logout(page);
  await login(page, studentName);
  expect(
    (await page.request.get(`/api/v1/offerings/${course.id}/`)).status(),
  ).toBe(404);
  expect(
    (await page.request.get(`/api/v1/offerings/${courseB.id}/`)).status(),
  ).toBe(200);
  expect((await page.request.get("/api/v1/memberships/")).status()).toBe(200); // Own membership only.
  expect(
    (await (await page.request.get("/api/v1/memberships/")).json()).count,
  ).toBe(1);
  await logout(page); await login(page, adminName);
  const nextYear = await write(page, "years", {name: "2027", start: "2027-01-01", end: "2027-12-31"});
  const nextTerm = await write(page, "terms", {name: "Second academic stage", year: nextYear.id, start: nextYear.start, end: nextYear.end, status: "active"});
  await page.goto(`/student-placement/${admission.membership}`);
  await page.getByRole("button", {name: "Review academic decision", exact: true}).click();
  await chooseRelation(page, "Academic year", nextYear.name);
  await chooseRelation(page, kind === "college" ? "Study year" : "Semester", nextTerm.name);
  await page.getByLabel("Decision reason").fill("Academic board reviewed all previous results and approved progression");
  await page.getByRole("button", {name: "Preview academic decision"}).click();
  await page.getByLabel("I reviewed the academic evidence and authorize this decision.").check();
  await page.getByRole("button", {name: "Confirm academic decision"}).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const placements = await (await page.request.get(`/api/v1/memberships/${admission.membership}/placements/`)).json();
  expect(placements.results.find((row: {ended_at: string | null}) => !row.ended_at).stage).toBe(2);
  if (kind === "university") {
    await page.goto("/institute-settings");
    await page.getByLabel("Repeated courses in GPA / CGPA").selectOption("latest");
    // Configure an example scale explicitly, never enable it by institute type alone.
    for (const [index, band] of [{label: "A", minimum: "80", points: "4"}, {label: "F", minimum: "0", points: "0"}].entries()) {
      await page.getByRole("button", {name: "Add grade band"}).click();
      await page.getByLabel(`Band ${index + 1} label`).fill(band.label);
      await page.getByLabel(`Band ${index + 1} minimum`).fill(band.minimum);
      await page.getByLabel(`Band ${index + 1} points`).fill(band.points);
    }
    await page.getByLabel("Reason for protection policy change").fill("Reviewed explicit test institution policy");
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/v1/institutes/${institute.id}/`) && response.request().method() === "PATCH");
    await page.getByRole("button", {name: "Save institute settings"}).click();
    expect((await saved).status()).toBe(200);
    await expect(page.getByText("Settings saved.", {exact: true})).toBeVisible();
  }
  await logout(page); await login(page, studentName);
  await page.goto("/academic-history");
  await expect(page.getByRole("row").filter({hasText: course.title})).toContainText("84.25%");
  await expect(page.getByRole("region", {name:"Recorded academic decisions"})).toContainText("Progression");
  if (kind === "university") await expect(page.getByRole("region", {name:"Provisional GPA and CGPA"})).toContainText("CGPA 4.00");
  expect((await page.request.get(`/api/v1/offerings/${courseB.id}/`)).status()).toBe(404);
});

}

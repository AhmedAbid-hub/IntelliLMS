import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(`university.${role}`);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Welcome back/ }),
  ).toBeVisible();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
}
test("admin structure → instructor lesson and assignment → student work → released feedback", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/units");
  await page.getByRole("button", { name: "Add new" }).click();
  await page.getByLabel("Name", { exact: false }).fill("E2E Department");
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("cell", { name: "E2E Department", exact: true }),
  ).toBeVisible();
  await page.goto("/courses");
  await page.getByRole("button", { name: "Add new" }).click();
  await page.getByLabel("Name", { exact: false }).fill("E2E Thinking");
  await page.getByLabel("Course code").fill("E2E101");
  await page
    .getByRole("combobox", { name: "Academic unit" })
    .selectOption({ label: "E2E Department" });
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/offerings");
  await page.getByRole("button", { name: "Add new" }).click();
  await page.getByLabel("Title").fill("E2E Course");
  await page
    .getByRole("combobox", { name: "Course definition" })
    .selectOption({ label: "E2E Thinking" });
  await page
    .getByRole("combobox", { name: "Semester", exact: true })
    .selectOption({ label: "Academic term" });
  await page.getByLabel(/Use administrative teaching-assignment override/).check();
  await page.getByLabel(/Administrative assignment override reason/).fill("Temporary cover while department leadership is appointed");
  await page
    .getByRole("listbox", { name: /Instructors/ })
    .selectOption({ label: "university.teacher" });
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/enrollments");
  await page.getByRole("button", { name: "Add new" }).click();
  await page
    .getByRole("combobox", { name: "Course offering" })
    .selectOption({ label: "E2E Course" });
  await page
    .getByRole("combobox", { name: "Student" })
    .selectOption({ label: "university.student" });
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await logout(page);
  await login(page, "teacher");
  await page.goto("/lessons");
  await page.getByRole("button", { name: "Add new" }).click();
  await page
    .getByRole("combobox", { name: "Course offering" })
    .selectOption({ label: "E2E Course" });
  await page.getByLabel("Title").fill("E2E Lesson");
  await page
    .getByLabel("Lesson text")
    .fill("Read this lesson and explain your reasoning.");
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/assignments");
  await page.getByRole("button", { name: "Add new" }).click();
  await page
    .getByRole("combobox", { name: "Course offering" })
    .selectOption({ label: "E2E Course" });
  await page.getByLabel("Title").fill("E2E Assignment");
  await page.getByLabel("Deadline").fill("2030-12-01T12:00");
  await page.getByLabel("Published", { exact: true }).check();
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await logout(page);
  await login(page, "student");
  await page.goto("/lessons");
  await page
    .getByRole("row")
    .filter({ hasText: "E2E Lesson" })
    .getByRole("button", { name: "Read lesson" })
    .click();
  await page.getByRole("button", { name: "Mark lesson complete" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.goto("/assignments");
  await page
    .getByRole("row")
    .filter({ hasText: "E2E Assignment" })
    .getByRole("button", { name: "Submit work" })
    .click();
  await page
    .getByLabel("Your answer")
    .fill("I applied the concept and checked my reasoning.");
  await page.getByRole("button", { name: "Submit assignment" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await logout(page);
  await login(page, "teacher");
  await page.goto("/assignments");
  await page
    .getByRole("row")
    .filter({ hasText: "E2E Assignment" })
    .getByRole("link", { name: "Submissions" })
    .click();
  await page.getByRole("button", { name: "Review", exact: true }).click();
  await expect(
    page.getByText("I applied the concept and checked my reasoning."),
  ).toBeVisible();
  await page.getByLabel("Marks", { exact: true }).fill("88");
  await page
    .getByLabel("Feedback", { exact: true })
    .fill("Excellent reasoning; consider an alternative approach.");
  await page.getByLabel("Release grade to student").check();
  await page.getByRole("button", { name: "Save grade" }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Learning progress" }),
  ).toBeVisible();
  await logout(page);
  await login(page, "student");
  await page.goto("/submissions");
  await page
    .getByRole("row")
    .filter({ hasText: "88.00" })
    .getByRole("button", { name: "Review" })
    .click();
  await expect(page.getByText(/Excellent reasoning/)).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto("/");
  await page.screenshot({
    path: "test-results/student-dashboard.png",
    fullPage: true,
  });
});
test("student completes a timed auto-graded quiz", async ({ page }) => {
  await login(page, "student");
  await page.goto("/quizzes");
  await page.getByRole("button", { name: "Start / resume" }).first().click();
  await expect(
    page.getByRole("heading", { name: "Focus on what you know." }),
  ).toBeVisible();
  await page.getByText("Practice with feedback", { exact: true }).click();
  await page.getByText("true", { exact: true }).click();
  await page.getByRole("button", { name: "Save answers", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Answers saved.");
  await page
    .getByRole("button", { name: "Submit attempt", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Attempt submitted" }),
  ).toBeVisible();
  await expect(page.getByText("Score: 10.00")).toBeVisible();
});

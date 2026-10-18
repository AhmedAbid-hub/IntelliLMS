import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(`university.${role}`);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
async function write(page: Page, path: string, data: unknown, method = "POST") {
  const csrf = (await page.context().cookies()).find(
    (c) => c.name === "csrftoken",
  )!.value;
  const response = await page.request.fetch(`/api/v1/${path}/`, {
    method,
    data,
    headers: { "X-CSRFToken": csrf },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}

test("Head switches between department oversight and assigned teaching; revocation removes teaching access", async ({
  page,
  browser,
}) => {
  await login(page, "admin");
  const members = await (
    await page.request.get("/api/v1/memberships/?role=head")
  ).json();
  const head = members.results.find(
    (m: { username: string }) => m.username === "university.head",
  );
  const courses = await (await page.request.get("/api/v1/offerings/")).json();
  const course = courses.results.find((c: { title: string }) =>
    c.title.startsWith("Introduction to Computing"),
  );
  await write(page, `memberships/${head.id}/transition`, {
    operation: "change_role",
    role: "head",
    can_teach: true,
    reason: "Authorized Head teaching demonstration",
  });
  await write(
    page,
    `offerings/${course.id}`,
    {
      teachers: [...course.teachers, head.user],
      assignment_reason: "Additional authorized Head teaching assignment",
    },
    "PATCH",
  );
  await write(page, "offerings", {
    title: `Oversight only ${Date.now()}`,
    course: course.course,
    term: course.term,
  });
  const context = await browser.newContext();
  const headPage = await context.newPage();
  await login(headPage, "head");
  const group = headPage.getByRole("group", { name: "Select Head workspace" });
  await expect(
    group.getByRole("button", { name: "Department management" }),
  ).toHaveAttribute("aria-pressed", "true");
  await headPage.goto(`/course/${course.id}`);
  await expect(
    headPage.getByRole("button", { name: "Create quiz", exact: true }),
  ).toHaveCount(0);
  await group.getByRole("button", { name: "My teaching", exact: true }).click();
  await expect(
    group.getByRole("button", { name: "My teaching", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(headPage).toHaveURL(/\/offerings$/);
  const teaching = await (
    await headPage.request.get("/api/v1/offerings/")
  ).json();
  expect(teaching.count).toBe(1);
  expect(teaching.results[0].id).toBe(course.id);
  await expect(
    headPage.getByRole("link", { name: "Teacher appointments", exact: true }),
  ).toHaveCount(0);
  await headPage.goto(`/course/${course.id}`);
  await expect(
    headPage.getByRole("button", { name: "Create quiz", exact: true }),
  ).toBeVisible();
  await write(
    page,
    `offerings/${course.id}`,
    {
      teachers: course.teachers,
      assignment_reason:
        "Teaching assignment ended; retain department management",
    },
    "PATCH",
  );
  expect(
    (await headPage.request.get(`/api/v1/offerings/${course.id}/`)).status(),
  ).toBe(404);
  await write(page, `memberships/${head.id}/transition`, {
    operation: "change_role",
    role: "head",
    can_teach: false,
    reason: "Teaching capability withdrawn after handover",
  });
  await headPage.reload();
  await expect(
    group.getByRole("button", { name: "My teaching", exact: true }),
  ).toBeDisabled();
  await group.getByRole("button", { name: "Department management" }).click();
  await expect(
    group.getByRole("button", { name: "Department management" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    headPage.getByRole("link", { name: "Teacher appointments", exact: true }),
  ).toBeVisible();
  await context.close();
});

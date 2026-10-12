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

test("academic progress displays authorized charts and accessible data", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page, "head");
  await page
    .getByRole("link", { name: "Academic progress", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Department overview" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Instructor workload" }),
  ).toBeVisible();
  await page
    .getByText("View accessible data table", { exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("columnheader", { name: "Events", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: "test-results/progress-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("quiz release settings remain editable after attempts exist", async ({
  page,
}) => {
  await login(page, "teacher");
  await page.goto("/quizzes");
  await page
    .getByRole("button", { name: "Edit Foundations check", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Title", { exact: true })).toHaveCount(0);
  await dialog.getByRole("checkbox").uncheck();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await page
    .getByRole("button", { name: "Edit Foundations check", exact: true })
    .first()
    .click();
  await dialog.getByRole("checkbox").check();
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
});

test("membership status can be edited without resending invitation fields", async ({
  page,
}) => {
  await login(page, "admin");
  await page.goto("/memberships");
  await page
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: "university.student", exact: true }),
    })
    .getByRole("button", { name: "Edit record", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Username", { exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
});

test("platform administrator sees only administrative accounts and appoints an existing admin", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("superadmin");
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("complementary").getByRole("link", { name: "Institute administrators", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Active institute")
    .selectOption({ label: "Northstar University" });
  await expect(page.getByRole("heading", {name: "Platform overview"})).toBeVisible();
  await page.getByRole("complementary")
    .getByRole("link", { name: "Institute administrators", exact: true })
    .click();
  await expect(page.getByRole("cell", { name: "school.student", exact: true })).toHaveCount(0);
  const directory = await (await page.request.get("/api/v1/platform-users/?search=student")).json();
  expect(directory.count).toBe(0);
  const row = page
    .getByRole("row")
    .filter({
      has: page.getByRole("cell", { name: "school.admin", exact: true }),
    });
  await row.getByRole("button", { name: "Link to selected institute" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create membership" })
    .click();
  await expect(page.getByRole("status")).toContainText("Membership created");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.goto("/memberships");
  await expect(
    page.getByRole("cell", { name: "school.admin", exact: true }),
  ).toBeVisible();
});

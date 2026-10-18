import { test, expect, type Page } from "@playwright/test";
import { chooseRelation, personAction } from "./helpers";
async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(`university.${role}`);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign out" }),
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
  await page.getByRole("button", { name: "Department overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Department progress", exact: true }),
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
  await page.getByRole("textbox", { name: "Search People" }).fill("university.student");
  const row = page.getByRole("row").filter({ has: page.getByRole("cell", { name: "university.student", exact: true }) });
  await personAction(page, row, "Edit details");
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
  await chooseRelation(page, "Switch institute context", "Northstar University");
  await expect(page.getByRole("button", { name: "Switch institute context", exact: true })).toContainText("Northstar University");
  await expect(page).toHaveURL(/\/platform$/);
  await expect(page.getByRole("heading", {name: "Platform overview"})).toBeVisible();
  await page.getByRole("complementary")
    .getByRole("link", { name: "Institute administrators", exact: true })
    .click();
  await expect(page).toHaveURL(/\/platform-users$/);
  await expect(page.getByRole("cell", { name: "school.student", exact: true })).toHaveCount(0);
  const directory = await (await page.request.get("/api/v1/platform-users/?search=student")).json();
  expect(directory.count).toBe(0);
  const row = page
    .getByRole("row")
    .filter({
      has: page.getByText("school.admin", { exact: true }),
    });
  await row.getByRole("button", { name: "Link to institute" }).click();
  const linked = page.waitForResponse(response => response.url().endsWith("/api/v1/memberships/attach/") && response.request().method() === "POST");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Link administrator" })
    .click();
  const response = await linked;
  expect(response.status(), await response.text()).toBe(201);
  const membership = await response.json();
  const identity = await (await page.request.get("/api/v1/auth/me/")).json();
  expect(membership.institute).toBe(identity.institute_id);
  expect(membership.role).toBe("admin");
  await expect(page.getByRole("heading", { name: "Administrator linked successfully" })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.goto("/memberships");
  await page.getByRole("textbox", { name: "Search People" }).fill("school.admin");
  await expect(page.getByRole("cell", { name: "school.admin", exact: true })).toHaveCount(2);
});

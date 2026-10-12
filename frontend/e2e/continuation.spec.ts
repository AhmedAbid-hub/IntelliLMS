import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("people filters combine role, status and academic unit", async ({
  page,
}) => {
  await login(page, "college.admin");
  await page.goto("/memberships");
  await page.getByLabel("Filter Role").selectOption("teacher");
  await page.getByLabel("Filter Active status").selectOption("true");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("college.teacher");
  await page.getByLabel("Filter Active status").selectOption("false");
  await expect(page.getByText(/No records yet/)).toBeVisible();
  await page.getByLabel("Filter Active status").selectOption("");
  await page.getByLabel("Filter Role").selectOption("student");
  await expect(page.locator("tbody tr")).toHaveCount(12);
});

test("school settings persist terminology and grade bands into learner reports", async ({
  page,
}) => {
  await login(page, "school.admin");
  await page.goto("/institute-settings");
  await page.getByText("Advanced terminology settings", { exact: true }).click();
  await page.getByLabel("Singular term", { exact: true }).fill("Quarter");
  await page.getByLabel("Plural term", { exact: true }).fill("Quarters");
  await page.getByLabel("Repeated quiz attempts").selectOption("best");
  await page.getByRole("button", { name: "Add grade band" }).click();
  await page.getByLabel("Band 1 label").fill("A");
  await page.getByLabel("Band 1 minimum").fill("80");
  await page.getByLabel("Band 1 points").fill("4");
  await page.getByRole("button", { name: "Add grade band" }).click();
  await page.getByLabel("Band 2 label").fill("B");
  await page.getByLabel("Band 2 minimum").fill("0");
  await page.getByLabel("Band 2 points").fill("2");
  await page.getByRole("button", { name: "Save institute settings" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /settings saved\./i }),
  ).toHaveText("Settings saved.");
  await page.goto("/academics");
  await expect(
    page.getByRole("link", { name: /Quarters/ }),
  ).toBeVisible();
  await page.goto("/grades");
  await expect(
    page.getByRole("navigation", { name: "Gradebook pagination" }),
  ).toContainText("Page 1");
  await page.getByLabel("Search learner or course").fill("school.student12");
  await expect(
    page.getByRole("navigation", { name: "Gradebook pagination" }),
  ).toContainText("3 results");
  await page.getByLabel("Search learner or course").clear();
  await page
    .getByRole("navigation", { name: "Gradebook pagination" })
    .getByRole("button", { name: "Next" })
    .click();
  await expect(
    page.getByRole("navigation", { name: "Gradebook pagination" }),
  ).toContainText("Page 2");
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "school.student");
  await page.goto("/grades");
  await expect(
    page.getByRole("columnheader", { name: "Letter / points" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /^[AB] \/ [24]$/ }).first(),
  ).toBeVisible();
});

test("platform overview stays accessible after entering an institute", async ({
  page,
}) => {
  await login(page, "superadmin");
  await page.goto("/platform");
  await expect(
    page.getByRole("heading", { name: "Platform overview" }),
  ).toBeVisible();
  await page.locator("tbody a").first().click();
  await expect(
    page.getByRole("heading", { name: "Institute administrators" }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: /\.admin$/, exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Manage institute administrators" })
    .click();
  await expect(page).toHaveURL(/memberships/);
  await page
    .getByRole("link", { name: "Platform overview", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Platform overview" }),
  ).toBeVisible();
});

test("head, teacher and student dashboards expose their permitted workflows", async ({
  page,
}) => {
  for (const [role, heading] of [
    ["head", "Department management"],
    ["teacher", "Teaching workspace"],
    ["student", "My learning"],
  ]) {
    await login(page, `college.${role}`);
    await expect(
      page.getByRole("heading", { name: heading, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Platform overview" }),
    ).toHaveCount(0);
    if (role === "student")
      await expect(
        page.getByRole("link", { name: "Grade submissions" }),
      ).toHaveCount(0);
    await page.getByRole("button", { name: "Sign out" }).click();
  }
});

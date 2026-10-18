import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, username: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("student direct navigation denies restricted pages before their API loads", async ({
  page,
}) => {
  await login(page, "university.student");
  const restrictedCalls: string[] = [];
  const restricted = [
    "audit",
    "platform-audit",
    "platform-users",
    "question-bank",
    "memberships",
    "predictions",
  ];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (restricted.some((resource) => path.startsWith(`/api/v1/${resource}/`)))
      restrictedCalls.push(path);
  });
  for (const resource of restricted) {
    await page.goto(`/${resource}`);
    await expect(
      page.getByRole("heading", { name: "Access unavailable" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/unauthorized$/);
  }
  expect(restrictedCalls).toEqual([]);
  await page.getByRole("link", { name: "Return to overview" }).click();
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }),
  ).toContainText("Overview");
});

test("Super Admin can review global changes without an active institute", async ({
  page,
}) => {
  await login(page, "superadmin");
  await page.goto("/platform-settings");
  await page.getByRole("textbox", { name: /^Notice message/ }).fill("Audit verification notice");
  await page.getByRole("button", { name: "Save platform settings", exact: true }).click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Platform configuration updated." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await page.getByRole("link", { name: "Platform audit", exact: true }).click();
  await page
    .getByLabel("Filter Record type")
    .selectOption("platformconfiguration");
  await page.getByLabel("Filter Action").selectOption("2");
  await expect(page.locator("tbody")).toContainText("superadmin");
  await expect(page.locator("tbody")).toContainText("Updated fields:");
  await expect(page.getByRole("button", { name: "Add new" })).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Breadcrumb" }),
  ).toContainText("Platform audit");
  await page.getByLabel("Search Platform audit").fill("no-such-audit-event");
  await expect(page.getByText(/No records yet/)).toBeVisible();
});

test("teacher workload uses paginated search and student analytics hides it", async ({
  page,
}) => {
  await login(page, "college.teacher");
  await page.goto("/analytics");
  await page.getByRole("button", { name: "Teaching overview", exact: true }).click();
  const workload = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", { name: "Instructor workload" }),
    });
  await expect(workload.locator("tbody tr")).toHaveCount(1);
  await expect(
    page.getByRole("navigation", { name: "Instructor workload pagination" }),
  ).toContainText("1 results");
  await page.getByLabel("Search instructor").fill("no-such-instructor");
  await expect(
    page.getByText("No instructors match these filters."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "college.student");
  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "My academic progress" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Instructor workload" }),
  ).toHaveCount(0);
});

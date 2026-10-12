import { test, expect } from "@playwright/test";

test("platform configuration saves and renders on public login", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("superadmin");
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.goto("/platform-settings");
  await page
    .getByLabel("Platform name", { exact: true })
    .fill("IntelliLMS Network");
  await page.getByLabel("Public support email").fill("support@example.test");
  await page
    .getByLabel("Public login notice")
    .fill("Contact your institute for account access.");
  await page.getByRole("button", { name: "Save platform settings" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /settings saved\./i }),
  ).toHaveText("Platform settings saved.");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(
    page.getByText("Contact your institute for account access."),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "support@example.test" }),
  ).toHaveAttribute("href", "mailto:support@example.test");
  await page.getByLabel("Username").fill("college.student");
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.goto("/platform-settings");
  await expect(
    page.getByRole("heading", { name: "Access unavailable" }),
  ).toBeVisible();
});

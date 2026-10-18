import { test, expect } from "@playwright/test";
import { login } from "./lifecycle-helpers";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Keep reviewed evidence when Playwright clears its output directory on a later focused run.
const evidenceDirectory = resolve("../backend/test-results/architecture-ui");
mkdirSync(evidenceDirectory, {recursive: true});

for (const [username, heading, structure] of [
  ["superadmin", "Platform overview", ""],
  ["university.admin", "Institute overview", "Programs and semesters"],
  ["college.admin", "Institute overview", "Programs and study years"],
  ["school.admin", "Institute overview", "Classes and school year"],
  ["university.head", "Department overview", ""],
  ["university.teacher", "Teaching overview", ""],
  ["university.student", "My learning", ""],
]) {
  test(`${username} dashboard and keyboard navigation work at desktop and mobile sizes`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setViewportSize({width: 1365, height: 900});
    await login(page, username, "LearnTogether42!");
    await expect(page.getByRole("heading", {name: heading, exact: true})).toBeVisible();
    if (structure) await expect(page.getByRole("heading", {name: structure, exact: true})).toBeVisible();
    if (username === "school.admin") {
      expect(await page.request.get("/api/v1/units/").then(r => r.status())).toBe(403);
      await expect(page.locator('aside a[href="/units"]')).toHaveCount(0);
      await expect(page.locator('aside a[href="/teacher-appointments"]')).toHaveCount(0);
    }
    if (username === "superadmin") {
      await expect(page.getByText("Distinct active administrators in active institutions", {exact: true})).toBeVisible();
      await expect(page.locator('.stat-card').filter({hasText: 'Institute administrators'}).locator('strong')).toHaveText('3');
      await expect(page.getByText("Model status", {exact: true})).toBeVisible({timeout: 30000});
      expect(await page.request.get("/api/v1/offerings/").then(r => r.status())).toBe(403);
      await expect(page.locator('aside a[href="/analytics"]')).toHaveCount(0);
    }
    if (username.endsWith(".student") || username.endsWith(".teacher")) {
      expect(await page.request.get("/api/v1/audit/").then(r => r.status())).toBe(403);
    }
    for (const width of [1365, 390]) {
      await page.setViewportSize({width, height: 900});
      if (width === 390) await expect(page.locator("#app-navigation")).not.toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path: resolve(evidenceDirectory, `architecture-${username}-${width}.png`), fullPage: true, animations: "disabled"});
    }
    const toggle = page.getByRole("button", {name: "Toggle navigation"});
    await toggle.focus();
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const navigation = page.getByRole("complementary", {name: "Main navigation"});
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("button", {name: "Close navigation"})).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
    await expect(page.locator("#app-navigation")).not.toBeVisible();
    expect(errors).toEqual([]);
  });
}

import { test, expect } from "@playwright/test";

for (const width of [1280, 390]) {
  test(`modal relation search, mouse selection and keyboard dismissal at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 850 });
    await page.goto("/login");
    await page.getByLabel("Username").fill("university.teacher");
    await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    // At mobile widths the closed navigation correctly hides its Sign out button.
    await expect(page.getByRole("heading", { name: "Teaching overview", exact: true })).toBeVisible();
    const offerings = await (await page.request.get("/api/v1/offerings/")).json();
    const course = offerings.results.find((row: { archived: boolean }) => !row.archived);
    await page.goto("/manual-grades");
    await page.getByRole("button", { name: "Add new" }).click();
    const dialog = page.getByRole("dialog");
    const trigger = dialog.getByRole("button", { name: "Course offering", exact: true });
    await trigger.click();
    const search = dialog.getByRole("searchbox", { name: "Search Course offering", exact: true });
    await expect(search).toBeFocused();
    await search.fill(course.title);
    const popup = dialog.locator(".relation-modern-popover");
    const bounds = await popup.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(850);
    await page.screenshot({ path: `test-results/evidence/modal-selector-${width}.png` });
    await dialog.getByRole("option", { name: course.title, exact: true }).click();
    await expect(trigger).toContainText(course.title);
    await expect(trigger).toBeFocused();
    await trigger.press("ArrowDown");
    await expect(search).toBeFocused();
    await search.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
    await trigger.press("ArrowDown");
    await search.fill(course.title);
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await search.press("Enter");
    await expect(trigger).toContainText(course.title);
    await expect(dialog).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await trigger.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
}

import { test, expect } from "@playwright/test";

test("teacher can page and search the learning insight learner selector", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("university.teacher");
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.goto("/predictions");
  await expect(
    page.getByRole("heading", { name: "Generate a course risk estimate" }),
  ).toBeVisible();
  const pages = page.getByRole("navigation", { name: "Learners pagination" });
  await expect(pages).toContainText("Page 1");
  await pages.getByRole("button", { name: "Next" }).click();
  await expect(pages).toContainText("Page 2");
  await page.getByLabel("Find learner or course").fill("university.student12");
  await expect(pages).toContainText("3 results");
  await expect(pages).toContainText("Page 1");
  await expect(
    page.getByLabel("Learner and course").locator("option"),
  ).toHaveCount(4);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

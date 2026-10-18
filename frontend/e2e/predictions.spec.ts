import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(`university.${role}`);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("teacher can page and search the class learning insight learner selector", async ({ page }) => {
  // Scope pagination to one class in this run's disposable database.
  await login(page, "admin");
  const prefix = `insight-${Date.now()}`;
  const csrf = (await page.context().cookies()).find(c => c.name === "csrftoken")!.value;
  const headers = { "X-CSRFToken": csrf };
  const csv = "username,email,role\n" + Array.from({ length: 16 }, (_, i) =>
    `${prefix}-${i},${prefix}-${i}@example.test,student`).join("\n");
  const imported = await page.request.post("/api/v1/memberships/import-csv/", {
    headers, multipart: { file: { name: "insights.csv", mimeType: "text/csv", buffer: Buffer.from(csv) } },
  });
  expect(imported.ok(), await imported.text()).toBe(true);
  const members = await (await page.request.get(`/api/v1/memberships/?search=${prefix}`)).json();
  expect(members.count).toBe(16);
  const offerings = await (await page.request.get("/api/v1/offerings/")).json();
  const course = offerings.results.find((row: { title: string }) => row.title === "Introduction to Computing · A");
  expect(course).toBeTruthy();
  const enrolled = await page.request.post(`/api/v1/offerings/${course.id}/bulk-enrollment/`, {
    headers, data: { students: members.results.map((row: { user: string }) => row.user), operation: "enroll", reason: "Browser pagination fixture" },
  });
  expect(enrolled.ok(), await enrolled.text()).toBe(true);
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "teacher");
  await page.goto(`/course/${course.id}`);
  await page.getByRole("tab", { name: "AI insights", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Generate a risk estimate" })).toBeVisible();
  const pages = page.getByRole("navigation", { name: "Learners pagination" });
  await expect(pages).toContainText("Page 1");
  await pages.getByRole("button", { name: "Next" }).click();
  await expect(pages).toContainText("Page 2");
  await page.getByLabel("Find learner", { exact: true }).fill("university.student12");
  await expect(pages).toContainText("1 result");
  await expect(pages).toContainText("Page 1");
  await expect(page.getByLabel("Enrolled learner").locator("option")).toHaveCount(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

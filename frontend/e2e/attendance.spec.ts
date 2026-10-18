import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, role: string) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(`university.${role}`);
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}

test("teacher searches and saves attendance; student sees course and meeting context", async ({
  page,
}) => {
  await login(page, "teacher");
  const csrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === "csrftoken",
  )!.value;
  const offerings = await (await page.request.get("/api/v1/offerings/")).json();
  const offering = offerings.results.find(
    (row: { archived: boolean }) => !row.archived,
  );
  const response = await page.request.post("/api/v1/attendance-sessions/", {
    headers: { "X-CSRFToken": csrf },
    data: {
      offering: offering.id,
      title: "E2E roster review",
      date: "2026-10-11",
    },
  });
  expect(response.status()).toBe(201);
  const session = await response.json();
  await page.goto("/attendance-sessions");
  const row = page.getByRole("row").filter({ hasText: "E2E roster review" });
  await row.getByRole("button", { name: "Mark attendance" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("searchbox", { name: "Search students" })
    .fill("Zara");
  await expect(dialog.getByRole("combobox")).toHaveCount(1);
  await dialog.getByRole("combobox").selectOption("excused");
  await expect(dialog.getByRole("searchbox")).toBeDisabled();
  await dialog.getByRole("button", { name: "Save attendance" }).click();
  await expect(dialog.getByRole("status")).toHaveText(
    "1 attendance record saved successfully.",
  );
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await row.getByRole("button", { name: "Mark attendance" }).click();
  await dialog.getByRole("searchbox").fill("Zara");
  await expect(dialog.getByRole("combobox")).toHaveCount(1);
  await expect(dialog.getByRole("combobox")).toHaveValue("excused");
  await dialog.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await login(page, "student");
  await page.goto(`/attendance?session=${session.id}`);
  const history = page
    .getByRole("row")
    .filter({ hasText: "E2E roster review" });
  await expect(history).toContainText(offering.title);
  await expect(history).toContainText("2026-10-11");
  await expect(history).toContainText("excused");
});

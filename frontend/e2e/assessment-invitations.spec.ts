import { test, expect, type Page } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function login(
  page: Page,
  username: string,
  password = "LearnTogether42!",
) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
}

test("admin invitation → emailed password setup → student login → replay rejected", async ({
  page,
}) => {
  const username = `invite-${Date.now()}`;
  const email = `${username}@example.test`;
  await login(page, "university.admin");
  await page.goto("/memberships");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("dialog").getByLabel("Role", { exact: false }).selectOption("student");
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const directory = resolve("../backend/test-results/e2e-mail");
  let resetPath = "";
  await expect
    .poll(async () => {
      for (const file of await readdir(directory)) {
        const content = await readFile(resolve(directory, file), "utf8");
        if (content.includes(`To: ${email}`))
          resetPath = content.match(/\/reset\/[^\s/]+\/[^\s/]+/)?.[0] || "";
      }
      return resetPath;
    })
    .not.toBe("");
  await logout(page);
  await page.goto(resetPath);
  await page.getByLabel("New password").fill("Invited-Strong-Password82!");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("status")).toContainText("Password saved.");
  await login(page, username, "Invited-Strong-Password82!");
  await page.goto("/memberships");
  await expect(page.getByRole("heading", { name: /Access/ })).toBeVisible();
  await logout(page);
  await page.goto(resetPath);
  await page.getByLabel("New password").fill("Replayed-Strong-Password82!");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Invalid or expired invitation",
  );
});

test("CSV validation is atomic and successful import appears in People", async ({
  page,
}) => {
  await login(page, "university.admin");
  await page.goto("/memberships");
  await page.getByRole("button", { name: "Import CSV" }).click();
  const username = `csv-${Date.now()}`;
  await page
    .getByLabel("CSV file")
    .setInputFiles({
      name: "people.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `username,email,role\n${username},${username}@example.test,student\nbad,invalid,student\n`,
      ),
    });
  await page
    .getByRole("button", { name: "Import accounts", exact: true })
    .click();
  await expect(page.getByText(/Line 3: Invalid email/)).toBeVisible();
  const response = await page.request.get(
    `/api/v1/memberships/?search=${username}`,
  );
  expect((await response.json()).count).toBe(0);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download error details" }).click();
  expect((await download).suggestedFilename()).toBe("import-errors.csv");
  await page
    .getByLabel("CSV file")
    .setInputFiles({
      name: "people.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(
        `username,email,role\n${username},${username}@example.test,student\n`,
      ),
    });
  await page
    .getByRole("button", { name: "Import accounts", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("status")).toContainText(
    "1 accounts created",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByLabel("Search People", { exact: true }).fill(username);
  await expect(
    page.getByRole("cell", { name: username, exact: true }),
  ).toBeVisible();
});

test("fractional manual assessment → release → student feedback and keyboard course tabs", async ({
  page,
}) => {
  await login(page, "university.teacher");
  const offerings = await (await page.request.get("/api/v1/offerings/")).json();
  const offering = offerings.results.find(
    (row: { archived: boolean }) => !row.archived,
  );
  await page.goto("/manual-grades");
  await page.getByRole("button", { name: "Add new" }).click();
  await page
    .getByRole("combobox", { name: "Course offering" })
    .selectOption(offering.id);
  await page
    .getByRole("combobox", { name: "Student" })
    .selectOption({ label: "university.student" });
  await page.getByLabel("Title").fill("E2E practical feedback");
  await page.getByLabel("Marks", { exact: false }).first().fill("8.25");
  await page.getByLabel("Maximum marks").fill("10");
  await page.getByLabel("Feedback").fill("Explain how you checked the result.");
  await page.getByRole("button", { name: "Create record" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await logout(page);
  await login(page, "university.student");
  await page.goto("/manual-grades");
  await expect(
    page.getByRole("cell", { name: "E2E practical feedback" }),
  ).toHaveCount(0);
  await logout(page);
  await login(page, "university.teacher");
  await page.goto("/manual-grades");
  await page
    .getByRole("row")
    .filter({ hasText: "E2E practical feedback" })
    .getByRole("button", { name: "Edit E2E practical feedback", exact: true })
    .click();
  await page.getByLabel("Release grade").check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await logout(page);
  await login(page, "university.student");
  await page.goto("/manual-grades");
  await page
    .getByRole("row")
    .filter({ hasText: "E2E practical feedback" })
    .getByRole("button", { name: "Review" })
    .click();
  await expect(page.getByText("8.25 / 10 marks")).toBeVisible();
  await expect(
    page.getByText("Explain how you checked the result."),
  ).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("spinbutton")).toHaveCount(0);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.goto(`/course/${offering.id}`);
  await page.getByRole("tab", { name: "Lessons" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Materials" })).toBeFocused();
  await expect(page.getByRole("tabpanel", { name: "Materials" })).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Modules" })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Lessons" })).toBeFocused();
});

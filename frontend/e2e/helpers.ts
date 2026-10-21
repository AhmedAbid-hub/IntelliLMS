import { expect, type Page, type Locator } from "@playwright/test";

export async function chooseRelation(
  page: Page,
  label: string,
  option: string,
  multiple = false,
) {
  const root = (await page.getByRole("dialog").count())
    ? page.getByRole("dialog")
    : page;
  await root.getByRole("button", { name: label, exact: true }).click();
  await page
    .getByRole("searchbox", { name: `Search ${label}`, exact: true })
    .fill(option);
  await page.getByRole("option", { name: option, exact: true }).click();
  if (multiple)
    await page.getByRole("button", { name: "Done", exact: true }).click();
}

export async function createStudentAccount(
  page: Page,
  username: string,
  email: string,
) {
  await page.goto("/memberships");
  await page.getByRole("button", { name: "Add person" }).click();
  await page.getByRole("button", { name: /^Student Create a learner/ }).click();
  await page
    .getByRole("textbox", { name: "Username", exact: true })
    .fill(username);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("First name", { exact: true }).fill("Invited");
  await page.getByLabel("Last name", { exact: true }).fill("Learner");
  await page.getByLabel("Student ID / roll number").fill(username);
  await page.getByRole("button", { name: "Continue to placement" }).click();
  const programs = await (
    await page.request.get("/api/v1/programs/?active=true")
  ).json();
  const years = await (await page.request.get("/api/v1/years/")).json();
  await chooseRelation(page, "Program", programs.results[0].name);
  await chooseRelation(page, "Academic year", years.results[0].name);
  await page
    .getByRole("button", { name: "Review admission", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Review admission", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Create student and invite", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Student admitted successfully",
  );
  await page.goto("/memberships");
}

export async function personAction(page: Page, row: Locator, name: string) {
  const trigger = row.getByRole("button", { name: /^Actions for / });
  // The page uses smooth scrolling and this menu intentionally dismisses on
  // outside scroll. Center the trigger instantly so the automated click cannot
  // overlap a scroll animation or need to scroll the open fixed-position menu.
  await trigger.evaluate((element) =>
    element.scrollIntoView({ behavior: "instant", block: "center" }),
  );
  await trigger.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await trigger.click();
  await page
    .getByRole("group", { name: /^Actions for / })
    .getByRole("button", { name, exact: true })
    .click();
}

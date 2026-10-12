import { test, expect } from "@playwright/test";

test("course choice search and pagination reach records beyond the first fifty", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("Username").fill("university.admin");
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  const csrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === "csrftoken",
  )!.value;
  for (let i = 0; i < 51; i++) {
    const response = await page.request.post("/api/v1/courses/", {
      headers: { "X-CSRFToken": csrf },
      data: {
        code: `PAGER${i}`,
        name: `Paged choice ${String(i).padStart(2, "0")}`,
      },
    });
    expect(response.status()).toBe(201);
  }
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/v1/courses/"))
      requests.push(request.url());
  });
  await page.goto("/offerings");
  await page.getByRole("button", { name: "Add new" }).click();
  const dialog = page.getByRole("dialog");
  const selector = dialog
    .locator(".relation-select")
    .filter({ has: page.getByRole("button", { name: "Choose subject", exact:true }) });
  await selector.getByRole("button",{name:"Choose subject",exact:true}).click();
  await expect(
    selector.getByRole("button", { name: "Next Choose subject page" }),
  ).toBeEnabled();
  expect(requests).toHaveLength(1);
  await selector
    .getByRole("button", { name: "Next Choose subject page" })
    .click();
  await expect(selector.getByText(/Page 2/)).toBeVisible();
  expect(requests).toHaveLength(2);
  await selector.getByRole("searchbox").fill("Paged choice 50");
  await expect(selector.getByRole("option")).toHaveCount(1);
  await selector.getByRole("option",{name:"Paged choice 50",exact:true}).click();
  await expect(selector.getByRole("button",{name:"Choose subject",exact:true})).toContainText("Paged choice 50");
  await selector.getByRole("button",{name:"Choose subject",exact:true}).click();
  await selector.getByRole("searchbox").fill("Paged choice 00");
  await expect(selector.getByRole("option")).toHaveCount(1);
  await expect(selector.locator("select option:checked")).toHaveText(
    "Paged choice 50",
  );
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
});

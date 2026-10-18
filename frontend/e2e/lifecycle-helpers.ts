import { expect, type Page } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const password = "Fresh-Learning-Password42!";
export async function login(page: Page, username: string, secret = password) {
  await page.goto("/login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
}
export async function logout(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByLabel("Username")).toBeVisible();
}
export async function write(page: Page, path: string, data: unknown, method = "POST") {
  const csrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === "csrftoken",
  )!.value;
  const response = await page.request.fetch(`/api/v1/${path}/`, {
    method,
    data,
    headers: { "X-CSRFToken": csrf },
  });
  expect(response.ok(), `${path}: ${await response.text()}`).toBe(true);
  return response.json();
}
export async function activate(page: Page, username: string) {
  const directory = resolve("../backend/test-results/e2e-mail");
  let path = "";
  await expect
    .poll(async () => {
      for (const name of await readdir(directory)) {
        const message = await readFile(resolve(directory, name), "utf8");
        if (message.includes(`To: ${username}@example.test`))
          path = message.match(/\/reset\/[^\s/]+\/[^\s/]+/)?.[0] || "";
      }
      return path;
    })
    .not.toBe("");
  await page.goto(path);
  await page.getByLabel("New password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("status")).toContainText("Password saved");
  await login(page, username);
  return path;
}


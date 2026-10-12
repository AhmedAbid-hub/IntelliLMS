import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await mkdir("test-results", { recursive: true });
  await page.goto("http://127.0.0.1:5173/login");
  await page.getByLabel("Username").fill("university.teacher");
  await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  await page.goto("http://127.0.0.1:5173/attendance-sessions");
  await page.getByRole("button", { name: "Mark attendance" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("button", { name: "Save attendance" })).toBeVisible();
  await page.screenshot({ path: "test-results/attendance-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/attendance-mobile.png", fullPage: true });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log(JSON.stringify({ pageErrors: errors, mobileHorizontalOverflow: overflow }));
  if (errors.length || overflow) process.exitCode = 1;
} finally {
  await browser.close();
}

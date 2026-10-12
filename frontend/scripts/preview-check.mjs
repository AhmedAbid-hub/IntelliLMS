import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
await mkdir("test-results", { recursive: true });
await page.goto("http://127.0.0.1:5173/login");
await page.getByLabel("Username").waitFor();
await page.screenshot({
  path: "test-results/login-desktop.png",
  fullPage: true,
});
await page.getByLabel("Username").fill("university.student");
await page.getByLabel("Password", { exact: true }).fill("LearnTogether42!");
await page.getByRole("button", { name: "Sign in", exact: true }).click();
await page.getByRole("heading", { name: "Learning progress" }).waitFor();
await page
  .getByText("Welcome to your learning community", { exact: true })
  .waitFor();
await page.screenshot({
  path: "test-results/dashboard-desktop.png",
  fullPage: true,
});
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({
  path: "test-results/dashboard-mobile.png",
  fullPage: true,
});
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth > window.innerWidth,
);
await page.getByRole("button", { name: "Toggle navigation" }).click();
await page.getByRole("link", { name: "My courses", exact: true }).click();
await page.getByRole("link", { name: "Open course" }).first().waitFor();
await page.screenshot({
  path: "test-results/courses-mobile.png",
  fullPage: true,
});
await browser.close();
console.log(
  JSON.stringify({
    pageErrors: errors,
    mobileHorizontalOverflow: overflow,
    screenshots: [
      "login-desktop.png",
      "dashboard-desktop.png",
      "dashboard-mobile.png",
      "courses-mobile.png",
    ],
  }),
);
if (errors.length || overflow) process.exit(1);

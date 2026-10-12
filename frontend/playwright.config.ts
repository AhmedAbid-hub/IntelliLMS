import { existsSync } from "node:fs";
import { resolve } from "node:path";
const localPython = resolve(
  "..",
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const python =
  process.env.E2E_PYTHON || (existsSync(localPython) ? localPython : "python");
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `"${python}" ../scripts/e2e-server.py`,
      url: "http://127.0.0.1:8001/health/",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: "npm run dev -- --port 5174",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
      env: { VITE_API_TARGET: "http://127.0.0.1:8001" },
    },
  ],
});

import { existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { resolve } from "node:path";
const localPython = resolve(
  "..",
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);
const python =
  process.env.E2E_PYTHON || (existsSync(localPython) ? localPython : "python");
import { defineConfig } from "@playwright/test";
const frontendPort = Number(process.env.E2E_FRONTEND_PORT || 5174);
const backendPort = Number(process.env.E2E_BACKEND_PORT || 8001);
// Share one fresh database with the server and controlled auth-test helper.
// Never flush a database left by another run or the interactive application.
if (!process.env.E2E_DATABASE_DIR) {
  const runs = resolve("..", "backend", "test-results", "e2e-runs");
  mkdirSync(runs, { recursive: true });
  process.env.E2E_DATABASE_DIR = mkdtempSync(resolve(runs, "run-"));
}
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${frontendPort}`,
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: `"${python}" ../scripts/e2e-server.py`,
      url: `http://127.0.0.1:${backendPort}/health/`,
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command: `npm run dev -- --port ${frontendPort} --strictPort`,
      url: `http://127.0.0.1:${frontendPort}`,
      reuseExistingServer: false,
      env: { VITE_API_TARGET: `http://127.0.0.1:${backendPort}` },
    },
  ],
});

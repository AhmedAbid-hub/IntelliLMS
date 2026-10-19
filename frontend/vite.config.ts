import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  // The invitation link and local frontend must use the same origin/port.
  // Load only this public value; never expose backend SMTP/database secrets.
  const root = fileURLToPath(new URL("..", import.meta.url));
  const configured = process.env.FRONTEND_URL || loadEnv(mode, root, "FRONTEND_URL").FRONTEND_URL;
  const origin = new URL(configured || "http://127.0.0.1:5173");
  return {
  plugins: [react(), tailwind()],
  server: {
    port: Number(origin.port || (origin.protocol === "https:" ? 443 : 80)),
    strictPort: true,
    proxy: {
      "/api": process.env.VITE_API_TARGET || "http://127.0.0.1:8000",
      "/health": process.env.VITE_API_TARGET || "http://127.0.0.1:8000",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
  };
});

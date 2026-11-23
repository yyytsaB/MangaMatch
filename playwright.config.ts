import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// A throwaway local SQLite file. The absolute path means neither the Prisma
// CLI nor the runtime adapter can resolve it anywhere else — never Turso.
const E2E_DATABASE_URL = `file:${path.resolve(__dirname, "prisma", "e2e.db").replace(/\\/g, "/")}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } }],
  webServer: {
    // Requires a production build (`npm run build`) — CI builds first.
    command: "npm run e2e:server",
    url: `http://localhost:${PORT}`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      GEMINI_API_KEY: "e2e-not-used",
      PORT: String(PORT),
    },
  },
});

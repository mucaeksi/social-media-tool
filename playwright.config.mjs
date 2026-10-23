import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: process.env.GITHUB_ACTIONS ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:3002",
    headless: true,
    launchOptions: {
      executablePath:
        process.env.CHROMIUM_EXECUTABLE ||
        (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined),
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/e2e-server.mjs",
    url: "http://127.0.0.1:3002/api/health",
    reuseExistingServer: false,
    timeout: 15000,
  },
});

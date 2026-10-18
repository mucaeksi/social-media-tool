import { defineConfig } from "@playwright/test";
import base from "./playwright.config.mjs";

export default defineConfig({
  ...base,
  use: { ...base.use, baseURL: "http://127.0.0.1:8788" },
  webServer: {
    command: "node scripts/e2e-cloud-server.mjs",
    url: "http://127.0.0.1:8788/api/health",
    reuseExistingServer: false,
    timeout: 60000,
  },
});

import { defineConfig } from "@playwright/test";
import base from "./playwright.cloudflare.config.mjs";
export default defineConfig({ ...base, testDir: "./tests/auth-browser" });

import { install, Browser } from "@puppeteer/browsers";
import { PUPPETEER_REVISIONS } from "puppeteer-core";
import { appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The helper automates ordinary Mozilla Firefox through BiDi. Playwright's
// modified Firefox is meant for its own protocol and cannot reliably create or
// activate BiDi tabs. Test against Puppeteer's pinned, supported Mozilla build.
const installed = await install({
  browser: Browser.FIREFOX,
  buildId: PUPPETEER_REVISIONS.firefox,
  cacheDir: join(process.env.RUNNER_TEMP || tmpdir(), "sosyal-studio-test-browsers"),
});
if (process.env.GITHUB_ENV)
  await appendFile(process.env.GITHUB_ENV, `FIREFOX_EXECUTABLE=${installed.executablePath}\n`);
console.log(`Firefox test sürümü: ${PUPPETEER_REVISIONS.firefox}`);

import { PUPPETEER_REVISIONS } from "puppeteer-core";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { appendFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const diagnostic = (error) =>
  String(error?.message || error)
    .replace(/https?:\/\/\S+/g, "[Mozilla indirme adresi]")
    .slice(0, 700)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
async function retry(label, action) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await action();
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn(
        `::warning title=Firefox test kurulumu::${label}, deneme ${attempt}/3: ${diagnostic(error)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
    }
  }
}
async function main() {
  // Use the installer paired with Puppeteer, not Cloudflare's older copy.
  const pairedRequire = createRequire(import.meta.resolve("puppeteer-core"));
  const {
    install,
    Browser,
    BrowserTag,
    detectBrowserPlatform,
    resolveBuildId,
  } = await import(
    pathToFileURL(pairedRequire.resolve("@puppeteer/browsers")).href
  );
  const cacheDir = join(
    process.env.RUNNER_TEMP || tmpdir(),
    "sosyal-studio-test-browsers",
  );
  // Keep the pinned ordinary Mozilla build for BiDi. Retries do not alter the
  // source, signature policy, selected revision, or the tests that follow.
  const installed = await retry("Sabit Firefox indirmesi", () =>
    install({
      browser: Browser.FIREFOX,
      buildId: PUPPETEER_REVISIONS.firefox,
      cacheDir,
    }),
  );
  if (process.env.GITHUB_ENV)
    await appendFile(
      process.env.GITHUB_ENV,
      `FIREFOX_EXECUTABLE=${installed.executablePath}\n`,
    );
  console.log(`Firefox test sürümü: ${PUPPETEER_REVISIONS.firefox}`);
  if (process.platform === "linux") {
    const buildId = await retry("Developer Edition sürümünü çözme", () =>
      resolveBuildId(
        Browser.FIREFOX,
        detectBrowserPlatform(),
        BrowserTag.DEVEDITION,
      ),
    );
    const extension = await retry("Developer Edition indirmesi", () =>
      install({ browser: Browser.FIREFOX, buildId, cacheDir }),
    );
    if (process.env.GITHUB_ENV)
      await appendFile(
        process.env.GITHUB_ENV,
        `FIREFOX_EXTENSION_EXECUTABLE=${extension.executablePath}\n`,
      );
    console.log(`Eklenti test sürümü: ${buildId}`);
  }
}
await main().catch((error) => {
  console.error(`::error title=Firefox test kurulumu::${diagnostic(error)}`);
  process.exitCode = 1;
});

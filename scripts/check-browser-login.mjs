import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { cfApi, listAll } from "./cloudflare-api.mjs";

// An unauthenticated compatibility check. Never submits credentials or a post.
const targets = [
  { platform: "x", url: "https://x.com/i/flow/login" },
  { platform: "instagram", url: "https://www.instagram.com/accounts/login/" },
];
const report = {
  checkedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA || null,
  workflowUrl: process.env.GITHUB_RUN_ID
    ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null,
  credentialsSubmitted: false,
  postsSubmitted: false,
  results: [],
};
let session, browser, endpoint;
try {
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    const accounts = await listAll("/accounts");
    if (accounts.length !== 1) throw new Error("Tek hedef hesap gerekli.");
    accountId = accounts[0].id;
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId)) throw new Error("Geçersiz hesap.");
  endpoint = `/accounts/${accountId}/browser-rendering/devtools/browser`;
  // No recording, short idle expiry, explicit close in finally.
  const response = await cfApi(`${endpoint}?keep_alive=10000`, {
    method: "POST",
    body: {},
    rawResponse: true,
  });
  session = response?.sessionId;
  if (!session || !/^[a-zA-Z0-9-]+$/.test(session))
    throw new Error("Tarayıcı oturumu alınamadı.");
  browser = await chromium.connectOverCDP(
    `wss://api.cloudflare.com/client/v4${endpoint}/${session}`,
    {
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
      timeout: 20000,
    },
  );
  const context = browser.contexts()[0];
  for (const target of targets) {
    const page = await context.newPage();
    let stage = "navigation";
    try {
      const response = await page.goto(target.url, {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
      stage = "login-form";
      const input = page.locator(
        'input[autocomplete="username"], input[name="text"], input[name="username"], input[type="password"]',
      );
      await input
        .first()
        .waitFor({ state: "visible", timeout: 8000 })
        .catch(() => {});
      const body = (
        await page.locator("body").innerText({ timeout: 3000 })
      ).slice(0, 16000);
      const cdp = await context.newCDPSession(page);
      let liveViewAvailable = false;
      let iframeAllowed = false;
      stage = "live-view";
      try {
        const live = await cdp.send("Cloudflare.getLiveView", {
          mode: "tab",
          expiresInMs: 60000,
        });
        const url = new URL(live.devtoolsFrontendUrl);
        liveViewAvailable =
          url.protocol === "https:" && url.hostname === "live.browser.run";
        const head = await fetch(url, {
          method: "HEAD",
          signal: AbortSignal.timeout(5000),
        });
        const framing = head.headers.get("x-frame-options") || "";
        const ancestors = (
          head.headers.get("content-security-policy") || ""
        ).match(/frame-ancestors[^;]*/)?.[0];
        iframeAllowed =
          head.ok &&
          !/deny|sameorigin/i.test(framing) &&
          (!ancestors || ancestors.includes("*"));
        // Signed URLs are credentials. Never print or persist the returned URL.
      } finally {
        await cdp.detach();
      }
      report.results.push({
        platform: target.platform,
        httpStatus: response?.status() ?? null,
        loginFieldsVisible: await input.first().isVisible(),
        challengeVisible:
          /captcha|verify you are human|unusual activity|access denied|something went wrong|bir sorun oluştu/i.test(
            body,
          ),
        liveViewAvailable,
        iframeAllowed,
      });
    } catch (error) {
      // Raw Playwright errors can include connection URLs or request headers.
      report.results.push({
        platform: target.platform,
        stage,
        networkError: String(error.message).match(/net::[A-Z_]+/)?.[0] ?? null,
        timeout: error.name === "TimeoutError",
        error: "Giriş sayfası veya canlı görünüm doğrulanamadı.",
      });
    } finally {
      await page.close().catch(() => {});
    }
  }
} catch {
  report.error =
    "Cloudflare uzak tarayıcı erişimi doğrulanamadı; hesap izinleri ve hizmet durumu kontrol edilmeli.";
} finally {
  if (session) {
    try {
      await cfApi(`${endpoint}/${session}`, { method: "DELETE" });
      report.sessionClosed = true;
    } catch {
      report.sessionClosed = false;
    }
  }
  if (browser) await browser.close().catch(() => {});
  await mkdir(".cloudflare", { recursive: true });
  await writeFile(
    ".cloudflare/browser-check.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

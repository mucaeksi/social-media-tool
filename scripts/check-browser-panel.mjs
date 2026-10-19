import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { cfApi, listAll, protectSecret } from "./cloudflare-api.mjs";
import { databaseQuery } from "./admin-provision.mjs";
import { hashPassword, randomToken } from "../shared/passwords.mjs";

// Explicitly dispatched after deployment. Uses a disposable application admin;
// no social credentials or posts are submitted. Never interrupts a user's view.
const report = {
  checkedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA,
  credentialsSubmitted: false,
  postsSubmitted: false,
};
let deployment, userId, companyId, accountId, cookie, remote;
async function http(path, { method = "GET", body } = {}) {
  const response = await fetch(deployment.url + path, {
    method,
    redirect: "error",
    headers: {
      Origin: deployment.url,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(45000),
  });
  const value = response.status === 204 ? null : await response.json();
  if (!response.ok) throw new Error(`Panel kontrolü HTTP ${response.status}`);
  return { response, value };
}
try {
  const receipt = JSON.parse(
    await readFile("deployment/cloudflare.json", "utf8"),
  );
  const accounts = await listAll("/accounts");
  const target =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (accounts.length === 1 ? accounts[0].id : null);
  if (!target) throw new Error("Tek hedef hesap gerekli.");
  const subdomain = await cfApi(`/accounts/${target}/workers/subdomain`);
  if (
    receipt.url !== `https://sosyal-studio.${subdomain.subdomain}.workers.dev`
  )
    throw new Error("Yayın adresi verilen Cloudflare hesabına ait değil.");
  const databases = await listAll(`/accounts/${target}/d1/database`);
  const database = databases.find((d) => d.name === "sosyal-studio");
  if (
    !database ||
    receipt.components?.worker !== "sosyal-studio" ||
    new URL(receipt.url).protocol !== "https:"
  )
    throw new Error("Yayın yapılandırması geçersiz.");
  deployment = {
    accountId: target,
    databaseId: database.uuid || database.id,
    worker: "sosyal-studio",
    url: receipt.url,
  };
  const health = await http("/api/health");
  if (!health.value.socialBrowser)
    throw new Error("Yayında uzak tarayıcı etkin değil.");
  userId = crypto.randomUUID();
  const password = randomToken(),
    username = `browser-${userId}@example.test`,
    hash = await hashPassword(password);
  for (const secret of [password, hash])
    protectSecret(secret, { emitMask: false });
  await databaseQuery(
    deployment,
    "INSERT INTO users(id,username,email,name,password_hash,role,created_at) SELECT ?,?,?,?,?,'admin',? WHERE (SELECT COUNT(*) FROM users)<50",
    [
      userId,
      username,
      username,
      "Geçici tarayıcı denetimi",
      hash,
      new Date().toISOString(),
    ],
  );
  const login = await http("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Giriş doğrulanamadı.");
  protectSecret(cookie, { emitMask: false });
  const status = (await http("/api/social/status")).value;
  if (status.active)
    throw new Error("Kullanıcının açık tarayıcısı var; kontrol başlatılmadı.");
  companyId = (
    await http("/api/companies", {
      method: "POST",
      body: {
        name: "Geçici tarayıcı kontrolü",
        handle: "",
        website: "",
        tone: "Türkçe",
        audience: "",
        keywords: "",
        color: "#326f61",
      },
    })
  ).value.id;
  accountId = (
    await http("/api/social/accounts", {
      method: "POST",
      body: {
        companyId,
        platform: "instagram",
        label: "Geçici Instagram giriş kontrolü",
      },
    })
  ).value.id;
  const view = (
    await http(`/api/social/accounts/${accountId}/open`, { method: "POST" })
  ).value;
  protectSecret(view.viewUrl, { emitMask: false });
  const url = new URL(view.viewUrl);
  if (url.hostname !== "live.browser.run" || url.protocol !== "https:")
    throw new Error("Canlı görünüm kaynağı geçersiz.");
  const socket = url.searchParams.get("wss");
  const session = socket?.match(/\/browser\/([a-zA-Z0-9-]+)\//)?.[1];
  if (!session) throw new Error("Canlı görünüm oturumu doğrulanamadı.");
  remote = await chromium.connectOverCDP(
    `wss://api.cloudflare.com/client/v4/accounts/${target}/browser-rendering/devtools/browser/${session}`,
    {
      headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
      timeout: 15000,
    },
  );
  const page = remote
    .contexts()[0]
    .pages()
    .find((p) => p.url().startsWith("https://www.instagram.com/"));
  if (!page) throw new Error("Gerçek giriş sayfası bulunamadı.");
  await page
    .locator('input[name="username"]')
    .waitFor({ state: "visible", timeout: 10000 });
  report.loginFieldsVisible = true;
  report.liveViewAvailable = true;
  // End through the actual application's cookie-read and browser-close path.
  const ended = (
    await http(`/api/social/accounts/${accountId}/save`, { method: "POST" })
  ).value;
  if (!ended.closed || ended.saved)
    throw new Error(
      "Giriş yapılmadan oturum kaydı veya tarayıcı kapanışı hatalı.",
    );
  report.sessionClosed = true;
  report.unauthenticatedSessionNotSaved = true;
  report.verified = true;
} catch {
  report.verified = false;
  report.error =
    "Panel içindeki giriş tarayıcısı canlıda doğrulanamadı. Kimlik bilgisi girilmedi ve paylaşım yapılmadı.";
  process.exitCode = 1;
} finally {
  if (remote) await remote.close().catch(() => {});
  if (accountId && cookie) {
    try {
      await http(`/api/social/accounts/${accountId}/close`, { method: "POST" });
    } catch {}
    try {
      await http(`/api/social/accounts/${accountId}`, { method: "DELETE" });
    } catch {
      report.cleanupIncomplete = true;
    }
  }
  if (companyId && cookie) {
    try {
      await http(`/api/companies/${companyId}`, { method: "DELETE" });
    } catch {
      report.cleanupIncomplete = true;
    }
  }
  if (deployment && userId) {
    try {
      await databaseQuery(deployment, "DELETE FROM users WHERE id=?", [userId]);
    } catch {
      report.cleanupIncomplete = true;
    }
  }
  if (report.cleanupIncomplete) {
    report.verified = false;
    process.exitCode = 1;
  }
  await mkdir(".cloudflare", { recursive: true });
  await writeFile(
    ".cloudflare/browser-panel.json",
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
}

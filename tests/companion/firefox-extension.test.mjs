import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import puppeteer from "puppeteer-core";
import { extensionFiles } from "../../scripts/build-firefox-extension.mjs";
import { prepareFirefoxExtension } from "../../companion/firefox-extension.mjs";
import { prepareStudioFirefoxProfile, ensureStudioFirefox } from "../../companion/studio-firefox.mjs";

const executablePath = process.env.FIREFOX_EXTENSION_EXECUTABLE || "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr";
test("Gerçek Firefox eklentisi: otomatik kurulum, çoklu hesap, AI okuması ve şirket/kişisel gönderi ayrımı", { timeout: 240000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "studio-extension-native-"));
  const extensionId = "firefox@sosyal-studio.local", uuid = "baf10523-2fb7-4c87-a821-39ced556aba0";
  const companyId = crypto.randomUUID(), accountId = crypto.randomUUID(), secondAccountId = crypto.randomUUID();
  let user = { id: "fixture-admin", role: "admin" }, origin, browser;
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    if (request.url.startsWith("/api/auth/me")) response.end(JSON.stringify({ user }));
    else if (request.url.startsWith("/api/social/accounts")) response.end(JSON.stringify([{ id: accountId, companyId, platform: "facebook", label: "Kurgu — Facebook", profileUrl: origin + "/kurgu" }, { id: secondAccountId, companyId, platform: "facebook", label: "İkinci sayfa", profileUrl: origin + "/kurgu-ikinci" }]));
    else if (request.url.startsWith("/panel")) response.end("<!doctype html><title>Kurgu panel</title><main>Panel</main>");
    else response.end(`<!doctype html><meta charset=utf-8><title>Kurgu şirket</title><h1>Kurgu</h1>
      <a aria-label="Your profile" href="/kurgu">Kurgu</a>
      <main><p>KKTC için kurgu ürün bilgisi.</p><p hidden>hidden-private-fixture</p><p data-private>private-fixture</p>
      <div class="msg-overlay-list-bubble">message-overlay-fixture</div></main>
      <div role="dialog"><a id="actor" href="/personal">Kişisel</a>
      <div role="textbox" contenteditable="true" aria-label="Gönderi metni" style="width:200px;height:70px"></div>
      <button onclick="window.published=(window.published||0)+1">Paylaş</button></div>`);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const managedExecutable = process.platform === "win32" ? await ensureStudioFirefox(directory) : executablePath;
    for (const name of extensionFiles) {
      let text = await readFile(resolve("firefox-extension", name), "utf8");
      // Test-only copied extension permits this ephemeral fixture origin. The
      // distributed source and ZIP never contain localhost or a test bypass.
      if (name === "manifest.json") {
        const manifest = JSON.parse(text); manifest.permissions = ["tabs", "http://127.0.0.1/*"];
        manifest.content_scripts[0].matches = ["http://127.0.0.1/panel*"];
        manifest.web_accessible_resources = ["popup.html", "popup.js", "popup.css"];
        text = JSON.stringify(manifest);
      }
      if (name === "policy.js") text = text.replace('"https://sosyal-studio.sosyalstudio-06a486e459d2.workers.dev"', JSON.stringify(origin)).replace('facebook: ["facebook.com"]', 'facebook: ["127.0.0.1"]').replace('u.protocol !== "https:"', 'u.protocol !== "http:"').replace(' || u.port', '');
      if (name === "background.js") text = text.replace("}, 30000);", "}, 250);");
      await writeFile(join(directory, name), text);
    }
    const profile = await prepareStudioFirefoxProfile(directory);
    const sourceFiles = Object.fromEntries(await Promise.all(extensionFiles.map(async (name) => [name, await readFile(join(directory, name), "utf8")])));
    const bundlePath = join(directory, "test-extension.json");
    await writeFile(bundlePath, JSON.stringify({ format: 1, files: sourceFiles }));
    const managed = await prepareFirefoxExtension(directory, { profile: true, bundleURL: bundlePath });
    assert.equal(managed.changed, true);
    browser = await puppeteer.launch({ browser: "firefox", executablePath: managedExecutable, headless: true, userDataDir: profile,
      // Test-only: WebDriver may inspect the installed extension's own popup.
      args: ["--remote-allow-system-access"],
      extraPrefsFirefox: { "xpinstall.signatures.required": false, "extensions.autoDisableScopes": 0, "extensions.startupScanScopes": 1, "remote.system-access-check.enabled": false, "extensions.webextensions.uuids": JSON.stringify({ [extensionId]: uuid }) } });
    // No installExtension call: the dedicated profile loads the extension on startup.
    const panel = await browser.newPage();
    panel.on("pageerror", (e) => console.error("Panel fixture:", e.message));
    await panel.goto(origin + "/panel");
    const social = await browser.newPage(); await social.goto(origin + "/kurgu");
    const rpc = (action, extra = {}) => panel.evaluate(({ action, extra }) => new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const timer = setTimeout(() => { window.removeEventListener("message", receive); reject(new Error("Eklenti yanıt süresi doldu: " + action)); }, 10000);
      const receive = (e) => { if (e.source !== window || e.data?.source !== "sosyal-studio-firefox-v1" || e.data.id !== id) return; clearTimeout(timer); window.removeEventListener("message", receive); resolve(e.data); };
      window.addEventListener("message", receive);
      window.postMessage({ source: "sosyal-studio-panel-v1", id, action, ...extra }, location.origin);
    }), { action, extra });
    const popup = await browser.newPage();
    popup.on("pageerror", (e) => console.error("Popup fixture:", e.message));
    // Firefox BiDi does not emit load events consistently for extension pages.
    // WebDriver navigation is required: recent Firefox rejects web-page script
    // navigation into moz-extension pages even for web-accessible resources.
    await popup.goto(`moz-extension://${uuid}/popup.html`, { waitUntil: "domcontentloaded", timeout: 5000 }).catch((e) => { if (e.name !== "TimeoutError") throw e; });
    await popup.waitForFunction(() => document.querySelector("#status").textContent.length > 0);
    assert.equal((await rpc("status")).version, "1.1.0");
    assert.equal((await rpc("read", { companyId, accountId })).ok, false);
    assert.equal((await rpc("connect", { target: { companyId, accountId, companyName: "Kurgu" } })).pending, true);
    await popup.evaluate(() => refresh());
    await popup.waitForSelector("section select");
    const choiceCount = await popup.$$eval("section select option", (items) => items.length);
    assert.equal(choiceCount, 1);
    await popup.evaluate(() => document.querySelector("section input").value = "Kurgu");
    await popup.evaluate(() => [...document.querySelectorAll("section button")].find((b) => b.textContent === "Bu sekmeyi bağla").click());
    await popup.waitForFunction(() => document.querySelector("#status").textContent.includes("1 panel bağlantısı etkin"));
    assert.equal((await rpc("status")).binding.accountId, accountId);
    const windowId = (await rpc("status")).window.windowId;
    const secondTab = await popup.evaluate(({ windowId, url }) => browser.tabs.create({ windowId, url, active: false }), { windowId, url: origin + "/kurgu-ikinci" });
    await browser.waitForTarget((t) => t.url() === origin + "/kurgu-ikinci");
    await rpc("connect", { target: { companyId, accountId: secondAccountId, companyName: "Kurgu" } });
    await popup.evaluate(() => refresh());
    await popup.select("section select", String(secondTab.id));
    await popup.evaluate(() => document.querySelector("section input").value = "Kurgu");
    await popup.evaluate(() => [...document.querySelectorAll("section button")].find((b) => b.textContent === "Bu sekmeyi bağla").click());
    await popup.waitForFunction(() => document.querySelector("#status").textContent.includes("1 panel bağlantısı etkin"));
    assert.equal((await rpc("status")).bindings.length, 2);
    assert.equal((await rpc("read", { companyId, accountId: secondAccountId })).page.url, origin + "/kurgu-ikinci");
    assert.equal((await rpc("read", { companyId, accountId })).page.url, origin + "/kurgu");
    assert.equal((await rpc("select-target", { companyId, accountId })).ok, true);
    assert.equal((await rpc("status")).binding.accountId, accountId);
    const outside = await popup.evaluate((url) => browser.windows.create({ url }), origin + "/other-window");
    const outsideTabId = outside.tabs[0].id;
    const windowTabs = await rpc("tabs", { companyId });
    assert.ok(windowTabs.tabs.length >= 3);
    assert.equal(windowTabs.tabs.some((t) => t.id === outsideTabId), false);
    assert.equal((await rpc("select-tab", { companyId, tabId: outsideTabId })).ok, false, "Diğer Firefox penceresine geçilmez");
    const scope = { companyId, accountId };
    let result = await rpc("read", scope);
    assert.equal(result.ok, true);
    assert.ok(result.page.text.includes("KKTC"));
    assert.equal(/private-fixture|message-overlay-fixture/.test(result.page.text), false);
    assert.equal(result.page.canPrepare, false, "Şirket başlığı kişisel gönderi penceresi için kimlik kanıtı değildir");
    // Even a forged panel prepare cannot bypass the actual composer proof.
    await rpc("prepare", { ...scope, snapshotId: result.page.id, text: "Şirket taslağı" });
    await popup.evaluate(() => refresh()); await popup.waitForSelector("section pre");
    await popup.evaluate(() => [...document.querySelectorAll("section button")].find((b) => b.textContent === "Metni taslağa yerleştir").click());
    await popup.waitForFunction(() => document.querySelector("#status").textContent.includes("kimliği"));
    assert.equal(await social.$eval('[role=textbox]', (e) => e.innerText), "");
    await social.evaluate(() => { const a = document.querySelector("#actor"); a.href = "/kurgu"; a.textContent = "Kurgu"; });
    result = await rpc("read", scope);
    assert.equal(result.page.canPrepare, true);
    await rpc("prepare", { ...scope, snapshotId: result.page.id, text: "Şirket taslağı" });
    await popup.evaluate(() => refresh()); await popup.waitForSelector("section pre");
    await popup.evaluate(() => [...document.querySelectorAll("section button")].find((b) => b.textContent === "Metni taslağa yerleştir").click());
    await social.waitForFunction(() => document.querySelector('[role=textbox]').innerText === "Şirket taslağı");
    assert.equal(await social.evaluate(() => window.published || 0), 0, "Eklenti yayın düğmesine basmaz");
    result = await rpc("read", scope);
    await rpc("prepare", { ...scope, snapshotId: result.page.id, text: "Mevcut taslağı ezme" });
    await popup.evaluate(() => refresh()); await popup.waitForSelector("section pre");
    await popup.evaluate(() => [...document.querySelectorAll("section button")].find((b) => b.textContent === "Metni taslağa yerleştir").click());
    await popup.waitForFunction(() => document.querySelector("#status").textContent.includes("metin var"));
    assert.equal(await social.$eval('[role=textbox]', (e) => e.innerText), "Şirket taslağı");
    await social.goto(origin + "/messages");
    assert.equal((await rpc("read", scope)).ok, false);
    await social.goto(origin + "/kurgu");
    await social.evaluate(() => { const input = document.createElement("input"); input.type = "password"; input.value = "password-fixture"; document.body.append(input); });
    assert.equal((await rpc("read", scope)).ok, false);
    user = { id: "another", role: "editor" };
    assert.equal((await rpc("status")).ok, false, "Oturum değişince yetki korunmaz");
    user = { id: "fixture-admin", role: "admin" };
    await rpc("disconnect");
    sourceFiles["manifest.json"] = JSON.stringify({ ...JSON.parse(sourceFiles["manifest.json"]), version: "99.0.0" });
    await writeFile(bundlePath, JSON.stringify({ format: 1, files: sourceFiles }));
    await prepareFirefoxExtension(directory, { profile: true, bundleURL: bundlePath });
    let reloaded = false;
    for (let i = 0; i < 20; i++) {
      await panel.reload();
      try { if ((await rpc("status")).version === "99.0.0") { reloaded = true; break; } } catch { /* extension is restarting */ }
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(reloaded, true, "Yardımcının yenilediği eklenti bağlantılar kapatılınca otomatik yeniden yüklenir");
  } finally {
    await browser?.close(); server.closeAllConnections(); await new Promise((r) => server.close(r));
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

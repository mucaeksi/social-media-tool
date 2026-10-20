import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import puppeteer from "puppeteer-core";
import { extensionFiles } from "../../scripts/build-firefox-extension.mjs";

const executablePath = process.env.FIREFOX_EXECUTABLE || "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr";
test("Gerçek Firefox eklentisi: panel köprüsü, sekme onayı, AI okuması ve şirket/kişisel gönderi ayrımı", { timeout: 90000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "studio-extension-native-"));
  const extensionId = "firefox@sosyal-studio.local", uuid = "baf10523-2fb7-4c87-a821-39ced556aba0";
  const companyId = crypto.randomUUID(), accountId = crypto.randomUUID();
  let user = { id: "fixture-admin", role: "admin" }, origin, browser;
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    if (request.url.startsWith("/api/auth/me")) response.end(JSON.stringify({ user }));
    else if (request.url.startsWith("/api/social/accounts")) response.end(JSON.stringify([{ id: accountId, companyId, platform: "facebook", label: "Kurgu — Facebook", profileUrl: origin + "/kurgu" }]));
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
      await writeFile(join(directory, name), text);
    }
    browser = await puppeteer.launch({ browser: "firefox", executablePath, headless: true,
      // Test-only: WebDriver may inspect the installed extension's own popup.
      args: ["--remote-allow-system-access"],
      extraPrefsFirefox: { "remote.system-access-check.enabled": false, "extensions.webextensions.uuids": JSON.stringify({ [extensionId]: uuid }) } });
    assert.equal(await browser.installExtension(directory), extensionId);
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
    // Navigate without waiting for those events, then verify the real popup DOM.
    await popup.evaluate((url) => { location.href = url; }, `moz-extension://${uuid}/popup.html`);
    await popup.waitForFunction(() => document.querySelector("#status").textContent.length > 0);
    assert.equal((await rpc("status")).version, "1.0.0");
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
  } finally {
    await browser?.close(); server.closeAllConnections(); await new Promise((r) => server.close(r));
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});

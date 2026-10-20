import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { firefox } from "@playwright/test";
import { ProfileBrowsers } from "../../companion/browser.mjs";
const executablePath = process.env.FIREFOX_EXECUTABLE ||
  (existsSync("/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr")
    ? "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr" : firefox.executablePath());
test("Gerçek Firefox: dokuz sosyal ağ sekmesi tek pencereyi paylaşır, yeniden açılışta saklanır ve ek hesaplar ayrıdır", { timeout: 120000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), "studio-company-window-"));
  const servers = [];
  let pool;
  try {
    const urls = [];
    const platforms = ["x", "facebook", "instagram", "threads", "pinterest", "youtube", "tiktok", "linkedin", "tumblr"];
    for (const host of platforms.map((_, index) => `127.0.0.${index + 1}`)) {
      const server = createServer((_request, response) => {
        response.setHeader("Content-Type", "text/html; charset=utf-8");
        response.end("<!doctype html><title>Kurgu sosyal ağ</title><h1>Kurgu hesap</h1>");
      });
      servers.push(server);
      await new Promise((r) => server.listen(0, host, r));
      urls.push(`http://${host}:${server.address().port}/`);
    }
    const companyId = crypto.randomUUID();
    const accounts = platforms.map((platform, index) => ({
      id: crypto.randomUUID(), companyId, platform, profileUrl: urls[index], profileScope: "company",
    }));
    const legacy = join(directory, `${companyId}-${accounts[0].id}`);
    await mkdir(legacy);
    await writeFile(join(legacy, "fixture-preserved.txt"), "Eski profil korunur");
    const options = {
      directory, executablePath, headless: true, testing: true,
      platforms: Object.fromEntries(accounts.map((a, index) => [a.platform, {
        login: urls[index], home: urls[index], roots: [new URL(urls[index]).hostname],
      }])),
    };
    pool = new ProfileBrowsers(options);
    const workspace = { ...accounts[0], workspaceAccounts: accounts };
    await pool.execute(workspace, { action: "workspace", noFrame: true });
    assert.equal(pool.opened.size, 1);
    const browser = [...pool.opened.values()][0].browser;
    await pool.execute(workspace, { action: "workspace", noFrame: true });
    assert.equal((await browser.pages()).filter((p) => urls.includes(p.url())).length, 9);
    for (const [index, account] of accounts.entries()) {
      const page = (await browser.pages()).find((p) => p.url() === urls[index]);
      assert.ok(page, account.platform + " sekmesi");
      await page.evaluate((value) => localStorage.setItem("fixture", value), account.platform);
      await pool.execute(account, { action: "open", noFrame: true });
      assert.equal([...pool.opened.values()][0].browser, browser);
    }
    await pool.execute(accounts[1], { action: "close" });
    assert.equal(pool.opened.size, 0);
    pool = new ProfileBrowsers(options);
    await pool.execute(workspace, { action: "workspace", noFrame: true });
    for (const [index, account] of accounts.entries()) {
      const page = (await [...pool.opened.values()][0].browser.pages()).find((p) => p.url() === urls[index]);
      assert.equal(await page.evaluate(() => localStorage.getItem("fixture")), account.platform);
    }
    for (const account of [
      { ...accounts[0], id: crypto.randomUUID(), profileScope: "account" },
      { ...accounts[0], companyId: crypto.randomUUID(), id: crypto.randomUUID() },
    ]) {
      await pool.execute(account, { action: "open", noFrame: true });
      const browser = [...pool.opened.values()].at(-1).browser;
      const page = (await browser.pages()).find((p) => p.url() === urls[0]);
      assert.equal(await page.evaluate(() => localStorage.getItem("fixture")), null);
    }
    assert.equal(await readFile(join(legacy, "fixture-preserved.txt"), "utf8"), "Eski profil korunur");
  } finally {
    await pool?.closeAll();
    for (const server of servers) {
      server.closeAllConnections();
      await new Promise((r) => server.close(r));
    }
    await rm(directory, { recursive: true, force: true });
  }
});

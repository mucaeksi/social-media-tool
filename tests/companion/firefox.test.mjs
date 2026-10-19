import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { firefox } from "@playwright/test";
import { ProfileBrowsers } from "../../companion/browser.mjs";

const executablePath =
  process.env.FIREFOX_EXECUTABLE ||
  (existsSync("/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr")
    ? "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr"
    : firefox.executablePath());

test(
  "Gerçek Firefox: panel girdisi çalışır, kapatıp açmada çerez/localStorage/IndexedDB korunur ve şirket profilleri ayrıdır",
  { timeout: 120000 },
  async () => {
    assert.ok(
      existsSync(executablePath),
      "Firefox gerekli: geliştirme ortamında scripts/setup-firefox.sh, CI'da playwright install firefox çalıştırın.",
    );
    const directory = await mkdtemp(join(tmpdir(), "studio-firefox-test-"));
    const html = `<!doctype html><meta charset=utf-8><form onsubmit="window.fixtureSubmitted=true;return false"><textarea style="position:absolute;left:20px;top:20px;width:240px;height:32px" id=name></textarea><button type="button" style="position:absolute;left:20px;top:80px;width:240px;height:32px" onclick="save()">Kurgu giriş</button></form><script>
  async function save(){localStorage.setItem('fixture',document.querySelector('#name').value);document.cookie='fixture_login=fixture-only; Max-Age=86400; Path=/';await new Promise((resolve,reject)=>{const r=indexedDB.open('fixture-db',1);r.onupgradeneeded=()=>r.result.createObjectStore('items');r.onsuccess=()=>{const db=r.result,tx=db.transaction('items','readwrite');tx.objectStore('items').put('fixture-idb','token');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject};r.onerror=reject;});document.body.dataset.ready='yes';}
  </script>`;
    const server = createServer((req, res) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(html);
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${server.address().port}/`;
    const options = {
      directory,
      executablePath,
      headless: true,
      testing: true,
      platforms: {
        x: {
          login: url,
          home: url,
          roots: ["127.0.0.1"],
          cookie: "fixture_login",
        },
      },
    };
    let pool = new ProfileBrowsers(options);
    const account = {
      id: crypto.randomUUID(),
      companyId: crypto.randomUUID(),
      platform: "x",
      profileUrl: url,
    };
    try {
      const opened = await pool.execute(account, { action: "open" });
      assert.ok(opened.frame.startsWith("/9j/"));
      assert.equal(opened.loginVerified, false);
      await pool.execute(account, { action: "click", x: 30, y: 30 });
      await pool.execute(account, {
        action: "type",
        text: "Türkçe firma profili\nİkinci satır",
      });
      await pool.execute(account, { action: "click", x: 30, y: 90 });
      let page = (await [...pool.opened.values()][0].browser.pages())[0];
      await page.waitForFunction(() => document.body.dataset.ready === "yes");
      assert.equal(
        await page.evaluate(() => localStorage.getItem("fixture")),
        "Türkçe firma profili\nİkinci satır",
      );
      assert.equal(
        await page.evaluate(() => window.fixtureSubmitted),
        undefined,
      );
      const closed = await pool.execute(account, { action: "close" });
      assert.equal(closed.authDetected, true);
      await pool.closeAll();
      pool = new ProfileBrowsers(options);
      await pool.execute(account, { action: "open" });
      page = (await [...pool.opened.values()][0].browser.pages()).find((p) =>
        p.url().startsWith(url),
      );
      assert.equal(
        await page.evaluate(() => localStorage.getItem("fixture")),
        "Türkçe firma profili\nİkinci satır",
      );
      assert.ok(
        (await page.evaluate(() => document.cookie)).includes(
          "fixture_login=fixture-only",
        ),
      );
      const stored = await page.evaluate(
        () =>
          new Promise((resolve, reject) => {
            const r = indexedDB.open("fixture-db", 1);
            r.onsuccess = () => {
              const db = r.result,
                q = db.transaction("items").objectStore("items").get("token");
              q.onsuccess = () => {
                db.close();
                resolve(q.result);
              };
              q.onerror = reject;
            };
            r.onerror = reject;
          }),
      );
      assert.equal(stored, "fixture-idb");
      const other = {
        ...account,
        id: crypto.randomUUID(),
        companyId: crypto.randomUUID(),
      };
      const fresh = await pool.execute(other, { action: "open" });
      assert.equal(fresh.authDetected, false);
      const otherBrowser = [...pool.opened.values()].at(-1).browser,
        otherPage = (await otherBrowser.pages())[0];
      assert.equal(
        await otherPage.evaluate(() => localStorage.getItem("fixture")),
        null,
      );
      assert.equal(await otherPage.evaluate(() => document.cookie), "");
      await assert.rejects(
        pool.execute({ ...account, id: "../escape" }, { action: "open" }),
      );
      await assert.rejects(
        pool.execute(account, { action: "evaluate", code: "malicious" }),
      );
    } finally {
      await pool.closeAll();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await rm(directory, { recursive: true, force: true });
    }
  },
);

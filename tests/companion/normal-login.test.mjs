import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "node:http";
import { ProfileBrowsers } from "../../companion/browser.mjs";

const executablePath = process.env.FIREFOX_EXECUTABLE ||
  "/workspace/.tools/firefox/usr/lib/firefox-esr/firefox-esr";
const pause = () => new Promise((resolve) => setTimeout(resolve, 20));
async function until(predicate) {
  for (let i = 0; i < 1500; i++) {
    if (await predicate()) return;
    await pause();
  }
  throw new Error("Firefox geçişi tamamlanmadı.");
}

test("Normal giriş eski otomasyon penceresini kapatır; aynı profile ikinci sahip ve panel girdisi engellenir", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "studio-normal-fixture-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const account = { id: crypto.randomUUID(), companyId: crypto.randomUUID(), platform: "youtube", profileScope: "company" };
  const key = `company-${account.companyId}`;
  let launches = 0, closed = false, finish;
  const exited = new Promise((r) => { finish = r; });
  const pool = new ProfileBrowsers({ directory, executablePath: "fixture", launchNormal: async ({ userDataDir, url }) => {
    assert.equal(closed, true);
    assert.equal(userDataDir, join(directory, key));
    assert.ok(url.startsWith("https://accounts.google.com/"));
    launches++;
    return { exited };
  }, launch: () => assert.fail("Normal giriş sürerken otomasyon açılmamalı") });
  pool.opened.set(key, { browser: { close: async () => { closed = true; } } });
  const result = await pool.execute(account, { action: "manual-login" });
  assert.equal(result.manualRunning, true);
  assert.equal(result.loginVerified, false);
  assert.equal(result.frame, undefined);
  assert.equal(pool.opened.size, 0);
  await pool.execute(account, { action: "manual-login" });
  assert.equal(launches, 1);
  assert.equal((await pool.execute(account, { action: "open" })).manualRunning, true);
  await assert.rejects(pool.execute(account, { action: "type", text: "fixture" }));
  await assert.rejects(pool.execute(account, { action: "prepare", jobId: crypto.randomUUID(), fingerprint: "a".repeat(64), identityLabel: "Kurgu", text: "Kurgu" }));
  assert.equal((await pool.execute(account, { action: "close" })).manualRunning, true);
  assert.equal(pool.manualOpened.size, 1, "Paneli kapatmak normal Firefox’u kapatmaz");
  finish(0);
  await until(() => pool.manualOpened.size === 0);
  assert.equal((await pool.execute(account, { action: "manual-status" })).manualRunning, false);
  await assert.rejects(pool.execute({ ...account, companyId: "../outside" }, { action: "manual-login" }));
  for (let i = 0; i < 3; i++) pool.manualOpened.set(`other-${i}`, {});
  await assert.rejects(pool.execute(account, { action: "manual-login" }));
  await assert.rejects(pool.execute(account, { action: "open" }));
  assert.equal(launches, 1, "Üç açık normal pencere varken yeni süreç açılmaz");
});

test("Gerçek normal Firefox: WebDriver kapalıdır; otomasyon → normal giriş → otomasyon çerez/IndexedDB/profil verisini korur", { timeout: 120000 }, async () => {
  assert.ok(existsSync(executablePath), "Normal Firefox testi için FIREFOX_EXECUTABLE gerekli.");
  const directory = await mkdtemp(join(tmpdir(), "studio-normal-firefox-"));
  let report, finishResponse, normal, failure;
  let phase = "otomasyon açılışı";
  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/report") {
      report = JSON.parse(url.searchParams.get("data"));
      response.end("ok");
    } else if (url.pathname === "/finish") {
      finishResponse = response;
    } else {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><title>Kurgu giriş</title><script>
        if (!navigator.webdriver) (async () => {
          const seed = localStorage.getItem('seed');
          localStorage.setItem('normal-login','fixture-normal');
          document.cookie='normal_cookie=fixture; Max-Age=86400; Path=/';
          await new Promise((resolve,reject)=>{
            const r=indexedDB.open('normal-db',1);
            r.onupgradeneeded=()=>r.result.createObjectStore('items');
            r.onsuccess=()=>{ const db=r.result,tx=db.transaction('items','readwrite');
              tx.objectStore('items').put('fixture-idb','token');
              tx.oncomplete=()=>{db.close();resolve()};tx.onerror=reject; };
            r.onerror=reject;
          });
          await fetch('/report?data='+encodeURIComponent(JSON.stringify({webdriver:navigator.webdriver,seed})));
          await fetch('/finish');
          window.close();
        })();
      </script>`);
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}/`;
  const account = { id: crypto.randomUUID(), companyId: crypto.randomUUID(), platform: "youtube", profileScope: "company", profileUrl: url };
  const pool = new ProfileBrowsers({ directory, executablePath, headless: true, testing: true,
    platforms: { youtube: { home: url, login: url, roots: ["127.0.0.1"] } },
  });
  const profile = join(directory, `company-${account.companyId}`);
  try {
    await pool.execute(account, { action: "open", noFrame: true });
    let page = (await [...pool.opened.values()][0].browser.pages()).find((p) => p.url() === url);
    assert.equal(await page.evaluate(() => navigator.webdriver), true);
    await page.evaluate(() => localStorage.setItem("seed", "fixture-automation"));
    await pool.execute(account, { action: "close" });
    phase = "normal Firefox açılışı";
    // Only the synthetic test page may close its own window, to exercise a
    // graceful OS-process exit on Windows too. Production preferences are untouched.
    await writeFile(join(profile, "user.js"),
      (await readFile(join(profile, "user.js")).catch(() => Buffer.alloc(0))) + '\nuser_pref("dom.allow_scripts_to_close_windows", true);\n');
    await pool.execute(account, { action: "manual-login" });
    normal = [...pool.manualOpened.values()][0];
    phase = "normal Firefox sayfası ve WebDriver denetimi";
    await until(() => report && finishResponse);
    assert.deepEqual(report, { webdriver: false, seed: "fixture-automation" });
    assert.equal((await pool.execute(account, { action: "workspace", noFrame: true })).manualRunning, true);
    await assert.rejects(pool.execute(account, { action: "screen" }));
    finishResponse.end("ok");
    phase = "normal Firefox kapanışı";
    assert.equal(await normal.exited, 0);
    await until(() => pool.manualOpened.size === 0);
    await pool.execute(account, { action: "open", noFrame: true });
    phase = "korunan oturum verileri";
    page = (await [...pool.opened.values()][0].browser.pages()).find((p) => p.url() === url);
    assert.equal(await page.evaluate(() => navigator.webdriver), true);
    assert.equal(await page.evaluate(() => localStorage.getItem("normal-login")), "fixture-normal");
    assert.match(await page.evaluate(() => document.cookie), /normal_cookie=fixture/);
    assert.equal(await page.evaluate(() => new Promise((resolve, reject) => {
      const r=indexedDB.open("normal-db",1);
      r.onsuccess=()=>{const db=r.result,q=db.transaction("items").objectStore("items").get("token");
        q.onsuccess=()=>{db.close();resolve(q.result)};q.onerror=reject;};r.onerror=reject;
    })), "fixture-idb");
  } catch (error) {
    failure = error;
    error.message = `${phase}: ${error.message}`;
  } finally {
    finishResponse?.end("ok");
    await pool.closeAll();
    if (normal?.child.exitCode === null) {
      await Promise.race([normal.exited, new Promise((r) => setTimeout(r, 2000))]);
      if (normal.child.exitCode === null) normal.child.kill();
    }
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
      .catch((error) => { failure ||= error; });
  }
  if (failure) throw failure;
});

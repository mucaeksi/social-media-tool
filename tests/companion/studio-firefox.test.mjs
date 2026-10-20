import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ensureStudioFirefox, downloadFirefoxInstaller, prepareStudioFirefoxProfile } from "../../companion/studio-firefox.mjs";
import { prepareFirefoxExtension } from "../../companion/firefox-extension.mjs";
async function root(t) { const d = await mkdtemp(join(tmpdir(), "studio-firefox-install-")); t.after(() => rm(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })); return d; }
test("Firefox kurucusu imza onayından önce yürütülmez; mevcut kurulum tekrar indirilmez", async (t) => {
  const d = await root(t); let ran = 0, downloads = 0, valid = false;
  const opts = { download: async (p) => { downloads++; await writeFile(p, "fixture"); }, verify: async () => { if (!valid) throw new Error("İmza geçersiz"); }, runInstaller: async () => { ran++; await mkdir(join(d, "FirefoxDeveloper")); await writeFile(join(d, "FirefoxDeveloper/firefox.exe"), "fixture"); } };
  await assert.rejects(ensureStudioFirefox(d, opts), /İmza/); assert.equal(ran, 0);
  valid = true; await ensureStudioFirefox(d, opts); assert.equal(ran, 1);
  await ensureStudioFirefox(d, opts); assert.equal(downloads, 2); assert.equal(ran, 1);
});
test("Firefox indirmesi yabancı yönlendirmeyi reddeder; yalnız özel profil ve eklenti klasörü güncellenir", async (t) => {
  const d = await root(t);
  await assert.rejects(downloadFirefoxInstaller(join(d, "bad.exe"), async () => new Response(null, { status: 302, headers: { Location: "https://evil.example/firefox.exe" } })), /Mozilla/);
  const profile = await prepareStudioFirefoxProfile(d);
  await writeFile(join(profile, "cookies.sqlite"), "giriş korunur");
  await writeFile(join(profile, "user.js"), 'user_pref("test.original",true);\n');
  await prepareStudioFirefoxProfile(d);
  assert.match(await readFile(join(profile, "user.js"), "utf8"), /test.original/);
  const a = await prepareFirefoxExtension(d, { profile: true });
  const b = await prepareFirefoxExtension(d, { profile: true });
  assert.equal(a.changed, true); assert.equal(b.changed, false);
  assert.match(await readFile(join(profile, "extensions/firefox@sosyal-studio.local/managed.js"), "utf8"), /true/);
  assert.equal(await readFile(join(profile, "cookies.sqlite"), "utf8"), "giriş korunur");
});
test("Firefox indirme ilerlemesi gerçek yazılan baytları bildirir; kurucu doğrulanmadan çalıştırılmaz", async (t) => {
  const d = await root(t), bytes = Buffer.alloc(150000, 37), progress = [];
  await downloadFirefoxInstaller(join(d, "test.exe"), async () => new Response(bytes, { headers: { "content-length": String(bytes.length) } }), (value) => progress.push(value));
  assert.deepEqual(await readFile(join(d, "test.exe")), bytes);
  assert.equal(progress.at(-1).bytes, bytes.length); assert.equal(progress.at(-1).total, bytes.length);
});

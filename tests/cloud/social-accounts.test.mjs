import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { tokenDigest } from "../../shared/passwords.mjs";
import {
  accountCookies,
  sealCookies,
  openCookies,
  reserveBrowserTime,
  settleBrowserTime,
} from "../../worker/browser-state.mjs";
import { SocialBrowser } from "../../worker/social-browser.mjs";

const secret = Buffer.alloc(32, 7).toString("base64url");
const base = "https://studio.example",
  companyId = crypto.randomUUID(),
  otherId = crypto.randomUUID();
const tokens = { admin: "A".repeat(43), editor: "B".repeat(43) };
let mf, db;
async function request(path, { method = "GET", body, role = "admin" } = {}) {
  return mf.dispatchFetch(base + path, {
    method,
    headers: {
      Origin: base,
      ...(role ? { Cookie: `__Host-studio_session=${tokens[role]}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: ".worker-build/index.js",
    compatibilityDate: "2026-07-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "social-accounts" },
    durableObjects: { SOCIAL_BROWSER: "SocialBrowser" },
    bindings: {
      APP_ENV: "production",
      AUTH_MODE: "password",
      BROWSER_STATE_KEY: secret,
    },
    serviceBindings: { ASSETS: () => new Response("Studio") },
  });
  db = await mf.getD1Database("DB");
  for (const name of [
    "0001_studio.sql",
    "0002_d1_media.sql",
    "0003_r2_budget.sql",
    "0004_users.sql",
    "0005_social_accounts.sql",
  ])
    for (const sql of (await readFile(`migrations/${name}`, "utf8"))
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  for (const id of [companyId, otherId])
    await db
      .prepare("INSERT INTO companies(id,data,created_at) VALUES(?,?,?)")
      .bind(
        id,
        JSON.stringify({
          name: "Deneme şirketi",
          handle: "",
          website: "",
          tone: "",
          audience: "",
          keywords: "",
          color: "#326f61",
        }),
        new Date().toISOString(),
      )
      .run();
  for (const role of ["admin", "editor"]) {
    await db
      .prepare(
        "INSERT INTO users(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        role,
        role,
        `${role}@example.test`,
        role,
        "not-used-for-login",
        role,
        new Date().toISOString(),
      )
      .run();
    await db
      .prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      )
      .bind(
        await tokenDigest(tokens[role]),
        role,
        Math.floor(Date.now() / 1000) + 600,
      )
      .run();
  }
});
after(async () => {
  await mf?.dispose();
});

test("Sosyal hesaplar oturumsuz ve editör erişimine kapalıdır; durum tarayıcı başlatmaz", async () => {
  for (const path of [
    "/api/social/status",
    `/api/social/accounts?companyId=${companyId}`,
  ]) {
    assert.equal((await request(path, { role: null })).status, 401);
    assert.equal((await request(path, { role: "editor" })).status, 403);
  }
  const status = await request("/api/social/status");
  assert.equal(status.status, 200);
  const data = await status.json();
  assert.equal(data.active, null);
  assert.equal(data.usedMs, 0);
  assert.equal(data.limits.dailyMs, 600000);
});

test("Şirket hesapları ayrı listelenir; şifreli çerezler API yanıtına çıkmaz ve silmede temizlenir", async () => {
  const response = await request("/api/social/accounts", {
    method: "POST",
    body: { companyId, platform: "instagram", label: "Marka hesabı" },
  });
  assert.equal(response.status, 201);
  const account = await response.json();
  const cookie = {
    name: "sessionid",
    value: "fixture-cookie-not-a-real-credential",
    domain: ".instagram.com",
    path: "/",
    expires: -1,
  };
  const encrypted = await sealCookies([cookie], account, secret);
  await db
    .prepare(
      "UPDATE social_accounts SET encrypted_cookies=?,saved_at=? WHERE id=?",
    )
    .bind(encrypted, new Date().toISOString(), account.id)
    .run();
  const list = await (
    await request(`/api/social/accounts?companyId=${companyId}`)
  ).json();
  assert.equal(list[0].hasSession, true);
  assert.equal(list[0].encryptedCookies, undefined);
  assert.ok(!JSON.stringify(list).includes(cookie.value));
  assert.deepEqual(
    await (await request(`/api/social/accounts?companyId=${otherId}`)).json(),
    [],
  );
  assert.equal(
    (
      await request(`/api/social/accounts/${account.id}/paste`, {
        method: "POST",
        body: { text: "Deneme" },
      })
    ).status,
    410,
  );
  assert.equal(
    (await request(`/api/social/accounts/${account.id}`, { method: "DELETE" }))
      .status,
    204,
  );
  assert.equal(
    await db
      .prepare("SELECT id FROM social_accounts WHERE id=?")
      .bind(account.id)
      .first(),
    null,
  );
});

test("Paralel hesap ekleme şirket başına 25 kayıt sınırını aşamaz", async () => {
  const results = await Promise.all(
    Array.from({ length: 26 }, (_, i) =>
      request("/api/social/accounts", {
        method: "POST",
        body: { companyId: otherId, platform: "x", label: `Hesap ${i}` },
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 25);
  assert.equal(results.filter((r) => r.status === 409).length, 1);
  assert.equal(
    (await request(`/api/companies/${otherId}`, { method: "DELETE" })).status,
    204,
  );
  assert.equal(
    (
      await db
        .prepare("SELECT COUNT(*) AS n FROM social_accounts WHERE company_id=?")
        .bind(otherId)
        .first()
    ).n,
    0,
  );
});

test("Oturum şifrelemesi şirket, hesap, platform ve anahtara bağlıdır; başka alan adı çerezi kaydedilmez", async () => {
  const account = {
    id: "hesap-1",
    companyId: "firma-1",
    platform: "instagram",
  };
  const cookies = [
    {
      name: "sessionid",
      value: "deneme",
      domain: ".instagram.com",
      expires: -1,
    },
    { name: "bad", value: "deneme", domain: ".evilinstagram.com", expires: -1 },
    { name: "expired", value: "deneme", domain: ".instagram.com", expires: 1 },
  ];
  assert.equal(accountCookies(cookies, "instagram").length, 1);
  const value = await sealCookies(cookies, account, secret);
  assert.ok(!value.includes("sessionid"));
  assert.deepEqual(await openCookies(value, account, secret), [cookies[0]]);
  for (const changed of [
    { ...account, companyId: "firma-2" },
    { ...account, id: "hesap-2" },
    { ...account, platform: "x" },
  ])
    await assert.rejects(openCookies(value, changed, secret));
  await assert.rejects(
    openCookies(value, account, Buffer.alloc(32, 9).toString("base64url")),
  );
});

test("Tarayıcı süresi UTC gününde kalır; kota dolunca açılmaz ve ertesi gün yenilenir", () => {
  const now = Date.parse("2026-10-18T12:00:00Z");
  const first = reserveBrowserTime(null, now);
  assert.equal(first.duration, 180000);
  assert.equal(first.reservedMs, 210000);
  assert.throws(
    () => reserveBrowserTime({ day: "2026-10-18", usedMs: 590000 }, now),
    /bütçesi doldu/,
  );
  assert.equal(
    reserveBrowserTime({ day: "2026-10-17", usedMs: 600000 }, now).budget
      .usedMs,
    210000,
  );
  assert.throws(
    () => reserveBrowserTime(null, Date.parse("2026-10-18T23:59:40Z")),
    /bütçesi doldu/,
  );
  const nearMidnight = reserveBrowserTime(
    null,
    Date.parse("2026-10-18T23:58:00Z"),
  );
  assert.equal(nearMidnight.duration, 90000);
  const active = {
    day: "2026-10-18",
    startedAt: now,
    reservedMs: first.reservedMs,
  };
  assert.equal(
    settleBrowserTime(first.budget, active, now + 10000).usedMs,
    40000,
  );
  assert.equal(
    settleBrowserTime(first.budget, active, now + 240000).usedMs,
    270000,
  );
  assert.deepEqual(
    settleBrowserTime(first.budget, active, Date.parse("2026-10-19T00:00:05Z")),
    { day: "2026-10-19", usedMs: 35000 },
  );
});

function controller() {
  const records = new Map(),
    state = {
      cookies: [],
      restored: [],
      closed: true,
      editable: false,
      failClose: false,
      writes: [],
    };
  const storage = {
    async get(key) {
      return structuredClone(records.get(key));
    },
    async put(key, value) {
      if (typeof key === "string") records.set(key, structuredClone(value));
      else
        for (const [k, v] of Object.entries(key))
          records.set(k, structuredClone(v));
    },
    async delete(key) {
      records.delete(key);
    },
    async setAlarm(time) {
      state.alarm = time;
    },
    async deleteAlarm() {
      state.alarm = null;
    },
  };
  let url = "about:blank";
  const page = {
    url: () => url,
    async goto(next) {
      url = next;
    },
    async setViewport() {},
    async evaluate() {
      return state.editable;
    },
    keyboard: {
      async insertText(value) {
        state.writes.push(value);
      },
    },
    async createCDPSession() {
      return {
        async detach() {},
        connection() {
          return {
            async send(method) {
              assert.equal(method, "Browser.close");
              if (state.failClose) throw new Error("fixture-private-url");
              state.closed = true;
            },
          };
        },
        async send(method, params) {
          if (method === "Cloudflare.getLiveView")
            return {
              devtoolsFrontendUrl:
                "https://live.browser.run/ui/view?jwt=fixture-signed-link",
            };
          if (method === "Storage.getCookies")
            return { cookies: state.cookies };
          if (method === "Storage.setCookies") state.restored = params.cookies;
          if (method === "Browser.close") {
            throw new Error("Browser.close sayfa oturumuna gönderilemez.");
          }
        },
      };
    },
  };
  const browser = {
    async pages() {
      return [page];
    },
    async newPage() {
      return page;
    },
    disconnect() {},
    async close() {
      if (state.failClose) throw new Error("fixture-private-url");
      state.closed = true;
    },
  };
  const driver = {
    async acquire() {
      state.closed = false;
      return { sessionId: "fixture-session" };
    },
    async connect() {
      if (state.closed) throw new Error("gone");
      return browser;
    },
    async sessions() {
      return state.closed ? [] : [{ sessionId: "fixture-session" }];
    },
  };
  const saved = [];
  const env = {
    BROWSER: {},
    BROWSER_STATE_KEY: secret,
    DB: {
      prepare() {
        return {
          bind(...args) {
            saved.push(args);
            return {
              async run() {
                return { meta: { changes: 1 } };
              },
            };
          },
        };
      },
    },
  };
  const object = new SocialBrowser({ storage }, env, driver);
  const account = {
    id: "account-1",
    companyId: "company-1",
    platform: "instagram",
  };
  const command = (action, extra = {}) =>
    object.fetch(
      new Request("https://browser.internal", {
        method: "POST",
        body: JSON.stringify({ action, account, userId: "admin-1", ...extra }),
      }),
    );
  return { object, state, saved, account, command, storage };
}

test("Açık tarayıcı başka şirket/kullanıcıya devredilmez; metin yalnızca seçilen gönderi alanına aktarılır", async () => {
  const f = controller();
  assert.equal((await f.command("open")).status, 200);
  assert.equal(
    (await f.command("open", { account: { ...f.account, id: "other" } }))
      .status,
    409,
  );
  assert.equal((await f.command("open", { userId: "admin-2" })).status, 409);
  assert.equal((await f.command("paste", { text: "Metin" })).status, 400);
  assert.deepEqual(f.state.writes, []);
  f.state.editable = true;
  const pasted = await f.command("paste", { text: "Metin" });
  assert.equal(pasted.status, 200);
  assert.deepEqual(await pasted.json(), { inserted: true, published: false });
  assert.deepEqual(f.state.writes, ["Metin"]);
  const ended = await (await f.command("save")).json();
  assert.equal(ended.saved, false);
  assert.equal(ended.closed, true);
  assert.equal(f.saved.length, 0);
});

test("Kaydetme yalnızca şifreli kendi hesap çerezini yazar; otomatik kapanış gerçek tarayıcıyı sonlandırır", async () => {
  const f = controller();
  await f.command("open");
  f.state.cookies = [
    {
      name: "sessionid",
      value: "test-session",
      domain: ".instagram.com",
      expires: -1,
    },
  ];
  const ended = await (await f.command("save")).json();
  assert.equal(ended.saved, true);
  assert.equal(ended.cookieReadVerified, true);
  assert.equal(f.state.closed, true);
  assert.ok(!f.saved[0][0].includes("test-session"));
  const cookies = await openCookies(f.saved[0][0], f.account, secret);
  assert.equal(cookies[0].value, "test-session");
  await f.command("open", {
    account: { ...f.account, encryptedCookies: f.saved[0][0] },
  });
  assert.deepEqual(f.state.restored, cookies);
  await f.object.alarm();
  assert.equal(f.state.closed, true);
  assert.equal((await (await f.command("status")).json()).active, null);
});

test("Kapanışı belirsiz tarayıcı için yeni hesap açılmaz; bütçe ve yeniden deneme alarmı korunur", async () => {
  const f = controller();
  await f.command("open");
  f.state.failClose = true;
  const result = await (await f.command("close")).json();
  assert.equal(result.closed, false);
  assert.ok(f.state.alarm);
  const budget = await f.storage.get("budget");
  assert.equal(budget.usedMs, 210000);
  assert.equal(
    (await f.command("open", { account: { ...f.account, id: "other" } }))
      .status,
    503,
  );
  f.state.failClose = false;
  await f.object.alarm();
  assert.equal(f.state.closed, true);
});

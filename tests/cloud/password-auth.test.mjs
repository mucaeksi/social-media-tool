import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import {
  hashPassword,
  verifyPassword,
  tokenDigest,
} from "../../shared/passwords.mjs";

let mf, db, adminHash;
const password = "Guvenli.Test.2026!",
  base = "https://studio.example";
async function request(
  path,
  { method = "GET", body, cookie, headers = {} } = {},
) {
  return mf.dispatchFetch(base + path, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(!["GET", "HEAD"].includes(method) ? { Origin: base } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function login(username = "yonetici", pass = password, headers = {}) {
  const response = await request("/api/auth/login", {
    method: "POST",
    body: { username, password: pass },
    headers,
  });
  return {
    response,
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: ".worker-build/index.js",
    compatibilityDate: "2026-07-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "password-auth" },
    bindings: {
      APP_ENV: "production",
      AUTH_MODE: "password",
      LOCAL_AUTH_BYPASS: "true",
    },
    serviceBindings: { ASSETS: () => new Response("Sosyal Studio") },
  });
  db = await mf.getD1Database("DB");
  for (const name of [
    "0001_studio.sql",
    "0002_d1_media.sql",
    "0003_r2_budget.sql",
    "0004_users.sql",
  ])
    for (const sql of (await readFile(`migrations/${name}`, "utf8"))
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  adminHash = await hashPassword(password);
  for (const [id, username, email, role] of [
    ["admin", "yonetici", "yonetici@example.test", "admin"],
    ["editor", "editor", "editor@example.test", "editor"],
  ])
    await db
      .prepare(
        "INSERT INTO users(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        username,
        email,
        username,
        adminHash,
        role,
        new Date().toISOString(),
      )
      .run();
});
after(async () => {
  await mf?.dispose();
});
beforeEach(async () => {
  await db.prepare("DELETE FROM auth_attempts").run();
  await db.prepare("DELETE FROM sessions").run();
});

test("Giriş HTML'i açıktır; API, localhost istisnası ve eski Access başlığı oturumsuz veri açamaz", async () => {
  assert.equal((await request("/")).status, 200);
  for (const path of [
    "/api/auth/me",
    "/api/companies",
    "/api/drafts",
    "/api/admin/users",
  ])
    assert.equal((await request(path)).status, 401);
  assert.equal(
    (
      await request("/api/companies", {
        headers: {
          "Cf-Access-Jwt-Assertion": "old-token",
          "Cf-Access-Authenticated-User-Email": "yonetici@example.test",
        },
      })
    ).status,
    401,
  );
  assert.equal(
    (await mf.dispatchFetch("http://localhost/api/companies")).status,
    401,
  );
});
test("Şifreler farklı tuzlarla özetlenir; doğru şifre doğrulanır ve yanlış şifre reddedilir", async () => {
  const other = await hashPassword(password);
  assert.notEqual(adminHash, other);
  assert.equal(await verifyPassword(password, adminHash), true);
  assert.equal(await verifyPassword("yanlis", adminHash), false);
  assert.equal(await verifyPassword(password, "not-a-password-record"), false);
});
test("Kullanıcı adı ve e-posta ile giriş güvenli çerez verir; yalnızca token özeti D1'de kalır", async () => {
  for (const username of ["YONETICI", "YONETICI@EXAMPLE.TEST"]) {
    const { response, cookie } = await login(username);
    assert.equal(response.status, 200);
    const set = response.headers.get("set-cookie");
    for (const flag of [
      "__Host-studio_session=",
      "HttpOnly",
      "Secure",
      "SameSite=Strict",
      "Max-Age=28800",
    ])
      assert.ok(set.includes(flag));
    const user = await response.json();
    assert.equal(user.user.role, "admin");
    assert.equal(JSON.stringify(user).includes(adminHash), false);
    const raw = cookie.split("=")[1],
      stored = await db
        .prepare("SELECT token_hash FROM sessions WHERE token_hash=?")
        .bind(await tokenDigest(raw))
        .first();
    assert.ok(stored);
    assert.notEqual(stored.token_hash, raw);
    assert.equal((await request("/api/companies", { cookie })).status, 200);
  }
});
test("Yanlış şifre ve olmayan kullanıcı aynı hatayı verir; oturum oluşturulmaz", async () => {
  const wrong = await login("yonetici", "yanlis-sifre");
  const missing = await login("yok", "yanlis-sifre");
  assert.equal(wrong.response.status, 401);
  assert.equal(missing.response.status, 401);
  assert.deepEqual(await wrong.response.json(), await missing.response.json());
  assert.equal(wrong.cookie, undefined);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS total FROM sessions").first()).total,
    0,
  );
});
test("Süresi dolan veya çıkış yapılan oturum yeniden kullanılamaz", async () => {
  let { cookie } = await login();
  await db.prepare("UPDATE sessions SET expires_at=0").run();
  assert.equal((await request("/api/auth/me", { cookie })).status, 401);
  ({ cookie } = await login());
  const out = await request("/api/auth/logout", { method: "POST", cookie });
  assert.equal(out.status, 204);
  assert.match(out.headers.get("set-cookie"), /Max-Age=0/);
  assert.equal((await request("/api/companies", { cookie })).status, 401);
});
test("Editör hesap açamaz; yönetici kullanıcı oluşturur ve şifre özeti yanıtta dönmez", async () => {
  const editor = await login("editor");
  assert.equal(
    (await request("/api/admin/users", { cookie: editor.cookie })).status,
    403,
  );
  assert.equal(
    (
      await request("/api/admin/users", {
        method: "POST",
        cookie: editor.cookie,
        body: {},
      })
    ).status,
    403,
  );
  const admin = await login();
  const created = await request("/api/admin/users", {
    method: "POST",
    cookie: admin.cookie,
    body: {
      username: "yeni",
      email: "yeni@example.test",
      name: "Yeni kullanıcı",
      password,
      role: "editor",
    },
  });
  assert.equal(created.status, 201);
  const user = await created.json();
  assert.equal(user.role, "editor");
  assert.equal(user.password_hash, undefined);
  const list = await (
    await request("/api/admin/users", { cookie: admin.cookie })
  ).json();
  assert.ok(list.every((u) => !u.password_hash));
  assert.equal((await login("yeni")).response.status, 200);
  await db.prepare("DELETE FROM users WHERE id=?").bind(user.id).run();
});
test("Devre dışı hesap eski oturumla veya doğru şifreyle giriş yapamaz", async () => {
  const { cookie } = await login();
  await db.prepare("UPDATE users SET enabled=0 WHERE id='admin'").run();
  try {
    assert.equal((await request("/api/companies", { cookie })).status, 401);
    assert.equal((await login()).response.status, 401);
  } finally {
    await db.prepare("UPDATE users SET enabled=1 WHERE id='admin'").run();
  }
});
test("Giriş ve oturumlu yazma istekleri yabancı veya eksik Origin ile reddedilir", async () => {
  for (const Origin of ["", "https://foreign.example"])
    assert.equal(
      (await login("yonetici", password, { Origin })).response.status,
      403,
    );
  const { cookie } = await login();
  assert.equal(
    (
      await request("/api/companies", {
        method: "POST",
        cookie,
        headers: { Origin: "" },
        body: { name: "CSRF" },
      })
    ).status,
    403,
  );
  const oversized = await request("/api/auth/login", {
    method: "POST",
    body: { username: "x", password: "x".repeat(9000) },
  });
  assert.equal(oversized.status, 413);
});
test("Paralel kaba kuvvet girişleri IP kotasını aşamaz ve süre dolunca yeniden açılır", async () => {
  const outcomes = await Promise.all(
    Array.from({ length: 12 }, () => login("yok", "yanlis-sifre")),
  );
  assert.equal(outcomes.filter((r) => r.response.status === 429).length, 2);
  assert.ok(
    Number(
      outcomes
        .find((r) => r.response.status === 429)
        .response.headers.get("retry-after"),
    ) > 0,
  );
  await db.prepare("UPDATE auth_attempts SET window=0").run();
  assert.equal((await login("yok", "yanlis-sifre")).response.status, 401);
});
test("Farklı IP'lerden aynı kullanıcıya yapılan saldırı da sınırlandırılır", async () => {
  for (let i = 0; i < 20; i++)
    assert.equal(
      (
        await login("yok", "yanlis-sifre", {
          "CF-Connecting-IP": `192.0.2.${i}`,
        })
      ).response.status,
      401,
    );
  assert.equal(
    (await login("yok", "yanlis-sifre", { "CF-Connecting-IP": "192.0.2.99" }))
      .response.status,
    429,
  );
});
test("50 kullanıcı sınırı ve kullanıcı adı/e-posta çakışması atomik olarak korunur", async () => {
  const { cookie } = await login();
  const alias = await request("/api/admin/users", {
    method: "POST",
    cookie,
    body: {
      username: "yonetici@example.test",
      email: "unique@example.test",
      name: "Çakışma",
      password,
    },
  });
  assert.equal(alias.status, 409);
  await db
    .prepare(
      "WITH RECURSIVE seq(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM seq WHERE x<48) INSERT INTO users(id,username,email,name,password_hash,role,created_at) SELECT 'cap-'||x,'cap-'||x,'cap-'||x||'@example.test','Limit',?,'editor','2026-10-01' FROM seq",
    )
    .bind(adminHash)
    .run();
  try {
    const extra = await request("/api/admin/users", {
      method: "POST",
      cookie,
      body: {
        username: "extra",
        email: "extra@example.test",
        name: "Limit",
        password,
      },
    });
    assert.equal(extra.status, 409);
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS total FROM users").first()).total,
      50,
    );
  } finally {
    await db.prepare("DELETE FROM users WHERE id LIKE 'cap-%'").run();
  }
});

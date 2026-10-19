import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { tokenDigest } from "../../shared/passwords.mjs";

let mf, db, device, agent;
const base = "https://studio.example",
  companyId = crypto.randomUUID(),
  otherCompany = crypto.randomUUID(),
  accountId = crypto.randomUUID(),
  otherAccount = crypto.randomUUID();
const tokens = {
  admin: "A".repeat(43),
  other: "C".repeat(43),
  editor: "B".repeat(43),
};
const frame = "/9j/2Q=="; // Minimal opaque fixture; no real user screen.
async function request(
  path,
  { method = "GET", body, role = "admin", headers = {} } = {},
) {
  return mf.dispatchFetch(base + path, {
    method,
    headers: {
      Origin: base,
      ...(role ? { Cookie: `__Host-studio_session=${tokens[role]}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
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
    d1Databases: { DB: "computer-test" },
    durableObjects: { COMPANY_COMPUTER: "CompanyComputer" },
    bindings: { APP_ENV: "production", AUTH_MODE: "password" },
    serviceBindings: { ASSETS: () => new Response("Studio") },
  });
  db = await mf.getD1Database("DB");
  for (const name of [
    "0001_studio.sql",
    "0004_users.sql",
    "0005_social_accounts.sql",
    "0008_social_profiles.sql",
    "0010_company_computer.sql",
  ])
    for (const sql of (await readFile(`migrations/${name}`, "utf8"))
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  for (const [id, role] of [
    ["admin", "admin"],
    ["other", "admin"],
    ["editor", "editor"],
  ]) {
    await db
      .prepare(
        "INSERT INTO users(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        id,
        `${id}@example.test`,
        id,
        "fixture-not-login",
        role,
        new Date().toISOString(),
      )
      .run();
    await db
      .prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      )
      .bind(
        await tokenDigest(tokens[id]),
        id,
        Math.floor(Date.now() / 1000) + 1800,
      )
      .run();
  }
  for (const id of [companyId, otherCompany])
    await db
      .prepare("INSERT INTO companies VALUES(?,?,?)")
      .bind(
        id,
        JSON.stringify({ name: "Kurgu şirket" }),
        new Date().toISOString(),
      )
      .run();
  for (const [id, company] of [
    [accountId, companyId],
    [otherAccount, otherCompany],
  ])
    await db
      .prepare(
        "INSERT INTO social_accounts(id,company_id,platform,label,created_at,profile_url) VALUES(?,?,'x','Kurgu hesap',?,'https://x.com/fixture')",
      )
      .bind(id, company, new Date().toISOString())
      .run();
});
after(async () => {
  agent?.close();
  await mf?.dispose();
});
const command = (id, body, role) =>
  request(`/api/computer/accounts/${id}/command`, {
    method: "POST",
    body,
    role,
  });

test("Cihaz kodu yalnızca yöneticiye verilir, tek kullanımlıdır ve açık anahtar D1'de tutulmaz", async () => {
  assert.equal(
    (await request("/api/computer/status", { role: null })).status,
    401,
  );
  assert.equal(
    (await request("/api/computer/pairing", { method: "POST", role: "editor" }))
      .status,
    403,
  );
  assert.equal(
    (
      await request("/api/computer/pairing", {
        method: "POST",
        headers: { Origin: "https://foreign.example" },
      })
    ).status,
    403,
  );
  const first = await (
    await request("/api/computer/pairing", { method: "POST" })
  ).json();
  const pairing = await (
    await request("/api/computer/pairing", { method: "POST" })
  ).json();
  assert.equal(
    (
      await request("/api/computer/enroll", {
        method: "POST",
        role: null,
        body: { code: first.code, name: "Eski kod" },
      })
    ).status,
    409,
  );
  const enroll = await request("/api/computer/enroll", {
    method: "POST",
    role: null,
    body: { code: pairing.code, name: "Firma Firefox bilgisayarı" },
  });
  assert.equal(enroll.status, 201);
  device = await enroll.json();
  const row = await db
    .prepare("SELECT * FROM company_computers WHERE id=?")
    .bind(device.id)
    .first();
  assert.equal(row.token_hash, await tokenDigest(device.token));
  assert.ok(!JSON.stringify(row).includes(device.token));
  assert.equal(
    (
      await request("/api/computer/enroll", {
        method: "POST",
        role: null,
        body: { code: pairing.code, name: "Tekrar" },
      })
    ).status,
    409,
  );
  const status = await (await request("/api/computer/status")).json();
  assert.equal(status.devices.length, 1);
  assert.equal(status.onlineDeviceId, null);
  assert.ok(!JSON.stringify(status).includes(device.token));
  assert.equal((await command(accountId, { action: "open" })).status, 503);
});

test("Kimliği doğrulanmış yardımcı hesabı açar; kullanıcı/hesap/görünüm kimliği karışamaz ve ham kod iletilemez", async () => {
  const invalid = await request("/api/computer/connect", {
    role: null,
    headers: {
      Upgrade: "websocket",
      "Sec-WebSocket-Protocol": `sosyal-device-v1, ${device.id}.${"x".repeat(43)}`,
    },
  });
  assert.equal(invalid.status, 401);
  const response = await request("/api/computer/connect", {
    role: null,
    headers: {
      Upgrade: "websocket",
      "Sec-WebSocket-Protocol": `sosyal-device-v1, ${device.id}.${device.token}`,
    },
  });
  assert.equal(response.status, 101);
  agent = response.webSocket;
  agent.accept();
  const forwarded = [];
  agent.addEventListener("message", (event) => {
    const m = JSON.parse(event.data);
    if (m.type !== "command") return;
    forwarded.push(m);
    agent.send(
      JSON.stringify({
        type: "result",
        id: m.id,
        result:
          m.command.action === "close"
            ? { closed: true, profilePresent: true, loginVerified: false }
            : {
                frame,
                width: 1280,
                height: 800,
                profilePresent: true,
                loginVerified: false,
              },
      }),
    );
  });
  const status = await (await request("/api/computer/status")).json();
  assert.equal(status.onlineDeviceId, device.id);
  const opened = await command(accountId, { action: "open" });
  assert.equal(opened.status, 200);
  const view = await opened.json();
  assert.equal(
    (
      await request(`/api/companies/${companyId}`, {
        method: "DELETE",
        role: "editor",
      })
    ).status,
    403,
  );
  assert.equal(view.loginVerified, false);
  assert.equal(view.frame, frame);
  assert.equal(forwarded[0].account.companyId, companyId);
  assert.equal(forwarded[0].account.encryptedCookies, undefined);
  assert.equal(
    (
      await command(
        accountId,
        { action: "screen", viewId: view.viewId },
        "other",
      )
    ).status,
    409,
  );
  assert.equal((await command(otherAccount, { action: "open" })).status, 409);
  assert.equal(
    (
      await command(accountId, {
        action: "screen",
        viewId: crypto.randomUUID(),
      })
    ).status,
    410,
  );
  assert.equal(
    (await command(accountId, { action: "evaluate", code: "process.exit()" }))
      .status,
    400,
  );
  assert.equal(
    (
      await command(accountId, {
        action: "click",
        viewId: view.viewId,
        x: -1,
        y: 0,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await command(accountId, {
        action: "key",
        viewId: view.viewId,
        key: "F12",
      })
    ).status,
    400,
  );
  const profiles = await (
    await request(`/api/computer/profiles?companyId=${companyId}`)
  ).json();
  assert.equal(profiles[0].accountId, accountId);
  assert.deepEqual(
    await (
      await request(`/api/computer/profiles?companyId=${otherCompany}`)
    ).json(),
    [],
  );
  assert.equal(
    (await command(accountId, { action: "close", viewId: view.viewId })).status,
    200,
  );
  assert.equal(
    (await command(accountId, { action: "screen", viewId: view.viewId }))
      .status,
    410,
  );
});

test("Cihaz iptali bağlantıyı ve eski anahtarla yeniden bağlanmayı keser", async () => {
  const response = await request(`/api/computer/devices/${device.id}/revoke`, {
    method: "POST",
  });
  assert.equal(response.status, 200);
  assert.equal(
    (
      await request("/api/computer/connect", {
        role: null,
        headers: {
          Upgrade: "websocket",
          "Sec-WebSocket-Protocol": `sosyal-device-v1, ${device.id}.${device.token}`,
        },
      })
    ).status,
    401,
  );
  assert.equal((await command(accountId, { action: "open" })).status, 409);
  assert.equal(
    (await (await request("/api/computer/status")).json()).devices.length,
    0,
  );
  assert.equal(
    (await request(`/api/social/accounts/${accountId}`, { method: "DELETE" }))
      .status,
    204,
  );
});

test("Günlük ücretsiz komut sınırı dolduğunda tarayıcıya yeni işlem iletilmez", async () => {
  const { CompanyComputer } = await import("../../worker/computer-relay.mjs");
  const rows = new Map([
    ["budget", { day: new Date().toISOString().slice(0, 10), count: 20000 }],
  ]);
  const socket = {
    readyState: 1,
    deserializeAttachment: () => ({ id: "device", seenAt: Date.now() }),
    send: () => assert.fail("Bütçe doluyken komut iletilemez"),
  };
  const controller = new CompanyComputer(
    {
      getWebSockets: () => [socket],
      storage: {
        get: async (k) => rows.get(k),
        put: async (k, v) => rows.set(k, v),
        delete: async (k) => rows.delete(k),
      },
    },
    {},
  );
  const result = await controller.fetch(
    new Request("https://computer.internal", {
      method: "POST",
      body: JSON.stringify({
        action: "command",
        command: { action: "open" },
        deviceId: "device",
        userId: "admin",
        account: { id: accountId, companyId },
      }),
    }),
  );
  assert.equal(result.status, 429);
  assert.equal(rows.has("lease"), false);
});

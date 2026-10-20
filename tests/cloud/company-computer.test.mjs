import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { randomBytes } from "node:crypto";
import { createD1Media } from "../../worker/d1-media.mjs";
import { objectKey } from "../../worker/media.mjs";
import { Miniflare } from "miniflare";
import { tokenDigest } from "../../shared/passwords.mjs";

let mf, db, device, agent, manualForwarded;
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
    "0002_d1_media.sql",
    "0003_r2_budget.sql",
    "0004_users.sql",
    "0005_social_accounts.sql",
    "0006_social_ai.sql",
    "0007_ai_images.sql",
    "0008_social_profiles.sql",
    "0010_company_computer.sql",
    "0011_local_ai.sql",
    "0012_expert_workspace.sql",
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
            : ["manual-login", "manual-status"].includes(m.command.action)
            ? (manualForwarded = m, { manualLogin: true, manualRunning: true, noFrame: true, loginVerified: false })
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
  assert.equal(status.companyTabs, false);
  assert.equal(status.normalLogin, false);
  assert.equal((await command(accountId, { action: "manual-login" })).status, 409);
  assert.equal((await command(accountId, { action: "workspace" })).status, 409);
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

test("Normal giriş yetenek bildirimi, doğrulanmış şirket profili ve operatör kilidi ister; ekran/şifre taşınmaz", async () => {
  agent.send(JSON.stringify({ type: "hello", capabilities: ["normal-login-v1"] }));
  for (let i = 0; i < 100; i++) {
    if ((await (await request("/api/computer/status")).json()).normalLogin) break;
    await new Promise((r) => setTimeout(r, 10));
  }
  const opened = await command(accountId, { action: "manual-login", url: "file:///outside", executablePath: "outside", profileScope: "account" });
  assert.equal(opened.status, 200);
  const view = await opened.json();
  assert.equal(view.manualLogin, true);
  assert.equal(view.frame, undefined);
  assert.equal(view.loginVerified, false);
  assert.deepEqual(manualForwarded.command, { action: "manual-login" });
  assert.equal(manualForwarded.account.companyId, companyId);
  assert.equal(manualForwarded.account.profileScope, "company");
  assert.equal((await command(otherAccount, { action: "manual-login" })).status, 409);
  assert.equal((await command(accountId, { action: "manual-login" }, "other")).status, 409);
  assert.equal((await command(accountId, { action: "manual-login" }, "editor")).status, 403);
  assert.equal((await command(accountId, { action: "manual-status", viewId: crypto.randomUUID() })).status, 410);
  assert.equal((await command(accountId, { action: "manual-status", viewId: view.viewId })).status, 200);
  const resumed = await command(accountId, { action: "open" });
  assert.equal(resumed.status, 200);
  const controlled = await resumed.json();
  assert.notEqual(controlled.viewId, view.viewId, "Normal girişten sonra eski panel geçersizdir");
  assert.equal((await command(accountId, { action: "type", viewId: view.viewId, text: "stale-fixture" })).status, 410);
  assert.equal((await command(accountId, { action: "close", viewId: controlled.viewId })).status, 200);
});

test("Yerel AI yönetici ister, eski yardımcıyı ayırt eder; seçili şirket bağlamı ve D1 geçmişi korunur", async () => {
  assert.equal(
    (await request("/api/computer/ai/status", { role: "editor" })).status,
    403,
  );
  assert.equal(
    (await request("/api/computer/ai/status", { role: null })).status,
    401,
  );
  assert.equal((await request("/api/computer/ai/status")).status, 409);
  const pong = new Promise((resolve) => {
    const listener = (e) => {
      if (JSON.parse(e.data).type === "pong") {
        agent.removeEventListener("message", listener);
        resolve();
      }
    };
    agent.addEventListener("message", listener);
  });
  agent.send(JSON.stringify({ type: "hello", capabilities: ["local-ai-v1"] }));
  agent.send(JSON.stringify({ type: "ping" }));
  await pong;
  let mode = "good",
    captured;
  const listener = (e) => {
    const m = JSON.parse(e.data);
    if (m.type !== "ai-command") return;
    captured = m.input;
    let result = {
      ok: true,
      status: {
        phase: "ready",
        model: "qwen3.5:4b",
        busy: false,
        progress: null,
        code: null,
      },
    };
    if (m.input.action === "generate")
      result = {
        ok: true,
        companyId: mode === "wrong-company" ? otherCompany : m.input.companyId,
        answer: "Yerel içerikler hazır; henüz paylaşılmadı.",
        posts: m.input.selected.map((p) => ({
          platform: p,
          title: "Başlık",
          caption:
            mode === "duplicate" ? "Aynı metin" : p + " için kurgu içerik",
          hashtags: [],
          alt: "",
        })),
        observation:
          m.input.image && mode !== "no-vision"
            ? "Kırmızı sentetik test karesi."
            : null,
      };
    agent.send(JSON.stringify({ type: "ai-result", id: m.id, result }));
  };
  agent.addEventListener("message", listener);
  try {
    assert.equal((await request("/api/computer/ai/status")).status, 200);
    assert.equal(
      (await request("/api/computer/ai/setup", { method: "POST" })).status,
      202,
    );
    for (const [id, body] of [
      [companyId, "Bu şirkete ait marka kuralı"],
      [otherCompany, "Diğer şirketin renk bilgisi"],
    ])
      await db
        .prepare("INSERT INTO ai_memory VALUES(?,?,?,?,?,?)")
        .bind(
          crypto.randomUUID(),
          id,
          "rule",
          "Referans",
          body,
          new Date().toISOString(),
        )
        .run();
    const body = {
      companyId,
      question: "Yeni ürün hakkında kısa içerik.",
      mode: "posts",
      selected: ["instagram", "x", "tumblr"],
    };
    const good = await request("/api/computer/ai/ask", {
      method: "POST",
      body,
    });
    assert.equal(good.status, 200);
    const turn = await good.json();
    assert.equal(turn.engine, "local");
    assert.equal(turn.published, false);
    assert.equal(turn.reservedNeurons, 0);
    assert.equal(turn.posts.length, 3);
    assert.ok(JSON.stringify(captured).includes("Bu şirkete ait marka kuralı"));
    assert.ok(
      !JSON.stringify(captured).includes("Diğer şirketin renk bilgisi"),
    );
    assert.equal(captured.image, null);
    assert.equal(captured.token, undefined);
    assert.equal(
      (
        await db
          .prepare("SELECT engine FROM ai_turns WHERE id=?")
          .bind(turn.id)
          .first()
      ).engine,
      "local",
    );
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS total FROM ai_budget").first())
        .total,
      0,
    );
    assert.equal(
      (
        await (
          await request(`/api/ai/workspace?companyId=${otherCompany}`)
        ).json()
      ).turns.length,
      0,
    );
    assert.equal(
      (
        await (
          await request(`/api/ai/workspace?companyId=${companyId}`, {
            role: "other",
          })
        ).json()
      ).turns.length,
      0,
    );
    mode = "duplicate";
    assert.equal(
      (await request("/api/computer/ai/ask", { method: "POST", body })).status,
      502,
    );
    mode = "wrong-company";
    assert.equal(
      (await request("/api/computer/ai/ask", { method: "POST", body })).status,
      502,
    );
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS total FROM ai_turns").first())
        .total,
      1,
    );
    const { createCloudStore } = await import("../../worker/store.mjs");
    const media = await createCloudStore(db).saveMedia({
      companyId: otherCompany,
      width: 1,
      height: 1,
      storage: "d1",
    });
    assert.equal(
      (
        await request("/api/computer/ai/ask", {
          method: "POST",
          body: { ...body, mediaId: media.id },
        })
      ).status,
      400,
    );
    const bytes = await sharp({
      create: { width: 128, height: 96, channels: 3, background: "#cc3420" },
    })
      .jpeg()
      .toBuffer();
    const own = await createCloudStore(db).saveMedia({
      companyId,
      width: 128,
      height: 96,
      storage: "d1",
    });
    await createD1Media(db).put(
      objectKey(companyId, own.id, "original"),
      bytes,
    );
    mode = "good";
    const visual = await request("/api/computer/ai/ask", {
      method: "POST",
      body: { ...body, mediaId: own.id },
    });
    assert.equal(visual.status, 200);
    assert.equal(
      (await visual.json()).imageObservation,
      "Kırmızı sentetik test karesi.",
    );
    assert.equal(captured.image, bytes.toString("base64"));
    mode = "no-vision";
    assert.equal(
      (
        await request("/api/computer/ai/ask", {
          method: "POST",
          body: { ...body, mediaId: own.id },
        })
      ).status,
      502,
    );
    assert.equal(
      (await db.prepare("SELECT COUNT(*) AS total FROM ai_turns").first())
        .total,
      2,
    );
    const large = await createCloudStore(db).saveMedia({
      companyId,
      width: 128,
      height: 96,
      storage: "d1",
    });
    const largeJpeg = await sharp(randomBytes(1024 * 1024 * 3), {
      raw: { width: 1024, height: 1024, channels: 3 },
    })
      .jpeg({ quality: 95 })
      .toBuffer();
    assert.ok(largeJpeg.length > 600000);
    await createD1Media(db).put(
      objectKey(companyId, large.id, "original"),
      largeJpeg,
    );
    assert.equal(
      (
        await request("/api/computer/ai/ask", {
          method: "POST",
          body: { ...body, mediaId: large.id },
        })
      ).status,
      413,
    );
  } finally {
    agent.removeEventListener("message", listener);
  }
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

test("Paralel yerel AI kotası atomiktir; uzun AI yanıtı tarayıcı komut kuyruğunu tutmaz", async () => {
  const { CompanyComputer } = await import("../../worker/computer-relay.mjs");
  const rows = new Map();
  let controller,
    replyAI,
    browserCalls = 0;
  const socket = {
    readyState: 1,
    deserializeAttachment: () => ({
      id: "fixture",
      seenAt: Date.now(),
      localAI: true,
    }),
    serializeAttachment: () => {},
    send(text) {
      const m = JSON.parse(text);
      if (m.type === "ai-command") {
        if (m.input.action === "generate" && replyAI === null)
          replyAI = () =>
            controller.webSocketMessage(
              socket,
              JSON.stringify({
                type: "ai-result",
                id: m.id,
                result: { ok: true, answer: "Öneri", posts: [] },
              }),
            );
        else
          queueMicrotask(() =>
            controller.webSocketMessage(
              socket,
              JSON.stringify({
                type: "ai-result",
                id: m.id,
                result: { ok: true, answer: "Öneri", posts: [] },
              }),
            ),
          );
      } else {
        browserCalls++;
        queueMicrotask(() =>
          controller.webSocketMessage(
            socket,
            JSON.stringify({
              type: "result",
              id: m.id,
              result: { closed: true, loginVerified: false },
            }),
          ),
        );
      }
    },
  };
  controller = new CompanyComputer(
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
  const call = (body) =>
    controller.fetch(
      new Request("https://computer.internal", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    );
  replyAI = null;
  const slow = call({
    action: "local-ai",
    deviceId: "fixture",
    userId: "admin",
    input: { action: "generate" },
  });
  for (let i = 0; i < 100 && !replyAI; i++)
    await new Promise((r) => setTimeout(r, 5));
  const browser = await call({
    action: "command",
    deviceId: "fixture",
    userId: "admin",
    account: { id: accountId, companyId },
    command: { action: "open" },
  });
  assert.equal(browser.status, 200);
  assert.equal(browserCalls, 1);
  assert.equal(typeof replyAI, "function");
  await replyAI();
  assert.equal((await slow).status, 200);
  const attempts = await Promise.all(
    Array.from({ length: 12 }, () =>
      call({
        action: "local-ai",
        deviceId: "fixture",
        userId: "admin",
        input: { action: "generate" },
      }),
    ),
  );
  assert.equal(attempts.filter((r) => r.status === 200).length, 9);
  assert.equal(attempts.filter((r) => r.status === 429).length, 3);
  assert.equal(rows.get("local-ai-budget").count, 10);
  assert.equal(rows.get("budget").count, 1);
});

import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { tokenDigest, hashPassword } from "../../shared/passwords.mjs";
import { createCloudStore } from "../../worker/store.mjs";
import { evidenceFor } from "../../worker/knowledge.mjs";
import { scheduledPublications } from "../../worker/publications.mjs";
let mf, db, socket, first, second, account, device;
let responder,
  publishCalls = 0,
  aiCalls = 0;
const base = "https://studio.example",
  tokens = {
    admin: "A".repeat(43),
    editor: "B".repeat(43),
    other: "C".repeat(43),
  };
const post = (platform) => ({
  platform,
  title: "Kurgu",
  caption: platform + " için doğrulanmış kurgu içerik.",
  hashtags: [],
  alt: "",
});
async function request(path, { method = "GET", body, role = "admin" } = {}) {
  return mf.dispatchFetch(base + path, {
    method,
    headers: {
      Cookie: `__Host-studio_session=${tokens[role]}`,
      Origin: base,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
async function expectJSON(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: ".worker-build/index.js",
    compatibilityDate: "2026-07-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "expert-workspace" },
    r2Buckets: { MEDIA: "expert-media" },
    durableObjects: { COMPANY_COMPUTER: "CompanyComputer" },
    bindings: {
      APP_ENV: "production",
      AUTH_MODE: "password",
      MEDIA_STORAGE: "r2",
    },
    serviceBindings: { ASSETS: () => new Response("Studio") },
  });
  db = await mf.getD1Database("DB");
  for (const name of (await readdir("migrations"))
    .filter((n) => n.endsWith(".sql") && !n.startsWith("0009"))
    .sort())
    for (const sql of (await readFile("migrations/" + name, "utf8"))
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  const passwordHash = await hashPassword("Fixture.NotARealAccount.2026");
  for (const [id, role] of [
    ["admin", "admin"],
    ["editor", "editor"],
    ["other", "admin"],
  ])
    await db
      .prepare(
        "INSERT INTO users(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        id,
        id,
        id + "@example.test",
        id,
        passwordHash,
        role,
        new Date().toISOString(),
      )
      .run();
  const store = createCloudStore(db);
  first = await store.saveCompany({
    name: "Kurgu Firma",
    website: "https://www.example.com/",
    tone: "Sade",
    audience: "Girne",
    keywords: "",
    handle: "@fixture",
    color: "#326f61",
    regional: {
      districts: "Girne",
      languages: "Türkçe",
      timezone: "Asia/Famagusta",
    },
  });
  second = await store.saveCompany({
    name: "Diğer Şirket",
    website: "https://example.org/",
  });
  account = crypto.randomUUID();
  device = crypto.randomUUID();
  await db
    .prepare(
      "INSERT INTO social_accounts(id,company_id,platform,label,created_at,profile_url) VALUES(?,?,'facebook','Kurgu Sayfa',?,'https://www.facebook.com/fixture')",
    )
    .bind(account, first.id, new Date().toISOString())
    .run();
  await db
    .prepare(
      "INSERT INTO company_computers(id,name,token_hash,pairing_hash,created_by,created_at) VALUES(?,'Kurgu cihaz',?,'fixture-pairing','admin',?)",
    )
    .bind(device, await tokenDigest("D".repeat(43)), new Date().toISOString())
    .run();
});
after(async () => {
  socket?.close();
  await mf?.dispose();
});
beforeEach(async () => {
  await db
    .prepare(
      "UPDATE users SET enabled=1,role=CASE WHEN id='editor' THEN 'editor' ELSE 'admin' END",
    )
    .run();
  for (const [id, token] of Object.entries(tokens))
    await db
      .prepare(
        "INSERT OR REPLACE INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      )
      .bind(await tokenDigest(token), id, Math.floor(Date.now() / 1000) + 3600)
      .run();
  for (const table of [
    "research_facts",
    "research_sources",
    "publication_jobs",
    "local_ai_jobs",
    "ai_turns",
    "drafts",
    "content_evaluations",
    "content_metrics",
    "company_access",
  ])
    await db.prepare("DELETE FROM " + table).run();
  await db
    .prepare("INSERT INTO company_access VALUES(?,?)")
    .bind(first.id, "editor")
    .run();
  publishCalls = 0;
  aiCalls = 0;
  responder = (v) => {
    if (v.type === "research-command")
      socket.send(
        JSON.stringify({
          type: "research-result",
          id: v.id,
          result: {
            ok: true,
            pages: v.input.urls.map((url) => ({
              url,
              finalUrl: url,
              title: "Kurgu kaynak",
              text: "Kurgu Firma. Teslimat yalnız Girne. Fiyat açıklanmadı.",
            })),
          },
        }),
      );
    if (v.type === "command") {
      const publication =
        v.command.action === "prepare"
          ? { state: "ready", jobId: v.command.jobId }
          : v.command.action === "publish"
            ? {
                state: "verified",
                jobId: v.command.jobId,
                url: "https://www.facebook.com/fixture/posts/123",
              }
            : undefined;
      if (v.command.action === "publish") publishCalls++;
      socket.send(
        JSON.stringify({
          type: "result",
          id: v.id,
          result: {
            noFrame: true,
            closed: v.command.action === "close",
            loginVerified: false,
            publication,
          },
        }),
      );
    }
  };
  if (!socket) {
    const response = await mf.dispatchFetch(base + "/api/computer/connect", {
      headers: {
        Upgrade: "websocket",
        "Sec-WebSocket-Protocol": `sosyal-device-v1,${device}.${"D".repeat(43)}`,
      },
    });
    assert.equal(response.status, 101);
    socket = response.webSocket;
    socket.accept();
    socket.addEventListener("message", (e) => {
      const v = JSON.parse(e.data);
      if (v.type !== "pong") void responder(v);
    });
    socket.send(
      JSON.stringify({
        type: "hello",
        capabilities: [
          "local-ai-v1",
          "research-v1",
          "browser-tasks-v1",
          "company-tabs-v1",
        ],
      }),
    );
    await new Promise((r) => setTimeout(r, 20));
  }
});
test("Şirket sekmeleri yalnız kayıtlı ilk hesapları açar; geçiş kullanıcı, şirket, görünüm ve ek hesap ayrımını korur", async () => {
  const instagram = crypto.randomUUID(),
    duplicate = crypto.randomUUID();
  for (const [id, platform] of [
    [instagram, "instagram"],
    [duplicate, "facebook"],
  ])
    await db
      .prepare(
        "INSERT INTO social_accounts(id,company_id,platform,label,created_at,profile_url) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        id,
        first.id,
        platform,
        "Kurgu ek hesap",
        new Date().toISOString(),
        `https://www.${platform}.com/fixture-${id}`,
      )
      .run();
  const old = responder,
    forwarded = [];
  responder = (value) => {
    forwarded.push(value);
    old(value);
  };
  try {
    assert.equal(
      (await expectJSON(await request("/api/computer/status"))).companyTabs,
      true,
    );
    const opened = await expectJSON(
      await request(`/api/computer/accounts/${account}/command`, {
        method: "POST",
        body: {
          action: "workspace",
          workspaceAccounts: [{ companyId: second.id }],
        },
      }),
    );
    const message = forwarded.find((v) => v.type === "command");
    assert.equal(message.account.profileScope, "company");
    assert.equal(message.account.workspaceAccounts.length, 2);
    assert.ok(
      message.account.workspaceAccounts.every(
        (a) => a.companyId === first.id && a.id !== duplicate,
      ),
    );
    assert.equal(
      (
        await request(`/api/computer/accounts/${instagram}/command`, {
          method: "POST",
          role: "other",
          body: {
            action: "open",
            switchAccount: true,
            previousViewId: opened.viewId,
          },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request(`/api/computer/accounts/${instagram}/command`, {
          method: "POST",
          body: {
            action: "open",
            switchAccount: true,
            previousViewId: crypto.randomUUID(),
          },
        })
      ).status,
      409,
    );
    const selected = await expectJSON(
      await request(`/api/computer/accounts/${instagram}/command`, {
        method: "POST",
        body: {
          action: "open",
          switchAccount: true,
          previousViewId: opened.viewId,
        },
      }),
    );
    assert.notEqual(selected.viewId, opened.viewId);
    assert.equal(
      (
        await request(`/api/computer/accounts/${account}/command`, {
          method: "POST",
          body: { action: "screen", viewId: opened.viewId },
        })
      ).status,
      409,
    );
    assert.equal(
      (
        await request(`/api/computer/accounts/${duplicate}/command`, {
          method: "POST",
          body: {
            action: "open",
            switchAccount: true,
            previousViewId: selected.viewId,
          },
        })
      ).status,
      409,
    );
    await expectJSON(
      await request(`/api/computer/accounts/${instagram}/command`, {
        method: "POST",
        body: { action: "close", viewId: selected.viewId },
      }),
    );
  } finally {
    responder = old;
    await db
      .prepare("DELETE FROM social_accounts WHERE id IN (?,?)")
      .bind(instagram, duplicate)
      .run();
  }
});
test("Editör yalnız atanan şirketin profil, taslak, görsel, AI hafızası ve kaynaklarına erişir", async () => {
  const store = createCloudStore(db),
    draft = await store.saveDraft({
      companyId: second.id,
      name: "Gizli",
      text: "",
      selected: ["facebook"],
      posts: [post("facebook")],
      mediaId: null,
      mediaFit: "contain",
    });
  const media = await store.saveMedia({
    companyId: second.id,
    width: 64,
    height: 64,
  });
  const list = await expectJSON(
    await request("/api/companies", { role: "editor" }),
  );
  assert.deepEqual(
    list.map((r) => r.id),
    [first.id],
  );
  for (const path of [
    `/api/drafts/${draft.id}`,
    `/api/media/${media.id}`,
    `/api/ai/workspace?companyId=${second.id}`,
    `/api/knowledge?companyId=${second.id}`,
    `/api/quality?companyId=${second.id}`,
    `/api/metrics?companyId=${second.id}`,
  ])
    assert.equal((await request(path, { role: "editor" })).status, 404, path);
  assert.equal(
    (
      await request(`/api/companies/${second.id}`, {
        method: "PUT",
        role: "editor",
        body: { name: "Sızma" },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request("/api/knowledge/research", {
        method: "POST",
        role: "editor",
        body: {},
      })
    ).status,
    403,
  );
});
test("Site araştırması kaynakları kaydeder, değişmemiş metni çoğaltmaz ve alan dışı adresi araca göndermez", async () => {
  const input = { companyId: first.id, urls: [first.website], mode: "static" };
  const firstRead = await expectJSON(
    await request("/api/knowledge/research", { method: "POST", body: input }),
    201,
  );
  assert.equal(firstRead.saved, 1);
  const same = await expectJSON(
    await request("/api/knowledge/research", { method: "POST", body: input }),
    201,
  );
  assert.equal(same.unchanged, 1);
  assert.equal(
    (
      await request("/api/knowledge/research", {
        method: "POST",
        body: { ...input, urls: ["https://other.com/"] },
      })
    ).status,
    400,
  );
  const knowledge = await expectJSON(
    await request(`/api/knowledge?companyId=${first.id}`),
  );
  assert.equal(knowledge.sources.length, 1);
  assert.equal(knowledge.facts.length, 0);
  const source = knowledge.sources[0],
    validUntil = new Date(Date.now() + 86400000).toISOString();
  assert.equal(
    (
      await request(`/api/knowledge/sources/${source.id}/approve`, {
        method: "POST",
        body: {
          field: "Teslimat",
          value: "Tüm KKTC",
          evidence: "Teslimat yalnız Girne.",
          validUntil,
        },
      })
    ).status,
    400,
  );
  await expectJSON(
    await request(`/api/knowledge/sources/${source.id}/approve`, {
      method: "POST",
      body: {
        field: "Teslimat",
        value: "yalnız Girne",
        evidence: "Teslimat yalnız Girne.",
        validUntil,
      },
    }),
    201,
  );
  const evidence = await evidenceFor(db, first.id, "teslimat");
  assert.equal(evidence.length, 1);
  assert.equal(evidence[0].value, "yalnız Girne");
  await db
    .prepare("UPDATE research_facts SET valid_until=?")
    .bind("2000-01-01T00:00:00.000Z")
    .run();
  assert.equal((await evidenceFor(db, first.id, "teslimat")).length, 0);
});
test("Eşzamanlı kaynak onaylarında aynı bilgi alanının tek güncel sürümü kalır", async () => {
  await expectJSON(
    await request("/api/knowledge/research", {
      method: "POST",
      body: { companyId: first.id, urls: [first.website], mode: "static" },
    }),
    201,
  );
  const data = await expectJSON(
      await request(`/api/knowledge?companyId=${first.id}`),
    ),
    source = data.sources[0];
  const results = await Promise.all(
    ["yalnız Girne", "Girne"].map((value) =>
      request(`/api/knowledge/sources/${source.id}/approve`, {
        method: "POST",
        body: {
          field: "Teslimat",
          value,
          evidence: "Teslimat yalnız Girne.",
          validUntil: new Date(Date.now() + 86400000).toISOString(),
        },
      }),
    ),
  );
  for (const r of results) assert.equal(r.status, 201);
  const facts = await evidenceFor(db, first.id, "teslimat");
  assert.equal(facts.length, 1);
});
async function newJob() {
  const d = await createCloudStore(db).saveDraft({
    companyId: first.id,
    name: "Kurgu gönderi",
    text: "Kurgu",
    selected: ["facebook"],
    posts: [post("facebook")],
    mediaId: null,
    mediaFit: "contain",
  });
  const id = crypto.randomUUID(),
    body = {
      id,
      draftId: d.id,
      accountId: account,
      scheduledAt: new Date().toISOString(),
      timezone: "Asia/Famagusta",
    };
  await expectJSON(
    await request("/api/publications", { method: "POST", body }),
    201,
  );
  await expectJSON(
    await request("/api/publications", { method: "POST", body }),
  );
  await expectJSON(
    await request(`/api/publications/${id}/approve`, {
      method: "POST",
      body: { confirmed: true, identityLabel: "Kurgu Sayfa" },
    }),
  );
  return id;
}
test("Yayın işi içerik sürümünü korur, eşzamanlı yürütmede bir kez gönderir ve gerçek bağlantıyı kaydeder", async () => {
  await new Promise((r) => setTimeout(r, 1100));
  const id = await newJob();
  const result = await Promise.all([
    request(`/api/publications/${id}/execute`, { method: "POST", body: {} }),
    request(`/api/publications/${id}/execute`, { method: "POST", body: {} }),
  ]);
  for (const response of result) assert.equal(response.status, 200);
  const row = await db
    .prepare("SELECT * FROM publication_jobs WHERE id=?")
    .bind(id)
    .first();
  assert.equal(row.state, "verified");
  assert.equal(publishCalls, 1);
  assert.equal(row.result_url, "https://www.facebook.com/fixture/posts/123");
});
test("Sonucu belirsiz gönderi yeniden denenmez; gecikmiş iş otomatik paylaşılmaz", async () => {
  await new Promise((r) => setTimeout(r, 1100));
  const id = await newJob(),
    old = responder;
  responder = (v) => {
    if (v.type === "command" && v.command.action === "publish") {
      publishCalls++;
      socket.send(
        JSON.stringify({
          type: "result",
          id: v.id,
          result: {
            noFrame: true,
            loginVerified: false,
            publication: { state: "unknown", jobId: v.command.jobId },
          },
        }),
      );
    } else old(v);
  };
  await expectJSON(
    await request(`/api/publications/${id}/execute`, {
      method: "POST",
      body: {},
    }),
  );
  await expectJSON(
    await request(`/api/publications/${id}/execute`, {
      method: "POST",
      body: {},
    }),
  );
  assert.equal(publishCalls, 1);
  assert.equal(
    (
      await db
        .prepare("SELECT state FROM publication_jobs WHERE id=?")
        .bind(id)
        .first()
    ).state,
    "unknown",
  );
  const later = await newJob();
  await db
    .prepare(
      "UPDATE publication_jobs SET scheduled_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    )
    .bind(later)
    .run();
  await expectJSON(
    await request(`/api/publications/${later}/execute`, {
      method: "POST",
      body: {},
    }),
  );
  assert.equal(publishCalls, 1);
  assert.equal(
    (
      await db
        .prepare("SELECT state FROM publication_jobs WHERE id=?")
        .bind(later)
        .first()
    ).state,
    "missed",
  );
});
test("Yarım kalan yerel AI yalnız kendi şirketinde ve değişmemiş bağlamla sürdürülür", async () => {
  responder = (v) => {
    if (v.type !== "ai-command") return;
    aiCalls++;
    if (!v.input.resume) {
      socket.send(
        JSON.stringify({
          type: "ai-progress",
          id: v.id,
          progress: { posts: [post("instagram")], observation: null },
        }),
      );
      socket.send(
        JSON.stringify({
          type: "ai-result",
          id: v.id,
          result: { ok: false, code: "FAILED" },
        }),
      );
    } else {
      assert.equal(v.input.resume.posts.length, 1);
      socket.send(
        JSON.stringify({
          type: "ai-result",
          id: v.id,
          result: {
            ok: true,
            companyId: first.id,
            answer: "Taslaklar hazır.",
            posts: [post("instagram"), post("facebook")],
            observation: null,
          },
        }),
      );
    }
  };
  assert.equal(
    (
      await request("/api/computer/ai/ask", {
        method: "POST",
        body: {
          companyId: first.id,
          mode: "posts",
          question: "Kurgu ürün",
          selected: ["instagram", "facebook"],
          mediaId: null,
        },
      })
    ).status,
    503,
  );
  const jobs = await expectJSON(
    await request(`/api/computer/ai/jobs?companyId=${first.id}`),
  );
  assert.equal(jobs[0].state, "paused");
  assert.equal(jobs[0].completed, 1);
  assert.equal(
    (
      await request(`/api/computer/ai/jobs/${jobs[0].id}/resume`, {
        method: "POST",
        body: {},
        role: "other",
      })
    ).status,
    404,
  );
  const result = await expectJSON(
    await request(`/api/computer/ai/jobs/${jobs[0].id}/resume`, {
      method: "POST",
      body: {},
    }),
  );
  assert.equal(result.posts.length, 2);
  assert.equal(aiCalls, 2);
  assert.equal(
    (
      await request(`/api/computer/ai/jobs/${jobs[0].id}/resume`, {
        method: "POST",
        body: {},
      })
    ).status,
    409,
  );
});
test("Şirket metin yedeği yeni kopyaya atomik yüklenir; şifre, görsel ve oturum yedeğe girmez", async () => {
  await createCloudStore(db).saveDraft({
    companyId: first.id,
    name: "Yedek taslak",
    text: "Kurgu",
    selected: ["facebook"],
    posts: [post("facebook")],
    mediaId: null,
    mediaFit: "contain",
  });
  const backup = await expectJSON(
    await request(`/api/workspace/backup?companyId=${first.id}`),
  );
  assert.equal(backup.drafts.length, 1);
  assert.equal(backup.password_hash, undefined);
  const result = await expectJSON(
    await request("/api/workspace/restore", { method: "POST", body: backup }),
    201,
  );
  assert.notEqual(result.companyId, first.id);
  const copied = await createCloudStore(db).drafts(result.companyId);
  assert.equal(copied.length, 1);
  assert.equal(copied[0].mediaId, null);
  const storage = await expectJSON(await request("/api/workspace/storage"));
  assert.equal(storage.freeDatabaseLimit, 500000000);
  assert.ok(storage.bytes === null || storage.bytes > 0);
});
test("Şirket izni değişince eski oturum kapanır; son yönetici korunur ve kullanıcı şifresini değiştirebilir", async () => {
  await expectJSON(
    await request("/api/admin/users/editor/companies", {
      method: "PUT",
      body: { companyIds: [second.id] },
    }),
  );
  assert.equal(
    (await request("/api/companies", { role: "editor" })).status,
    401,
  );
  await db
    .prepare("INSERT INTO sessions VALUES(?,?,?)")
    .bind(
      await tokenDigest(tokens.editor),
      "editor",
      Math.floor(Date.now() / 1000) + 3600,
    )
    .run();
  const list = await expectJSON(
    await request("/api/companies", { role: "editor" }),
  );
  assert.deepEqual(
    list.map((r) => r.id),
    [second.id],
  );
  await expectJSON(
    await request("/api/admin/users/other", {
      method: "PUT",
      body: { enabled: false, role: "admin" },
    }),
  );
  assert.equal(
    (
      await request("/api/admin/users/admin", {
        method: "PUT",
        body: { enabled: false, role: "admin" },
      })
    ).status,
    409,
  );
  const changed = await expectJSON(
    await request("/api/auth/password", {
      method: "POST",
      body: {
        currentPassword: "Fixture.NotARealAccount.2026",
        password: "Fixture.NewNotARealAccount.2026",
      },
    }),
  );
  assert.equal(changed.loginRequired, true);
  assert.equal((await request("/api/auth/me")).status, 401);
});
test("Zamanlayıcı gecikmiş, yetkisi kalkmış ve kesilmiş işleri yeniden göndermez", async () => {
  const late = await newJob(),
    revoked = await newJob(),
    interrupted = await newJob();
  await db
    .prepare(
      "UPDATE publication_jobs SET scheduled_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    )
    .bind(late)
    .run();
  await db
    .prepare("UPDATE publication_jobs SET created_by='other' WHERE id=?")
    .bind(revoked)
    .run();
  await db.prepare("UPDATE users SET enabled=0 WHERE id='other'").run();
  await db
    .prepare(
      "UPDATE publication_jobs SET state='sending',updated_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    )
    .bind(interrupted)
    .run();
  let contacted = 0;
  const namespace = {
    idFromName: (v) => v,
    get: () => ({
      fetch: async () => {
        contacted++;
        return Response.json({ onlineDeviceId: null, active: null });
      },
    }),
  };
  await scheduledPublications({ DB: db, COMPANY_COMPUTER: namespace });
  for (const [id, state] of [
    [late, "missed"],
    [revoked, "cancelled"],
    [interrupted, "unknown"],
  ])
    assert.equal(
      (
        await db
          .prepare("SELECT state FROM publication_jobs WHERE id=?")
          .bind(id)
          .first()
      ).state,
      state,
    );
  assert.equal(contacted, 0);
  const offline = await newJob();
  await scheduledPublications({ DB: db, COMPANY_COMPUTER: namespace });
  assert.equal(
    (
      await db
        .prepare("SELECT state FROM publication_jobs WHERE id=?")
        .bind(offline)
        .first()
    ).state,
    "queued",
  );
  assert.equal(contacted, 1);
});
test(
  "Zamanlayıcı işi işler ve manuel ekran aynı kullanıcıda bile kontrolü alamaz",
  { timeout: 20000 },
  async () => {
    await new Promise((r) => setTimeout(r, 1100));
    const id = await newJob(),
      old = responder;
    let release, entered;
    const paused = new Promise((r) => {
      entered = r;
    });
    responder = (v) => {
      if (v.type === "command" && v.command.action === "prepare") {
        release = () => old(v);
        entered();
      } else old(v);
    };
    const wake = request("/api/publications/wake", {
      method: "POST",
      body: {},
    });
    const reached = await Promise.race([
      paused.then(() => true),
      new Promise((r) => setTimeout(() => r(false), 5000)),
    ]);
    assert.equal(reached, true, "Zamanlayıcı hazırlığa ulaşmadı.");
    const manual = request(`/api/computer/accounts/${account}/command`, {
      method: "POST",
      body: { action: "open" },
    });
    await new Promise((r) => setTimeout(r, 50));
    release();
    assert.equal((await manual).status, 409);
    assert.equal((await wake).status, 200);
    for (let i = 0; i < 50; i++) {
      const state = (
        await db
          .prepare("SELECT state FROM publication_jobs WHERE id=?")
          .bind(id)
          .first()
      ).state;
      if (state === "verified") break;
      await new Promise((r) => setTimeout(r, 100));
    }
    assert.equal(
      (
        await db
          .prepare("SELECT state FROM publication_jobs WHERE id=?")
          .bind(id)
          .first()
      ).state,
      "verified",
    );
    assert.equal(publishCalls, 1);
  },
);

async function newTabJob(platform = "facebook") {
  const existing =
    platform === "facebook"
      ? null
      : await db
          .prepare(
            "SELECT id FROM social_accounts WHERE company_id=? AND platform=?",
          )
          .bind(first.id, platform)
          .first();
  const accountId =
    platform === "facebook" ? account : existing?.id || crypto.randomUUID();
  if (platform !== "facebook" && !existing)
    await db
      .prepare(
        "INSERT INTO social_accounts(id,company_id,platform,label,created_at,profile_url) VALUES(?,?,?,?,?,?)",
      )
      .bind(
        accountId,
        first.id,
        platform,
        "Kurgu " + platform,
        new Date().toISOString(),
        platform === "x"
          ? "https://x.com/fixture"
          : "https://www.youtube.com/@fixture",
      )
      .run();
  const draft = await createCloudStore(db).saveDraft({
    companyId: first.id,
    name: "Sekme kurgu",
    text: "Kurgu",
    selected: [platform],
    posts: [post(platform)],
    mediaId: null,
    mediaFit: "contain",
  });
  const id = crypto.randomUUID();
  await expectJSON(
    await request("/api/tab-publications", {
      method: "POST",
      body: { id, draftId: draft.id, accountId, targetLabel: "Kurgu" },
    }),
    201,
  );
  return { id, draft, accountId };
}
test("Firefox yayın kuyruğu dokuz platform politikasıyla ayrı çalışır; yetki, sahiplik ve eşzamanlı tek yürütme korunur", async () => {
  const a = await newTabJob("x"),
    b = await newTabJob("youtube");
  assert.equal(
    (await request(`/api/tab-publications/${a.id}`, { role: "editor" })).status,
    403,
  );
  assert.equal(
    (await request(`/api/tab-publications/${a.id}`, { role: "other" })).status,
    403,
  );
  assert.equal(
    (
      await request(`/api/publications/${a.id}/execute`, {
        method: "POST",
        body: {},
      })
    ).status,
    409,
  );
  const executor = crypto.randomUUID(),
    other = crypto.randomUUID();
  for (const id of [a.id, b.id])
    await expectJSON(
      await request(`/api/tab-publications/${id}/authorize`, {
        method: "POST",
        body: { executor, confirmed: true },
      }),
    );
  const claims = await Promise.all(
    [a.id, b.id].map((id) =>
      request(`/api/tab-publications/${id}/claim`, {
        method: "POST",
        body: { executor },
      }),
    ),
  );
  assert.deepEqual(claims.map((r) => r.status).sort(), [200, 409]);
  const active = claims[0].status === 200 ? a : b;
  assert.equal(
    (
      await request(`/api/tab-publications/${active.id}/sending`, {
        method: "POST",
        body: { executor: other },
      })
    ).status,
    409,
  );
  await expectJSON(
    await request(`/api/tab-publications/${active.id}/sending`, {
      method: "POST",
      body: { executor },
    }),
  );
  await expectJSON(
    await request(`/api/tab-publications/${active.id}/result`, {
      method: "POST",
      body: { executor, state: "unknown" },
    }),
  );
  assert.equal(
    (
      await request(`/api/tab-publications/${active.id}/claim`, {
        method: "POST",
        body: { executor },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/api/tab-publications/${active.id}/authorize`, {
        method: "POST",
        body: { executor, confirmed: true },
      })
    ).status,
    409,
  );
});
test("Eklenti yayın onayı sabit içeriği korur; profil değişimi ve sahte başarı reddedilir, kesinti belirsiz kalır", async () => {
  const { id, accountId, draft } = await newTabJob("x"),
    executor = crypto.randomUUID();
  assert.equal(
    (
      await request("/api/tab-publications", {
        method: "POST",
        body: {
          id: crypto.randomUUID(),
          draftId: draft.id,
          accountId,
          targetLabel: "Kurgu",
        },
      })
    ).status,
    409,
  );
  await expectJSON(
    await request(`/api/tab-publications/${id}/authorize`, {
      method: "POST",
      body: { executor, confirmed: true },
    }),
  );
  await db
    .prepare("UPDATE social_accounts SET profile_url=? WHERE id=?")
    .bind("https://x.com/other", accountId)
    .run();
  assert.equal(
    (
      await request(`/api/tab-publications/${id}/claim`, {
        method: "POST",
        body: { executor },
      })
    ).status,
    409,
  );
  await db
    .prepare("UPDATE social_accounts SET profile_url=? WHERE id=?")
    .bind("https://x.com/fixture", accountId)
    .run();
  await expectJSON(
    await request(`/api/tab-publications/${id}/claim`, {
      method: "POST",
      body: { executor },
    }),
  );
  await expectJSON(
    await request(`/api/tab-publications/${id}/sending`, {
      method: "POST",
      body: { executor },
    }),
  );
  assert.equal(
    (
      await request(`/api/tab-publications/${id}/result`, {
        method: "POST",
        body: {
          executor,
          state: "verified",
          url: "https://x.com/other/status/123",
        },
      })
    ).status,
    400,
  );
  await db
    .prepare(
      "UPDATE publication_jobs SET updated_at='2000-01-01T00:00:00.000Z' WHERE id=?",
    )
    .bind(id)
    .run();
  const jobs = await expectJSON(
    await request(`/api/tab-publications?companyId=${first.id}`),
  );
  assert.equal(jobs.find((j) => j.id === id).state, "unknown");
  assert.equal(
    (
      await request(`/api/tab-publications/${id}/claim`, {
        method: "POST",
        body: { executor },
      })
    ).status,
    409,
  );
});
test("Eski yayın cron işi eklenti hedefini ayrı Firefox oturumunda yürütmez", async () => {
  const { id } = await newTabJob(),
    executor = crypto.randomUUID();
  await expectJSON(
    await request(`/api/tab-publications/${id}/authorize`, {
      method: "POST",
      body: { executor, confirmed: true },
    }),
  );
  await scheduledPublications(
    mf.getBindings ? await mf.getBindings() : { DB: db },
    async () => {
      throw new Error("Eklenti işi bilgisayar brokerına gönderilemez.");
    },
  );
  assert.equal(
    (
      await db
        .prepare("SELECT state FROM publication_jobs WHERE id=?")
        .bind(id)
        .first()
    ).state,
    "queued",
  );
});

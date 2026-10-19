import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { Hono } from "hono";
import { createCloudStore } from "../../worker/store.mjs";
import {
  registerSocialAI,
  reserveAI,
  aiReservation,
  aiText,
  AI_MODEL,
  AI_LIMITS,
} from "../../worker/social-ai.mjs";

let mf, db, app, model;
const companies = [crypto.randomUUID(), crypto.randomUUID()];
async function call(
  path,
  {
    method = "GET",
    body,
    role = "admin",
    userId = "user-1",
    enabled = true,
  } = {},
) {
  return app.request(
    "https://studio.test" + path,
    {
      method,
      headers: {
        "content-type": "application/json",
        "x-fixture-role": role,
        "x-fixture-user": userId,
      },
      body: body ? JSON.stringify(body) : undefined,
    },
    { DB: db, AI: model, AI_FREE_ONLY: enabled ? "true" : "false" },
  );
}
const input = (companyId = companies[0]) => ({
  companyId,
  question: "Hizmet verdiğimiz şehir için içerik fikri ver.",
  mode: "chat",
});
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: 'export default {fetch(){return new Response("ok")}}',
    d1Databases: { DB: "social-ai-tests" },
  });
  db = await mf.getD1Database("DB");
  for (const name of ["0001_studio.sql", "0006_social_ai.sql"])
    for (const sql of (await readFile(`migrations/${name}`, "utf8"))
      .split(";")
      .map((v) => v.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  app = new Hono();
  app.use("*", async (c, next) => {
    c.set("store", createCloudStore(c.env.DB));
    c.set("identity", {
      id: c.req.header("x-fixture-user"),
      role: c.req.header("x-fixture-role"),
    });
    await next();
  });
  registerSocialAI(app);
  app.onError((e, c) =>
    c.json({ error: e.public ? e.message : "Geçersiz istek" }, e.status ?? 400),
  );
});
beforeEach(async () => {
  for (const table of [
    "ai_memory",
    "ai_turns",
    "ai_requests",
    "ai_budget",
    "companies",
  ])
    await db.prepare(`DELETE FROM ${table}`).run();
  for (const [i, id] of companies.entries())
    await createCloudStore(db).saveCompany(
      {
        name: i ? "Şirket B özel bilgi" : "Şirket A",
        tone: "Samimi",
        audience: "Yerel işletmeler",
        website: "",
        keywords: "marka",
      },
      id,
    );
  model = {
    run: async () => ({
      choices: [
        {
          message: { content: "Sivas için yerel bir içerik fikri." },
          finish_reason: "stop",
        },
      ],
    }),
  };
});
after(async () => {
  await mf?.dispose();
});

test("Şirket hafızası kalıcı ve şirket kapsamlıdır; editör yazamaz, yanlış şirkete taşıma/silme yapılamaz", async () => {
  const entry = {
    companyId: companies[0],
    kind: "fact",
    title: "Hizmet",
    body: "Yalnızca Sivas'ta hizmet veriyoruz.",
  };
  assert.equal(
    (
      await call("/api/ai/memory", {
        method: "POST",
        body: entry,
        role: "editor",
      })
    ).status,
    403,
  );
  const created = await call("/api/ai/memory", { method: "POST", body: entry });
  assert.equal(created.status, 201);
  const item = await created.json();
  assert.equal(
    (await (await call(`/api/ai/workspace?companyId=${companies[0]}`)).json())
      .memory[0].body,
    entry.body,
  );
  assert.deepEqual(
    (await (await call(`/api/ai/workspace?companyId=${companies[1]}`)).json())
      .memory,
    [],
  );
  assert.equal(
    (
      await call(`/api/ai/memory/${item.id}`, {
        method: "PUT",
        body: { ...entry, companyId: companies[1] },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(`/api/ai/memory/${item.id}?companyId=${companies[1]}`, {
        method: "DELETE",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(`/api/ai/memory/${item.id}`, {
        method: "PUT",
        body: { ...entry, body: "Ankara'da hizmet veriyoruz." },
      })
    ).status,
    200,
  );
  await createCloudStore(db).deleteCompany(companies[0]);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM ai_memory").first()).n,
    0,
  );
});

test("Model yalnızca seçili şirket hafızasını alır; kendi sohbet geçmişi saklanır, iç düşünce döndürülmez", async () => {
  await call("/api/ai/memory", {
    method: "POST",
    body: {
      companyId: companies[0],
      kind: "fact",
      title: "Hizmet şehri",
      body: "Sivas",
    },
  });
  await call("/api/ai/memory", {
    method: "POST",
    body: {
      companyId: companies[1],
      kind: "fact",
      title: "Gizli diğer şirket",
      body: "DİĞER-ŞİRKET-ÖZEL-BİLGİ",
    },
  });
  model.run = async (name, options) => {
    assert.equal(name, AI_MODEL);
    assert.equal(options.max_tokens, AI_LIMITS.replyTokens);
    const prompt = JSON.stringify(options.messages);
    assert.match(prompt, /Sivas/);
    assert.doesNotMatch(prompt, /DİĞER-ŞİRKET-ÖZEL-BİLGİ|Şirket B/);
    return {
      choices: [
        {
          message: {
            content:
              "<think>özel düşünce</think>Sivas için yerel içerik öneriyorum.",
            reasoning_content: "özel analiz",
          },
          finish_reason: "stop",
        },
      ],
    };
  };
  const result = await call("/api/ai/ask", { method: "POST", body: input() });
  assert.equal(result.status, 200);
  const value = await result.json();
  assert.match(value.answer, /Sivas/);
  assert.doesNotMatch(JSON.stringify(value), /özel düşünce|özel analiz/);
  assert.equal(value.published, false);
  assert.equal(
    (await (await call(`/api/ai/workspace?companyId=${companies[0]}`)).json())
      .turns.length,
    1,
  );
  assert.deepEqual(
    (
      await (
        await call(`/api/ai/workspace?companyId=${companies[0]}`, {
          userId: "user-2",
        })
      ).json()
    ).turns,
    [],
  );
  await call(`/api/ai/history?companyId=${companies[0]}`, { method: "DELETE" });
  assert.equal(
    (await (await call(`/api/ai/workspace?companyId=${companies[0]}`)).json())
      .memory.length,
    1,
  );
});

test("Sekiz platform verisi doğrulanır; eksik/tekrarlanan/hatalı model yanıtı mevcut geçmişe eklenmez", async () => {
  const selected = [
    "instagram",
    "facebook",
    "x",
    "threads",
    "pinterest",
    "youtube",
    "tiktok",
    "linkedin",
  ];
  const posts = selected.map((platform) => ({
    platform,
    title: "",
    caption: "Doğrulanmış içerik",
    hashtags: ["#marka"],
    alt: "",
  }));
  model.run = async (_name, options) => {
    assert.deepEqual(options.response_format, { type: "json_object" });
    return { response: JSON.stringify({ posts }) };
  };
  const data = { ...input(), mode: "posts", selected };
  const result = await call("/api/ai/ask", { method: "POST", body: data });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).posts.length, 8);
  for (const response of [
    '{"posts":[]}',
    JSON.stringify({ posts: [posts[0], posts[0]] }),
    "geçersiz json",
  ]) {
    model.run = async () => ({ response });
    assert.equal(
      (await call("/api/ai/ask", { method: "POST", body: data })).status,
      502,
    );
  }
  assert.equal(
    (await (await call(`/api/ai/workspace?companyId=${companies[0]}`)).json())
      .turns.length,
    1,
  );
});

test("Sağlayıcı hatası gizli ayrıntı sızdırmaz, ücretli yola geçmez ve ayrılan bütçe geri verilmez", async () => {
  model.run = async () => {
    throw new Error("fixture-secret-private-prompt");
  };
  const response = await call("/api/ai/ask", { method: "POST", body: input() });
  assert.equal(response.status, 503);
  assert.doesNotMatch(await response.text(), /fixture-secret/);
  assert.ok((await (await call("/api/ai/status")).json()).reservedNeurons > 0);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM ai_turns").first()).n,
    0,
  );
  assert.equal(
    (
      await call("/api/ai/ask", {
        method: "POST",
        body: input(),
        enabled: false,
      })
    ).status,
    503,
  );
});

test("Eşzamanlı model istekleri günlük bütçeyi aşamaz; onaylanmayan rezervasyon çağrı kaydı oluşturmaz", async () => {
  const results = await Promise.allSettled(
    Array.from({ length: 15 }, () =>
      reserveAI(db, "same-user", 1000, Date.parse("2026-10-19T12:00:00Z")),
    ),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 9);
  assert.equal(
    (await db.prepare("SELECT reserved_neurons FROM ai_budget").first())
      .reserved_neurons,
    9000,
  );
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM ai_requests").first()).n,
    9,
  );
});

test("Kullanıcı başına saat sınırı atomiktir; UTC gün sonu engellenir, ertesi gün bütçe yenilenir", async () => {
  const now = Date.parse("2026-10-19T12:00:00Z");
  const results = await Promise.allSettled(
    Array.from({ length: 30 }, () => reserveAI(db, "same-user", 1, now)),
  );
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 20);
  await assert.rejects(
    reserveAI(db, "other", 1, Date.parse("2026-10-19T23:59:00Z")),
    /duraklatıldı/,
  );
  await reserveAI(db, "same-user", 1000, Date.parse("2026-10-20T00:01:00Z"));
  assert.deepEqual(await db.prepare("SELECT * FROM ai_budget").first(), {
    day: "2026-10-20",
    reserved_neurons: 1000,
  });
});

test("Hafıza sayısı ve karakter sınırı eşzamanlı yazmalarda korunur", async () => {
  const results = await Promise.all(
    Array.from({ length: 40 }, (_, i) =>
      call("/api/ai/memory", {
        method: "POST",
        body: {
          companyId: companies[0],
          kind: "rule",
          title: `Kural ${i}`,
          body: "Sade Türkçe kullan.",
        },
      }),
    ),
  );
  assert.equal(results.filter((r) => r.status === 201).length, 30);
  for (let i = 0; i < 4; i++)
    assert.equal(
      (
        await call("/api/ai/memory", {
          method: "POST",
          body: {
            companyId: companies[1],
            kind: "fact",
            title: "Bilgi",
            body: "a".repeat(2000),
          },
        })
      ).status,
      201,
    );
  assert.equal(
    (
      await call("/api/ai/memory", {
        method: "POST",
        body: {
          companyId: companies[1],
          kind: "fact",
          title: "Taşma",
          body: "a",
        },
      })
    ).status,
    409,
  );
});

test("İstek boyutu ve model çıktısı sınırlıdır; iç düşünce veya kesilmiş yanıt gösterilmez", () => {
  assert.ok(aiReservation([{ role: "user", content: "Merhaba" }], 2048) > 0);
  assert.throws(
    () => aiReservation([{ role: "user", content: "a".repeat(30000) }], 2048),
    /çok uzun/,
  );
  assert.throws(
    () =>
      aiText({
        choices: [{ message: { content: "yarım" }, finish_reason: "length" }],
      }),
    /tam bir yanıt/,
  );
  assert.throws(
    () => aiText({ response: "<think>henüz tamamlanmadı" }),
    /doğrulanamadı/,
  );
});

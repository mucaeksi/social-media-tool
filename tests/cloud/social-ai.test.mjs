import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { Hono } from "hono";
import sharp from "sharp";
import { createCloudStore } from "../../worker/store.mjs";
import { VISION_MODEL, visionReservation } from "../../worker/ai-vision.mjs";
import { objectKey } from "../../worker/media.mjs";
import { createD1Media } from "../../worker/d1-media.mjs";
import {
  registerSocialAI,
  reserveAI,
  aiReservation,
  aiText,
  AI_MODEL,
  AI_LIMITS,
} from "../../worker/social-ai.mjs";

let mf, db, app, model, bucket;
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
    {
      DB: db,
      MEDIA: bucket,
      AI: model,
      AI_FREE_ONLY: enabled ? "true" : "false",
    },
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
    r2Buckets: { MEDIA: "ai-test-images" },
  });
  db = await mf.getD1Database("DB");
  bucket = await mf.getR2Bucket("MEDIA");
  for (const name of [
    "0001_studio.sql",
    "0002_d1_media.sql",
    "0003_r2_budget.sql",
    "0006_social_ai.sql",
    "0007_ai_images.sql",
  ])
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

async function image(companyId = companies[0], storage = "r2") {
  const bytes = await sharp({
    create: { width: 128, height: 96, channels: 3, background: "#c32420" },
  })
    .jpeg()
    .toBuffer();
  const media = await createCloudStore(db).saveMedia({
    companyId,
    width: 128,
    height: 96,
    storage,
  });
  const key = objectKey(companyId, media.id, "original");
  if (storage === "d1") await createD1Media(db).put(key, bytes);
  else await bucket.put(key, bytes);
  return { media, bytes };
}

test("Görsel özel depodan okunur; iki modelin bütçesi önceden ayrılır ve gözlem platform içeriğine taşınır", async () => {
  const { media, bytes } = await image(),
    calls = [];
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
  model.run = async (name, options) => {
    calls.push(name);
    assert.ok(
      (await db.prepare("SELECT reserved_neurons FROM ai_budget").first())
        .reserved_neurons > visionReservation(),
    );
    if (name === VISION_MODEL) {
      assert.equal(options.max_completion_tokens, 768);
      assert.equal(options.chat_template_kwargs.enable_thinking, false);
      const url = options.messages[0].content[1].image_url.url;
      assert.ok(url.startsWith("data:image/jpeg;base64,"));
      assert.deepEqual(Buffer.from(url.split(",")[1], "base64"), bytes);
      return {
        choices: [
          {
            message: { content: "A red ceramic mug on a white background." },
            finish_reason: "stop",
          },
        ],
      };
    }
    const prompt = JSON.stringify(options.messages);
    assert.match(prompt, /red ceramic mug/);
    assert.doesNotMatch(prompt, /CLIENT-INJECTED-OBSERVATION/);
    return {
      response: JSON.stringify({
        posts: selected.map((platform) => ({
          platform,
          title: "",
          caption: `${platform} için kırmızı kupa duyurusu.`,
          hashtags: [],
          alt: "Beyaz zeminde kırmızı seramik kupa.",
        })),
      }),
    };
  };
  const result = await call("/api/ai/ask", {
    method: "POST",
    body: {
      ...input(),
      mode: "posts",
      selected,
      mediaId: media.id,
      imageObservation: "CLIENT-INJECTED-OBSERVATION",
    },
  });
  assert.equal(result.status, 200);
  const value = await result.json();
  assert.deepEqual(calls, [VISION_MODEL, AI_MODEL]);
  assert.equal(value.mediaId, media.id);
  assert.match(value.imageObservation, /red ceramic mug/);
  assert.equal(value.published, false);
  const workspace = await (
    await call(`/api/ai/workspace?companyId=${companies[0]}`)
  ).json();
  assert.equal(workspace.turns[0].mediaId, media.id);
  assert.equal(workspace.turns[0].expertVersion, "gorsel-ozet-v1");
  await db.prepare("DELETE FROM media WHERE id=?").bind(media.id).run();
  assert.equal(
    (await (await call(`/api/ai/workspace?companyId=${companies[0]}`)).json())
      .turns[0].mediaId,
    null,
  );
});

test("Başka şirket görseli AI ve depoya erişilmeden reddedilir", async () => {
  const { media } = await image(companies[1]);
  let called = false;
  model.run = async () => {
    called = true;
  };
  const result = await call("/api/ai/ask", {
    method: "POST",
    body: { ...input(), mediaId: media.id },
  });
  assert.equal(result.status, 400);
  assert.equal(called, false);
  assert.equal(
    (await (await call("/api/ai/status")).json()).reservedNeurons,
    0,
  );
});

test("Görsel modeli başarısızsa metin modeli çağrılmaz, sonuç kaydedilmez ve ayrılan bütçe korunur", async () => {
  const { media } = await image();
  let calls = 0;
  model.run = async (name) => {
    calls++;
    assert.equal(name, VISION_MODEL);
    throw new Error("fixture-private-image-url");
  };
  const result = await call("/api/ai/ask", {
    method: "POST",
    body: { ...input(), mediaId: media.id },
  });
  assert.equal(result.status, 503);
  assert.doesNotMatch(await result.text(), /fixture-private/);
  assert.equal(calls, 1);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM ai_turns").first()).n,
    0,
  );
  assert.ok(
    (await (await call("/api/ai/status")).json()).reservedNeurons >=
      visionReservation(),
  );
});

test("Görsel okuma D1 yedek depoda da çalışır; genel URL veya R2 gerektirmez", async () => {
  const { media } = await image(companies[0], "d1");
  model.run = async (name) =>
    name === VISION_MODEL
      ? { response: "A red product on white." }
      : { response: "Görselde kırmızı bir ürün var." };
  const result = await call("/api/ai/ask", {
    method: "POST",
    body: { ...input(), mediaId: media.id },
  });
  assert.equal(result.status, 200);
  assert.match((await result.json()).imageObservation, /red product/);
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
    caption: `${platform} için doğrulanmış içerik`,
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
    JSON.stringify({
      posts: posts.map((p, i) => ({
        ...p,
        caption: i % 2 ? "  AYNI   İÇERİK  " : "aynı içerik",
      })),
    }),
    "geçersiz json",
  ]) {
    let attempts = 0;
    model.run = async () => {
      attempts++;
      return { response };
    };
    assert.equal(
      (await call("/api/ai/ask", { method: "POST", body: data })).status,
      502,
    );
    assert.equal(attempts, 2);
  }
  assert.equal(
    (await (await call(`/api/ai/workspace?companyId=${companies[0]}`)).json())
      .turns.length,
    1,
  );
});

test("Aynı platform metinleri en fazla bir kez düzeltilir; iki çağrının bütçesi baştan ayrılır ve yalnızca doğru sonuç saklanır", async () => {
  const selected = ["instagram", "facebook"];
  const initial = {
    posts: selected.map((platform) => ({
      platform,
      caption: "Aynı metin",
      hashtags: [],
    })),
  };
  let attempts = 0,
    firstCost;
  model.run = async (_name, options) => {
    attempts++;
    const budget = (
      await db.prepare("SELECT reserved_neurons FROM ai_budget").first()
    ).reserved_neurons;
    if (attempts === 1) {
      firstCost = aiReservation(options.messages, options.max_tokens);
      assert.ok(budget > firstCost);
      return { response: JSON.stringify(initial) };
    }
    assert.equal(attempts, 2);
    assert.equal(options.messages.at(-2).role, "assistant");
    assert.equal(options.messages.at(-2).content, JSON.stringify(initial));
    assert.match(options.messages.at(-1).content, /denetimden geçmedi/);
    assert.match(options.messages.at(-1).content, /\["facebook"\]/);
    assert.equal(options.max_tokens, AI_LIMITS.repairTokens);
    assert.ok(
      budget >= firstCost + aiReservation(options.messages, options.max_tokens),
    );
    return {
      response: JSON.stringify({
        posts: [
          {
            ...initial.posts[1],
            caption: "Topluluğumuz için yeni bir buluşma.",
          },
        ],
      }),
    };
  };
  const response = await call("/api/ai/ask", {
    method: "POST",
    body: { ...input(), mode: "posts", selected },
  });
  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.equal(
    new Set((await response.json()).posts.map((p) => p.caption)).size,
    2,
  );
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS n FROM ai_requests").first()).n,
    1,
  );
  const workspace = await (
    await call(`/api/ai/workspace?companyId=${companies[0]}`)
  ).json();
  assert.equal(workspace.turns.length, 1);
  assert.equal(workspace.turns[0].posts[0].caption, "Aynı metin");
  assert.equal(
    workspace.turns[0].posts[1].caption,
    "Topluluğumuz için yeni bir buluşma.",
  );
  attempts = 0;
  model.run = async () => ({
    response: JSON.stringify({
      posts: ++attempts === 1 ? initial.posts : [initial.posts[1]],
    }),
  });
  assert.equal(
    (
      await call("/api/ai/ask", {
        method: "POST",
        body: { ...input(), mode: "posts", selected },
      })
    ).status,
    502,
  );
  assert.equal(attempts, 2);
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

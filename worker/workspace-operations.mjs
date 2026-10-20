import { z } from "zod";
import { companySchema, draftSchema } from "../shared/schemas.mjs";
import { qualityCases } from "../shared/quality-cases.mjs";
import { event } from "./workspace-access.mjs";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status, public: true });
};
export async function databaseUsage(db) {
  const r = await db
    .prepare("SELECT COUNT(*) AS companies FROM companies")
    .all();
  const bytes = Number(r.meta?.size_after);
  return {
    bytes: Number.isFinite(bytes) && bytes > 0 ? bytes : null,
    freeDatabaseLimit: 500000000,
    textWarningAt: 400000000,
    companies: r.results[0].companies,
    source: "D1 yanıt üstverisi",
    modelFiles: "Şirket bilgisayarında; D1/R2 kotasına dahil değil",
  };
}
export function registerWorkspaceOperations(app) {
  const admin = (c) => {
    if (c.get("identity")?.role !== "admin")
      fail(403, "Yönetici yetkisi gerekli.");
  };
  const company = async (c, id) => {
    const p = await c.get("store").company(id);
    if (!p) fail(404, "Şirket bulunamadı.");
    return p;
  };
  app.get("/api/workspace/storage", async (c) => {
    admin(c);
    const data = await databaseUsage(c.env.DB);
    const { results } = await c.env.DB.prepare(
      "SELECT 'sources' AS kind,COUNT(*) AS count,COALESCE(SUM(length(CAST(excerpt AS BLOB))),0) AS bytes FROM research_sources UNION ALL SELECT 'facts',COUNT(*),COALESCE(SUM(length(CAST(value AS BLOB))),0) FROM research_facts UNION ALL SELECT 'jobs',COUNT(*),COALESCE(SUM(length(CAST(snapshot AS BLOB))),0) FROM publication_jobs",
    ).all();
    return c.json({
      ...data,
      textArchives: results,
      limits: {
        sourcesPerCompany: 100,
        factsPerCompany: 100,
        jobsPerCompany: 100,
        evaluationsPerCompany: 100,
        metricsPerCompany: 100,
      },
    });
  });
  app.get("/api/quality", async (c) => {
    const id = z.uuid().parse(c.req.query("companyId"));
    await company(c, id);
    return c.json({
      cases: qualityCases,
      evaluations: (
        await c.env.DB.prepare(
          "SELECT * FROM content_evaluations WHERE company_id=? ORDER BY created_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      ).results.map((r) => ({ ...r, scores: JSON.parse(r.scores) })),
    });
  });
  app.post("/api/quality", async (c) => {
    const input = z
      .object({
        companyId: z.uuid(),
        scenario: z.enum(qualityCases.map((r) => r.id)),
        answer: z.string().trim().min(1).max(6000),
        scores: z.object({
          grounding: z.number().int().min(0).max(4),
          brand: z.number().int().min(0).max(4),
          local: z.number().int().min(0).max(4),
          platform: z.number().int().min(0).max(4),
          hallucination: z.boolean(),
        }),
      })
      .parse(await c.req.json());
    await company(c, input.companyId);
    const result = await c.env.DB.prepare(
      "INSERT INTO content_evaluations VALUES(?,?,?,?,?,?,?)",
    )
      .bind(
        crypto.randomUUID(),
        input.companyId,
        c.get("identity").id,
        input.scenario,
        input.answer,
        JSON.stringify(input.scores),
        new Date().toISOString(),
      )
      .run();
    await c.env.DB.prepare(
      "DELETE FROM content_evaluations WHERE company_id=? AND id NOT IN (SELECT id FROM content_evaluations WHERE company_id=? ORDER BY created_at DESC,id DESC LIMIT 100)",
    )
      .bind(input.companyId, input.companyId)
      .run();
    return c.json({ ok: Boolean(result.success) }, 201);
  });
  app.get("/api/metrics", async (c) => {
    const id = z.uuid().parse(c.req.query("companyId"));
    await company(c, id);
    return c.json(
      (
        await c.env.DB.prepare(
          "SELECT * FROM content_metrics WHERE company_id=? ORDER BY measured_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      ).results.map((r) => ({ ...r, values: JSON.parse(r.values_json) })),
    );
  });
  app.post("/api/metrics", async (c) => {
    const input = z
      .object({
        companyId: z.uuid(),
        jobId: z.uuid().nullable().default(null),
        sourceUrl: z.url().max(2048),
        measuredAt: z.iso.datetime(),
        values: z.object({
          impressions: z.number().int().nonnegative().max(1e9),
          clicks: z.number().int().nonnegative().max(1e9),
          messages: z.number().int().nonnegative().max(1e9),
          leads: z.number().int().nonnegative().max(1e9),
        }),
      })
      .parse(await c.req.json());
    await company(c, input.companyId);
    const url = new URL(input.sourceUrl);
    if (url.protocol !== "https:" || url.username || url.password)
      fail(400, "Kaynak bağlantısı HTTPS olmalı.");
    if (
      input.jobId &&
      !(await c.env.DB.prepare(
        "SELECT id FROM publication_jobs WHERE id=? AND company_id=?",
      )
        .bind(input.jobId, input.companyId)
        .first())
    )
      fail(400, "Gönderi bu şirkete ait değil.");
    if (Date.parse(input.measuredAt) > Date.now() + 60000)
      fail(400, "Ölçüm tarihi gelecekte olamaz.");
    await c.env.DB.prepare("INSERT INTO content_metrics VALUES(?,?,?,?,?,?,?)")
      .bind(
        crypto.randomUUID(),
        input.companyId,
        input.jobId,
        input.sourceUrl,
        input.measuredAt,
        JSON.stringify(input.values),
        c.get("identity").id,
      )
      .run();
    await c.env.DB.prepare(
      "DELETE FROM content_metrics WHERE company_id=? AND id NOT IN (SELECT id FROM content_metrics WHERE company_id=? ORDER BY measured_at DESC,id DESC LIMIT 100)",
    )
      .bind(input.companyId, input.companyId)
      .run();
    return c.json(
      {
        ok: true,
        source: "İşletmenin girdiği ölçüm; platform API'sinden çekilmedi.",
      },
      201,
    );
  });
  app.get("/api/workspace/backup", async (c) => {
    admin(c);
    const id = z.uuid().parse(c.req.query("companyId"));
    const profile = await company(c, id);
    const estimate = await c.env.DB.prepare(
      "SELECT (SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) FROM drafts WHERE company_id=?)+(SELECT COALESCE(SUM(length(CAST(excerpt AS BLOB))+length(CAST(url AS BLOB))+length(CAST(final_url AS BLOB))+length(CAST(title AS BLOB))+512),0) FROM research_sources WHERE company_id=?) AS bytes",
    )
      .bind(id, id)
      .first();
    if (estimate.bytes > 3500000)
      fail(
        413,
        "Metin yedeği 4 MB sınırına yaklaştı. Büyük taslakları ayrı dışa aktarıp eski kayıtları temizleyin.",
      );
    const drafts = await c.get("store").drafts(id);
    if (drafts.length > 100)
      fail(
        413,
        "Yedek en fazla 100 taslak içerebilir. Eski taslakları ayrıca dışa aktarın.",
      );
    const sources = (
      await c.env.DB.prepare(
        "SELECT url,final_url,title,excerpt,content_hash,fetched_at FROM research_sources WHERE company_id=? LIMIT 100",
      )
        .bind(id)
        .all()
    ).results;
    const memory = (
      await c.env.DB.prepare(
        "SELECT kind,title,body FROM ai_memory WHERE company_id=? LIMIT 30",
      )
        .bind(id)
        .all()
    ).results;
    c.header(
      "Content-Disposition",
      `attachment; filename="sosyal-studio-yedek-${id}.json"`,
    );
    return c.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      company: profile,
      drafts,
      sources,
      memory,
      note: "Görsel dosyaları, sosyal hesap oturumları, şifreler ve model dosyaları bu metin yedeğinde yoktur. Kaynaklar geri yüklemede yeniden onaylanır.",
    });
  });
  app.post("/api/workspace/restore", async (c) => {
    admin(c);
    const raw = await c.req.text();
    if (new TextEncoder().encode(raw).length > 4000000)
      fail(413, "Yedek en fazla 4 MB olabilir.");
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      fail(400, "Geçerli JSON yedeği gerekli.");
    }
    const httpsURL = z
      .url()
      .max(2048)
      .refine((v) => {
        const u = new URL(v);
        return u.protocol === "https:" && !u.username && !u.password;
      }, "Kaynak HTTPS olmalı.");
    const input = z
      .object({
        version: z.literal(1),
        company: companySchema,
        drafts: z.array(draftSchema).max(100),
        sources: z
          .array(
            z.object({
              url: httpsURL,
              final_url: httpsURL,
              title: z.string().max(300),
              excerpt: z.string().max(12000),
              content_hash: z.string().max(64),
              fetched_at: z.iso.datetime(),
            }),
          )
          .max(100),
        memory: z
          .array(
            z.object({
              kind: z.enum(["fact", "rule", "example"]),
              title: z.string().max(100),
              body: z.string().max(2000),
            }),
          )
          .max(30)
          .default([]),
      })
      .parse(data);
    if (input.memory.reduce((n, r) => n + r.body.length, 0) > 8000)
      fail(400, "Yedekteki şirket hafızası 8.000 karakteri aşıyor.");
    if ((await c.get("store").companies()).length >= 30)
      fail(409, "Önce şirket sınırında yer açın.");
    const now = new Date().toISOString(),
      profile = {
        ...input.company,
        id: crypto.randomUUID(),
        name: (input.company.name + " — yedek").slice(0, 80),
      };
    const statements = [
      c.env.DB.prepare(
        "INSERT INTO companies(id,data,created_at) VALUES(?,?,?)",
      ).bind(profile.id, JSON.stringify(profile), now),
    ];
    const drafts = input.drafts.map((draft) => ({
      ...draft,
      id: crypto.randomUUID(),
      companyId: profile.id,
      mediaId: null,
      sourceRefs: [],
      createdAt: now,
      updatedAt: now,
    }));
    for (let i = 0; i < drafts.length; i += 10)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO drafts(id,company_id,data,created_at,updated_at) SELECT json_extract(value,'$.id'),?,value,?,? FROM json_each(?)",
        ).bind(profile.id, now, now, JSON.stringify(drafts.slice(i, i + 10))),
      );
    const sources = input.sources.map((source) => ({
      ...source,
      id: crypto.randomUUID(),
    }));
    const memory = input.memory.map((r) => ({ ...r, id: crypto.randomUUID() }));
    for (let i = 0; i < memory.length; i += 10)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO ai_memory(id,company_id,kind,title,body,created_at) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.kind'),json_extract(value,'$.title'),json_extract(value,'$.body'),? FROM json_each(?)",
        ).bind(profile.id, now, JSON.stringify(memory.slice(i, i + 10))),
      );
    for (let i = 0; i < sources.length; i += 10)
      statements.push(
        c.env.DB.prepare(
          "INSERT INTO research_sources(id,company_id,url,final_url,title,excerpt,content_hash,fetched_at) SELECT json_extract(value,'$.id'),?,json_extract(value,'$.url'),json_extract(value,'$.final_url'),json_extract(value,'$.title'),json_extract(value,'$.excerpt'),json_extract(value,'$.content_hash'),json_extract(value,'$.fetched_at') FROM json_each(?) ON CONFLICT DO NOTHING",
        ).bind(profile.id, JSON.stringify(sources.slice(i, i + 10))),
      );
    await c.env.DB.batch(statements);
    await event(c.env.DB, c.get("identity"), "backup-restored", profile.id);
    return c.json(
      {
        companyId: profile.id,
        note: "Yeni şirket kopyası oluşturuldu. Mevcut veriler korunur; görselleri yeniden yükleyin ve kaynakları yeniden onaylayın.",
      },
      201,
    );
  });
}

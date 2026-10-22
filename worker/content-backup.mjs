import { z } from "zod";
import { companySchema, draftSchema } from "../shared/schemas.mjs";
import {
  editorialKinds,
  preferencesSchema,
  recordSchemas,
} from "../shared/editorial.mjs";
import { validateDraftRelations } from "./draft-store.mjs";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status, public: true });
};
const resourceSchema = z.object({
  group: z.enum([
    "draft",
    "record",
    "media",
    "source",
    "memory",
    "archive",
    "publication",
    "metric",
    "quality",
    "fact",
    "version",
  ]),
  id: z.string().min(1).max(200),
});
const key = (r) => `${r.group}:${r.id}`;
export function registerContentBackup(app) {
  const admin = (c) => {
    if (c.get("identity")?.role !== "admin")
      fail(403, "Yönetici yetkisi gerekli.");
  };
  const company = async (c, id) => {
    const p = await c.get("store").company(z.uuid().parse(id));
    if (!p) fail(404, "Şirket bulunamadı.");
    return p;
  };
  async function descriptors(c, id) {
    const out = [];
    for (const [group, table] of [
      ["draft", "drafts"],
      ["record", "editorial_records"],
      ["media", "media"],
      ["archive", "editorial_archives"],
      ...(!c.env.LOCAL_CONTENT
        ? [
            ["source", "research_sources"],
            ["memory", "ai_memory"],
            ["publication", "publication_jobs"],
            ["metric", "content_metrics"],
            ["quality", "content_evaluations"],
            ["fact", "research_facts"],
          ]
        : []),
    ]) {
      const { results } = await c.env.DB.prepare(
        `SELECT id FROM ${table} WHERE company_id=? LIMIT 1001`,
      )
        .bind(id)
        .all();
      if (results.length > 1000)
        fail(
          413,
          "Tek türde 1.000 kayıt yedek sınırı aşıldı. Eski taslakları ayrı dışa aktarın.",
        );
      out.push(...results.map((r) => ({ group, id: r.id })));
    }
    const versions = await c.env.DB.prepare(
      "SELECT draft_id,revision FROM draft_versions WHERE company_id=? LIMIT 100",
    )
      .bind(id)
      .all();
    out.push(
      ...versions.results.map((v) => ({
        group: "version",
        id: `${v.draft_id}:${v.revision}`,
      })),
    );
    if (out.length > 4000) fail(413, "Yedek kayıt sınırı aşıldı.");
    return out;
  }
  app.get("/api/content/backup/index", async (c) => {
    admin(c);
    const id = c.req.query("companyId"),
      profile = await company(c, id);
    const preferences = await c.env.DB.prepare(
      "SELECT data FROM editorial_preferences WHERE company_id=?",
    )
      .bind(id)
      .first();
    return c.json({
      format: 2,
      exportId: crypto.randomUUID(),
      exportedAt: new Date().toISOString(),
      company: profile,
      preferences: preferences ? JSON.parse(preferences.data) : null,
      resources: await descriptors(c, id),
      note: "Görseller ve içerik parçalı arşivlenir. Şifreler, oturumlar, cihaz anahtarları ve modeller dahil değildir. Yayınlar geri yüklemede yürütülmez; kaynaklar yeniden incelenir.",
    });
  });
  app.get("/api/content/backup/part", async (c) => {
    admin(c);
    const id = c.req.query("companyId");
    await company(c, id);
    const r = resourceSchema.parse({
      group: c.req.query("group"),
      id: c.req.query("id"),
    });
    if (r.group === "version") {
      const [draftId, revision] = r.id.split(":");
      if (!z.uuid().safeParse(draftId).success || !/^\d+$/.test(revision))
        fail(400, "Sürüm kaydı geçersiz.");
      const row = await c.env.DB.prepare(
        "SELECT * FROM draft_versions WHERE company_id=? AND draft_id=? AND revision=?",
      )
        .bind(id, draftId, Number(revision))
        .first();
      if (!row) fail(409, "Sürüm kaydı değişti. Yedeği yeniden başlatın.");
      return c.json({ resource: r, row: { ...row, id: r.id } });
    }
    const tables = {
      draft: "drafts",
      record: "editorial_records",
      archive: "editorial_archives",
      source: "research_sources",
      memory: "ai_memory",
      publication: "publication_jobs",
      metric: "content_metrics",
      quality: "content_evaluations",
      fact: "research_facts",
    };
    if (
      !tables[r.group] ||
      (c.env.LOCAL_CONTENT && !["draft", "record", "archive"].includes(r.group))
    )
      fail(400, "Yedek türü geçersiz.");
    const row = await c.env.DB.prepare(
      `SELECT * FROM ${tables[r.group]} WHERE company_id=? AND id=?`,
    )
      .bind(id, r.id)
      .first();
    if (!row)
      fail(409, "Yedek alınırken kaynak değişti. Yeniden yedek başlatın.");
    return c.json({ resource: r, row });
  });
  app.post("/api/content/restore/start", async (c) => {
    admin(c);
    const input = z
      .object({
        format: z.literal(2),
        exportId: z.uuid(),
        company: companySchema,
        preferences: preferencesSchema.nullable().optional(),
        resources: z.array(resourceSchema).max(4000),
      })
      .parse(await c.req.json());
    if (new Set(input.resources.map(key)).size !== input.resources.length)
      fail(400, "Yedekte tekrarlanan kaynak var.");
    if ((await c.get("store").companies()).length >= 30)
      fail(409, "Yeni şirket için şirket sınırında yer açın.");
    const open = await c.env.DB.prepare(
      "SELECT COUNT(*) n FROM editorial_restores WHERE user_id=? AND json_extract(data,'$.finished') IS NULL",
    )
      .bind(c.get("identity").id)
      .first();
    if (open.n >= 3)
      fail(
        409,
        "Önce yarım yedek geri yüklemelerini tamamlayın veya iptal edin.",
      );
    const companyId = crypto.randomUUID(),
      jobId = crypto.randomUUID(),
      now = new Date().toISOString(),
      profile = {
        ...input.company,
        id: companyId,
        name: (input.company.name + " — yedek").slice(0, 80),
      },
      mapping = Object.fromEntries(
        input.resources.map((r) => [key(r), crypto.randomUUID()]),
      );
    await c.env.DB.batch([
      c.env.DB.prepare("INSERT INTO companies VALUES(?,?,?)").bind(
        companyId,
        JSON.stringify(profile),
        now,
      ),
      c.env.DB.prepare(
        "INSERT INTO editorial_restores VALUES(?,?,?,?,1,?)",
      ).bind(
        jobId,
        companyId,
        c.get("identity").id,
        JSON.stringify({ index: input, mapping, completed: [] }),
        now,
      ),
    ]);
    return c.json({ id: jobId, companyId }, 201);
  });
  const restore = async (c, id) => {
    admin(c);
    const r = await c.env.DB.prepare(
      "SELECT * FROM editorial_restores WHERE id=? AND user_id=?",
    )
      .bind(z.uuid().parse(id), c.get("identity").id)
      .first();
    if (!r) fail(404, "Geri yükleme bulunamadı.");
    await company(c, r.company_id);
    return { ...r, state: JSON.parse(r.data) };
  };
  app.get("/api/content/restore/:id", async (c) => {
    const job = await restore(c, c.req.param("id"));
    return c.json({
      completed: job.state.completed,
      finished: !!job.state.finished,
    });
  });
  app.get("/api/content/restore", async (c) => {
    admin(c);
    const r = await c.env.DB.prepare(
      "SELECT id,company_id,data FROM editorial_restores WHERE user_id=? ORDER BY created_at DESC LIMIT 3",
    )
      .bind(c.get("identity").id)
      .all();
    return c.json(
      r.results.map((r) => ({
        id: r.id,
        companyId: r.company_id,
        exportId: JSON.parse(r.data).index.exportId,
        completed: JSON.parse(r.data).completed.length,
        total: JSON.parse(r.data).index.resources.length,
        finished: !!JSON.parse(r.data).finished,
      })),
    );
  });
  app.post("/api/content/restore/:id/part", async (c) => {
    const job = await restore(c, c.req.param("id")),
      input = await c.req.json(),
      resource = resourceSchema.parse(input.resource),
      k = key(resource),
      s = job.state;
    if (!s.mapping[k]) fail(400, "Kaynak yedek manifestinde yok.");
    if (s.completed.includes(k)) return c.json({ ok: true, already: true });
    if (s.finished) fail(409, "Geri yükleme tamamlanmış.");
    const statements = [],
      now = new Date().toISOString(),
      mapped = (group, id) => (id ? s.mapping[`${group}:${id}`] || null : null);
    if (resource.group === "media") {
      const m = await c.get("store").media(z.uuid().parse(input.mediaId));
      if (m?.companyId !== job.company_id)
        fail(400, "Görsel yeni şirket kopyasına ait olmalı.");
      s.mapping[k] = m.id;
    } else {
      if (
        s.index.resources.some(
          (r) => r.group === "media" && !s.completed.includes(key(r)),
        )
      )
        fail(409, "Önce görsel parçaları geri yüklenmeli.");
      const row = input.row;
      if (!row || row.id !== resource.id) fail(400, "Yedek kaydı uyuşmuyor.");
      if (new TextEncoder().encode(JSON.stringify(row)).length > 1_100_000)
        fail(413, "Yedek kaydı çok büyük.");
      if (resource.group === "record") {
        const schema = recordSchemas[z.enum(editorialKinds).parse(row.kind)];
        if (!schema) fail(400, "İçerik türü geçersiz.");
        const original =
          typeof row.data === "string" ? JSON.parse(row.data) : row.data;
        const data = schema.parse({
          ...original,
          campaignId: mapped("record", original.campaignId),
          productId: mapped("record", original.productId),
          draftId: mapped("draft", original.draftId),
          jobId: null,
          mediaId: mapped("media", original.mediaId),
          ...(original.variants
            ? {
                variants: original.variants.map((v) => ({
                  ...v,
                  draftId: mapped("draft", v.draftId),
                })),
              }
            : {}),
          ...(["product", "correction"].includes(row.kind)
            ? { state: "pending" }
            : {}),
        });
        statements.push(
          c.env.DB.prepare(
            "INSERT OR IGNORE INTO editorial_records VALUES(?,?,?,?,1,?,?,?)",
          ).bind(
            s.mapping[k],
            job.company_id,
            row.kind,
            JSON.stringify(data),
            c.get("identity").id,
            now,
            now,
          ),
        );
      } else if (resource.group === "draft") {
        const original = JSON.parse(row.data),
          d = draftSchema.parse({
            ...original,
            companyId: job.company_id,
            revision: 1,
            mediaId: mapped("media", original.mediaId),
            gallery: (original.gallery || [])
              .map((g) => ({ ...g, mediaId: mapped("media", g.mediaId) }))
              .filter((g) => g.mediaId),
            platformMedia: Object.fromEntries(
              Object.entries(original.platformMedia || {})
                .map(([p, id]) => [p, mapped("media", id)])
                .filter(([, id]) => id),
            ),
            campaignId: mapped("record", original.campaignId),
            productId: mapped("record", original.productId),
            sourceRefs: [],
            productRefs: [],
            review: {
              state: "draft",
              owner: original.review?.owner || "",
              comment: "Yedekten geri alındı; yeniden inceleyin.",
            },
          });
        const draft = {
          ...d,
          id: s.mapping[k],
          createdAt: original.createdAt || now,
          updatedAt: now,
          ...(original.deletedAt &&
          Number.isFinite(Date.parse(original.deletedAt))
            ? { deletedAt: new Date(original.deletedAt).toISOString() }
            : {}),
        };
        for (const id of [
          draft.mediaId,
          ...draft.gallery.map((g) => g.mediaId),
          ...Object.values(draft.platformMedia),
        ].filter(Boolean)) {
          const m = await c.get("store").media(id);
          if (m?.companyId !== job.company_id)
            fail(400, "Yedek görseli eksik.");
        }
        statements.push(
          c.env.DB.prepare(
            "INSERT OR IGNORE INTO drafts VALUES(?,?,?,?,?)",
          ).bind(
            draft.id,
            job.company_id,
            JSON.stringify(draft),
            draft.createdAt,
            now,
          ),
        );
      } else if (resource.group === "source" && !c.env.LOCAL_CONTENT) {
        const source = z
          .object({
            url: z.url(),
            final_url: z.url(),
            title: z.string().max(300),
            excerpt: z.string().max(12000),
            content_hash: z.string().max(64),
            fetched_at: z.iso.datetime(),
          })
          .parse(row);
        for (const u of [source.url, source.final_url])
          if (
            new URL(u).protocol !== "https:" ||
            new URL(u).username ||
            new URL(u).password
          )
            fail(400, "Kaynak bağlantısı HTTPS olmalı.");
        statements.push(
          c.env.DB.prepare(
            "INSERT OR IGNORE INTO research_sources(id,company_id,url,final_url,title,excerpt,content_hash,fetched_at) VALUES(?,?,?,?,?,?,?,?)",
          ).bind(
            s.mapping[k],
            job.company_id,
            source.url,
            source.final_url,
            source.title,
            source.excerpt,
            source.content_hash,
            source.fetched_at,
          ),
        );
      } else {
        // Old approvals, publication snapshots and memory remain reviewable archives.
        // They never become executable jobs or approved model context on restore.
        statements.push(
          c.env.DB.prepare(
            "INSERT OR IGNORE INTO editorial_archives VALUES(?,?,?,?,?)",
          ).bind(
            s.mapping[k],
            job.company_id,
            resource.group,
            JSON.stringify(row),
            now,
          ),
        );
      }
    }
    s.completed.push(k);
    const result = await c.env.DB.batch([
      ...statements,
      c.env.DB.prepare(
        "UPDATE editorial_restores SET data=?,revision=revision+1 WHERE id=? AND revision=?",
      ).bind(JSON.stringify(s), job.id, job.revision),
    ]);
    if (!result.at(-1).meta.changes)
      fail(409, "Başka bir geri yükleme isteği çalıştı. Durumu yenileyin.");
    return c.json({
      ok: true,
      completed: s.completed.length,
      total: s.index.resources.length,
    });
  });
  app.post("/api/content/restore/:id/finish", async (c) => {
    const job = await restore(c, c.req.param("id")),
      s = job.state;
    if (s.completed.length !== s.index.resources.length)
      fail(409, "Bütün yedek parçaları tamamlanmadı.");
    const drafts = await c.get("store").drafts(job.company_id);
    for (const d of drafts)
      await validateDraftRelations(c.get("store"), c.env.DB, d, {
        id: c.get("identity").id,
        role: "admin",
      });
    s.finished = true;
    await c.env.DB.prepare(
      "UPDATE editorial_restores SET data=?,revision=revision+1 WHERE id=?",
    )
      .bind(JSON.stringify(s), job.id)
      .run();
    if (s.index.preferences)
      await c.env.DB.prepare(
        "INSERT OR REPLACE INTO editorial_preferences VALUES(?,?,?)",
      )
        .bind(
          job.company_id,
          JSON.stringify(s.index.preferences),
          new Date().toISOString(),
        )
        .run();
    return c.json({
      companyId: job.company_id,
      note: "Yeni şirket kopyası hazır. Kaynakları ve ürün bilgilerini yeniden onaylayın. Eski yayın işleri yürütülmez.",
    });
  });
  app.delete("/api/content/restore/:id", async (c) => {
    const job = await restore(c, c.req.param("id"));
    await c.env.DB.prepare("DELETE FROM editorial_restores WHERE id=?")
      .bind(job.id)
      .run();
    return c.body(null, 204);
  });
  app.get("/api/content/archives", async (c) => {
    admin(c);
    const id = c.req.query("companyId");
    await company(c, id);
    const rows = await c.env.DB.prepare(
      "SELECT * FROM editorial_archives WHERE company_id=? ORDER BY created_at DESC LIMIT 100",
    )
      .bind(id)
      .all();
    return c.json(
      rows.results.map((r) => ({ ...r, data: JSON.parse(r.data) })),
    );
  });
}

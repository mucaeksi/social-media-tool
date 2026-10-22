import { registerContentBackup } from "./content-backup.mjs";
import { z } from "zod";
import { draftSchema } from "../shared/schemas.mjs";
import {
  editorialKinds,
  recordSchemas,
  preferencesSchema,
  draftAssetIds,
  conflict,
} from "../shared/editorial.mjs";
import { platforms } from "../shared/platform-catalog.mjs";
import { createR2Media } from "./r2-media.mjs";
import { createD1Media } from "./d1-media.mjs";
import { objectKey } from "./media.mjs";

const fail = (status, message) => {
  throw Object.assign(new Error(message), { status, public: true });
};
const decode = (r) => ({
  ...JSON.parse(r.data),
  id: r.id,
  revision: r.revision,
  createdBy: r.created_by,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
export function registerEditorial(app) {
  registerContentBackup(app);
  for (const path of ["/api/ai/ask", "/api/computer/ai/ask"]) {
    app.use(path, async (c, next) => {
      if (c.req.method !== "POST" || c.env.LOCAL_CONTENT) return next();
      const input = await c.req.raw
        .clone()
        .json()
        .catch(() => null);
      if (!input?.mediaId || !z.uuid().safeParse(input.mediaId).success)
        return next();
      const image = await c.get("store").media(input.mediaId);
      if (!image || image.companyId !== input.companyId)
        fail(400, "Görsel bu şirkete ait değil.");
      const lease = crypto.randomUUID(),
        now = new Date().toISOString();
      await c.env.DB.prepare(
        "DELETE FROM media_usage_leases WHERE expires_at<=?",
      )
        .bind(now)
        .run();
      const result = await c.env.DB.prepare(
        "INSERT INTO media_usage_leases SELECT ?,id,? FROM media WHERE id=? AND company_id=? AND json_extract(data,'$.deleting') IS NULL",
      )
        .bind(
          lease,
          new Date(Date.now() + 1800000).toISOString(),
          image.id,
          image.companyId,
        )
        .run();
      if (!result.meta.changes)
        fail(409, "Görsel kaldırılıyor; başka görsel seçin.");
      try {
        await next();
      } finally {
        await c.env.DB.prepare("DELETE FROM media_usage_leases WHERE id=?")
          .bind(lease)
          .run();
      }
    });
  }

  const admin = (c) => {
    if (c.get("identity")?.role !== "admin")
      fail(403, "Yönetici yetkisi gerekli.");
  };
  const company = async (c, id) => {
    const p = await c.get("store").company(z.uuid().parse(id));
    if (!p) fail(404, "Şirket bulunamadı.");
    return p;
  };
  const record = async (c, id) => {
    const r = await c.env.DB.prepare(
      "SELECT * FROM editorial_records WHERE id=?",
    )
      .bind(z.uuid().parse(id))
      .first();
    if (!r) fail(404, "Kayıt bulunamadı.");
    await company(c, r.company_id);
    return r;
  };
  const objectStore = (c, image) =>
    image.storage === "d1"
      ? createD1Media(c.env.DB)
      : createR2Media(c.env.DB, c.env.MEDIA);

  app.post("/api/content/evidence/check", async (c) => {
    const input = await c.req.json();
    await company(c, input.companyId);
    const refs = draftSchema.shape.sourceRefs.parse(input.refs) || [];
    const results = [];
    for (const ref of refs) {
      let valid = false;
      if (!c.env.LOCAL_CONTENT) {
        const r = await c.env.DB.prepare(
          "SELECT f.id FROM research_facts f JOIN research_sources s ON s.id=f.source_id WHERE f.id=? AND f.company_id=? AND f.source_id=? AND f.value=? AND f.retired_at IS NULL AND f.valid_until>? AND s.state='approved'",
        )
          .bind(
            ref.factId,
            input.companyId,
            ref.sourceId,
            ref.value,
            new Date().toISOString(),
          )
          .first();
        valid = !!r;
      }
      results.push({
        factId: ref.factId,
        valid,
        reason: valid
          ? "Onaylı kaynak bilgisi hâlâ geçerli."
          : "Bilgi doğrulanamadı, değişmiş veya süresi dolmuş olabilir. Yeniden inceleyin.",
      });
    }
    return c.json(results);
  });
  app.get("/api/content/impact", async (c) => {
    const id = c.req.query("companyId");
    await company(c, id);
    const url = (c.req.query("url") || "").slice(0, 2048);
    const rows = await c.env.DB.prepare(
      "SELECT id,json_extract(data,'$.name') name FROM drafts d WHERE company_id=? AND json_extract(data,'$.deletedAt') IS NULL AND (EXISTS(SELECT 1 FROM json_tree(d.data) WHERE value=?) OR EXISTS(SELECT 1 FROM editorial_records p WHERE p.company_id=d.company_id AND p.kind='product' AND json_extract(p.data,'$.sourceUrl')=? AND (p.id=json_extract(d.data,'$.productId') OR EXISTS(SELECT 1 FROM json_tree(d.data,'$.productRefs') WHERE value=p.id)))) LIMIT 50",
    )
      .bind(id, url, url)
      .all();
    return c.json(rows.results);
  });
  app.get("/api/content/preferences", async (c) => {
    const id = c.req.query("companyId");
    const p = await company(c, id);
    const row = await c.env.DB.prepare(
      "SELECT data FROM editorial_preferences WHERE company_id=?",
    )
      .bind(id)
      .first();
    return c.json(
      row
        ? JSON.parse(row.data)
        : {
            platforms: p.preferredPlatforms || [
              "instagram",
              "facebook",
              "linkedin",
              "threads",
            ],
            compact: false,
          },
    );
  });
  app.put("/api/content/preferences", async (c) => {
    const { companyId, ...raw } = await c.req.json();
    await company(c, companyId);
    const input = preferencesSchema.parse(raw);
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO editorial_preferences VALUES(?,?,?) ON CONFLICT(company_id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
      ).bind(companyId, JSON.stringify(input), new Date().toISOString()),
      c.env.DB.prepare(
        "UPDATE companies SET data=json_set(data,'$.preferredPlatforms',json(?)) WHERE id=?",
      ).bind(JSON.stringify(input.platforms), companyId),
    ]);
    return c.json(input);
  });

  app.get("/api/content/records", async (c) => {
    const companyId = c.req.query("companyId"),
      kind = z.enum(editorialKinds).parse(c.req.query("kind"));
    await company(c, companyId);
    const rows = await c.env.DB.prepare(
      "SELECT * FROM editorial_records WHERE company_id=? AND kind=? ORDER BY updated_at DESC,id DESC LIMIT 100",
    )
      .bind(companyId, kind)
      .all();
    return c.json(rows.results.map(decode));
  });
  async function saveRecord(c) {
    const body = await c.req.json(),
      kind = z.enum(editorialKinds).parse(body.kind),
      companyId = z.uuid().parse(body.companyId);
    await company(c, companyId);
    const input = recordSchemas[kind].parse(body.data);
    if (new TextEncoder().encode(JSON.stringify(input)).length > 16000)
      fail(413, "Kayıt 16 KB sınırını aşıyor.");
    const id = c.req.param("id"),
      old = id ? await record(c, id) : null;
    if (old && (old.company_id !== companyId || old.kind !== kind))
      fail(400, "Kayıt başka şirkete veya türe taşınamaz.");
    if (old && body.revision !== old.revision) throw conflict();
    if (old && JSON.parse(old.data).state === "approved") admin(c);
    if (kind === "metric" && Date.parse(input.measuredAt) > Date.now() + 60000)
      fail(400, "Ölçüm tarihi gelecekte olamaz.");
    if (
      kind === "campaign" &&
      input.advertising &&
      input.startsAt &&
      input.endsAt &&
      input.endsAt < input.startsAt
    )
      fail(400, "Reklam planının bitişi başlangıçtan önce olamaz.");
    if (
      kind === "metric" &&
      input.advertising &&
      Date.parse(input.advertising.periodEnd) >
        Date.parse(input.measuredAt) + 60000
    )
      fail(400, "Reklam raporunun dönemi ölçüm anından sonra bitemez.");
    for (const [key, target] of [
      ["campaignId", "campaign"],
      ["productId", "product"],
    ])
      if (input[key]) {
        const r = await record(c, input[key]);
        if (r.company_id !== companyId || r.kind !== target)
          fail(400, "İlişkili kayıt bu şirkete ait değil.");
        if (
          kind === "metric" &&
          input.advertising &&
          key === "campaignId" &&
          JSON.parse(r.data).advertising?.provider &&
          JSON.parse(r.data).advertising.provider !== input.advertising.provider
        )
          fail(400, "Reklam ölçümü ile kampanya sağlayıcısı farklı.");
      }
    if (input.draftId) {
      const d = await c.get("store").draft(input.draftId);
      if (!d || d.companyId !== companyId)
        fail(400, "Taslak bu şirkete ait değil.");
    }
    if (input.mediaId) {
      const m = await c.get("store").media(input.mediaId);
      if (!m || m.companyId !== companyId)
        fail(400, "Görsel bu şirkete ait değil.");
    }
    if (input.variants)
      for (const v of input.variants)
        if (v.draftId) {
          const d = await c.get("store").draft(v.draftId);
          if (!d || d.companyId !== companyId)
            fail(400, "Varyant taslağı bu şirkete ait değil.");
        }
    if (input.jobId && !c.env.LOCAL_CONTENT) {
      const r = await c.env.DB.prepare(
        "SELECT company_id FROM publication_jobs WHERE id=?",
      )
        .bind(input.jobId)
        .first();
      if (r?.company_id !== companyId) fail(400, "Yayın bu şirkete ait değil.");
    }
    if (input.state === "approved") {
      admin(c);
      if (
        kind === "correction" &&
        input.domain === "advertising" &&
        (!input.validUntil || Date.parse(input.validUntil) <= Date.now())
      )
        fail(400, "Reklam çalışma notu için ileri geçerlilik tarihi gerekli.");
      if (
        kind === "product" &&
        (!input.evidence ||
          !input.sourceUrl ||
          Date.parse(input.validUntil) <= Date.now() ||
          !input.validUntil)
      )
        fail(
          400,
          "Ürünü onaylamak için kaynak, kanıt ve ileri geçerlilik tarihi gerekli.",
        );
      input.approvedBy = c.get("identity").id;
      input.approvedAt = new Date().toISOString();
    }
    const exampleBody =
      kind === "correction"
        ? `Önce: ${input.before}\nOnaylı düzenleme: ${input.after}\nGerekçe: ${input.reason}`
        : "";
    if (
      kind === "correction" &&
      input.state === "approved" &&
      exampleBody.length > 2000
    )
      fail(
        400,
        "Onaylı örnek 2.000 karakteri aşamaz. Daha kısa bir düzeltme seçin.",
      );
    const now = new Date().toISOString(),
      recordId = id || crypto.randomUUID();
    const result = old
      ? await c.env.DB.prepare(
          "UPDATE editorial_records SET data=?,revision=revision+1,updated_at=? WHERE id=? AND company_id=? AND revision=?",
        )
          .bind(JSON.stringify(input), now, id, companyId, body.revision)
          .run()
      : await c.env.DB.prepare(
          "INSERT INTO editorial_records SELECT ?,?,?,?,1,?,?,? WHERE (SELECT COUNT(*) FROM editorial_records WHERE company_id=? AND kind=?)<100",
        )
          .bind(
            recordId,
            companyId,
            kind,
            JSON.stringify(input),
            c.get("identity").id,
            now,
            now,
            companyId,
            kind,
          )
          .run();
    if (!result.meta.changes)
      fail(409, "Kayıt değişti veya bu türde 100 kayıt sınırı doldu.");
    if (kind === "correction" && !c.env.LOCAL_CONTENT) {
      if (input.state === "approved") {
        const body = exampleBody;
        const memoryResult = await c.env.DB.prepare(
          "INSERT INTO ai_memory(id,company_id,kind,title,body,created_at) SELECT ?,?,'example',?,?,? WHERE ((SELECT COUNT(*) FROM ai_memory WHERE company_id=?)<30 OR EXISTS(SELECT 1 FROM ai_memory WHERE id=?)) AND (SELECT COALESCE(SUM(length(body)),0) FROM ai_memory WHERE company_id=? AND id<>?)+length(?)<=8000 ON CONFLICT(id) DO UPDATE SET body=excluded.body,title=excluded.title",
        )
          .bind(
            recordId,
            companyId,
            input.domain === "advertising"
              ? `Onaylı reklam notu · ${input.validUntil}`
              : "Onaylı editör düzeltmesi",
            body,
            now,
            companyId,
            recordId,
            companyId,
            recordId,
            body,
          )
          .run();
        if (!memoryResult.meta.changes) {
          input.state = "pending";
          delete input.approvedBy;
          delete input.approvedAt;
          await c.env.DB.prepare(
            "UPDATE editorial_records SET data=? WHERE id=? AND revision=?",
          )
            .bind(JSON.stringify(input), recordId, old ? old.revision + 1 : 1)
            .run();
          fail(
            409,
            "Şirket hafızası sınırı dolu. Düzeltme inceleme bekliyor; hafızada yer açıp yeniden onaylayın.",
          );
        }
      } else
        await c.env.DB.prepare(
          "DELETE FROM ai_memory WHERE id=? AND company_id=?",
        )
          .bind(recordId, companyId)
          .run();
    }
    return c.json(
      decode(
        await c.env.DB.prepare("SELECT * FROM editorial_records WHERE id=?")
          .bind(recordId)
          .first(),
      ),
      old ? 200 : 201,
    );
  }
  app.post("/api/content/records", saveRecord);
  app.put("/api/content/records/:id", saveRecord);
  app.delete("/api/content/records/:id", async (c) => {
    const old = await record(c, c.req.param("id"));
    if (JSON.parse(old.data).state === "approved") admin(c);
    const referenced = await c.env.DB.prepare(
      "SELECT 1 FROM drafts WHERE company_id=? AND EXISTS(SELECT 1 FROM json_tree(data) WHERE value=?) UNION ALL SELECT 1 FROM editorial_records WHERE company_id=? AND id<>? AND EXISTS(SELECT 1 FROM json_tree(data) WHERE value=?) LIMIT 1",
    )
      .bind(old.company_id, old.id, old.company_id, old.id, old.id)
      .first();
    if (referenced)
      fail(
        409,
        "Kayıt başka taslak veya içerik kaydında kullanılıyor. Önce ilgili bağlantıyı kaldırın.",
      );
    if (!c.env.LOCAL_CONTENT && old.kind === "correction")
      await c.env.DB.prepare(
        "DELETE FROM ai_memory WHERE id=? AND company_id=?",
      )
        .bind(old.id, old.company_id)
        .run();
    await c.env.DB.prepare("DELETE FROM editorial_records WHERE id=?")
      .bind(old.id)
      .run();
    return c.body(null, 204);
  });

  app.get("/api/content/drafts", async (c) => {
    const id = c.req.query("companyId");
    await company(c, id);
    const query = (c.req.query("q") || "")
        .slice(0, 120)
        .toLocaleLowerCase("tr"),
      platform = c.req.query("platform"),
      mode = c.req.query("mode") || "active",
      campaign = c.req.query("campaignId"),
      state = c.req.query("state") || "",
      from = c.req.query("from") || "",
      to = c.req.query("to") || "";
    for (const date of [from, to])
      if (
        date &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
          !Number.isFinite(Date.parse(date)))
      )
        fail(400, "Taslak tarih filtresi geçersiz.");
    const page = Math.max(
        0,
        Math.min(100000, Number(c.req.query("page")) || 0),
      ),
      limit = Math.max(1, Math.min(100, Number(c.req.query("limit")) || 20));
    const where =
      "company_id=? AND ((?='trash' AND json_extract(data,'$.deletedAt') IS NOT NULL) OR (?='archive' AND json_extract(data,'$.deletedAt') IS NULL AND json_extract(data,'$.archived')=1) OR (?='active' AND json_extract(data,'$.deletedAt') IS NULL AND COALESCE(json_extract(data,'$.archived'),0)=0)) AND (?='' OR lower(json_extract(data,'$.name')||' '||json_extract(data,'$.text')) LIKE ?) AND (?='' OR EXISTS(SELECT 1 FROM json_each(json_extract(data,'$.selected')) WHERE value=?)) AND (?='' OR json_extract(data,'$.campaignId')=?) AND (?='' OR COALESCE(json_extract(data,'$.review.state'),'draft')=?) AND (?='' OR substr(updated_at,1,10)>=?) AND (?='' OR substr(updated_at,1,10)<=?)";
    const args = [
      id,
      mode,
      mode,
      mode,
      query,
      `%${query}%`,
      platform || "",
      platform || "",
      campaign || "",
      campaign || "",
      state,
      state,
      from,
      from,
      to,
      to,
    ];
    const count = await c.env.DB.prepare(
      `SELECT COUNT(*) n FROM drafts WHERE ${where}`,
    )
      .bind(...args)
      .first();
    const rows = await c.env.DB.prepare(
      `SELECT json_object('id',id,'name',json_extract(data,'$.name'),'text',substr(json_extract(data,'$.text'),1,250),'selected',json(json_extract(data,'$.selected')),'mediaId',json_extract(data,'$.mediaId'),'revision',COALESCE(json_extract(data,'$.revision'),0),'review',json(COALESCE(json_extract(data,'$.review'),'null')),'archived',json_extract(data,'$.archived'),'updatedAt',updated_at,'deletedAt',json_extract(data,'$.deletedAt'),'campaignId',json_extract(data,'$.campaignId')) AS data FROM drafts WHERE ${where} ORDER BY updated_at DESC,id DESC LIMIT ? OFFSET ?`,
    )
      .bind(...args, limit, page * limit)
      .all();
    return c.json({
      items: rows.results.map((r) => {
        const d = JSON.parse(r.data);
        return {
          id: d.id,
          name: d.name,
          text: d.text.slice(0, 250),
          selected: d.selected,
          mediaId: d.mediaId,
          revision: d.revision ?? 0,
          review: d.review,
          archived: d.archived,
          updatedAt: d.updatedAt,
          deletedAt: d.deletedAt,
          campaignId: d.campaignId,
        };
      }),
      total: count.n,
      page,
      limit,
    });
  });
  app.get("/api/content/drafts/:id/history", async (c) => {
    const d = await c.get("store").draft(c.req.param("id"));
    if (!d) fail(404, "Taslak bulunamadı.");
    await company(c, d.companyId);
    const r = await c.env.DB.prepare(
      "SELECT data FROM draft_versions WHERE draft_id=? ORDER BY revision DESC LIMIT 5",
    )
      .bind(d.id)
      .all();
    return c.json(r.results.map((r) => JSON.parse(r.data)));
  });
  app.post("/api/content/drafts/:id/restore", async (c) => {
    const r = await c.env.DB.prepare("SELECT * FROM drafts WHERE id=?")
      .bind(c.req.param("id"))
      .first();
    if (!r) fail(404, "Taslak bulunamadı.");
    await company(c, r.company_id);
    const data = JSON.parse(r.data);
    if (!data.deletedAt) fail(409, "Taslak zaten etkin.");
    await c.env.DB.prepare(
      "UPDATE drafts SET data=json_remove(json_set(data,'$.revision',COALESCE(json_extract(data,'$.revision'),0)+1),'$.deletedAt'),updated_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), r.id)
      .run();
    return c.json({ ok: true });
  });
  app.delete("/api/content/drafts/:id/permanent", async (c) => {
    admin(c);
    const r = await c.env.DB.prepare(
      "SELECT * FROM drafts WHERE id=? AND json_extract(data,'$.deletedAt') IS NOT NULL",
    )
      .bind(c.req.param("id"))
      .first();
    if (!r) fail(404, "Silinmiş taslak bulunamadı.");
    await company(c, r.company_id);
    await c.env.DB.prepare("DELETE FROM drafts WHERE id=?").bind(r.id).run();
    return c.body(null, 204);
  });

  const mediaRefs = async (c, m) => {
    const rows = await c.env.DB.prepare(
      "SELECT id,json_extract(data,'$.name') name,json_extract(data,'$.deletedAt') deletedAt FROM drafts WHERE company_id=? AND EXISTS(SELECT 1 FROM json_tree(drafts.data) WHERE value=?) UNION ALL SELECT draft_id AS id,json_extract(data,'$.name') || ' · önceki sürüm ' || revision AS name,NULL AS deletedAt FROM draft_versions WHERE company_id=? AND EXISTS(SELECT 1 FROM json_tree(draft_versions.data) WHERE value=?) LIMIT 100",
    )
      .bind(m.companyId, m.id, m.companyId, m.id)
      .all();
    let jobs = [];
    if (!c.env.LOCAL_CONTENT) {
      const r = await c.env.DB.prepare(
        "SELECT id,state FROM publication_jobs WHERE company_id=? AND state IN ('draft','queued','preparing','sending','unknown') AND EXISTS(SELECT 1 FROM json_tree(publication_jobs.snapshot) WHERE value=?) LIMIT 100",
      )
        .bind(m.companyId, m.id)
        .all();
      jobs = r.results;
    }
    return { drafts: rows.results, jobs };
  };
  app.get("/api/content/media", async (c) => {
    const id = c.req.query("companyId");
    await company(c, id);
    return c.json((await c.get("store").companyMedia(id)).filter(Boolean));
  });
  app.get("/api/content/media/:id/usage", async (c) => {
    const m = await c.get("store").media(c.req.param("id"));
    if (!m) fail(404, "Görsel bulunamadı.");
    await company(c, m.companyId);
    return c.json(await mediaRefs(c, m));
  });
  app.delete("/api/content/media/:id", async (c) => {
    const m = await c.get("store").media(c.req.param("id"));
    if (!m) fail(404, "Görsel bulunamadı.");
    await company(c, m.companyId);
    const refs = await mediaRefs(c, m);
    if (refs.drafts.length || refs.jobs.length)
      fail(
        409,
        "Görsel taslak, çöp kutusu veya yayın işinde kullanılıyor. Önce ilgili kaydı düzenleyin.",
      );
    const aiGuard = c.env.LOCAL_CONTENT
      ? ""
      : " AND NOT EXISTS(SELECT 1 FROM ai_turns WHERE company_id=media.company_id AND media_id=media.id) AND NOT EXISTS(SELECT 1 FROM local_ai_jobs WHERE company_id=media.company_id AND state NOT IN ('complete','completed','failed','cancelled') AND EXISTS(SELECT 1 FROM json_tree(request_json) WHERE value=media.id)) AND NOT EXISTS(SELECT 1 FROM publication_jobs WHERE company_id=media.company_id AND state IN ('draft','queued','preparing','sending','unknown') AND EXISTS(SELECT 1 FROM json_tree(snapshot) WHERE value=media.id))";
    const claimed = await c.env.DB.prepare(
      "UPDATE media SET data=json_set(data,'$.deleting',1) WHERE id=? AND NOT EXISTS(SELECT 1 FROM drafts WHERE company_id=media.company_id AND EXISTS(SELECT 1 FROM json_tree(drafts.data) WHERE value=media.id)) AND NOT EXISTS(SELECT 1 FROM draft_versions WHERE company_id=media.company_id AND EXISTS(SELECT 1 FROM json_tree(draft_versions.data) WHERE value=media.id)) AND NOT EXISTS(SELECT 1 FROM editorial_records WHERE company_id=media.company_id AND EXISTS(SELECT 1 FROM json_tree(editorial_records.data) WHERE value=media.id)) AND NOT EXISTS(SELECT 1 FROM media_usage_leases WHERE media_id=media.id AND expires_at>strftime('%Y-%m-%dT%H:%M:%fZ','now'))" +
        aiGuard,
    )
      .bind(m.id)
      .run();
    if (!claimed.meta.changes)
      fail(409, "Görsel bir taslak veya AI kaydında kullanılıyor.");
    try {
      if (c.env.LOCAL_CONTENT) await c.env.MEDIA_IO.remove(m);
      else {
        const store = objectStore(c, m);
        const page = await store.list({
          prefix: `companies/${m.companyId}/${m.id}/`,
        });
        if (page.truncated) fail(409, "Görsel dosya sayısı beklenenden fazla.");
        await store.delete(page.objects.map((o) => o.key));
      }
      await c.env.DB.prepare("DELETE FROM media WHERE id=?").bind(m.id).run();
      return c.body(null, 204);
    } catch (e) {
      // Keep a tombstone after partial object deletion. A later retry can finish
      // cleanup; no new draft or AI request may attach half-deleted media.
      throw e;
    }
  });
  app.get("/api/content/media/:id/file", async (c) => {
    const m = await c.get("store").media(c.req.param("id"));
    if (!m) fail(404, "Görsel bulunamadı.");
    await company(c, m.companyId);
    if (m.deleting) fail(409, "Görsel temizliği tamamlanmalı.");
    const target = c.req.query("target") || "original";
    if (
      target !== "original" &&
      !platforms.some((p) =>
        [`${p.id}_contain`, `${p.id}_cover`].includes(target),
      )
    )
      fail(400, "Görsel boyutu geçersiz.");
    const object = c.env.LOCAL_CONTENT
      ? await c.env.MEDIA_IO.read(m, target)
      : await objectStore(c, m).get(objectKey(m.companyId, m.id, target));
    if (!object) fail(404, "Görsel bulunamadı.");
    c.header("Content-Type", "image/jpeg");
    return c.body(object.body);
  });
}

export async function approvedProductContext(db, companyId) {
  const { results } = await db
    .prepare(
      "SELECT id,revision,data FROM editorial_records WHERE company_id=? AND kind='product' AND json_extract(data,'$.state')='approved' AND json_extract(data,'$.validUntil')>? ORDER BY updated_at DESC LIMIT 2",
    )
    .bind(companyId, new Date().toISOString())
    .all();
  return results.map((r) => ({
    ...JSON.parse(r.data),
    id: r.id,
    revision: r.revision,
  }));
}

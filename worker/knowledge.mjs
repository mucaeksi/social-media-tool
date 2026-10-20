import { z } from "zod";
import { computerBroker } from "./company-computer.mjs";
import {
  researchInput,
  webUrl,
  validResearchResult,
} from "../shared/research-protocol.mjs";
import { selectEvidence } from "../shared/regional-expert.mjs";
import { event } from "./workspace-access.mjs";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status, public: true });
};
export async function evidenceFor(db, companyId, question) {
  const { results } = await db
    .prepare(
      "SELECT f.*,s.final_url FROM research_facts f JOIN research_sources s ON s.id=f.source_id WHERE f.company_id=? AND f.retired_at IS NULL AND f.valid_until>? ORDER BY f.approved_at DESC LIMIT 100",
    )
    .bind(companyId, new Date().toISOString())
    .all();
  return selectEvidence(results, question);
}
export function registerKnowledge(app) {
  const company = async (c, id) => {
    const p = await c.get("store").company(id);
    if (!p) fail(404, "Şirket bulunamadı.");
    return p;
  };
  const admin = (c) => {
    if (c.get("identity")?.role !== "admin")
      fail(403, "Kaynak araştırması ve onayı için yönetici yetkisi gerekli.");
  };
  app.get("/api/knowledge", async (c) => {
    const id = z.uuid().parse(c.req.query("companyId"));
    await company(c, id);
    const [sources, facts] = await Promise.all([
      c.env.DB.prepare(
        "SELECT * FROM research_sources WHERE company_id=? ORDER BY fetched_at DESC LIMIT 100",
      )
        .bind(id)
        .all(),
      c.env.DB.prepare(
        "SELECT f.*,s.final_url FROM research_facts f JOIN research_sources s ON s.id=f.source_id WHERE f.company_id=? ORDER BY f.approved_at DESC LIMIT 100",
      )
        .bind(id)
        .all(),
    ]);
    return c.json({
      sources: sources.results,
      facts: facts.results,
      limits: {
        sources: 100,
        facts: 100,
        dailyResearch: 20,
        pagesPerResearch: 5,
      },
    });
  });
  app.post("/api/knowledge/research", async (c) => {
    admin(c);
    const input = z
      .object({
        companyId: z.uuid(),
        urls: z.array(z.string().max(2048)).min(1).max(5),
        mode: z.enum(["static", "firefox"]).default("static"),
      })
      .parse(await c.req.json());
    const profile = await company(c, input.companyId);
    let host;
    try {
      host = new URL(webUrl(profile.website)).hostname;
    } catch (e) {
      fail(400, e.message);
    }
    const hosts = [
      ...new Set([
        host,
        host.startsWith("www.") ? host.slice(4) : `www.${host}`,
      ]),
    ];
    let payload;
    try {
      payload = researchInput({ ...input, hosts });
    } catch (e) {
      fail(400, e.message);
    }
    if (!c.env.COMPANY_COMPUTER)
      fail(503, "Araştırma için şirket bilgisayarı bağlantısı gerekli.");
    const device = await c.env.DB.prepare(
      "SELECT d.id FROM company_computers d JOIN users u ON u.id=d.created_by WHERE d.revoked_at IS NULL AND u.enabled=1 AND u.role='admin' LIMIT 1",
    ).first();
    if (!device) fail(409, "Önce şirket bilgisayarını eşleştirin.");
    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) AS n FROM research_sources WHERE company_id=?",
    )
      .bind(input.companyId)
      .first();
    if (count.n + input.urls.length > 100)
      fail(
        409,
        "Şirketin 100 kaynak sınırı doldu. Eski ve kullanılmayan kaynakları silin.",
      );
    const response = await computerBroker(c.env, {
      action: "research",
      deviceId: device.id,
      input: { ...payload, companyId: input.companyId },
    });
    const result = await response.json();
    if (!response.ok)
      fail(response.status, result.error || "Araştırma tamamlanamadı.");
    if (!validResearchResult(result) || !result.ok)
      fail(502, "Araştırma sonucu doğrulanamadı.");
    if (result.pages.length !== payload.urls.length)
      fail(502, "Araştırmada istenen sayfalardan biri eksik.");
    const checked = result.pages.map((p) => {
      let url, finalUrl;
      try {
        url = webUrl(p.url, hosts);
        finalUrl = webUrl(p.finalUrl, hosts);
      } catch {
        fail(502, "Kaynak alan adı doğrulanamadı.");
      }
      if (!payload.urls.includes(url)) fail(502, "İstenmeyen kaynak döndü.");
      return { ...p, url, finalUrl };
    });
    if (new Set(checked.map((p) => p.url)).size !== payload.urls.length)
      fail(502, "Tekrarlanan kaynak sonucu alındı.");
    const now = new Date().toISOString();
    const saved = [];
    let unchanged = 0,
      limited = 0;
    for (const p of checked) {
      const { url, finalUrl } = p;
      const hash = [
        ...new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(p.text),
          ),
        ),
      ]
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const id = crypto.randomUUID();
      const inserted = await c.env.DB.prepare(
        "INSERT INTO research_sources(id,company_id,url,final_url,title,excerpt,content_hash,fetched_at) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM research_sources WHERE company_id=?)<100 ON CONFLICT DO NOTHING",
      )
        .bind(
          id,
          input.companyId,
          url,
          finalUrl,
          p.title,
          p.text,
          hash,
          now,
          input.companyId,
        )
        .run();
      if (inserted.meta.changes) saved.push(id);
      else if (
        await c.env.DB.prepare(
          "SELECT id FROM research_sources WHERE company_id=? AND final_url=? AND content_hash=?",
        )
          .bind(input.companyId, finalUrl, hash)
          .first()
      )
        unchanged++;
      else limited++;
    }
    await event(
      c.env.DB,
      c.get("identity"),
      "website-researched",
      input.companyId,
    );
    return c.json(
      {
        saved: saved.length,
        unchanged,
        limited,
        published: false,
      },
      201,
    );
  });
  app.post("/api/knowledge/sources/:id/approve", async (c) => {
    admin(c);
    const id = z.uuid().parse(c.req.param("id"));
    const input = z
      .object({
        field: z.string().trim().min(1).max(100),
        value: z.string().trim().min(1).max(600),
        evidence: z.string().trim().min(1).max(800),
        validUntil: z.iso.datetime(),
      })
      .parse(await c.req.json());
    input.field = input.field.normalize("NFKC").toLocaleLowerCase("tr-TR");
    const s = await c.env.DB.prepare(
      "SELECT * FROM research_sources WHERE id=?",
    )
      .bind(id)
      .first();
    if (!s) fail(404, "Kaynak bulunamadı.");
    await company(c, s.company_id);
    if (
      !s.excerpt.includes(input.evidence) ||
      !input.evidence.includes(input.value)
    )
      fail(400, "Bilgi ve kanıt alıntısı kaynak metinde aynen bulunmalı.");
    const until = Date.parse(input.validUntil),
      now = new Date().toISOString();
    if (until <= Date.now() || until > Date.now() + 366 * 86400000)
      fail(400, "Geçerlilik tarihi gelecekte ve en fazla bir yıl olmalı.");
    const factId = crypto.randomUUID();
    const result = await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO research_facts(id,company_id,source_id,field,value,evidence,approved_by,approved_at,valid_until) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM research_facts WHERE company_id=?)<100",
      ).bind(
        factId,
        s.company_id,
        id,
        input.field,
        input.value,
        input.evidence,
        c.get("identity").id,
        now,
        input.validUntil,
        s.company_id,
      ),
      c.env.DB.prepare(
        "UPDATE research_facts SET retired_at=? WHERE company_id=? AND field=? AND id<>? AND retired_at IS NULL AND EXISTS(SELECT 1 FROM research_facts WHERE id=?)",
      ).bind(now, s.company_id, input.field, factId, factId),
      c.env.DB.prepare(
        "UPDATE research_sources SET state='approved',approved_by=?,approved_at=?,valid_until=? WHERE id=? AND EXISTS(SELECT 1 FROM research_facts WHERE id=?)",
      ).bind(c.get("identity").id, now, input.validUntil, id, factId),
    ]);
    if (!result[0].meta.changes)
      fail(409, "100 bilgi sınırı doldu; eski bilgileri silin.");
    await event(
      c.env.DB,
      c.get("identity"),
      "source-fact-approved",
      s.company_id,
      factId,
    );
    return c.json({ id: factId }, 201);
  });
  app.delete("/api/knowledge/facts/:id", async (c) => {
    admin(c);
    const id = z.uuid().parse(c.req.param("id"));
    const r = await c.env.DB.prepare(
      "SELECT company_id FROM research_facts WHERE id=?",
    )
      .bind(id)
      .first();
    if (!r) fail(404, "Bilgi bulunamadı.");
    await company(c, r.company_id);
    await c.env.DB.prepare("DELETE FROM research_facts WHERE id=?")
      .bind(id)
      .run();
    return c.body(null, 204);
  });
  app.delete("/api/knowledge/sources/:id", async (c) => {
    admin(c);
    const id = z.uuid().parse(c.req.param("id"));
    const r = await c.env.DB.prepare(
      "SELECT company_id FROM research_sources WHERE id=?",
    )
      .bind(id)
      .first();
    if (!r) fail(404, "Kaynak bulunamadı.");
    await company(c, r.company_id);
    const deleted = await c.env.DB.prepare(
      "DELETE FROM research_sources WHERE id=? AND NOT EXISTS(SELECT 1 FROM research_facts WHERE source_id=?)",
    )
      .bind(id, id)
      .run();
    if (!deleted.meta.changes)
      fail(409, "Önce bu kaynağa bağlı bilgileri silin.");
    return c.body(null, 204);
  });
}

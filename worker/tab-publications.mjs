import { z } from "zod";
import { tabPublishing as policy } from "../shared/tab-publishing.mjs";
import { transferMedia } from "./media-transfer.mjs";
import { event } from "./workspace-access.mjs";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status, public: true });
};
const view = (r) => ({ ...r, snapshot: JSON.parse(r.snapshot) });
const body = (c) => c.req.json();
export async function validateSources(c, snapshot, companyId) {
  for (const ref of snapshot.sourceRefs || []) {
    const found = await c.env.DB.prepare(
      "SELECT id FROM research_facts WHERE id=? AND company_id=? AND value=? AND retired_at IS NULL AND valid_until>?",
    )
      .bind(ref.factId, companyId, ref.value, new Date().toISOString())
      .first();
    if (!found)
      fail(
        409,
        "Onaylı şirket kaynağı değişti veya süresi doldu. Taslağı yeniden inceleyin.",
      );
  }
  for (const ref of [
    ...(snapshot.productRefs || []),
    ...(snapshot.productId
      ? [{ id: snapshot.productId, revision: snapshot.productRevision }]
      : []),
  ]) {
    const row = await c.env.DB.prepare(
      "SELECT revision,data FROM editorial_records WHERE id=? AND company_id=? AND kind='product'",
    )
      .bind(ref.id, companyId)
      .first();
    if (
      !row ||
      row.revision !== ref.revision ||
      JSON.parse(row.data).state !== "approved" ||
      Date.parse(JSON.parse(row.data).validUntil) <= Date.now()
    )
      fail(
        409,
        "Ürün kaynağı değişti veya süresi doldu. Yeni yayın önizlemesi hazırlayın.",
      );
  }
}
export function registerTabPublications(app) {
  const admin = (c) => {
    if (c.get("identity")?.role !== "admin")
      fail(403, "Otomatik yayın için yönetici yetkisi gerekli.");
  };
  const load = async (c) => {
    admin(c);
    const id = z.uuid().parse(c.req.param("id"));
    const row = await c.env.DB.prepare(
      "SELECT * FROM publication_jobs WHERE id=? AND json_extract(snapshot,'$.transport')='firefox-tabs'",
    )
      .bind(id)
      .first();
    if (!row || !(await c.get("store").company(row.company_id)))
      fail(404, "Firefox yayın işi bulunamadı.");
    if (row.created_by !== c.get("identity").id)
      fail(403, "Bu yayın onayını oluşturan yönetici oturumunu kullanın.");
    return row;
  };
  app.get("/api/tab-publications", async (c) => {
    admin(c);
    const companyId = z.uuid().parse(c.req.query("companyId"));
    if (!(await c.get("store").company(companyId)))
      fail(404, "Şirket bulunamadı.");
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      "UPDATE publication_jobs SET state='unknown',detail='Eklenti yürütmesi kesildi. Hesabı kontrol edin; otomatik tekrar yapılmaz.',updated_at=? WHERE company_id=? AND json_extract(snapshot,'$.transport')='firefox-tabs' AND state IN ('preparing','sending') AND updated_at<?",
    )
      .bind(now, companyId, new Date(Date.now() - 300000).toISOString())
      .run();
    await c.env.DB.prepare(
      "UPDATE publication_jobs SET state='missed',detail='Onaylı yayın zamanı 15 dakikadan fazla geçti. Otomatik geç paylaşım yapılmadı.',updated_at=? WHERE company_id=? AND json_extract(snapshot,'$.transport')='firefox-tabs' AND state='queued' AND scheduled_at<?",
    )
      .bind(now, companyId, new Date(Date.now() - 900000).toISOString())
      .run();
    return c.json(
      (
        await c.env.DB.prepare(
          "SELECT * FROM publication_jobs WHERE company_id=? AND json_extract(snapshot,'$.transport')='firefox-tabs' ORDER BY created_at DESC LIMIT 100",
        )
          .bind(companyId)
          .all()
      ).results.map(view),
    );
  });
  app.post("/api/tab-publications", async (c) => {
    admin(c);
    const input = z
      .object({
        id: z.uuid(),
        draftId: z.uuid(),
        draftRevision: z.number().int().nonnegative().optional(),
        accountId: z.uuid(),
        scheduledAt: z.iso.datetime().nullable().default(null),
        targetLabel: z.string().trim().min(1).max(100),
      })
      .parse(await body(c));
    const draft = await c.get("store").draft(input.draftId);
    if (!draft) fail(404, "Kaydedilmiş taslak bulunamadı.");
    if (input.draftRevision !== undefined && draft.revision !== input.draftRevision)
      fail(409, "Hazırlanmış taslak değişti. Son içeriği yeniden inceleyin.");
    const account = await c.env.DB.prepare(
      "SELECT * FROM social_accounts WHERE id=? AND company_id=?",
    )
      .bind(input.accountId, draft.companyId)
      .first();
    const p = account && policy.platforms[account.platform];
    if (!p || !policy.profile(account.profile_url, account.platform))
      fail(400, "Hesaba gerçek hedef profil/sayfa adresini kaydedin.");
    const post = draft.posts.find((p) => p.platform === account.platform);
    if (!post) fail(400, "Bu platform için hazırlanmış metin taslakta yok.");
    const text = [
      post.caption,
      ...(post.hashtags.length ? [post.hashtags.join(" ")] : []),
    ]
      .filter(Boolean)
      .join("\n\n");
    if (!text.trim() || text.length > p.limit)
      fail(
        400,
        `${p.name} metni boş veya ${p.limit} karakter sınırını aşıyor.`,
      );
    if (
      ["pinterest", "tumblr"].includes(account.platform) &&
      (post.title || "").length > 100
    )
      fail(400, "Gönderi başlığını 100 karakterle sınırlayın.");
    const media =
      draft.gallery?.length > 1
        ? draft.gallery.map((g) => ({
            mediaId: g.mediaId,
            fit: draft.mediaFit,
            alt: g.alt || post.alt,
          }))
        : draft.platformMedia?.[account.platform] ||
            draft.gallery?.[0]?.mediaId ||
            draft.mediaId
          ? [
              {
                mediaId:
                  draft.platformMedia?.[account.platform] ||
                  draft.gallery?.[0]?.mediaId ||
                  draft.mediaId,
                fit: draft.platformFits?.[account.platform] || draft.mediaFit,
                alt: post.alt,
              },
            ]
          : [];
    if (media.length > p.images)
      fail(400, `${p.name} akışı en fazla ${p.images} fotoğraf kabul eder.`);
    if (
      ["instagram", "pinterest", "tiktok"].includes(account.platform) &&
      !media.length
    )
      fail(400, "Bu platform için fotoğraf gerekli.");
    for (const m of media) {
      const found = await c.get("store").media(m.mediaId);
      if (!found || found.companyId !== draft.companyId || found.deleting)
        fail(400, "Görsel seçili şirkete ait değil veya siliniyor.");
    }
    const product = draft.productId
      ? await c.env.DB.prepare(
          "SELECT revision FROM editorial_records WHERE id=? AND company_id=? AND kind='product'",
        )
          .bind(draft.productId, draft.companyId)
          .first()
      : null;
    const snapshot = {
      transport: "firefox-tabs",
      immediate: !input.scheduledAt,
      platform: account.platform,
      draftId: draft.id,
      draftRevision: draft.revision,
      post,
      text,
      media,
      mediaId: media[0]?.mediaId || null,
      profileUrl: account.profile_url,
      accountLabel: account.label,
      identityLabel: input.targetLabel,
      sourceRefs: draft.sourceRefs || [],
      productRefs: draft.productRefs || [],
      productId: draft.productId || null,
      productRevision: product?.revision || null,
      format:
        account.platform === "youtube"
          ? "community"
          : account.platform === "tiktok"
            ? "photo"
            : "post",
    };
    await validateSources(c, snapshot, draft.companyId);
    const fingerprint = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(JSON.stringify(snapshot)),
        ),
      ),
    )
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const now = new Date().toISOString(),
      scheduledAt = input.scheduledAt || now;
    if (
      Date.parse(scheduledAt) < Date.now() - 60000 ||
      Date.parse(scheduledAt) > Date.now() + 30 * 86400000
    )
      fail(400, "Zamanlama bugün ile 30 gün sonrası arasında olmalı.");
    const old = await c.env.DB.prepare(
      "SELECT * FROM publication_jobs WHERE id=?",
    )
      .bind(input.id)
      .first();
    if (old) {
      if (
        old.company_id !== draft.companyId ||
        old.created_by !== c.get("identity").id ||
        old.fingerprint !== fingerprint
      )
        fail(409, "İstek kimliği başka içeriğe ait.");
      return c.json(view(old));
    }
    const r = await c.env.DB.prepare(
      "INSERT INTO publication_jobs(id,company_id,account_id,created_by,snapshot,fingerprint,scheduled_at,timezone,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM publication_jobs WHERE company_id=?)<100 AND NOT EXISTS(SELECT 1 FROM publication_jobs WHERE account_id=? AND fingerprint=? AND state NOT IN ('cancelled','failed','missed')) ON CONFLICT DO NOTHING",
    )
      .bind(
        input.id,
        draft.companyId,
        account.id,
        c.get("identity").id,
        JSON.stringify(snapshot),
        fingerprint,
        scheduledAt,
        "Asia/Famagusta",
        now,
        now,
        draft.companyId,
        account.id,
        fingerprint,
      )
      .run();
    if (!r.meta.changes)
      fail(
        409,
        "Bu içerik aynı hedef için zaten kayıtlı, gönderilmiş veya sonucu belirsiz; ya da 100 iş sınırı dolu.",
      );
    return c.json(
      view(
        await c.env.DB.prepare("SELECT * FROM publication_jobs WHERE id=?")
          .bind(input.id)
          .first(),
      ),
      201,
    );
  });
  app.get("/api/tab-publications/:id", async (c) =>
    c.json(view(await load(c))),
  );
  app.get("/api/tab-publications/:id/media/:index", async (c) => {
    const row = await load(c),
      snapshot = JSON.parse(row.snapshot),
      index = z.coerce.number().int().min(0).max(9).parse(c.req.param("index"));
    if (
      !["draft", "queued", "preparing"].includes(row.state) ||
      !snapshot.media[index]
    )
      fail(409, "Bu iş için görsel aktarımı açık değil.");
    const m = snapshot.media[index];
    return c.json({
      data: await transferMedia(
        c,
        { companyId: row.company_id, platform: snapshot.platform },
        m.mediaId,
        m.fit,
      ),
      name: `studio-${index + 1}.jpg`,
      type: "image/jpeg",
    });
  });
  app.post("/api/tab-publications/:id/:action", async (c) => {
    const row = await load(c),
      snapshot = JSON.parse(row.snapshot),
      action = c.req.param("action"),
      input = await body(c),
      now = new Date().toISOString();
    let sql, bind;
    if (action === "authorize") {
      z.object({ confirmed: z.literal(true), executor: z.uuid() }).parse(input);
      await validateSources(c, snapshot, row.company_id);
      const account = await c.env.DB.prepare(
        "SELECT profile_url FROM social_accounts WHERE id=? AND company_id=?",
      )
        .bind(row.account_id, row.company_id)
        .first();
      if (account?.profile_url !== snapshot.profileUrl)
        fail(409, "Hedef profil adresi değişti. Yeni önizleme hazırlayın.");
      snapshot.executor = input.executor;
      sql =
        "UPDATE publication_jobs SET snapshot=?,state='queued',scheduled_at=?,approved_at=?,updated_at=? WHERE id=? AND state IN ('draft','queued')";
      bind = [
        JSON.stringify(snapshot),
        snapshot.immediate ? now : row.scheduled_at,
        now,
        now,
        row.id,
      ];
    } else if (action === "claim") {
      z.object({ executor: z.uuid() }).parse(input);
      if (snapshot.executor !== input.executor)
        fail(409, "Eklenti onayı değişti.");
      if (Date.parse(row.scheduled_at) > Date.now())
        fail(409, "Yayın zamanı henüz gelmedi.");
      if (Date.parse(row.scheduled_at) < Date.now() - 900000)
        fail(409, "Yayın zamanı 15 dakikadan fazla geçti.");
      await validateSources(c, snapshot, row.company_id);
      const a = await c.env.DB.prepare(
        "SELECT profile_url FROM social_accounts WHERE id=? AND company_id=?",
      )
        .bind(row.account_id, row.company_id)
        .first();
      if (a?.profile_url !== snapshot.profileUrl)
        fail(409, "Hedef profil adresi değişti.");
      sql =
        "UPDATE publication_jobs SET state='preparing',updated_at=? WHERE id=? AND state='queued' AND json_extract(snapshot,'$.executor')=? AND NOT EXISTS(SELECT 1 FROM publication_jobs WHERE state IN ('preparing','sending') AND json_extract(snapshot,'$.transport')='firefox-tabs')";
      bind = [now, row.id, input.executor];
    } else if (action === "sending") {
      z.object({ executor: z.uuid() }).parse(input);
      await validateSources(c, snapshot, row.company_id);
      const a = await c.env.DB.prepare(
        "SELECT profile_url FROM social_accounts WHERE id=? AND company_id=?",
      )
        .bind(row.account_id, row.company_id)
        .first();
      if (a?.profile_url !== snapshot.profileUrl)
        fail(409, "Hedef profil adresi değişti.");
      sql =
        "UPDATE publication_jobs SET state='sending',updated_at=? WHERE id=? AND state='preparing' AND json_extract(snapshot,'$.executor')=?";
      bind = [now, row.id, input.executor];
    } else if (action === "result") {
      const r = z
        .object({
          executor: z.uuid(),
          state: z.enum(["verified", "unknown", "failed"]),
          url: z.string().max(2048).optional(),
          detail: z.string().max(300).optional(),
        })
        .parse(input);
      const url =
        r.state === "verified"
          ? policy.postURL(r.url, snapshot.platform)
          : null;
      if (
        r.state === "verified" &&
        (!url || !policy.ownedURL(url, snapshot.profileUrl, snapshot.platform))
      )
        fail(400, "Gönderi bağlantısı hedef platform/hesap ile eşleşmiyor.");
      sql =
        "UPDATE publication_jobs SET state=?,result_url=?,detail=?,updated_at=? WHERE id=? AND json_extract(snapshot,'$.executor')=? AND state=?";
      bind = [
        r.state,
        url,
        r.state === "verified"
          ? "Yeni gönderi bağlantısı ve sayfadaki yazar eklenti tarafından doğrulandı."
          : r.state === "unknown"
            ? "Gönderimin sonucu belirsiz. Hesabı kontrol edin; otomatik tekrar yapılmaz."
            : "Gönderim başlatılmadı. " +
              (r.detail || "Firefox hesabını ve formunu kontrol edin."),
        now,
        row.id,
        r.executor,
        r.state === "failed" ? "preparing" : "sending",
      ];
    } else if (action === "cancel") {
      sql =
        "UPDATE publication_jobs SET state='cancelled',updated_at=? WHERE id=? AND state IN ('draft','queued','preparing')";
      bind = [now, row.id];
    } else fail(400, "Geçersiz yayın adımı.");
    const result = await c.env.DB.prepare(sql)
      .bind(...bind)
      .run();
    if (!result.meta.changes)
      fail(
        409,
        "Yayın adımı değişti veya başka yürütücü tarafından alındı; tekrar gönderilmedi.",
      );
    await event(
      c.env.DB,
      c.get("identity"),
      "firefox-publication-" + action,
      row.company_id,
      row.id,
    );
    return c.json(
      view(
        await c.env.DB.prepare("SELECT * FROM publication_jobs WHERE id=?")
          .bind(row.id)
          .first(),
      ),
    );
  });
}

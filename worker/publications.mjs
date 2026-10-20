import { z } from "zod";
import { computerBroker, computerAccount } from "./company-computer.mjs";
import { transferMedia } from "./media-transfer.mjs";
import { publicationURL, publicationBelongsTo } from "../shared/scheduling.mjs";
import { createCloudStore } from "./store.mjs";
import { event } from "./workspace-access.mjs";
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status, public: true });
};
const hash = async (text) =>
  [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
const view = (r) => ({ ...r, snapshot: JSON.parse(r.snapshot) });
export async function executePublication(c, id) {
  const broker = c.broker || ((payload) => computerBroker(c.env, payload));
  const row = await c.env.DB.prepare(
    "SELECT * FROM publication_jobs WHERE id=?",
  )
    .bind(id)
    .first();
  if (!row || !(await c.get("store").company(row.company_id)))
    fail(404, "Yayın işi bulunamadı.");
  const now = Date.now();
  const owner = await c.env.DB.prepare(
    "SELECT id FROM users WHERE id=? AND role='admin' AND enabled=1",
  )
    .bind(row.created_by)
    .first();
  if (!owner) {
    await c.env.DB.prepare(
      "UPDATE publication_jobs SET state='cancelled',detail='Onaylayan yönetici artık etkin değil.',updated_at=? WHERE id=? AND state='queued'",
    )
      .bind(new Date().toISOString(), id)
      .run();
    return;
  }
  if (Date.parse(row.scheduled_at) > now)
    fail(409, "Planlanan zaman henüz gelmedi.");
  if (now - Date.parse(row.scheduled_at) > 120000) {
    await c.env.DB.prepare(
      "UPDATE publication_jobs SET state='missed',detail='Planlanan zaman geçti; otomatik geç paylaşım yapılmadı.',updated_at=? WHERE id=? AND state='queued'",
    )
      .bind(new Date().toISOString(), id)
      .run();
    return;
  }
  const device = await c.env.DB.prepare(
    "SELECT d.id FROM company_computers d JOIN users u ON u.id=d.created_by WHERE d.revoked_at IS NULL AND u.enabled=1 AND u.role='admin' LIMIT 1",
  ).first();
  if (!device) return;
  const status = await (
    await broker({
      action: "status",
      userId: c.get("identity").id,
    })
  ).json();
  if (status.onlineDeviceId !== device.id || status.active) return;
  const account = await c.env.DB.prepare(
    "SELECT id,company_id,platform,label,profile_url FROM social_accounts WHERE id=? AND company_id=?",
  )
    .bind(row.account_id, row.company_id)
    .first();
  if (!account) fail(404, "Hedef hesap bulunamadı.");
  const claimed = await c.env.DB.prepare(
    "UPDATE publication_jobs SET state='preparing',updated_at=? WHERE id=? AND state='queued' RETURNING id",
  )
    .bind(new Date().toISOString(), id)
    .first();
  if (!claimed) return;
  const snapshot = JSON.parse(row.snapshot);
  let viewId,
    sending = false;
  const target = await computerAccount(c.env.DB, account);
  const command = async (value) => {
    const response = await broker({
      action: "command",
      jobId: id,
      jobExclusive: value.action === "open",
      deviceId: device.id,
      userId: c.get("identity").id,
      viewId,
      account: target,
      command: { ...value, noFrame: true },
    });
    const result = await response.json();
    if (!response.ok)
      fail(response.status, result.error || "Bilgisayar işlemi tamamlanamadı.");
    viewId = result.viewId;
    return result;
  };
  try {
    if (account.profile_url !== snapshot.profileUrl)
      fail(
        409,
        "Hedef profil adresi onaydan sonra değişti; iş yeniden oluşturulmalı.",
      );
    for (const ref of snapshot.sourceRefs || []) {
      const fact = await c.env.DB.prepare(
        "SELECT id FROM research_facts WHERE id=? AND company_id=? AND value=? AND retired_at IS NULL AND valid_until>?",
      )
        .bind(ref.factId, row.company_id, ref.value, new Date().toISOString())
        .first();
      if (!fact)
        fail(409, "Kaynak bilgisi eski veya değişmiş; yayın durduruldu.");
    }
    await command({ action: "open" });
    await command({ action: "profile" });
    const media = snapshot.mediaId
      ? await transferMedia(c, target, snapshot.mediaId, snapshot.mediaFit)
      : undefined;
    const proof = {
      jobId: id,
      fingerprint: row.fingerprint,
      identityLabel: snapshot.identityLabel,
    };
    const prepared = await command({
      action: "prepare",
      ...proof,
      text: snapshot.text,
      media,
    });
    if (
      prepared.publication?.state !== "ready" ||
      prepared.publication.jobId !== id
    )
      fail(502, "Yayın önizlemesi doğrulanamadı.");
    const send = await c.env.DB.prepare(
      "UPDATE publication_jobs SET state='sending',updated_at=? WHERE id=? AND state='preparing' RETURNING id",
    )
      .bind(new Date().toISOString(), id)
      .first();
    if (!send) return;
    sending = true;
    const result = await command({ action: "publish", ...proof });
    const url = publicationURL(result.publication?.url, account.platform);
    if (
      result.publication?.state !== "verified" ||
      result.publication.jobId !== id ||
      !url ||
      !publicationBelongsTo(url, snapshot.profileUrl)
    )
      fail(502, "Gönderinin sonucu belirsiz; yeniden paylaşılmadı.");
    await c.env.DB.prepare(
      "UPDATE publication_jobs SET state='verified',result_url=?,detail='Gerçek gönderi bağlantısı doğrulandı.',updated_at=? WHERE id=? AND state='sending'",
    )
      .bind(url, new Date().toISOString(), id)
      .run();
    await event(
      c.env.DB,
      c.get("identity"),
      "publication-verified",
      row.company_id,
      id,
    );
  } catch (e) {
    await c.env.DB.prepare(
      "UPDATE publication_jobs SET state=?,detail=?,updated_at=? WHERE id=? AND state IN ('preparing','sending')",
    )
      .bind(
        sending ? "unknown" : "failed",
        sending
          ? "Sonuç belirsiz. Hesaptaki gönderileri kontrol edin; otomatik tekrar yapılmaz."
          : e.public
            ? e.message
            : "Hazırlık tamamlanamadı; gerçek paylaşım doğrulanmadı.",
        new Date().toISOString(),
        id,
      )
      .run();
  } finally {
    if (viewId) await command({ action: "close" }).catch(() => {});
  }
}
export async function scheduledPublications(env, broker) {
  const now = new Date().toISOString();
  await env.DB.prepare(
    "UPDATE publication_jobs SET state='missed',detail='Planlanan zaman geçti; otomatik geç paylaşım yapılmadı.',updated_at=? WHERE state='queued' AND scheduled_at<?",
  )
    .bind(now, new Date(Date.now() - 120000).toISOString())
    .run();
  await env.DB.prepare(
    "UPDATE publication_jobs SET state='cancelled',detail='Onaylayan yönetici artık etkin değil.',updated_at=? WHERE state='queued' AND scheduled_at<=? AND NOT EXISTS(SELECT 1 FROM users WHERE id=publication_jobs.created_by AND role='admin' AND enabled=1)",
  )
    .bind(now, now)
    .run();
  await env.DB.prepare(
    "UPDATE publication_jobs SET state='unknown',detail='Yürütme kesildi; hesap kontrol edilmeden tekrar gönderilmez.',updated_at=? WHERE state IN ('preparing','sending') AND updated_at<?",
  )
    .bind(now, new Date(Date.now() - 300000).toISOString())
    .run();
  const { results } = await env.DB.prepare(
    "SELECT j.id,j.created_by FROM publication_jobs j JOIN users u ON u.id=j.created_by WHERE j.state='queued' AND j.scheduled_at<=? AND u.enabled=1 AND u.role='admin' ORDER BY j.scheduled_at LIMIT 3",
  )
    .bind(now)
    .all();
  for (const row of results) {
    const c = {
      env,
      broker,
      get: (key) =>
        key === "store"
          ? createCloudStore(env.DB)
          : { id: row.created_by, role: "admin" },
    };
    await executePublication(c, row.id).catch(() => {});
  }
}
export function registerPublications(app) {
  const admin = (c) => {
    if (c.get("identity")?.role !== "admin")
      fail(403, "Yayın işlemi için yönetici yetkisi gerekli.");
  };
  app.post("/api/publications/wake", async (c) => {
    admin(c);
    if (!c.env.COMPANY_COMPUTER)
      fail(503, "Şirket bilgisayarı bağlantısı gerekli.");
    return computerBroker(c.env, { action: "wake-publications" });
  });
  app.get("/api/publications", async (c) => {
    const id = z.uuid().parse(c.req.query("companyId"));
    if (!(await c.get("store").company(id))) fail(404, "Şirket bulunamadı.");
    return c.json(
      (
        await c.env.DB.prepare(
          "SELECT * FROM publication_jobs WHERE company_id=? ORDER BY scheduled_at DESC LIMIT 100",
        )
          .bind(id)
          .all()
      ).results.map(view),
    );
  });
  app.post("/api/publications", async (c) => {
    admin(c);
    const input = z
      .object({
        id: z.uuid(),
        draftId: z.uuid(),
        accountId: z.uuid(),
        scheduledAt: z.iso.datetime(),
        timezone: z.enum(["Asia/Famagusta", "Europe/Istanbul"]),
        immediate: z.boolean().default(false),
      })
      .parse(await c.req.json());
    const draft = await c.get("store").draft(input.draftId);
    if (!draft) fail(404, "Taslak bulunamadı.");
    const account = await c.env.DB.prepare(
      "SELECT * FROM social_accounts WHERE id=? AND company_id=?",
    )
      .bind(input.accountId, draft.companyId)
      .first();
    if (!account) fail(400, "Hesap seçili şirkete ait değil.");
    if (account.platform !== "facebook" || !account.profile_url)
      fail(
        400,
        "İlk otomatik yayın pilotu, profil adresi kayıtlı Facebook hesabıdır. Diğer platformlarda Firefox üzerinden hazırlama kullanılabilir.",
      );
    const post = draft.posts.find((p) => p.platform === account.platform);
    if (!post) fail(400, "Taslakta bu platformun metni yok.");
    const text = [post.caption, post.hashtags.join(" ")]
      .filter(Boolean)
      .join("\n\n");
    if (!text.trim() || text.length > 10000)
      fail(400, "Yayın metni boş veya çok uzun.");
    const scheduled = Date.parse(input.scheduledAt);
    if (
      scheduled < Date.now() - 60000 ||
      scheduled > Date.now() + 30 * 86400000
    )
      fail(400, "Zamanlama en fazla 30 gün ileri olabilir.");
    const snapshot = {
      draftId: draft.id,
      post,
      text,
      mediaId: draft.mediaId,
      mediaFit: draft.mediaFit,
      sourceRefs: draft.sourceRefs || [],
      profileUrl: account.profile_url,
      immediate: input.immediate,
    };
    const fingerprint = await hash(JSON.stringify(snapshot));
    const now = new Date().toISOString();
    const existing = await c.env.DB.prepare(
      "SELECT * FROM publication_jobs WHERE id=?",
    )
      .bind(input.id)
      .first();
    if (existing) {
      if (
        existing.company_id !== draft.companyId ||
        existing.fingerprint !== fingerprint
      )
        fail(409, "İstek kimliği başka içeriğe ait.");
      return c.json(view(existing));
    }
    const result = await c.env.DB.prepare(
      "INSERT INTO publication_jobs(id,company_id,account_id,created_by,snapshot,fingerprint,scheduled_at,timezone,created_at,updated_at) SELECT ?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM publication_jobs WHERE company_id=?)<100 ON CONFLICT DO NOTHING",
    )
      .bind(
        input.id,
        draft.companyId,
        account.id,
        c.get("identity").id,
        JSON.stringify(snapshot),
        fingerprint,
        input.scheduledAt,
        input.timezone,
        now,
        now,
        draft.companyId,
      )
      .run();
    if (!result.meta.changes)
      fail(
        409,
        "Aynı hesap/içerik/zaman için iş zaten var veya 100 iş sınırı doldu.",
      );
    return c.json({ id: input.id, state: "draft" }, 201);
  });
  app.post("/api/publications/:id/:action", async (c) => {
    admin(c);
    const id = z.uuid().parse(c.req.param("id")),
      action = c.req.param("action");
    const job = await c.env.DB.prepare(
      "SELECT * FROM publication_jobs WHERE id=?",
    )
      .bind(id)
      .first();
    if (!job || !(await c.get("store").company(job.company_id)))
      fail(404, "Yayın işi bulunamadı.");
    if (action === "approve") {
      const input = z
        .object({
          identityLabel: z.string().trim().min(1).max(100),
          confirmed: z.literal(true),
        })
        .parse(await c.req.json());
      const snapshot = JSON.parse(job.snapshot);
      snapshot.identityLabel = input.identityLabel;
      const approvedAt = new Date().toISOString();
      const scheduledAt = snapshot.immediate ? approvedAt : job.scheduled_at,
        minuteStart = scheduledAt.slice(0, 16) + ":00.000Z",
        minuteEnd = new Date(Date.parse(minuteStart) + 60000).toISOString();
      const result = await c.env.DB.prepare(
        "UPDATE publication_jobs SET snapshot=?,state='queued',scheduled_at=?,approved_at=?,updated_at=? WHERE id=? AND state='draft' AND (SELECT COUNT(*) FROM publication_jobs WHERE state='queued' AND scheduled_at>=? AND scheduled_at<?)<3",
      )
        .bind(
          JSON.stringify(snapshot),
          scheduledAt,
          approvedAt,
          approvedAt,
          id,
          minuteStart,
          minuteEnd,
        )
        .run();
      if (!result.meta.changes)
        fail(
          409,
          "İş artık taslak değil veya bu dakikada üç onaylı iş var. Başka bir dakika seçin.",
        );
      await event(
        c.env.DB,
        c.get("identity"),
        "publication-approved",
        job.company_id,
        id,
      );
    } else if (action === "cancel") {
      const result = await c.env.DB.prepare(
        "UPDATE publication_jobs SET state='cancelled',updated_at=? WHERE id=? AND state IN ('draft','queued','preparing')",
      )
        .bind(new Date().toISOString(), id)
        .run();
      if (!result.meta.changes)
        fail(409, "Gönderimi başlayan veya sonuçlanan iş iptal edilemez.");
    } else if (action === "execute") await executePublication(c, id);
    else fail(400, "Geçersiz yayın işlemi.");
    return c.json(
      view(
        await c.env.DB.prepare("SELECT * FROM publication_jobs WHERE id=?")
          .bind(id)
          .first(),
      ),
    );
  });
  app.delete("/api/publications/:id", async (c) => {
    admin(c);
    const id = z.uuid().parse(c.req.param("id"));
    await c.env.DB.prepare(
      "DELETE FROM publication_jobs WHERE id=? AND state IN ('draft','cancelled','failed','missed','verified')",
    )
      .bind(id)
      .run();
    return c.body(null, 204);
  });
}

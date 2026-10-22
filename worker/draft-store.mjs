import { draftAssetIds, conflict } from "../shared/editorial.mjs";

export async function persistDraft(db, data, id) {
  const existing = id
    ? await db.prepare("SELECT data FROM drafts WHERE id=?").bind(id).first()
    : null;
  const previous = existing ? JSON.parse(existing.data) : null;
  if (id && (!previous || previous.deletedAt))
    throw Object.assign(new Error("Taslak bulunamadı."), { status: 404 });
  if (
    previous &&
    (data.revision === undefined || data.revision !== (previous.revision ?? 0))
  )
    throw conflict();
  const now = new Date().toISOString();
  const draft = {
    ...data,
    id: id || crypto.randomUUID(),
    revision: (previous?.revision ?? 0) + 1,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
  delete draft.deletedAt;
  const assets = JSON.stringify(draftAssetIds(draft));
  const assetGuard =
    " NOT EXISTS(SELECT 1 FROM json_each(?) a LEFT JOIN media m ON m.id=a.value AND m.company_id=? WHERE m.id IS NULL OR json_extract(m.data,'$.deleting') IS NOT NULL)";
  if (previous) {
    const results = await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO draft_versions(draft_id,revision,company_id,data,created_at) SELECT id,COALESCE(json_extract(data,'$.revision'),0),company_id,data,? FROM drafts WHERE id=? AND COALESCE(json_extract(data,'$.revision'),0)=?",
        )
        .bind(now, id, data.revision),
      db
        .prepare(
          "UPDATE drafts SET data=?,updated_at=? WHERE id=? AND company_id=? AND COALESCE(json_extract(data,'$.revision'),0)=? AND " +
            assetGuard,
        )
        .bind(
          JSON.stringify(draft),
          now,
          id,
          data.companyId,
          data.revision,
          assets,
          data.companyId,
        ),
      db
        .prepare(
          "DELETE FROM draft_versions WHERE draft_id=? AND revision NOT IN (SELECT revision FROM draft_versions WHERE draft_id=? ORDER BY revision DESC LIMIT 5)",
        )
        .bind(id, id),
      db
        .prepare(
          "DELETE FROM draft_versions WHERE company_id=? AND rowid NOT IN (SELECT rowid FROM draft_versions WHERE company_id=? ORDER BY created_at DESC,rowid DESC LIMIT 100)",
        )
        .bind(data.companyId, data.companyId),
    ]);
    if (!results[1].meta.changes) throw conflict();
  } else {
    const created = await db
      .prepare(
        "INSERT INTO drafts(id,company_id,data,created_at,updated_at) SELECT ?,?,?,?,? WHERE " +
          assetGuard,
      )
      .bind(
        draft.id,
        data.companyId,
        JSON.stringify(draft),
        now,
        now,
        assets,
        data.companyId,
      )
      .run();
    if (!created.meta.changes)
      throw Object.assign(
        new Error("Taslak görsellerinden biri kaldırılıyor. Yeniden seçin."),
        { status: 409 },
      );
  }
  return draft;
}

export async function validateDraftRelations(store, db, input, identity) {
  const assets = [
    input.mediaId,
    ...(input.gallery || []).map((a) => a.mediaId),
    ...Object.values(input.platformMedia || {}),
  ].filter(Boolean);
  for (const id of new Set(assets)) {
    const m = await store.media(id);
    if (!m || m.companyId !== input.companyId || m.deleting)
      throw Object.assign(
        new Error("Görsel bu şirkete ait değil veya kaldırılıyor."),
        { status: 400 },
      );
  }
  for (const [kind, id] of [
    ["campaign", input.campaignId],
    ["product", input.productId],
  ])
    if (id) {
      if (
        !(await db
          .prepare(
            "SELECT id FROM editorial_records WHERE id=? AND company_id=? AND kind=?",
          )
          .bind(id, input.companyId, kind)
          .first())
      )
        throw Object.assign(
          new Error("Kampanya veya ürün bu şirkete ait değil."),
          { status: 400 },
        );
    }
  if (input.review?.state === "approved" || input.review?.state === "planned") {
    if (identity?.role !== "admin")
      throw Object.assign(new Error("İçerik onayı için yönetici gerekli."), {
        status: 403,
      });
    input.review.reviewedBy = identity.id;
    input.review.reviewedAt = new Date().toISOString();
  } else if (input.review) {
    delete input.review.reviewedBy;
    delete input.review.reviewedAt;
  }
}

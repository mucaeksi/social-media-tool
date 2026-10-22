export async function generationTrace(
  db,
  {
    id,
    companyId,
    model,
    expertVersion,
    sourceRefs,
    products = [],
    context = null,
    mediaId,
    started,
  },
) {
  const sourceVersion = [
    ...new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(
          JSON.stringify({ sourceRefs, products, context, mediaId }),
        ),
      ),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const trace = {
    model,
    expertVersion,
    sourceVersion,
    mediaId,
    modelDigest: null,
    products: products.map((p) => ({
      id: p.id,
      revision: p.revision,
      sourceUrl: p.sourceUrl,
      validUntil: p.validUntil,
    })),
    durationMs: Math.max(0, Date.now() - started),
    timing: "Sunucudaki toplam istek süresi; yalnız GPU süresi değildir.",
  };
  await db
    .prepare("INSERT INTO ai_generation_trace VALUES(?,?,?)")
    .bind(id, companyId, JSON.stringify(trace))
    .run();
  await db
    .prepare(
      "DELETE FROM ai_generation_trace WHERE company_id=? AND turn_id NOT IN(SELECT id FROM ai_turns WHERE company_id=?)",
    )
    .bind(companyId, companyId)
    .run();
  return trace;
}

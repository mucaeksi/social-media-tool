// Application limits for Standard R2. Storage stays below this instantaneous
// ceiling, which also bounds its monthly daily-peak average. GB is decimal.
export const R2_LIMITS = Object.freeze({
  storageBytes: 10_000_000_000,
  classAPerMonth: 1_000_000,
  classBPerMonth: 10_000_000,
});

const periodAt = (date) => date.toISOString().slice(0, 7);
function quotaError(message) {
  return Object.assign(new Error(message), { status: 429 });
}

export async function r2Usage(db, now = new Date()) {
  const row = await db
    .prepare("SELECT * FROM r2_budget WHERE singleton=1")
    .first();
  if (!row) throw new Error("R2 kullanım kaydı bulunamadı.");
  const period = periodAt(now);
  return {
    period,
    storageBytes: row.stored_bytes,
    classA: row.period === period ? row.class_a : 0,
    classB: row.period === period ? row.class_b : 0,
  };
}

export function createR2Media(db, bucket, now = () => new Date()) {
  const reserved = new Map();
  async function reserve({ bytes = 0, classA = 0, classB = 0, objects = [] }) {
    const period = periodAt(now()),
      token = crypto.randomUUID();
    const update = db
      .prepare(
        `
      UPDATE r2_budget SET
        period=?,
        class_a=(CASE WHEN period=? THEN class_a ELSE 0 END)+?,
        class_b=(CASE WHEN period=? THEN class_b ELSE 0 END)+?,
        stored_bytes=stored_bytes+?, reservation=?
      WHERE singleton=1 AND (?=0 OR stored_bytes+?<=?)
        AND (CASE WHEN period=? THEN class_a ELSE 0 END)+?<=?
        AND (CASE WHEN period=? THEN class_b ELSE 0 END)+?<=?
      RETURNING singleton
    `,
      )
      .bind(
        period,
        period,
        classA,
        period,
        classB,
        bytes,
        token,
        bytes,
        bytes,
        R2_LIMITS.storageBytes,
        period,
        classA,
        R2_LIMITS.classAPerMonth,
        period,
        classB,
        R2_LIMITS.classBPerMonth,
      );
    // D1 batches are transactions: the ledger is inserted only when the same
    // transaction obtained the reservation. Concurrent requests cannot overspend.
    const statements = [update];
    if (objects.length)
      statements.push(
        db
          .prepare(
            `
      INSERT INTO r2_objects(object_key,size,pending)
      SELECT json_extract(value,'$.key'),json_extract(value,'$.size'),1
      FROM json_each(?)
      WHERE (SELECT reservation FROM r2_budget WHERE singleton=1)=?
    `,
          )
          .bind(JSON.stringify(objects), token),
      );
    const result = await db.batch(statements);
    if (!result[0].results.length) {
      const usage = await r2Usage(db, now());
      if (usage.storageBytes + bytes > R2_LIMITS.storageBytes)
        throw quotaError(
          "R2 için 10 GB depolama sınırına ulaşıldı. Yeni görsel yüklemek için kullanılmayan şirket görsellerini silin.",
        );
      if (usage.classA + classA > R2_LIMITS.classAPerMonth)
        throw quotaError(
          "R2 aylık 1 milyon Class A işlem sınırına ulaşıldı. Görsel yükleme yeni UTC ayında açılacak.",
        );
      throw quotaError(
        "R2 aylık 10 milyon Class B işlem sınırına ulaşıldı. Görsel okuma yeni UTC ayında açılacak.",
      );
    }
  }
  return {
    async reserveUpload(images) {
      const objects = images.map(({ key, bytes }) => ({
        key,
        size: bytes.byteLength,
      }));
      if (
        !objects.length ||
        new Set(objects.map((x) => x.key)).size !== objects.length
      )
        throw new Error("Görsel rezervasyonu geçersiz.");
      await reserve({
        bytes: objects.reduce((sum, x) => sum + x.size, 0),
        classA: objects.length,
        objects,
      });
      for (const object of objects) reserved.set(object.key, object.size);
    },
    async put(key, bytes, options) {
      if (reserved.get(key) !== bytes.byteLength)
        throw new Error("R2 yazımı için kullanım rezervasyonu gerekli.");
      reserved.delete(key);
      // Failed attempts remain counted; refunds could undercount provider usage.
      return bucket.put(key, bytes, { ...options, storageClass: "Standard" });
    },
    async get(key) {
      await reserve({ classB: 1 });
      return bucket.get(key);
    },
    async completeUpload(keys) {
      // Only completed writes can be selected by company deletion. Otherwise a
      // concurrent delete could release capacity before an in-flight put ends.
      await db
        .prepare(
          "UPDATE r2_objects SET pending=0 WHERE object_key IN (SELECT value FROM json_each(?))",
        )
        .bind(JSON.stringify(keys))
        .run();
    },
    async list({ prefix = "", cursor = "" } = {}) {
      // Use the D1 object ledger, avoiding billable R2 ListObjects calls. This also
      // permits deletion when the monthly Class A budget has been exhausted.
      const rows = (
        await db
          .prepare(
            "SELECT object_key AS key FROM r2_objects WHERE pending=0 AND object_key LIKE ? AND object_key>? ORDER BY object_key LIMIT 1000",
          )
          .bind(`${prefix}%`, cursor)
          .all()
      ).results;
      return {
        objects: rows,
        truncated: rows.length === 1000,
        cursor: rows.length === 1000 ? rows.at(-1).key : undefined,
      };
    },
    async delete(keys) {
      const values = Array.isArray(keys) ? keys : [keys];
      if (!values.length) return;
      for (let start = 0; start < values.length; start += 1000) {
        const chunk = values.slice(start, start + 1000);
        // DeleteObject is free. Release capacity only after R2 confirms deletion.
        await bucket.delete(chunk);
        const encoded = JSON.stringify(chunk);
        await db.batch([
          db
            .prepare(
              "UPDATE r2_budget SET stored_bytes=MAX(0,stored_bytes-COALESCE((SELECT SUM(size) FROM r2_objects WHERE object_key IN (SELECT value FROM json_each(?))),0)) WHERE singleton=1",
            )
            .bind(encoded),
          db
            .prepare(
              "DELETE FROM r2_objects WHERE object_key IN (SELECT value FROM json_each(?))",
            )
            .bind(encoded),
        ]);
      }
    },
  };
}

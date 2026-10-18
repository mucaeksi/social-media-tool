const CHUNK_SIZE = 1024 * 1024;

// An object-store interface backed by bounded D1 BLOB chunks. No file exceeds
// D1's per-value limit, and reads stream one chunk at a time.
export function createD1Media(db) {
  return {
    async put(key, input, options = {}) {
      const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
      const companyId = key.split("/")[1];
      const chunks = Math.ceil(bytes.length / CHUNK_SIZE);
      const statements = [
        db
          .prepare(
            "INSERT INTO media_objects(object_key,company_id,content_type,size,chunk_count,first_bytes) VALUES(?,?,?,?,?,?)",
          )
          .bind(
            key,
            companyId,
            options.httpMetadata?.contentType ?? "image/jpeg",
            bytes.length,
            chunks,
            bytes.slice(0, CHUNK_SIZE).buffer,
          ),
      ];
      for (let index = 1; index < chunks; index++) {
        const chunk = bytes.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE);
        statements.push(
          db
            .prepare(
              "INSERT INTO media_chunks(object_key,chunk_index,bytes) VALUES(?,?,?)",
            )
            .bind(key, index, chunk.buffer),
        );
      }
      await db.batch(statements);
    },
    async get(key) {
      const metadata = await db
        .prepare(
          "SELECT size,chunk_count,content_type,first_bytes FROM media_objects WHERE object_key=?",
        )
        .bind(key)
        .first();
      if (!metadata) return null;
      let index = 0;
      const body = new ReadableStream({
        async pull(controller) {
          try {
            if (index >= metadata.chunk_count) {
              controller.close();
              return;
            }
            const row =
              index === 0
                ? { bytes: metadata.first_bytes }
                : await db
                    .prepare(
                      "SELECT bytes FROM media_chunks WHERE object_key=? AND chunk_index=?",
                    )
                    .bind(key, index)
                    .first();
            index++;
            if (!row) throw new Error("Görsel parçası bulunamadı.");
            controller.enqueue(
              row.bytes instanceof Uint8Array
                ? row.bytes
                : new Uint8Array(row.bytes),
            );
          } catch (error) {
            controller.error(error);
          }
        },
      });
      return { body, size: metadata.size };
    },
    async list({ prefix, cursor = "" } = {}) {
      const rows = (
        await db
          .prepare(
            "SELECT object_key AS key FROM media_objects WHERE object_key LIKE ? AND object_key>? ORDER BY object_key LIMIT 1000",
          )
          .bind(`${prefix ?? ""}%`, cursor)
          .all()
      ).results;
      const truncated = rows.length === 1000;
      return {
        objects: rows,
        truncated,
        cursor: truncated ? rows.at(-1).key : undefined,
      };
    },
    async delete(keys) {
      const values = Array.isArray(keys) ? keys : [keys];
      for (let start = 0; start < values.length; start += 50) {
        const slice = values.slice(start, start + 50);
        await db
          .prepare(
            `DELETE FROM media_objects WHERE object_key IN (${slice.map(() => "?").join(",")})`,
          )
          .bind(...slice)
          .run();
      }
    },
  };
}

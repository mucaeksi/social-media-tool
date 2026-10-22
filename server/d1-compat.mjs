// Reuse bounded editorial operations in local SQLite and production D1.
export function d1Compat(db) {
  const prepare = (sql, args = []) => ({
    bind: (...values) => prepare(sql, values),
    first: async () => db.prepare(sql).get(...args) ?? null,
    all: async () => ({ results: db.prepare(sql).all(...args) }),
    run: async () => ({
      success: true,
      meta: { changes: Number(db.prepare(sql).run(...args).changes) },
    }),
    execute: () =>
      sql.trim().toUpperCase().startsWith("SELECT")
        ? {
            results: db.prepare(sql).all(...args),
            success: true,
            meta: { changes: 0 },
          }
        : {
            success: true,
            meta: { changes: Number(db.prepare(sql).run(...args).changes) },
          },
  });
  return {
    prepare,
    async batch(statements) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = statements.map((s) => s.execute());
        db.exec("COMMIT");
        return result;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

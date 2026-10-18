const decode = (row) => (row ? JSON.parse(row.data) : null);

export function createCloudStore(db) {
  return {
    companies: async () =>
      (
        await db.prepare("SELECT data FROM companies ORDER BY created_at").all()
      ).results.map(decode),
    company: async (id) =>
      decode(
        await db
          .prepare("SELECT data FROM companies WHERE id=?")
          .bind(id)
          .first(),
      ),
    saveCompany: async (data, id = crypto.randomUUID()) => {
      const company = { ...data, id };
      await db
        .prepare(
          "INSERT INTO companies(id,data,created_at) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",
        )
        .bind(id, JSON.stringify(company), new Date().toISOString())
        .run();
      return company;
    },
    deleteCompany: (id) =>
      db.prepare("DELETE FROM companies WHERE id=?").bind(id).run(),
    companyMedia: async (id) =>
      (
        await db
          .prepare("SELECT data FROM media WHERE company_id=?")
          .bind(id)
          .all()
      ).results.map(decode),
    media: async (id) =>
      decode(
        await db.prepare("SELECT data FROM media WHERE id=?").bind(id).first(),
      ),
    saveMedia: async (data, id = crypto.randomUUID()) => {
      const media = { ...data, id };
      await db
        .prepare("INSERT INTO media(id,company_id,data) VALUES(?,?,?)")
        .bind(id, data.companyId, JSON.stringify(media))
        .run();
      return media;
    },
    drafts: async (id) =>
      (
        await db
          .prepare(
            "SELECT data FROM drafts WHERE company_id=? ORDER BY updated_at DESC",
          )
          .bind(id)
          .all()
      ).results.map(decode),
    draft: async (id) =>
      decode(
        await db.prepare("SELECT data FROM drafts WHERE id=?").bind(id).first(),
      ),
    saveDraft: async (data, id = crypto.randomUUID()) => {
      const previous = decode(
        await db.prepare("SELECT data FROM drafts WHERE id=?").bind(id).first(),
      );
      const now = new Date().toISOString();
      const draft = {
        ...data,
        id,
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      };
      await db
        .prepare(
          "INSERT INTO drafts(id,company_id,data,created_at,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at",
        )
        .bind(id, data.companyId, JSON.stringify(draft), draft.createdAt, now)
        .run();
      return draft;
    },
    deleteDraft: (id) =>
      db.prepare("DELETE FROM drafts WHERE id=?").bind(id).run(),
  };
}

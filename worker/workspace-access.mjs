import { z } from "zod";
import { hashPassword, verifyPassword } from "../shared/passwords.mjs";

const fail = (status, message) => {
  throw Object.assign(new Error(message), { status, public: true });
};
export function scopedStore(base, db, identity) {
  if (!identity || identity.local || identity.role !== "editor") return base;
  const allowed = async (id) =>
    Boolean(
      await db
        .prepare(
          "SELECT 1 FROM company_access WHERE company_id=? AND user_id=?",
        )
        .bind(id, identity.id)
        .first(),
    );
  const result = {
    ...base,
    companies: async () => {
      const { results } = await db
        .prepare("SELECT company_id FROM company_access WHERE user_id=?")
        .bind(identity.id)
        .all();
      const ids = new Set(results.map((r) => r.company_id));
      return (await base.companies()).filter((c) => ids.has(c.id));
    },
    company: async (id) => ((await allowed(id)) ? base.company(id) : null),
    media: async (id) => {
      const m = await base.media(id);
      return m && (await allowed(m.companyId)) ? m : null;
    },
    draft: async (id) => {
      const d = await base.draft(id);
      return d && (await allowed(d.companyId)) ? d : null;
    },
  };
  return result;
}
export async function event(
  db,
  identity,
  action,
  companyId = null,
  targetId = null,
) {
  await db.batch([
    db
      .prepare("INSERT INTO workspace_events VALUES(?,?,?,?,?,?)")
      .bind(
        crypto.randomUUID(),
        companyId,
        identity.id,
        action,
        targetId,
        new Date().toISOString(),
      ),
    db.prepare(
      "DELETE FROM workspace_events WHERE id IN (SELECT id FROM workspace_events ORDER BY created_at DESC LIMIT -1 OFFSET 1000)",
    ),
  ]);
}
export function registerWorkspaceAccess(app) {
  const admin = (c) => {
    if (c.get("identity")?.role !== "admin")
      fail(403, "Yönetici yetkisi gerekli.");
  };
  app.get("/api/admin/events", async (c) => {
    admin(c);
    return c.json(
      (
        await c.env.DB.prepare(
          "SELECT action,created_at AS createdAt FROM workspace_events ORDER BY created_at DESC LIMIT 100",
        ).all()
      ).results,
    );
  });
  app.get("/api/admin/access", async (c) => {
    admin(c);
    return c.json(
      (
        await c.env.DB.prepare(
          "SELECT company_id AS companyId,user_id AS userId FROM company_access",
        ).all()
      ).results,
    );
  });
  app.put("/api/admin/users/:id/companies", async (c) => {
    admin(c);
    const id = c.req.param("id"),
      { companyIds } = z
        .object({ companyIds: z.array(z.uuid()).max(30) })
        .parse(await c.req.json());
    if (
      !(await c.env.DB.prepare("SELECT id FROM users WHERE id=?")
        .bind(id)
        .first())
    )
      fail(404, "Kullanıcı bulunamadı.");
    for (const companyId of companyIds)
      if (!(await c.get("store").company(companyId)))
        fail(404, "Şirket bulunamadı.");
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM company_access WHERE user_id=?").bind(id),
      ...[...new Set(companyIds)].map((companyId) =>
        c.env.DB.prepare("INSERT INTO company_access VALUES(?,?)").bind(
          companyId,
          id,
        ),
      ),
      c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
    ]);
    await event(
      c.env.DB,
      c.get("identity"),
      "company-access-updated",
      null,
      id,
    );
    return c.json({ ok: true });
  });
  app.put("/api/admin/users/:id", async (c) => {
    admin(c);
    const id = c.req.param("id");
    const input = z
      .object({
        enabled: z.boolean(),
        role: z.enum(["admin", "editor"]),
        password: z.string().min(10).max(256).optional(),
      })
      .parse(await c.req.json());
    const hash = input.password ? await hashPassword(input.password) : null;
    const row = await c.env.DB.prepare(
      "UPDATE users SET enabled=?,role=?,password_hash=COALESCE(?,password_hash) WHERE id=? AND (role<>'admin' OR enabled=0 OR (?=1 AND ?='admin') OR (SELECT COUNT(*) FROM users WHERE role='admin' AND enabled=1)>1) RETURNING id",
    )
      .bind(
        Number(input.enabled),
        input.role,
        hash,
        id,
        Number(input.enabled),
        input.role,
      )
      .first();
    if (!row)
      fail(409, "Kullanıcı bulunamadı veya son etkin yönetici kaldırılamaz.");
    await c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
      .bind(id)
      .run();
    await event(c.env.DB, c.get("identity"), "user-updated", null, id);
    return c.json({ ok: true });
  });
  app.post("/api/auth/password", async (c) => {
    const input = z
      .object({
        currentPassword: z.string().max(256),
        password: z.string().min(10).max(256),
      })
      .parse(await c.req.json());
    const id = c.get("identity").id;
    const row = await c.env.DB.prepare(
      "SELECT password_hash FROM users WHERE id=?",
    )
      .bind(id)
      .first();
    if (
      !row ||
      !(await verifyPassword(input.currentPassword, row.password_hash))
    )
      fail(403, "Mevcut şifre doğrulanamadı.");
    const hash = await hashPassword(input.password);
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE users SET password_hash=? WHERE id=? AND password_hash=?",
      ).bind(hash, id, row.password_hash),
      c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?").bind(id),
    ]);
    return c.json({ ok: true, loginRequired: true });
  });
  app.post("/api/auth/sessions/revoke", async (c) => {
    await c.env.DB.prepare("DELETE FROM sessions WHERE user_id=?")
      .bind(c.get("identity").id)
      .run();
    return c.json({ ok: true, loginRequired: true });
  });
  app.get("/api/workspace/events", async (c) => {
    const companyId = z.uuid().parse(c.req.query("companyId"));
    if (!(await c.get("store").company(companyId)))
      fail(404, "Şirket bulunamadı.");
    return c.json(
      (
        await c.env.DB.prepare(
          "SELECT action,target_id AS targetId,created_at AS createdAt FROM workspace_events WHERE company_id=? ORDER BY created_at DESC LIMIT 100",
        )
          .bind(companyId)
          .all()
      ).results,
    );
  });
}

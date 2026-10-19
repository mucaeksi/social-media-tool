import { z } from "zod";
import { browserPlatforms, accountProfileUrl } from "./browser-state.mjs";

const inputSchema = z.object({
  companyId: z.uuid(),
  platform: z.enum(Object.keys(browserPlatforms)),
  label: z.string().trim().min(1).max(80),
  profileUrl: z.string().trim().max(2048).default(""),
});
const publicAccount = (row) => ({
  id: row.id,
  companyId: row.company_id,
  platform: row.platform,
  label: row.label,
  savedAt: row.saved_at,
  hasSession: Boolean(row.encrypted_cookies),
  profileUrl: row.profile_url ?? "",
  authDetected: row.auth_detected == null ? null : Boolean(row.auth_detected),
});
export async function browserCommand(env, payload) {
  return env.SOCIAL_BROWSER.get(env.SOCIAL_BROWSER.idFromName("primary")).fetch(
    "https://browser.internal/command",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
export function registerSocialAccounts(app) {
  app.use("/api/social/*", async (c, next) => {
    if (c.get("identity")?.role !== "admin")
      return c.json(
        { error: "Sosyal hesap işlemleri için yönetici yetkisi gerekli." },
        403,
      );
    if (!c.env.SOCIAL_BROWSER || !c.env.BROWSER_STATE_KEY)
      return c.json({ error: "Uzak tarayıcı bu ortamda etkin değil." }, 503);
    return next();
  });
  app.get("/api/social/status", (c) =>
    browserCommand(c.env, { action: "status", userId: c.get("identity").id }),
  );
  app.get("/api/social/accounts", async (c) => {
    const companyId = z.uuid().parse(c.req.query("companyId"));
    const { results } = await c.env.DB.prepare(
      "SELECT * FROM social_accounts WHERE company_id=? ORDER BY created_at,id",
    )
      .bind(companyId)
      .all();
    return c.json(results.map(publicAccount));
  });
  app.post("/api/social/accounts", async (c) => {
    const input = inputSchema.parse(await c.req.json());
    input.profileUrl = accountProfileUrl(input.profileUrl, input.platform);
    if (
      !(await c.env.DB.prepare("SELECT id FROM companies WHERE id=?")
        .bind(input.companyId)
        .first())
    )
      return c.json({ error: "Şirket bulunamadı." }, 404);
    const id = crypto.randomUUID();
    const result = await c.env.DB.prepare(
      "INSERT INTO social_accounts(id,company_id,platform,label,created_at,profile_url) SELECT ?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM social_accounts WHERE company_id=?) < 25 ON CONFLICT DO NOTHING",
    )
      .bind(
        id,
        input.companyId,
        input.platform,
        input.label,
        new Date().toISOString(),
        input.profileUrl,
        input.companyId,
      )
      .run();
    if (!result.meta.changes)
      return c.json(
        { error: "Bu sayfa zaten ekli veya şirketin 25 hesap sınırı dolu." },
        409,
      );
    return c.json(
      { id, ...input, savedAt: null, hasSession: false, authDetected: null },
      201,
    );
  });
  app.post("/api/social/accounts/:id/:action", async (c) => {
    const row = await c.env.DB.prepare(
      "SELECT * FROM social_accounts WHERE id=?",
    )
      .bind(c.req.param("id"))
      .first();
    if (!row) return c.json({ error: "Sosyal hesap bulunamadı." }, 404);
    const action = c.req.param("action");
    if (
      ![
        "open",
        "save",
        "close",
        "paste",
        "checkpoint",
        "profile",
        "login",
      ].includes(action)
    )
      return c.json({ error: "Geçersiz işlem." }, 400);
    const text =
      action === "paste"
        ? z
            .object({ text: z.string().min(1).max(70000) })
            .parse(await c.req.json()).text
        : undefined;
    return browserCommand(c.env, {
      action,
      account: {
        ...publicAccount(row),
        encryptedCookies: row.encrypted_cookies,
      },
      userId: c.get("identity").id,
      text,
    });
  });
  app.delete("/api/social/accounts/:id", async (c) => {
    const id = c.req.param("id");
    const response = await browserCommand(c.env, {
      action: "remove-account",
      account: { id },
      userId: c.get("identity").id,
    });
    if (!response.ok) return response;
    await c.env.DB.prepare("DELETE FROM social_accounts WHERE id=?")
      .bind(id)
      .run();
    return c.body(null, 204);
  });
}

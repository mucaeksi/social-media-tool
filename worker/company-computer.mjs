import { z } from "zod";
import { transferMedia } from "./media-transfer.mjs";
import { randomToken, tokenDigest } from "../shared/passwords.mjs";
import {
  computerCommand,
  computerError,
} from "../shared/computer-protocol.mjs";

export const computerPublicPaths = new Set([
  "/api/computer/enroll",
  "/api/computer/connect",
]);
export function computerBroker(env, payload, upgradeHeaders) {
  return env.COMPANY_COMPUTER.get(
    env.COMPANY_COMPUTER.idFromName("primary"),
  ).fetch(
    "https://computer.internal/",
    upgradeHeaders
      ? { headers: upgradeHeaders }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
  );
}
export async function computerAccount(db, row) {
  const primary = await db.prepare(
    "SELECT id FROM social_accounts WHERE company_id=? AND platform=? ORDER BY created_at,id LIMIT 1",
  ).bind(row.company_id, row.platform).first();
  return {
    id: row.id, companyId: row.company_id, platform: row.platform,
    label: row.label, profileUrl: row.profile_url,
    profileScope: primary?.id === row.id ? "company" : "account",
  };
}
export function registerCompanyComputer(app) {
  app.use("/api/computer/*", async (c, next) => {
    if (!c.env.COMPANY_COMPUTER)
      return c.json(
        { error: "Şirket bilgisayarı bağlantısı bu ortamda etkin değil." },
        503,
      );
    if (
      !computerPublicPaths.has(c.req.path) &&
      c.get("identity")?.role !== "admin"
    )
      return c.json(
        { error: "Bilgisayar yönetimi için yönetici yetkisi gerekli." },
        403,
      );
    return next();
  });
  app.post("/api/computer/pairing", async (c) => {
    const code = randomToken(),
      expiresAt = Date.now() + 600000;
    await c.env.DB.batch([
      c.env.DB.prepare(
        "DELETE FROM computer_pairings WHERE expires_at<=? OR user_id=?",
      ).bind(Date.now(), c.get("identity").id),
      c.env.DB.prepare(
        "INSERT INTO computer_pairings(code_hash,user_id,expires_at) VALUES(?,?,?)",
      ).bind(await tokenDigest(code), c.get("identity").id, expiresAt),
    ]);
    return c.json({ code, expiresAt }, 201);
  });
  app.post("/api/computer/enroll", async (c) => {
    const input = z
      .object({
        code: z.string().regex(/^[\w-]{43}$/),
        name: z.string().trim().min(1).max(80),
      })
      .parse(await c.req.json());
    const id = crypto.randomUUID(),
      token = randomToken(),
      hash = await tokenDigest(input.code),
      now = new Date().toISOString();
    const results = await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO company_computers(id,name,token_hash,pairing_hash,created_by,created_at,last_seen_at) SELECT ?,?,?,p.code_hash,p.user_id,?,? FROM computer_pairings p JOIN users u ON u.id=p.user_id WHERE p.code_hash=? AND p.expires_at>? AND u.role='admin' AND u.enabled=1 AND (SELECT COUNT(*) FROM company_computers WHERE revoked_at IS NULL)<1 ON CONFLICT DO NOTHING",
      ).bind(
        id,
        input.name,
        await tokenDigest(token),
        now,
        now,
        hash,
        Date.now(),
      ),
      c.env.DB.prepare(
        "DELETE FROM computer_pairings WHERE code_hash=? AND EXISTS(SELECT 1 FROM company_computers WHERE id=?)",
      ).bind(hash, id),
    ]);
    if (!results[0].meta.changes)
      return c.json(
        {
          error:
            "Kod geçersiz, kullanılmış veya süresi dolmuş. Başka bilgisayar eşliyse önce bağlantısını kaldırın.",
        },
        409,
      );
    return c.json({ id, token }, 201);
  });
  app.get("/api/computer/connect", async (c) => {
    if (c.req.header("upgrade")?.toLowerCase() !== "websocket")
      return c.json({ error: "WebSocket bağlantısı gerekli." }, 426);
    const protocols = (c.req.header("sec-websocket-protocol") || "")
      .split(",")
      .map((p) => p.trim());
    const credential = protocols.find((p) =>
      /^[0-9a-f-]{36}\.[\w-]{43}$/.test(p),
    );
    if (!protocols.includes("sosyal-device-v1") || !credential)
      return c.json({ error: "Cihaz kimliği doğrulanamadı." }, 401);
    const [id, token] = credential.split(".");
    const row = await c.env.DB.prepare(
      "SELECT d.id FROM company_computers d JOIN users u ON u.id=d.created_by WHERE d.id=? AND d.token_hash=? AND d.revoked_at IS NULL AND u.enabled=1 AND u.role='admin'",
    )
      .bind(id, await tokenDigest(token))
      .first();
    if (!row) return c.json({ error: "Cihaz kimliği doğrulanamadı." }, 401);
    await c.env.DB.prepare(
      "UPDATE company_computers SET last_seen_at=? WHERE id=?",
    )
      .bind(new Date().toISOString(), id)
      .run();
    return computerBroker(c.env, null, {
      Upgrade: "websocket",
      "X-Device-Id": id,
    });
  });
  app.get("/api/computer/status", async (c) => {
    const { results: devices } = await c.env.DB.prepare(
      "SELECT id,name,created_at,last_seen_at FROM company_computers WHERE revoked_at IS NULL ORDER BY created_at",
    ).all();
    const broker = await (
      await computerBroker(c.env, {
        action: "status",
        userId: c.get("identity").id,
      })
    ).json();
    return c.json({ ...broker, devices });
  });
  app.post("/api/computer/devices/:id/revoke", async (c) => {
    const id = z.uuid().parse(c.req.param("id"));
    await c.env.DB.prepare(
      "UPDATE company_computers SET revoked_at=? WHERE id=? AND revoked_at IS NULL",
    )
      .bind(new Date().toISOString(), id)
      .run();
    await computerBroker(c.env, { action: "revoke", deviceId: id });
    return c.json({ ok: true });
  });
  app.get("/api/computer/profiles", async (c) => {
    const companyId = z.uuid().parse(c.req.query("companyId"));
    const { results } = await c.env.DB.prepare(
      "SELECT p.account_id AS accountId,p.last_opened_at AS lastOpenedAt,p.auth_detected AS authDetected FROM computer_profiles p JOIN social_accounts a ON a.id=p.account_id JOIN company_computers d ON d.id=p.device_id WHERE a.company_id=? AND d.revoked_at IS NULL",
    )
      .bind(companyId)
      .all();
    return c.json(results);
  });
  app.post("/api/computer/accounts/:id/command", async (c) => {
    const input = await c.req.json(),
      command = computerCommand(input);
    if (["prepare", "publish"].includes(command.action))
      throw computerError(400, "Bu işlem yayın kuyruğundan başlatılmalıdır.");
    delete command.media;
    const viewId =
      ["open", "workspace", "manual-login"].includes(command.action) ? undefined : z.uuid().parse(input.viewId);
    const row = await c.env.DB.prepare(
      "SELECT id,company_id,platform,label,profile_url FROM social_accounts WHERE id=?",
    )
      .bind(z.uuid().parse(c.req.param("id")))
      .first();
    if (!row) throw computerError(404, "Sosyal hesap bulunamadı.");
    const target = await computerAccount(c.env.DB, row);
    if (command.action === "workspace") {
      if (target.profileScope !== "company")
        throw computerError(409, "Şirket penceresi için bu platformun ilk hesabını seçin.");
      const { results } = await c.env.DB.prepare(
        "SELECT a.* FROM social_accounts a WHERE company_id=? AND id=(SELECT b.id FROM social_accounts b WHERE b.company_id=a.company_id AND b.platform=a.platform ORDER BY b.created_at,b.id LIMIT 1) ORDER BY created_at,id LIMIT 9",
      ).bind(row.company_id).all();
      target.workspaceAccounts = results.map((a) => ({
        id: a.id, companyId: a.company_id, platform: a.platform,
        label: a.label, profileUrl: a.profile_url, profileScope: "company",
      }));
    }
    if (command.action === "upload")
      command.media = await transferMedia(
        c,
        { companyId: row.company_id, platform: row.platform },
        z.uuid().parse(command.mediaId),
      );
    const device = await c.env.DB.prepare(
      "SELECT d.id FROM company_computers d JOIN users u ON u.id=d.created_by WHERE d.revoked_at IS NULL AND u.role='admin' AND u.enabled=1 LIMIT 1",
    ).first();
    if (!device)
      throw computerError(409, "Önce şirket bilgisayarını eşleştirin.");
    const response = await computerBroker(c.env, {
      action: "command",
      command,
      viewId,
      deviceId: device.id,
      userId: c.get("identity").id,
      switchAccount: input.switchAccount === true,
      previousViewId: input.previousViewId,
      account: target,
    });
    if (response.ok && ["open", "workspace", "close"].includes(command.action)) {
      const result = await response.clone().json();
      const hint =
        typeof result.authDetected === "boolean"
          ? Number(result.authDetected)
          : null;
      if (["open", "workspace"].includes(command.action))
        await c.env.DB.prepare(
          "INSERT INTO computer_profiles(account_id,device_id,last_opened_at,auth_detected) VALUES(?,?,?,?) ON CONFLICT(account_id,device_id) DO UPDATE SET last_opened_at=excluded.last_opened_at,auth_detected=excluded.auth_detected",
        )
          .bind(row.id, device.id, new Date().toISOString(), hint)
          .run();
      else
        await c.env.DB.prepare(
          "UPDATE computer_profiles SET auth_detected=? WHERE account_id=? AND device_id=?",
        )
          .bind(hint, row.id, device.id)
          .run();
    }
    return response;
  });
}

import { z } from "zod";
import {
  hashPassword,
  verifyPassword,
  tokenDigest,
  randomToken,
} from "../shared/passwords.mjs";

export const SESSION_SECONDS = 8 * 60 * 60;
const userColumns =
  "u.id,u.username,u.email,u.name,u.role,u.created_at,u.enabled";
const publicUser = (row) => ({
  id: row.id,
  username: row.username,
  email: row.email,
  name: row.name,
  role: row.role,
  enabled: Boolean(row.enabled),
  createdAt: row.created_at,
});
const cookieName = (request) =>
  new URL(request.url).protocol === "https:"
    ? "__Host-studio_session"
    : "studio_session";
const cookieToken = (request) => {
  const name = cookieName(request);
  return (request.headers.get("cookie") || "")
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`))
    ?.slice(name.length + 1);
};
function sessionCookie(request, value, maxAge = SESSION_SECONDS) {
  return `${cookieName(request)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`;
}
export async function authenticatePassword(request, env) {
  const token = cookieToken(request);
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = await env.DB.prepare(
    `SELECT ${userColumns} FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.enabled=1`,
  )
    .bind(await tokenDigest(token), Math.floor(Date.now() / 1000))
    .first();
  return row ? publicUser(row) : null;
}
async function checkLoginRate(c, username) {
  const ip = c.req.header("cf-connecting-ip") || "unknown",
    now = Math.floor(Date.now() / 1000),
    window = Math.floor(now / 900);
  const buckets = [
    await tokenDigest(`ip:${ip}`),
    await tokenDigest(`user:${username}`),
  ];
  const results = await c.env.DB.batch(
    buckets.map((bucket) =>
      c.env.DB.prepare(
        "INSERT INTO auth_attempts(bucket,window,attempts) VALUES(?,?,1) ON CONFLICT(bucket) DO UPDATE SET window=excluded.window,attempts=CASE WHEN auth_attempts.window=excluded.window THEN auth_attempts.attempts+1 ELSE 1 END RETURNING attempts",
      ).bind(bucket, window),
    ),
  );
  if (
    results[0].results[0].attempts > 10 ||
    results[1].results[0].attempts > 20
  ) {
    c.header("Retry-After", String(900 - (now % 900)));
    throw Object.assign(
      new Error(
        "Çok fazla giriş denemesi yapıldı. Bir süre bekleyip yeniden deneyin.",
      ),
      { status: 429 },
    );
  }
  await c.env.DB.prepare("DELETE FROM auth_attempts WHERE window<?")
    .bind(window - 2)
    .run();
}
export function registerPasswordRoutes(app) {
  app.get("/api/auth/me", (c) => c.json({ user: c.get("identity") }));
  app.post("/api/auth/login", async (c) => {
    const input = z
      .object({
        username: z.string().min(1).max(254),
        password: z.string().min(1).max(256),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!input.success)
      return c.json({ error: "Kullanıcı adı veya şifre hatalı." }, 401);
    const username = input.data.username.trim().toLowerCase();
    await checkLoginRate(c, username);
    const rows = (
      await c.env.DB.prepare("SELECT * FROM users WHERE username=? OR email=?")
        .bind(username, username)
        .all()
    ).results;
    const row = rows.length === 1 ? rows[0] : null;
    const valid = await verifyPassword(
      input.data.password,
      row?.password_hash ?? null,
    );
    if (!valid || !row?.enabled)
      return c.json({ error: "Kullanıcı adı veya şifre hatalı." }, 401);
    const token = randomToken(),
      now = Math.floor(Date.now() / 1000);
    await c.env.DB.batch([
      c.env.DB.prepare("DELETE FROM sessions WHERE expires_at<=?").bind(now),
      c.env.DB.prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      ).bind(await tokenDigest(token), row.id, now + SESSION_SECONDS),
    ]);
    c.header("Set-Cookie", sessionCookie(c.req.raw, token));
    return c.json({ user: publicUser(row) });
  });
  app.post("/api/auth/logout", async (c) => {
    const token = cookieToken(c.req.raw);
    if (token)
      await c.env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await tokenDigest(token))
        .run();
    c.header("Set-Cookie", sessionCookie(c.req.raw, "", 0));
    return c.body(null, 204);
  });
  app.get("/api/admin/users", async (c) => {
    if (c.get("identity")?.role !== "admin")
      return c.json({ error: "Bu işlem için yönetici yetkisi gerekir." }, 403);
    const rows = (
      await c.env.DB.prepare(
        `SELECT ${userColumns} FROM users u ORDER BY u.created_at`,
      ).all()
    ).results;
    return c.json(rows.map(publicUser));
  });
  app.post("/api/admin/users", async (c) => {
    if (c.get("identity")?.role !== "admin")
      return c.json({ error: "Bu işlem için yönetici yetkisi gerekir." }, 403);
    const parsed = z
      .object({
        username: z.string().trim().min(3).max(254),
        email: z.email().max(254),
        name: z.string().trim().min(1).max(100),
        password: z.string().min(10).max(256),
        role: z.enum(["admin", "editor"]).default("editor"),
      })
      .safeParse(await c.req.json().catch(() => null));
    if (!parsed.success)
      return c.json(
        {
          error:
            "Kullanıcı bilgilerini kontrol edin. Geçerli bir e-posta, kullanıcı adı ve en az 10 karakterli şifre gerekir.",
        },
        400,
      );
    const input = parsed.data;
    const username = input.username.toLowerCase(),
      email = input.email.toLowerCase();
    const passwordHash = await hashPassword(input.password),
      id = crypto.randomUUID(),
      createdAt = new Date().toISOString();
    try {
      const row = await c.env.DB.prepare(
        "INSERT INTO users(id,username,email,name,password_hash,role,created_at) SELECT ?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM users)<50 AND NOT EXISTS(SELECT 1 FROM users WHERE username IN (?,?) OR email IN (?,?)) RETURNING id",
      )
        .bind(
          id,
          username,
          email,
          input.name,
          passwordHash,
          input.role,
          createdAt,
          username,
          email,
          username,
          email,
        )
        .first();
      if (!row)
        return c.json(
          {
            error:
              "Kullanıcı limiti dolu veya kullanıcı adı/e-posta zaten kayıtlı.",
          },
          409,
        );
    } catch (error) {
      if (/UNIQUE|user_identity_exists/.test(error.message))
        return c.json(
          { error: "Kullanıcı adı veya e-posta zaten kullanılıyor." },
          409,
        );
      throw error;
    }
    return c.json(
      { id, username, email, name: input.name, role: input.role, createdAt },
      201,
    );
  });
}

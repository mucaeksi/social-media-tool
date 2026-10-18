import {
  generateKeyPairSync,
  createPublicKey,
  createHash,
  privateDecrypt,
  constants,
  createDecipheriv,
} from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { cfApi, listAll, protectSecret } from "./cloudflare-api.mjs";
import { validPasswordHash, verifyPassword } from "../shared/passwords.mjs";

export async function databaseQuery(deployment, sql, params = []) {
  const results = await cfApi(
    `/accounts/${deployment.accountId}/d1/database/${deployment.databaseId}/query`,
    { method: "POST", body: { sql, params } },
  );
  if (!Array.isArray(results) || results.some((row) => row.success === false))
    throw new Error("D1 yönetim işlemi doğrulanamadı.");
  return results[0]?.results ?? [];
}
const keyId = (privateKey) =>
  createHash("sha256")
    .update(createPublicKey(privateKey).export({ type: "spki", format: "pem" }))
    .digest("hex");

export async function prepareAdminKey(deployment) {
  await databaseQuery(
    deployment,
    "CREATE TABLE IF NOT EXISTS admin_bootstrap_keys(id TEXT PRIMARY KEY,private_key TEXT NOT NULL,expires_at INTEGER NOT NULL)",
  );
  await databaseQuery(
    deployment,
    "CREATE TABLE IF NOT EXISTS admin_provision_requests(request_id TEXT PRIMARY KEY,applied_at TEXT NOT NULL)",
  );
  const now = Math.floor(Date.now() / 1000);
  let [row] = await databaseQuery(
    deployment,
    "SELECT private_key,expires_at FROM admin_bootstrap_keys WHERE id='current'",
  );
  if (!row || row.expires_at <= now) {
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 3072,
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
      publicKeyEncoding: { type: "spki", format: "pem" },
    });
    protectSecret(privateKey);
    await databaseQuery(
      deployment,
      "INSERT INTO admin_bootstrap_keys(id,private_key,expires_at) VALUES('current',?,?) ON CONFLICT(id) DO UPDATE SET private_key=excluded.private_key,expires_at=excluded.expires_at WHERE admin_bootstrap_keys.expires_at<=?",
      [privateKey, now + 7 * 86400, now],
    );
    [row] = await databaseQuery(
      deployment,
      "SELECT private_key,expires_at FROM admin_bootstrap_keys WHERE id='current'",
    );
  }
  protectSecret(row.private_key);
  const receipt = {
    keyId: keyId(row.private_key),
    publicKey: createPublicKey(row.private_key).export({
      type: "spki",
      format: "pem",
    }),
    expiresAt: new Date(row.expires_at * 1000).toISOString(),
  };
  await mkdir(".cloudflare", { recursive: true });
  await writeFile(
    ".cloudflare/auth-bootstrap.json",
    JSON.stringify(receipt, null, 2) + "\n",
  );
  return receipt;
}

export async function applyAdminRequest(deployment) {
  let envelope;
  try {
    envelope = JSON.parse(await readFile(".github/admin-request.json", "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw new Error("Yönetici isteği okunamadı.");
  }
  if (
    typeof envelope.requestId !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(envelope.requestId)
  )
    throw new Error("Yönetici istek kimliği geçersiz.");
  if (
    (
      await databaseQuery(
        deployment,
        "SELECT request_id FROM admin_provision_requests WHERE request_id=?",
        [envelope.requestId],
      )
    ).length
  )
    return;
  const [row] = await databaseQuery(
    deployment,
    "SELECT private_key,expires_at FROM admin_bootstrap_keys WHERE id='current'",
  );
  if (
    !row ||
    row.expires_at * 1000 <= Date.now() ||
    keyId(row.private_key) !== envelope.keyId
  )
    throw new Error(
      "Yönetici isteğinin aktarım anahtarı geçersiz veya süresi dolmuş.",
    );
  protectSecret(row.private_key);
  let request;
  try {
    const key = privateDecrypt(
      {
        key: row.private_key,
        oaepHash: "sha256",
        padding: constants.RSA_PKCS1_OAEP_PADDING,
      },
      Buffer.from(envelope.key, "base64"),
    );
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(envelope.iv, "base64"),
    );
    decipher.setAAD(Buffer.from(envelope.requestId));
    decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
    const bytes = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, "base64")),
      decipher.final(),
    ]);
    request = JSON.parse(bytes.toString("utf8"));
    bytes.fill(0);
    key.fill(0);
  } catch {
    throw new Error("Yönetici isteği güvenli biçimde çözülemedi.");
  }
  if (
    request.requestId !== envelope.requestId ||
    request.action !== "create" ||
    !validPasswordHash(request.passwordHash) ||
    !["admin", "editor"].includes(request.role) ||
    typeof request.username !== "string" ||
    typeof request.email !== "string" ||
    !request.email.includes("@") ||
    request.username.length > 254 ||
    request.email.length > 254 ||
    typeof request.name !== "string" ||
    request.name.length > 100 ||
    !Number.isFinite(request.expiresAt) ||
    request.expiresAt < Date.now()
  )
    throw new Error("Yönetici oluşturma isteği doğrulanamadı.");
  protectSecret(request.passwordHash);
  if (request.verificationPassword) {
    protectSecret(request.verificationPassword);
    if (
      typeof request.verificationPassword !== "string" ||
      !(await verifyPassword(
        request.verificationPassword,
        request.passwordHash,
      ))
    )
      throw new Error("Yönetici şifre doğrulaması başarısız.");
  }
  const username = request.username.trim().toLowerCase(),
    email = request.email.trim().toLowerCase();
  const existing = await databaseQuery(
    deployment,
    "SELECT id FROM users WHERE username IN (?,?) OR email IN (?,?)",
    [username, email, username, email],
  );
  if (existing.length && existing[0].id !== request.requestId)
    throw new Error(
      "Bu kullanıcı zaten var; şifresi veya rolü değiştirilmedi.",
    );
  if (!existing.length) {
    const created = await databaseQuery(
      deployment,
      "INSERT INTO users(id,username,email,name,password_hash,role,enabled,created_at) SELECT ?,?,?,?,?,?,1,? WHERE (SELECT COUNT(*) FROM users)<50 AND NOT EXISTS(SELECT 1 FROM users WHERE username IN (?,?) OR email IN (?,?)) RETURNING id",
      [
        request.requestId,
        username,
        email,
        request.name,
        request.passwordHash,
        request.role,
        new Date().toISOString(),
        username,
        email,
        username,
        email,
      ],
    );
    if (!created.length)
      throw new Error("Uygulamanın 50 kullanıcı sınırına ulaşıldı.");
  }
  await databaseQuery(
    deployment,
    "INSERT INTO admin_provision_requests(request_id,applied_at) VALUES(?,?) ON CONFLICT DO NOTHING",
    [request.requestId, new Date().toISOString()],
  );
  await databaseQuery(
    deployment,
    "DELETE FROM admin_bootstrap_keys WHERE id='current'",
  );
  const verification = request.verificationPassword
    ? { username, password: request.verificationPassword, role: request.role }
    : undefined;
  console.log(
    "Yetkili kullanıcı oluşturma isteği D1 üzerinde uygulandı. Şifre özeti kayıtlara yazılmadı.",
  );
  return verification;
}

if (process.argv.includes("--prepare")) {
  const accounts = await listAll("/accounts");
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    (accounts.length === 1 ? accounts[0].id : null);
  if (!accountId) throw new Error("Hedef Cloudflare hesabı belirsiz.");
  const db = (await listAll(`/accounts/${accountId}/d1/database`)).find(
    (db) => db.name === "sosyal-studio",
  );
  if (!db) throw new Error("Sosyal Studio veritabanı bulunamadı.");
  const deployment = { accountId, databaseId: db.uuid || db.id };
  if (process.argv.includes("--rotate"))
    await databaseQuery(
      deployment,
      "DELETE FROM admin_bootstrap_keys WHERE id='current'",
    );
  await prepareAdminKey(deployment);
  console.log("Yönetici aktarımı için açık anahtar hazırlandı.");
}

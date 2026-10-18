import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  randomBytes,
  randomUUID,
  createCipheriv,
  publicEncrypt,
  constants,
} from "node:crypto";
import {
  prepareAdminKey,
  applyAdminRequest,
} from "../../scripts/admin-provision.mjs";
import { hashPassword, verifyPassword } from "../../shared/passwords.mjs";

const migration = await readFile(
  new URL("../../migrations/0004_users.sql", import.meta.url),
  "utf8",
);
const deployment = { accountId: "test-account", databaseId: "test-db" };
async function fixture(action) {
  const oldDirectory = process.cwd(),
    oldFetch = globalThis.fetch,
    oldToken = process.env.CLOUDFLARE_API_TOKEN;
  const directory = await mkdtemp(path.join(tmpdir(), "admin-provision-")),
    db = new DatabaseSync(":memory:");
  db.exec(migration);
  process.chdir(directory);
  process.env.CLOUDFLARE_API_TOKEN = "fixture-only";
  globalThis.fetch = async (url, options) => {
    assert.equal(
      new URL(url).pathname,
      "/client/v4/accounts/test-account/d1/database/test-db/query",
    );
    const { sql, params } = JSON.parse(options.body);
    const results = db.prepare(sql).all(...params);
    return new Response(
      JSON.stringify({ success: true, result: [{ success: true, results }] }),
    );
  };
  try {
    await action({ db, directory });
  } finally {
    globalThis.fetch = oldFetch;
    process.chdir(oldDirectory);
    db.close();
    if (oldToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = oldToken;
    await rm(directory, { recursive: true, force: true });
  }
}
function encrypt(publicKey, keyId, payload) {
  const key = randomBytes(32),
    iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(payload.requestId));
  return {
    requestId: payload.requestId,
    keyId,
    key: publicEncrypt(
      {
        key: publicKey,
        oaepHash: "sha256",
        padding: constants.RSA_PKCS1_OAEP_PADDING,
      },
      key,
    ).toString("base64"),
    iv: iv.toString("base64"),
    data: Buffer.concat([
      cipher.update(JSON.stringify(payload)),
      cipher.final(),
    ]).toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}
test("Açık anahtar dosyası sır içermez; geçerli anahtar tekrar kullanılır", async () =>
  fixture(async ({ db, directory }) => {
    const first = await prepareAdminKey(deployment),
      again = await prepareAdminKey(deployment);
    assert.equal(first.keyId, again.keyId);
    const text = await readFile(
      path.join(directory, ".cloudflare/auth-bootstrap.json"),
      "utf8",
    );
    assert.ok(!text.includes("PRIVATE KEY"));
    assert.ok(
      db
        .prepare("SELECT private_key FROM admin_bootstrap_keys")
        .get()
        .private_key.includes("PRIVATE KEY"),
    );
    assert.equal(
      db.prepare("SELECT COUNT(*) AS total FROM users").get().total,
      0,
    );
  }));
test("Şifreli yönetici isteği bir kez uygulanır, parola özetlenir ve aktarım anahtarı tüketilir", async () =>
  fixture(async ({ db }) => {
    const bootstrap = await prepareAdminKey(deployment),
      password = "Fixture.Admin.2026!";
    const payload = {
      requestId: randomUUID(),
      action: "create",
      username: "admin@example.test",
      email: "admin@example.test",
      name: "Deneme yöneticisi",
      role: "admin",
      passwordHash: await hashPassword(password),
      verificationPassword: password,
      expiresAt: Date.now() + 60000,
    };
    const envelope = encrypt(bootstrap.publicKey, bootstrap.keyId, payload),
      serialized = JSON.stringify(envelope);
    assert.ok(!serialized.includes(password));
    assert.ok(!serialized.includes(payload.passwordHash));
    await mkdir(".github");
    await writeFile(".github/admin-request.json", serialized);
    const verification = await applyAdminRequest(deployment);
    assert.equal(verification.username, payload.username);
    const user = db.prepare("SELECT * FROM users").get();
    assert.equal(user.role, "admin");
    assert.notEqual(user.password_hash, password);
    assert.ok(await verifyPassword(password, user.password_hash));
    assert.equal(
      db.prepare("SELECT COUNT(*) AS total FROM admin_bootstrap_keys").get()
        .total,
      0,
    );
    db.prepare("UPDATE users SET enabled=0").run();
    assert.equal(await applyAdminRequest(deployment), undefined);
    assert.equal(db.prepare("SELECT enabled FROM users").get().enabled, 0);
    const next = await prepareAdminKey(deployment);
    assert.notEqual(next.keyId, bootstrap.keyId);
  }));
test("Değiştirilmiş şifreli veri veya süresi dolmuş istek hesap açamaz", async () =>
  fixture(async ({ db }) => {
    const bootstrap = await prepareAdminKey(deployment),
      passwordHash = await hashPassword("Fixture.Admin.2026!");
    const payload = {
      requestId: randomUUID(),
      action: "create",
      username: "admin@example.test",
      email: "admin@example.test",
      name: "Deneme",
      role: "admin",
      passwordHash,
      expiresAt: Date.now() + 60000,
    };
    await mkdir(".github");
    const envelope = encrypt(bootstrap.publicKey, bootstrap.keyId, payload);
    envelope.tag = randomBytes(16).toString("base64");
    await writeFile(".github/admin-request.json", JSON.stringify(envelope));
    await assert.rejects(applyAdminRequest(deployment), /çözülemedi/);
    payload.expiresAt = Date.now() - 1;
    await writeFile(
      ".github/admin-request.json",
      JSON.stringify(encrypt(bootstrap.publicKey, bootstrap.keyId, payload)),
    );
    await assert.rejects(applyAdminRequest(deployment), /doğrulanamadı/);
    assert.equal(
      db.prepare("SELECT COUNT(*) AS total FROM users").get().total,
      0,
    );
  }));

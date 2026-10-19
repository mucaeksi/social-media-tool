import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import sharp from "sharp";
import { createD1Media } from "../../worker/d1-media.mjs";
import { platforms } from "../../server/platforms.mjs";

let mf, db, bucket, first, second, image, draft, privateKey, publicKey;
const issuer = "https://test.cloudflareaccess.com",
  audience = "test-app";
async function token({ aud = audience, expiry = "5m" } = {}) {
  return new SignJWT({ email: "test@example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuer(issuer)
    .setAudience(aud)
    .setSubject("test-user")
    .setIssuedAt()
    .setExpirationTime(expiry)
    .sign(privateKey);
}
async function request(
  route,
  {
    method = "GET",
    body,
    hostname = "localhost",
    jwt,
    headers = {},
    instance = mf,
  } = {},
) {
  let encoded = body ? JSON.stringify(body) : undefined;
  const contentHeaders = body ? { "Content-Type": "application/json" } : {};
  if (body instanceof FormData) {
    const native = new Request("http://localhost/upload", {
      method: "POST",
      body,
    });
    encoded = await native.arrayBuffer();
    contentHeaders["Content-Type"] = native.headers.get("content-type");
  }
  const response = await instance.dispatchFetch(`http://${hostname}${route}`, {
    method,
    headers: {
      ...contentHeaders,
      ...(jwt ? { "Cf-Access-Jwt-Assertion": jwt } : {}),
      ...headers,
    },
    body: encoded,
  });
  return {
    response,
    data: response.status === 204 ? null : await response.json(),
  };
}

before(async () => {
  ({ privateKey, publicKey } = await generateKeyPair("RS256"));
  const jwk = {
    ...(await exportJWK(publicKey)),
    alg: "RS256",
    use: "sig",
    kid: "test-key",
  };
  mf = new Miniflare({
    modules: true,
    scriptPath: ".worker-build/index.js",
    compatibilityDate: "2026-07-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "studio-test" },
    r2Buckets: { MEDIA: "studio-test-media" },
    bindings: {
      APP_ENV: "development",
      LOCAL_AUTH_BYPASS: "true",
      ACCESS_TEAM_DOMAIN: "test.cloudflareaccess.com",
      ACCESS_AUD: audience,
    },
    serviceBindings: {
      ASSETS: () =>
        new Response('<!doctype html><html lang="tr">Sosyal Studio</html>', {
          headers: { "Content-Type": "text/html" },
        }),
    },
    outboundService: (request) => {
      if (request.url === `${issuer}/cdn-cgi/access/certs`)
        return new Response(JSON.stringify({ keys: [jwk] }), {
          headers: { "Content-Type": "application/json" },
        });
      throw new Error("Beklenmeyen dış bağlantı.");
    },
  });
  db = await mf.getD1Database("DB");
  bucket = await mf.getR2Bucket("MEDIA");
  const migration =
    (await readFile("migrations/0001_studio.sql", "utf8")) +
    (await readFile("migrations/0002_d1_media.sql", "utf8")) +
    (await readFile("migrations/0003_r2_budget.sql", "utf8"));
  for (const statement of migration
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean))
    await db.prepare(statement).run();
});
after(async () => {
  await mf?.dispose();
});

test("Cloudflare sağlık kontrolü gerçek D1 ve R2 çalışma biçimini bildirir", async () => {
  const { response, data } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(data.database, "d1");
  assert.equal(data.storage, "r2");
  assert.equal(data.mediaProcessing, "browser");
});
test("Üretim alan adı yerel giriş istisnasını kullanamaz; sahte e-posta başlığı kabul edilmez", async () => {
  assert.equal(
    (await request("/api/companies", { hostname: "studio.workers.dev" }))
      .response.status,
    401,
  );
  assert.equal(
    (
      await request("/api/companies", {
        hostname: "studio.workers.dev",
        headers: { "Cf-Access-Authenticated-User-Email": "spoof@example.com" },
      })
    ).response.status,
    401,
  );
});
test("Cloudflare Access JWT imzası, hedefi ve süresi doğrulanır", async () => {
  assert.equal(
    (
      await request("/api/companies", {
        hostname: "studio.workers.dev",
        jwt: await token(),
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request("/api/companies", {
        hostname: "studio.workers.dev",
        jwt: await token({ aud: "wrong-app" }),
      })
    ).response.status,
    401,
  );
  assert.equal(
    (
      await request("/api/companies", {
        hostname: "studio.workers.dev",
        jwt: await token({ expiry: Math.floor(Date.now() / 1000) - 10 }),
      })
    ).response.status,
    401,
  );
});
test("D1 şirket kayıtları ve sekiz platform için hazırlama çalışır", async () => {
  first = (
    await request("/api/companies", {
      method: "POST",
      body: { name: "Cloudflare Denemesi", keywords: "tasarım, yenilik" },
    })
  ).data;
  second = (
    await request("/api/companies", {
      method: "POST",
      body: { name: "İkinci Şirket" },
    })
  ).data;
  assert.ok(first.id);
  assert.notEqual(first.id, second.id);
  const { data } = await request("/api/prepare", {
    method: "POST",
    body: {
      companyId: first.id,
      text: "Yeni koleksiyon hazır.",
      selected: platforms.map((p) => p.id),
    },
  });
  assert.equal(data.posts.length, 8);
  assert.deepEqual(data.posts[0].hashtags, ["#tasarım", "#yenilik"]);
});
test("ChatGPT talimatı ve içe aktarım aynı doğrulama kurallarını uygular", async () => {
  const brief = {
    companyId: first.id,
    text: "Koleksiyon hazır.",
    selected: ["instagram", "linkedin"],
  };
  assert.ok(
    (
      await request("/api/prompt", { method: "POST", body: brief })
    ).data.prompt.includes(first.name),
  );
  assert.equal(
    (
      await request("/api/import", {
        method: "POST",
        body: {
          ...brief,
          result: JSON.stringify({
            posts: [{ platform: "instagram", caption: "Merhaba" }],
          }),
        },
      })
    ).response.status,
    400,
  );
  const posts = brief.selected.map((platform) => ({
    platform,
    caption: "Türkçe gönderi",
    hashtags: ["#yenilik"],
  }));
  assert.equal(
    (
      await request("/api/import", {
        method: "POST",
        body: { ...brief, result: JSON.stringify({ posts }) },
      })
    ).response.status,
    200,
  );
});
test("17 JPEG R2 üzerinde saklanır; görsel boyutları ve kırpma seçenekleri korunur", async () => {
  const form = new FormData();
  const original = await sharp({
    create: { width: 400, height: 300, channels: 3, background: "#336655" },
  })
    .jpeg()
    .toBuffer();
  form.append(
    "original",
    new Blob([original], { type: "image/jpeg" }),
    "original.jpg",
  );
  for (const p of platforms)
    for (const fit of ["contain", "cover"]) {
      const bytes = await sharp(original)
        .resize(p.width, p.height, { fit, background: "white" })
        .jpeg()
        .toBuffer();
      form.append(
        `${p.id}_${fit}`,
        new Blob([bytes], { type: "image/jpeg" }),
        `${p.id}_${fit}.jpg`,
      );
    }
  await db
    .prepare("UPDATE r2_budget SET period=?,class_a=999984 WHERE singleton=1")
    .bind(new Date().toISOString().slice(0, 7))
    .run();
  const denied = await request(`/api/media?companyId=${first.id}`, {
    method: "POST",
    body: form,
  });
  assert.equal(denied.response.status, 429);
  assert.match(denied.data.error, /Class A/);
  assert.equal((await bucket.list()).objects.length, 0);
  await db.prepare("UPDATE r2_budget SET class_a=0 WHERE singleton=1").run();
  const result = await request(`/api/media?companyId=${first.id}`, {
    method: "POST",
    body: form,
  });
  assert.equal(result.response.status, 201);
  image = result.data;
  assert.equal((await bucket.list()).objects.length, 17);
  const usage = (await request("/api/storage/usage")).data.r2;
  assert.equal(usage.limits.storageBytes, 10_000_000_000);
  assert.equal(usage.usage.classA, 17);
  assert.ok(usage.usage.storageBytes > 0);
  for (const p of platforms)
    for (const fit of ["contain", "cover"]) {
      const response = await mf.dispatchFetch(
        `http://localhost/api/media/${image.id}/${p.id}.jpg?fit=${fit}`,
      );
      const metadata = await sharp(
        Buffer.from(await response.arrayBuffer()),
      ).metadata();
      assert.deepEqual([metadata.width, metadata.height], [p.width, p.height]);
    }
});
test("Eksik veya hatalı görsel paketleri R2 yazımı yapılmadan reddedilir", async () => {
  const form = new FormData();
  form.append(
    "original",
    new Blob(["<svg/>"], { type: "image/svg+xml" }),
    "bad.svg",
  );
  assert.equal(
    (
      await request(`/api/media?companyId=${first.id}`, {
        method: "POST",
        body: form,
      })
    ).response.status,
    400,
  );
  assert.equal((await bucket.list()).objects.length, 17);
});
test("D1 taslakları şirketlere göre ayrılır, güncellenir ve dışa aktarılır", async () => {
  const input = {
    companyId: first.id,
    name: "Bulut taslağı",
    text: "Merhaba",
    selected: ["instagram"],
    posts: [{ platform: "instagram", caption: "Merhaba", hashtags: [] }],
    mediaId: image.id,
  };
  draft = (await request("/api/drafts", { method: "POST", body: input })).data;
  assert.ok(draft.id);
  assert.equal(
    (await request(`/api/drafts?companyId=${second.id}`)).data.length,
    0,
  );
  assert.equal(
    (
      await request("/api/drafts", {
        method: "POST",
        body: { ...input, companyId: second.id },
      })
    ).response.status,
    400,
  );
  assert.equal(
    (
      await request(`/api/drafts/${draft.id}`, {
        method: "PUT",
        body: { ...input, companyId: second.id, mediaId: null },
      })
    ).response.status,
    400,
  );
  assert.equal(
    (await request(`/api/drafts/${draft.id}/export`)).data.published,
    false,
  );
  assert.ok(
    await db.prepare("SELECT id FROM drafts WHERE id=?").bind(draft.id).first(),
  );
});
test("Yabancı kaynak istekleri reddedilir; şirket silme R2 ve D1 kayıtlarını birlikte kaldırır", async () => {
  assert.equal(
    (
      await request("/api/companies", {
        headers: { Origin: "https://other.example" },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (await request(`/api/companies/${first.id}`, { method: "DELETE" })).response
      .status,
    204,
  );
  assert.equal((await request(`/api/drafts/${draft.id}`)).response.status, 404);
  assert.equal((await bucket.list()).objects.length, 0);
  assert.equal(
    (await request("/api/storage/usage")).data.r2.usage.storageBytes,
    0,
  );
  assert.equal((await request("/api/companies")).data[0].id, second.id);
});

test("D1 büyük görselleri parçalara ayırıp eksiksiz akışla geri verir", async () => {
  const storage = createD1Media(db);
  const key = `companies/${second.id}/chunk-test/original.jpg`;
  const bytes = new Uint8Array(2 * 1024 * 1024 + 127);
  for (let index = 0; index < bytes.length; index++) bytes[index] = index % 251;
  await storage.put(key, bytes);
  const chunks = await db
    .prepare("SELECT COUNT(*) AS total FROM media_chunks WHERE object_key=?")
    .bind(key)
    .first();
  assert.equal(chunks.total, 2);
  const object = await storage.get(key);
  const received = new Uint8Array(
    await new Response(object.body).arrayBuffer(),
  );
  assert.deepEqual(received, bytes);
  await storage.delete(key);
  assert.equal(await storage.get(key), null);
});

test("R2 bağlantısı olmadan D1 üzerinde görsel yükleme, indirme ve şirket silme çalışır", async () => {
  const instance = new Miniflare({
    modules: true,
    scriptPath: ".worker-build/index.js",
    compatibilityDate: "2026-07-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "d1-media-only" },
    bindings: {
      APP_ENV: "development",
      LOCAL_AUTH_BYPASS: "true",
      MEDIA_STORAGE: "d1",
    },
    serviceBindings: { ASSETS: () => new Response("Sosyal Studio") },
  });
  try {
    const database = await instance.getD1Database("DB");
    for (const name of [
      "0001_studio.sql",
      "0002_d1_media.sql",
      "0003_r2_budget.sql",
    ])
      for (const statement of (await readFile(`migrations/${name}`, "utf8"))
        .split(";")
        .map((s) => s.trim())
        .filter(Boolean))
        await database.prepare(statement).run();
    const profile = (
      await request("/api/companies", {
        instance,
        method: "POST",
        body: { name: "D1 Görsel Denemesi" },
      })
    ).data;
    const original = await sharp({
      create: { width: 300, height: 200, channels: 3, background: "#336655" },
    })
      .jpeg()
      .toBuffer();
    const form = new FormData();
    form.append(
      "original",
      new Blob([original], { type: "image/jpeg" }),
      "original.jpg",
    );
    for (const p of platforms)
      for (const fit of ["contain", "cover"]) {
        const bytes = await sharp(original)
          .resize(p.width, p.height, { fit, background: "white" })
          .jpeg()
          .toBuffer();
        form.append(
          `${p.id}_${fit}`,
          new Blob([bytes], { type: "image/jpeg" }),
          `${p.id}_${fit}.jpg`,
        );
      }
    const upload = await request(`/api/media?companyId=${profile.id}`, {
      instance,
      method: "POST",
      body: form,
    });
    assert.equal(upload.response.status, 201);
    assert.equal(upload.data.storage, "d1");
    assert.equal(
      (await request("/api/health", { instance })).data.storage,
      "d1",
    );
    const response = await instance.dispatchFetch(
      `http://localhost/api/media/${upload.data.id}/instagram.jpg`,
    );
    const metadata = await sharp(
      Buffer.from(await response.arrayBuffer()),
    ).metadata();
    assert.deepEqual([metadata.width, metadata.height], [1080, 1350]);
    assert.equal(
      (
        await database
          .prepare("SELECT COUNT(*) AS total FROM media_objects")
          .first()
      ).total,
      17,
    );
    assert.equal(
      (
        await request(`/api/companies/${profile.id}`, {
          instance,
          method: "DELETE",
        })
      ).response.status,
      204,
    );
    assert.equal(
      (
        await database
          .prepare("SELECT COUNT(*) AS total FROM media_objects")
          .first()
      ).total,
      0,
    );
    assert.equal(
      (
        await database
          .prepare("SELECT COUNT(*) AS total FROM media_chunks")
          .first()
      ).total,
      0,
    );
  } finally {
    await instance.dispose();
  }
});

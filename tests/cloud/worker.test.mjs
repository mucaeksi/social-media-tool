import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { generateKeyPair, exportJWK, SignJWT } from "jose";
import sharp from "sharp";
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
  { method = "GET", body, hostname = "localhost", jwt, headers = {} } = {},
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
  const response = await mf.dispatchFetch(`http://${hostname}${route}`, {
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
  const migration = await readFile("migrations/0001_studio.sql", "utf8");
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
  const result = await request(`/api/media?companyId=${first.id}`, {
    method: "POST",
    body: form,
  });
  assert.equal(result.response.status, 201);
  image = result.data;
  assert.equal((await bucket.list()).objects.length, 17);
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
  assert.equal((await request("/api/companies")).data[0].id, second.id);
});

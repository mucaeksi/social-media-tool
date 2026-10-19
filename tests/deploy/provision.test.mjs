import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { provisionCloudflare } from "../../scripts/provision-cloudflare.mjs";
import {
  ZERO_TRUST_LIMITS,
  requireCapacity,
} from "../../scripts/cloudflare-free-tier.mjs";

const account = "a".repeat(32);
async function fixture(handler, action) {
  const previousDirectory = process.cwd(),
    previousFetch = globalThis.fetch;
  const previousToken = process.env.CLOUDFLARE_API_TOKEN,
    previousAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const directory = await mkdtemp(path.join(os.tmpdir(), "studio-provision-"));
  const calls = [];
  process.chdir(directory);
  process.env.CLOUDFLARE_API_TOKEN = "fixture-token-not-a-credential";
  delete process.env.CLOUDFLARE_ACCOUNT_ID;
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).hostname, "api.cloudflare.com");
    calls.push({
      path: new URL(url).pathname,
      method: options.method,
      body: options.body ? JSON.parse(options.body) : null,
    });
    const result = handler(
      new URL(url).pathname.replace("/client/v4", ""),
      options,
      new URL(url).searchParams,
    );
    if (result instanceof Response) return result;
    return new Response(JSON.stringify({ success: true, result }), {
      headers: { "Content-Type": "application/json" },
    });
  };
  try {
    await action({ directory, calls });
  } finally {
    process.chdir(previousDirectory);
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
    if (previousAccount === undefined) delete process.env.CLOUDFLARE_ACCOUNT_ID;
    else process.env.CLOUDFLARE_ACCOUNT_ID = previousAccount;
    await rm(directory, { recursive: true, force: true });
  }
}
function existing(pathname, options) {
  if (pathname === "/accounts") return [{ id: account }];
  if (pathname.endsWith("/subscriptions"))
    return [
      {
        price: 0,
        state: "Provisioned",
        rate_plan: {
          id: "teams_free",
          public_name: "Zero Trust Free",
          scope: "teams",
        },
      },
    ];
  if (pathname.endsWith("/access/users")) return [];
  if (pathname.endsWith("/workers/scripts/sosyal-studio/settings")) return null;
  if (pathname.endsWith("/d1/database"))
    return [{ name: "sosyal-studio", uuid: "database-id" }];
  if (pathname.endsWith("/r2/buckets/sosyal-studio-media"))
    return { name: "sosyal-studio-media" };
  if (pathname.endsWith("/workers/subdomain")) return { subdomain: "fixture" };
  if (pathname.endsWith("/access/organizations"))
    return { auth_domain: "fixture.cloudflareaccess.com" };
  if (pathname.endsWith("/access/identity_providers"))
    return [{ id: "otp-id", type: "onetimepin" }];
  if (pathname.endsWith("/access/apps"))
    return [
      {
        id: "app-id",
        name: "Sosyal Studio",
        domain: "sosyal-studio.fixture.workers.dev",
        aud: "app-audience",
      },
    ];
  if (pathname.endsWith("/access/apps/app-id") && options.method === "PUT")
    return { id: "app-id", aud: "app-audience" };
  if (pathname.endsWith("/access/apps/app-id/policies"))
    return [{ name: "Doğrulanmış tüm e-postalar" }];
  throw new Error(`Beklenmeyen sağlayıcı isteği: ${pathname}`);
}
test("Mevcut Cloudflare kaynakları tekrar oluşturulmaz; üretim yerel giriş istisnasıyla yayımlanmaz", async () => {
  await fixture(existing, async ({ directory, calls }) => {
    const result = await provisionCloudflare();
    assert.equal(result.url, "https://sosyal-studio.fixture.workers.dev");
    assert.equal(calls.filter((call) => call.method === "POST").length, 0);
    const contents = await readFile(
      path.join(directory, ".cloudflare/wrangler.deploy.json"),
      "utf8",
    );
    assert.ok(!contents.includes("fixture-token-not-a-credential"));
    const config = JSON.parse(contents);
    assert.equal(config.vars.APP_ENV, "production");
    assert.equal(config.vars.LOCAL_AUTH_BYPASS, undefined);
    assert.equal(config.d1_databases[0].database_id, "database-id");
    assert.equal(config.assets.run_worker_first, true);
    assert.equal(config.browser.binding, "BROWSER");
    assert.equal(config.durable_objects.bindings[0].class_name, "SocialBrowser");
    assert.deepEqual(config.migrations[0].new_sqlite_classes, ["SocialBrowser"]);
    assert.ok(config.compatibility_flags.includes("nodejs_compat"));
  });
});
test("Birden fazla hesapta rastgele hesap seçilmez ve kaynak oluşturulmaz", async () => {
  await fixture(
    (pathname) =>
      pathname === "/accounts"
        ? [{ id: account }, { id: "b".repeat(32) }]
        : assert.fail("Hesap seçilmeden başka istek yapılamaz."),
    async ({ calls }) => {
      await assert.rejects(provisionCloudflare, /CLOUDFLARE_ACCOUNT_ID/);
      assert.equal(calls.length, 1);
    },
  );
});
test("Başka Access uygulamasının üzerine yazılmaz", async () => {
  await fixture(
    (pathname, options) =>
      pathname.endsWith("/access/apps")
        ? [
            {
              id: "other-app",
              name: "Başka Uygulama",
              domain: "sosyal-studio.fixture.workers.dev",
            },
          ]
        : existing(pathname, options),
    async ({ calls }) => {
      await assert.rejects(provisionCloudflare, /üzerine yazılmadı/);
      assert.equal(calls.filter((call) => call.method !== "GET").length, 0);
    },
  );
});
test("Başka Worker üzerinde yayın yapılmaz ve kaynak değişikliği başlamaz", async () => {
  await fixture(
    (pathname, options) =>
      pathname.endsWith("/workers/scripts/sosyal-studio/settings")
        ? { bindings: [] }
        : existing(pathname, options),
    async ({ calls }) => {
      await assert.rejects(provisionCloudflare, /başka bir uygulamaya ait/);
      assert.equal(calls.filter((call) => call.method !== "GET").length, 0);
    },
  );
});

test("R2 hesapta etkin değilse D1 görsel deposu seçilir; R2 binding eklenmez", async () => {
  await fixture(
    (pathname, options) =>
      pathname.includes("/r2/buckets/")
        ? new Response(
            JSON.stringify({
              success: false,
              errors: [
                {
                  code: 10042,
                  message: "Please enable R2 through the Cloudflare Dashboard.",
                },
              ],
            }),
            { status: 403 },
          )
        : existing(pathname, options),
    async ({ directory }) => {
      const result = await provisionCloudflare();
      assert.equal(result.mediaStorage, "d1");
      const config = JSON.parse(
        await readFile(
          path.join(directory, ".cloudflare/wrangler.deploy.json"),
          "utf8",
        ),
      );
      assert.equal(config.r2_buckets, undefined);
      assert.equal(config.vars.MEDIA_STORAGE, "d1");
    },
  );
});

test("R2 yetki hatası etkinleştirme hatası gibi değerlendirilmez", async () => {
  await fixture(
    (pathname, options) =>
      pathname.includes("/r2/buckets/")
        ? new Response(
            JSON.stringify({
              success: false,
              errors: [{ code: 10000, message: "Authentication error" }],
            }),
            { status: 403 },
          )
        : existing(pathname, options),
    async () => {
      await assert.rejects(provisionCloudflare, /10000/);
    },
  );
});

test("Şifreli giriş için Access kuruluşu, sağlayıcı veya politika oluşturulmaz", async () => {
  await fixture(existing, async ({ calls, directory }) => {
    await provisionCloudflare();
    assert.ok(calls.every((call) => call.method === "GET"));
    assert.ok(
      !calls.some(
        (call) =>
          call.path.endsWith("/access/organizations") ||
          call.path.endsWith("/access/identity_providers"),
      ),
    );
    const config = JSON.parse(
      await readFile(
        path.join(directory, ".cloudflare/wrangler.deploy.json"),
        "utf8",
      ),
    );
    assert.equal(config.vars.AUTH_MODE, "password");
    assert.equal(config.vars.ACCESS_AUD, undefined);
  });
});

test("Ücretli Zero Trust planında kaynaklar ve abonelik değiştirilmez", async () => {
  await fixture(
    (pathname, options) =>
      pathname.endsWith("/subscriptions")
        ? [
            {
              price: 7,
              state: "Paid",
              rate_plan: {
                id: "teams_paid",
                public_name: "Zero Trust Pay-as-you-go",
              },
            },
          ]
        : existing(pathname, options),
    async ({ calls }) => {
      await assert.rejects(
        provisionCloudflare,
        /ücretsiz olarak doğrulanamadı/,
      );
      assert.ok(calls.every((x) => x.method === "GET"));
    },
  );
});

test("Plan bulunamazsa veya Free adıyla ücret varsa dağıtım durur", async () => {
  for (const subscriptions of [
    [],
    [
      {
        price: 1,
        state: "Provisioned",
        rate_plan: { id: "teams_free", public_name: "Zero Trust Free" },
      },
    ],
  ])
    await fixture(
      (pathname, options) =>
        pathname.endsWith("/subscriptions")
          ? subscriptions
          : existing(pathname, options),
      async ({ calls }) => {
        await assert.rejects(provisionCloudflare, /doğrulanamadı/);
        assert.ok(calls.every((x) => x.method === "GET"));
      },
    );
});

test("Access ve Gateway ortak koltuk sayısında 50 kabul edilir, 51'de kaynak değişmez", async () => {
  for (const count of [50, 51])
    await fixture(
      (pathname, options, params) =>
        pathname.endsWith("/access/users")
          ? Array.from({ length: count }, (_, i) => ({
              uid: String(i),
              access_seat: i % 2 === 0,
              gateway_seat: i % 2 === 1,
            })).slice(
              (Number(params.get("page") ?? 1) - 1) * 50,
              Number(params.get("page") ?? 1) * 50,
            )
          : existing(pathname, options),
      async ({ calls }) => {
        if (count === 50) {
          const result = await provisionCloudflare();
          assert.equal(result.zeroTrust.activeSeats, 50);
          assert.equal(result.zeroTrust.price, 0);
        } else {
          await assert.rejects(provisionCloudflare, /51 aktif koltuk/);
          assert.ok(calls.every((x) => x.method === "GET"));
        }
      },
    );
});

test("Access hesap kaynak sınırlarında yeni kaynak isteği yapılmaz", async () => {
  for (const [name, limit] of Object.entries(ZERO_TRUST_LIMITS)) {
    if (name === "activeSeats") continue;
    assert.doesNotThrow(() => requireCapacity(limit - 1, limit, name));
    assert.throws(
      () => requireCapacity(limit, limit, name),
      /Yeni kaynak oluşturulmadı/,
    );
  }
  await fixture(existing, async ({ calls }) => {
    const result = await provisionCloudflare();
    assert.equal(result.legacyAccessAppId, "app-id");
    assert.ok(calls.every((call) => call.method === "GET"));
  });
});

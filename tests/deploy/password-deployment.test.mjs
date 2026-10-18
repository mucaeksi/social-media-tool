import { test } from "node:test";
import assert from "node:assert/strict";
import { detachLegacyAccess } from "../../scripts/password-deployment.mjs";
const deployment = {
  accountId: "test",
  databaseId: "db",
  worker: "sosyal-studio",
  legacyAccessAppId: "old-access",
  url: "https://studio.example",
};
async function fixture(
  { mode = "password", admin = true, foreign = false },
  action,
) {
  const oldFetch = globalThis.fetch,
    oldToken = process.env.CLOUDFLARE_API_TOKEN,
    calls = [];
  process.env.CLOUDFLARE_API_TOKEN = "fixture-only";
  globalThis.fetch = async (url, options) => {
    const path = new URL(url).pathname;
    calls.push({ path, method: options.method });
    let result;
    if (path.endsWith("/settings"))
      result = {
        bindings: [
          { name: "AUTH_MODE", text: mode },
          { name: "APP_ENV", text: "production" },
          { name: "APPLICATION_ID", text: "mucaeksi/social-media-tool" },
        ],
      };
    else if (path.endsWith("/query"))
      result = [{ success: true, results: admin ? [{ id: "admin" }] : [] }];
    else if (path.endsWith("/old-access"))
      result =
        options.method === "DELETE"
          ? null
          : {
              name: foreign ? "Başka uygulama" : "Sosyal Studio",
              domain: "studio.example",
            };
    else assert.fail(path);
    return new Response(JSON.stringify({ success: true, result }));
  };
  try {
    await action(calls);
  } finally {
    globalThis.fetch = oldFetch;
    if (oldToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = oldToken;
  }
}
test("Yeni şifreli Worker ve admin hazır olmadan eski giriş katmanı kaldırılamaz", async () => {
  for (const setup of [{ mode: "access" }, { admin: false }])
    await fixture(setup, async (calls) => {
      await assert.rejects(detachLegacyAccess(deployment), /korunuyor/);
      assert.ok(calls.every((c) => c.method !== "DELETE"));
    });
});
test("Geçiş yalnızca bu sitenin Access uygulamasını kaldırır", async () => {
  await fixture({}, async (calls) => {
    await detachLegacyAccess(deployment);
    assert.equal(calls.filter((c) => c.method === "DELETE").length, 1);
  });
  await fixture({ foreign: true }, async (calls) => {
    await assert.rejects(detachLegacyAccess(deployment), /Başka Access/);
    assert.ok(calls.every((c) => c.method !== "DELETE"));
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { cfApi } from "../../scripts/cloudflare-api.mjs";

async function fixture(handler, action) {
  const previousFetch = globalThis.fetch;
  const previousToken = process.env.CLOUDFLARE_API_TOKEN;
  process.env.CLOUDFLARE_API_TOKEN = "fixture-token-not-a-credential";
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return handler(calls.length, options);
  };
  try {
    await action(calls);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousToken === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previousToken;
  }
}
const html = (status) =>
  new Response("<!DOCTYPE html>fixture-private-provider-body", { status });

test("Geçici HTML 502 okuma hatasından sonra aynı API okunur; JSON sonucu döner", async () => {
  await fixture(
    (attempt) =>
      attempt === 1
        ? html(502)
        : Response.json({ success: true, result: [{ id: "fixture" }] }),
    async (calls) => {
      assert.deepEqual(await cfApi("/accounts"), [{ id: "fixture" }]);
      assert.equal(calls.length, 2);
      assert.equal(calls[0].url, calls[1].url);
      assert.equal(calls[0].options.headers.Accept, "application/json");
      assert.equal(calls[0].options.redirect, "error");
    },
  );
});

test("Kalıcı HTML hatası üç okumada durur; gövde yerine endpoint ve HTTP durumu raporlanır", async () => {
  await fixture(() => html(503), async (calls) => {
    await assert.rejects(cfApi("/accounts"), (error) => {
      assert.equal(error.status, 503);
      assert.match(error.message, /GET \/accounts: HTTP 503/);
      assert.ok(!error.message.includes("fixture-private-provider-body"));
      assert.ok(!error.message.includes("<!DOCTYPE"));
      return true;
    });
    assert.equal(calls.length, 3);
  });
});

test("Yazma işlemi, yetki hatası ve hatalı başarılı yanıt otomatik tekrarlanmaz", async () => {
  for (const [method, status] of [["POST", 502], ["GET", 401], ["GET", 200]])
    await fixture(() => html(status), async (calls) => {
      await assert.rejects(cfApi("/accounts", { method }), /Geçerli JSON/);
      assert.equal(calls.length, 1);
    });
});

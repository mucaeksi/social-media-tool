import { test } from "node:test";
import assert from "node:assert/strict";
import { ensureBrowserSecret } from "../../scripts/browser-secret.mjs";

const deployment = { accountId: "a".repeat(32), worker: "sosyal-studio" };
async function fixture(bindings, action) {
  const original = globalThis.fetch,
    previous = process.env.CLOUDFLARE_API_TOKEN;
  const calls = [];
  process.env.CLOUDFLARE_API_TOKEN = "fixture-api-token";
  globalThis.fetch = async (url, options) => {
    calls.push({
      path: new URL(url).pathname,
      method: options.method,
      body: options.body ? JSON.parse(options.body) : null,
    });
    return Response.json({
      success: true,
      result:
        options.method === "GET"
          ? { bindings }
          : { name: "BROWSER_STATE_KEY", type: "secret_text" },
    });
  };
  try {
    await action(calls);
  } finally {
    globalThis.fetch = original;
    if (previous === undefined) delete process.env.CLOUDFLARE_API_TOKEN;
    else process.env.CLOUDFLARE_API_TOKEN = previous;
  }
}
test("Var olan sosyal oturum anahtarı yeniden dağıtımda değiştirilmez", async () => {
  await fixture(
    [{ name: "BROWSER_STATE_KEY", type: "secret_text" }],
    async (calls) => {
      await ensureBrowserSecret(deployment);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].method, "GET");
    },
  );
});
test("Eksik anahtar yalnızca Worker secret olarak hazırlanır; kaynak kod veya çıktıya yazılmaz", async () => {
  await fixture([], async (calls) => {
    const before = process.stdout.write,
      previousActions = process.env.GITHUB_ACTIONS;
    let output = "";
    process.stdout.write = (value) => {
      output += String(value);
      return true;
    };
    process.env.GITHUB_ACTIONS = "true";
    try {
      await ensureBrowserSecret(deployment);
    } finally {
      process.stdout.write = before;
      if (previousActions === undefined) delete process.env.GITHUB_ACTIONS;
      else process.env.GITHUB_ACTIONS = previousActions;
    }
    assert.equal(calls.length, 2);
    assert.equal(calls[1].method, "PUT");
    assert.ok(calls[1].path.endsWith("/workers/scripts/sosyal-studio/secrets"));
    const value = calls[1].body.text;
    assert.equal(Buffer.from(value, "base64url").length, 32);
    assert.ok(!output.includes(value));
    assert.ok(!output.includes("::add-mask::"));
  });
});
test("Beklenmeyen anahtar türünün üzerine yazılıp mevcut oturumlar kaybedilmez", async () => {
  await fixture(
    [{ name: "BROWSER_STATE_KEY", type: "plain_text" }],
    async (calls) => {
      await assert.rejects(
        ensureBrowserSecret(deployment),
        /üzerine yazılmadı/,
      );
      assert.equal(calls.length, 1);
    },
  );
});

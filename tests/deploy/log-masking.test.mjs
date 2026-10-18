import { test } from "node:test";
import assert from "node:assert/strict";
import { protectSecret, safeMessage } from "../../scripts/cloudflare-api.mjs";
test("Çok satırlı sırlar Actions komutundan dışarı taşmadan maskelenir", () => {
  const previous = process.env.GITHUB_ACTIONS,
    write = process.stdout.write;
  let captured = "";
  process.env.GITHUB_ACTIONS = "true";
  process.stdout.write = (value) => {
    captured += value;
    return true;
  };
  try {
    protectSecret("fixture-line-one\nfixture-line-two\rpercent%value");
  } finally {
    process.stdout.write = write;
    if (previous === undefined) delete process.env.GITHUB_ACTIONS;
    else process.env.GITHUB_ACTIONS = previous;
  }
  assert.equal(
    captured,
    "::add-mask::fixture-line-one%0Afixture-line-two%0Dpercent%25value\n",
  );
  assert.equal(captured.split("\n").length, 2);
  assert.equal(
    safeMessage("fixture-line-one\nfixture-line-two\rpercent%value"),
    "[gizli]",
  );
});

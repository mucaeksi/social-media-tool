import { test } from "node:test";
import assert from "node:assert/strict";
import {
  rememberDraft,
  recoverDraft,
  forgetUser,
} from "../src/draftRecovery.ts";

test("Kurtarma yalnız aynı kullanıcı ve şirkete açılır; çıkış ve 24 saat sınırı uygulanır", () => {
  const storage = {};
  Object.defineProperties(storage, {
    setItem: {
      value(k, v) {
        this[k] = v;
      },
    },
    getItem: {
      value(k) {
        return this[k] ?? null;
      },
    },
    removeItem: {
      value(k) {
        delete this[k];
      },
    },
  });
  const previous = globalThis.sessionStorage;
  globalThis.sessionStorage = storage;
  try {
    const input = {
      companyId: "company-a",
      name: "Deneme",
      text: "Korunan çalışma",
      selected: ["facebook"],
      posts: [],
    };
    assert.equal(rememberDraft("user-a", null, input), true);
    assert.equal(recoverDraft("user-b", "company-a"), null);
    assert.equal(recoverDraft("user-a", "company-b"), null);
    assert.equal(recoverDraft("user-a", "company-a").input.text, input.text);
    rememberDraft("user-b", null, input);
    const key = Object.keys(storage).find((k) => k.includes("user-a:"));
    const stale = JSON.parse(storage[key]);
    stale.savedAt = Date.now() - 86400001;
    storage[key] = JSON.stringify(stale);
    assert.equal(recoverDraft("user-a", "company-a"), null);
    rememberDraft("user-a", null, input);
    forgetUser("user-a");
    assert.equal(recoverDraft("user-a", "company-a"), null);
    assert.ok(recoverDraft("user-b", "company-a"));
  } finally {
    if (previous === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previous;
  }
});

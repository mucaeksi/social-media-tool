import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import {
  adProviders,
  advertisingExtensionSource,
  advertisingKPIs,
} from "../shared/advertising.mjs";
import { recordSchemas } from "../shared/editorial.mjs";

test("Yedi reklam paneli aynı katalogdan gelir; alan dışı, giriş ve ödeme URL’leri reddedilir", async () => {
  assert.equal(adProviders.length, 7);
  assert.equal(
    await readFile("firefox-extension/advertising.js", "utf8"),
    advertisingExtensionSource(),
  );
  const context = vm.createContext({ URL });
  vm.runInContext(advertisingExtensionSource(), context);
  vm.runInContext(
    await readFile("firefox-extension/policy.js", "utf8"),
    context,
  );
  const p = context.StudioPolicy;
  for (const provider of adProviders) {
    assert.ok(p.clean(provider.home, "ads-" + provider.id), provider.id);
    assert.equal(
      p.clean(
        "https://" + provider.hosts[0] + ".evil.example/",
        "ads-" + provider.id,
      ),
      null,
    );
    assert.equal(
      p.clean(provider.home.replace("https:", "http:"), "ads-" + provider.id),
      null,
    );
    assert.equal(
      p.clean(new URL("billing", provider.home).href, "ads-" + provider.id),
      null,
    );
  }
  assert.ok(
    p.clean(
      "https://www.linkedin.com/campaignmanager/accounts/123456/campaigns",
      "ads-linkedin",
    ),
  );
  assert.equal(p.clean("https://www.facebook.com/feed", "ads-meta"), null);
  const identity = {
    companyId: crypto.randomUUID(),
    accountId: crypto.randomUUID(),
    companyName: "Kurgu",
    label: "Kurgu",
    platform: "ads-meta",
    profileUrl: adProviders[0].home,
  };
  assert.notEqual(
    p.key(identity),
    p.key({ ...identity, platform: "facebook" }),
  );
  assert.notEqual(
    p.key(identity),
    p.key({ ...identity, platform: "ads-google" }),
  );
});
test("Reklam hesaplaması bilinmeyen ile sıfırı ayırır; gelir doğrulanmadan ROAS üretmez", () => {
  assert.deepEqual(
    advertisingKPIs(
      { clicks: 10, impressions: 1000 },
      { spend: 100, conversions: 2, revenue: 500, revenueVerified: false },
    ),
    { ctr: 1, cpc: 10, cpm: 100, cpa: 50, roas: null },
  );
  assert.equal(
    advertisingKPIs(
      { clicks: 0, impressions: null },
      { spend: 0, conversions: null, revenue: 0, revenueVerified: true },
    ).cpc,
    null,
  );
  assert.equal(
    advertisingKPIs(
      { clicks: 0, impressions: 100 },
      { spend: 100, conversions: 0, revenue: 0, revenueVerified: true },
    ).roas,
    0,
  );
  const now = new Date().toISOString();
  assert.equal(
    recordSchemas.metric.safeParse({
      sourceUrl: "https://ads.google.com/aw/overview",
      measuredAt: now,
      platform: "youtube",
      values: { clicks: null },
      advertising: {
        provider: "google",
        spend: null,
        currency: "TRY",
        periodStart: now,
        periodEnd: "2020-01-01",
        attribution: "",
      },
    }).success,
    false,
  );
});

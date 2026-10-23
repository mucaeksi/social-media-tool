import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  tabPublishing as p,
  tabPublishingExtensionSource,
} from "../shared/tab-publishing.mjs";
test("Dokuz yayın platformu ve eklenti kataloğu aynı kaynaktır; sahte alan ve özel ekran reddedilir", async () => {
  assert.equal(Object.keys(p.platforms).length, 9);
  assert.equal(
    await readFile("firefox-extension/publication-policy.js", "utf8"),
    tabPublishingExtensionSource(),
  );
  for (const [platform, c] of Object.entries(p.platforms)) {
    assert.ok(c.images > 0);
    assert.equal(
      p.profile("https://" + c.hosts[0] + ".evil.test/fixture", platform),
      null,
    );
    assert.equal(
      p.profile("https://" + c.hosts[0] + "/messages", platform),
      null,
    );
    assert.equal(
      p.profile("http://" + c.hosts[0] + "/fixture", platform),
      null,
    );
  }
});
test("Gönderi bağlantıları platform ve görünür yazar denetimine uygun biçimde sınırlanır", () => {
  const samples = {
    facebook: [
      "https://www.facebook.com/fixture/posts/123",
      "https://www.facebook.com/fixture",
    ],
    instagram: [
      "https://www.instagram.com/p/AbC123/",
      "https://www.instagram.com/fixture",
    ],
    x: ["https://x.com/fixture/status/123", "https://x.com/fixture"],
    threads: [
      "https://www.threads.com/@fixture/post/AbC123",
      "https://www.threads.com/@fixture",
    ],
    pinterest: [
      "https://www.pinterest.com/pin/123/",
      "https://www.pinterest.com/fixture",
    ],
    linkedin: [
      "https://www.linkedin.com/feed/update/urn:li:activity:123/",
      "https://www.linkedin.com/company/fixture",
    ],
    youtube: [
      "https://www.youtube.com/post/Ug123",
      "https://www.youtube.com/@fixture",
    ],
    tiktok: [
      "https://www.tiktok.com/@fixture/photo/123",
      "https://www.tiktok.com/@fixture",
    ],
    tumblr: [
      "https://www.tumblr.com/fixture/123",
      "https://www.tumblr.com/fixture",
    ],
  };
  for (const [platform, [url, profile]] of Object.entries(samples)) {
    assert.ok(p.postURL(url, platform), platform);
    assert.equal(p.ownedURL(url, profile, platform), true, platform);
    assert.equal(p.postURL(profile, platform), null, platform);
  }
  assert.equal(
    p.ownedURL("https://x.com/other/status/123", "https://x.com/fixture", "x"),
    false,
  );
  assert.equal(
    p.ownedURL(
      "https://www.facebook.com/other/posts/123",
      "https://www.facebook.com/fixture",
      "facebook",
    ),
    false,
  );
});

test("Organik yayın politikası reklam panelini hedef profil kabul etmez", () => {
  assert.equal(
    p.profile("https://adsmanager.facebook.com/fixture", "facebook"),
    null,
  );
  assert.equal(
    p.profile("https://www.linkedin.com/campaignmanager/fixture", "linkedin"),
    null,
  );
  assert.equal(p.profile("https://www.tumblr.com/blaze", "tumblr"), null);
});

test("Facebook fotoğraf bağlantısı içerik kimliği ister; sayısal hedef çakışması reddedilir", () => {
  assert.ok(
    p.postURL("https://www.facebook.com/photo.php?fbid=123", "facebook"),
  );
  assert.equal(
    p.postURL("https://www.facebook.com/photo.php", "facebook"),
    null,
  );
  assert.equal(
    p.ownedURL(
      "https://www.facebook.com/photo.php?fbid=123&id=45",
      "https://www.facebook.com/profile.php?id=67",
      "facebook",
    ),
    false,
  );
});

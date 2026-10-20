import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { EventEmitter } from "node:events";
import {
  publicAddress,
  publicTarget,
  publicHTML,
  robotsDisallows,
} from "../../companion/research.mjs";
import { webUrl, researchInput } from "../../shared/research-protocol.mjs";
import {
  zonedTime,
  publicationURL,
  publicationBelongsTo,
} from "../../shared/scheduling.mjs";
test("Web araştırması özel IP, kullanıcı bilgili URL ve alan dışı yönlendirmeyi reddeder", async () => {
  for (const ip of [
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
  ])
    assert.equal(publicAddress(ip), false, ip);
  assert.equal(publicAddress("1.1.1.1"), true);
  assert.equal(publicAddress("2606:4700::1111"), true);
  await assert.rejects(
    publicTarget("fixture.com", async () => [
      { address: "1.1.1.1", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ]),
    /herkese açık/,
  );
  for (const url of [
    "https://127.0.0.1/",
    "https://localhost/",
    "https://user:pass@fixture.com/",
    "file:///etc/passwd",
    "https://fixture.com:8443/",
  ])
    assert.throws(() => webUrl(url));
  assert.throws(() =>
    researchInput({
      urls: ["https://other.com/"],
      hosts: ["fixture.com"],
      mode: "static",
    }),
  );
  let called = 0;
  const request = (_url, options, callback) => {
    called++;
    options.lookup("fixture.com", { all: true }, (error, ips) => {
      assert.ifError(error);
      assert.deepEqual(ips, [{ address: "1.1.1.1", family: 4 }]);
    });
    const req = new EventEmitter();
    req.end = () => {
      const r = Readable.from([]);
      r.statusCode = 302;
      r.headers = {
        location: "https://127.0.0.1/private",
        "content-type": "text/html",
      };
      callback(r);
    };
    return req;
  };
  await assert.rejects(
    publicHTML("https://fixture.com/", ["fixture.com"], {
      resolve: async () => ({ address: "1.1.1.1", family: 4 }),
      request,
    }),
    /onaylı/,
  );
  assert.equal(called, 1);
});
test("Gece iptali DNS dönüşünden sonra yeni HTTP açmaz ve devam eden isteğe iptal sinyalini taşır", async () => {
  const first = new AbortController(); let requests = 0;
  await assert.rejects(publicHTML("https://fixture.com/", ["fixture.com"], {
    signal: first.signal,
    resolve: async () => { first.abort(); return { address: "1.1.1.1", family: 4 }; },
    request: () => { requests++; },
  }), { name: "AbortError" });
  assert.equal(requests, 0);
  const active = new AbortController();
  await assert.rejects(publicHTML("https://fixture.com/", ["fixture.com"], {
    signal: active.signal, resolve: async () => ({ address: "1.1.1.1", family: 4 }),
    request: (_url, options) => {
      assert.equal(options.signal, active.signal);
      const req = new EventEmitter();
      active.signal.addEventListener("abort", () => req.emit("error", new Error("İstek iptal edildi")), { once: true });
      req.end = () => active.abort();
      return req;
    },
  }), /iptal/);
});
test("Site metni boyutu ve türü sınırlıdır; robots grupları ve izin önceliği uygulanır", async () => {
  const fetcher = (size, type) => ({
    resolve: async () => ({ address: "1.1.1.1", family: 4 }),
    request: (_url, _options, callback) => {
      const req = new EventEmitter();
      req.end = () => {
        const r = Readable.from([Buffer.alloc(size, 65)]);
        r.statusCode = 200;
        r.headers = { "content-type": type };
        callback(r);
      };
      return req;
    },
  });
  await assert.rejects(
    publicHTML(
      "https://fixture.com/",
      ["fixture.com"],
      fetcher(1000001, "text/html"),
    ),
    /büyük/,
  );
  await assert.rejects(
    publicHTML(
      "https://fixture.com/",
      ["fixture.com"],
      fetcher(10, "application/octet-stream"),
    ),
    /okunamadı/,
  );
  const robots =
    "User-agent: SosyalStudio\nUser-agent: AnotherBot\nDisallow: /private/*\nAllow: /private/open$\nUser-agent: *\nDisallow: /";
  assert.equal(robotsDisallows(robots, "/private/a"), true);
  assert.equal(robotsDisallows(robots, "/private/open"), false);
  assert.equal(robotsDisallows(robots, "/private/open/extra"), true);
  assert.equal(robotsDisallows(robots, "/public"), false);
});
test("KKTC takvimi yaz/kış saatini uygular; belirsiz saat ve başka hesabın gönderisi reddedilir", () => {
  assert.equal(
    zonedTime("2026-07-01T12:00", "Asia/Famagusta"),
    "2026-07-01T09:00:00.000Z",
  );
  assert.equal(
    zonedTime("2026-12-01T12:00", "Asia/Famagusta"),
    "2026-12-01T10:00:00.000Z",
  );
  assert.throws(
    () => zonedTime("2026-10-25T03:30", "Asia/Famagusta"),
    /belirsiz/,
  );
  assert.equal(
    publicationURL(
      "https://www.facebook.com/fixture/posts/123?tracking=secret",
      "facebook",
    ),
    "https://www.facebook.com/fixture/posts/123",
  );
  assert.equal(
    publicationBelongsTo(
      "https://www.facebook.com/fixture/posts/123",
      "https://facebook.com/fixture/",
    ),
    true,
  );
  assert.equal(
    publicationBelongsTo(
      "https://www.facebook.com/other/posts/123",
      "https://facebook.com/fixture/",
    ),
    false,
  );
});

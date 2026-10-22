import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { createApp } from "../server/app.mjs";
import { campaignUrl, latestMeasurements } from "../shared/editorial.mjs";
import { createZip, readZip } from "../shared/zip.mjs";
let directory, server, base, store, first, second;
async function call(path, { method = "GET", data } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: data ? { "content-type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
  };
}
const input = (companyId) => ({
  companyId,
  name: "Ortak taslak",
  text: "İlk metin",
  selected: ["facebook"],
  posts: [
    {
      platform: "facebook",
      caption: "İlk metin",
      title: "",
      alt: "",
      hashtags: [],
    },
  ],
  mediaId: null,
});
before(async () => {
  directory = await mkdtemp(join(tmpdir(), "studio-editorial-"));
  const app = createApp({
    dataDir: directory,
    distDir: join(directory, "no-dist"),
  });
  store = app.store;
  server = await new Promise((resolve) => {
    const s = app.app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${server.address().port}`;
  first = (
    await call("/api/companies", { method: "POST", data: { name: "Birinci" } })
  ).data;
  second = (
    await call("/api/companies", { method: "POST", data: { name: "İkinci" } })
  ).data;
});
after(async () => {
  await new Promise((r) => server.close(r));
  store.close();
  await rm(directory, { recursive: true, force: true });
});
test("Eski sürüm ve sürümsüz kayıt reddedilir; eşzamanlı kayıtların yalnız biri kazanır", async () => {
  const created = await call("/api/drafts", {
    method: "POST",
    data: input(first.id),
  });
  assert.equal(created.status, 201);
  const d = created.data;
  const [a, b] = await Promise.all([
    call(`/api/drafts/${d.id}`, {
      method: "PUT",
      data: { ...d, text: "A düzeltmesi" },
    }),
    call(`/api/drafts/${d.id}`, {
      method: "PUT",
      data: { ...d, text: "B düzeltmesi" },
    }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409]);
  const stale = await call(`/api/drafts/${d.id}`, {
    method: "PUT",
    data: { ...d, text: "Eski düzenleme" },
  });
  assert.equal(stale.status, 409);
  const noVersion = await call(`/api/drafts/${d.id}`, {
    method: "PUT",
    data: input(first.id),
  });
  assert.equal(noVersion.status, 409);
  const history = await call(`/api/content/drafts/${d.id}/history`);
  assert.equal(history.status, 200);
  assert.equal(history.data[0].text, "İlk metin");
  assert.equal(history.data[0].revision, 1);
});
test("Çöp kutusu geri alınır; filtre ve sayfalama doğru şirketi kullanır", async () => {
  const d = (
    await call("/api/drafts", {
      method: "POST",
      data: { ...input(first.id), name: "Aranabilir deneme" },
    })
  ).data;
  assert.equal(
    (await call(`/api/drafts/${d.id}`, { method: "DELETE" })).status,
    204,
  );
  assert.equal((await call(`/api/drafts/${d.id}`)).status, 404);
  const trash = await call(
    `/api/content/drafts?companyId=${first.id}&mode=trash`,
  );
  assert.ok(trash.data.items.some((v) => v.id === d.id));
  assert.equal(
    (
      await call(`/api/content/drafts/${d.id}/restore`, {
        method: "POST",
        data: {},
      })
    ).status,
    200,
  );
  const found = await call(
    `/api/content/drafts?companyId=${first.id}&q=Aranabilir&platform=facebook&limit=1`,
  );
  assert.equal(found.data.total, 1);
  assert.equal(found.data.items[0].id, d.id);
  assert.equal(
    (await call(`/api/content/drafts?companyId=${second.id}&q=Aranabilir`)).data
      .total,
    0,
  );
});
test("Medya taslak ve çöp kutusunda korunur; boş görsel silinir; yabancı slayt reddedilir", async () => {
  const bytes = await sharp({
    create: { width: 80, height: 60, channels: 3, background: "#326f61" },
  })
    .jpeg()
    .toBuffer();
  const uploaded = await fetch(`${base}/api/media?companyId=${first.id}`, {
    method: "POST",
    headers: { "content-type": "image/jpeg" },
    body: bytes,
  });
  const m = await uploaded.json();
  const invalid = await call("/api/drafts", {
    method: "POST",
    data: { ...input(second.id), gallery: [{ mediaId: m.id, alt: "" }] },
  });
  assert.equal(invalid.status, 400);
  const d = (
    await call("/api/drafts", {
      method: "POST",
      data: { ...input(first.id), gallery: [{ mediaId: m.id, alt: "Ürün" }] },
    })
  ).data;
  assert.equal(
    (await call(`/api/content/media/${m.id}`, { method: "DELETE" })).status,
    409,
  );
  await call(`/api/drafts/${d.id}`, { method: "DELETE" });
  assert.equal(
    (await call(`/api/content/media/${m.id}`, { method: "DELETE" })).status,
    409,
  );
  await call(`/api/content/drafts/${d.id}/permanent`, { method: "DELETE" });
  assert.equal(
    (await call(`/api/content/media/${m.id}`, { method: "DELETE" })).status,
    204,
  );
  assert.equal((await call(`/api/media/${m.id}`)).status, 404);
});
test("Kampanya/ürün şirket ayrımı, kayıt çakışması ve nullable ölçümler korunur", async () => {
  const c = (
    await call("/api/content/records", {
      method: "POST",
      data: {
        companyId: first.id,
        kind: "campaign",
        data: { name: "Kampanya", platforms: ["facebook"] },
      },
    })
  ).data;
  assert.equal(
    (
      await call("/api/drafts", {
        method: "POST",
        data: { ...input(second.id), campaignId: c.id },
      })
    ).status,
    400,
  );
  const update = await call(`/api/content/records/${c.id}`, {
    method: "PUT",
    data: {
      companyId: first.id,
      kind: "campaign",
      revision: c.revision,
      data: { ...c, name: "Yeni kampanya" },
    },
  });
  assert.equal(update.status, 200);
  const linked = (
    await call("/api/drafts", {
      method: "POST",
      data: { ...input(first.id), campaignId: c.id },
    })
  ).data;
  const filtered = (
    await call(
      `/api/content/drafts?companyId=${first.id}&campaignId=${c.id}&state=draft&from=${new Date().toISOString().slice(0, 10)}`,
    )
  ).data;
  assert.ok(filtered.items.some((d) => d.id === linked.id));
  assert.equal(
    (
      await call(
        `/api/content/drafts?companyId=${first.id}&campaignId=${c.id}&state=approved`,
      )
    ).data.total,
    0,
  );
  assert.equal(
    (await call(`/api/content/drafts?companyId=${first.id}&from=not-date`))
      .status,
    400,
  );
  assert.equal(
    (
      await call(`/api/content/records/${c.id}`, {
        method: "PUT",
        data: {
          companyId: first.id,
          kind: "campaign",
          revision: c.revision,
          data: c,
        },
      })
    ).status,
    409,
  );
  const measurement = await call("/api/content/records", {
    method: "POST",
    data: {
      companyId: first.id,
      kind: "metric",
      data: {
        platform: "facebook",
        sourceUrl: "https://example.com/post/1",
        measuredAt: new Date().toISOString(),
        values: { clicks: 0, messages: null },
      },
    },
  });
  assert.equal(measurement.status, 201);
  assert.equal(measurement.data.values.clicks, 0);
  assert.equal(measurement.data.values.messages, null);
  assert.equal(measurement.data.values.reach, null);
});
test("UTM platform/varyantı ayırır; aynı gönderinin anlık görüntüleri toplanmaz", () => {
  const u = new URL(
    campaignUrl({
      url: "https://example.com/urun?x=1",
      platform: "pinterest",
      campaign: "Calisma",
      variant: "kapak-b",
    }),
  );
  assert.equal(u.searchParams.get("utm_source"), "pinterest");
  assert.equal(u.searchParams.get("utm_content"), "kapak-b");
  assert.equal(u.searchParams.get("x"), "1");
  const rows = [
    {
      platform: "facebook",
      sourceUrl: "https://example.com/p",
      windowHours: 72,
      measuredAt: "2026-10-20T12:00:00Z",
      values: { clicks: 4 },
    },
    {
      platform: "facebook",
      sourceUrl: "https://example.com/p",
      windowHours: 72,
      measuredAt: "2026-10-21T12:00:00Z",
      values: { clicks: 8 },
    },
  ];
  assert.equal(latestMeasurements(rows).length, 1);
  assert.equal(latestMeasurements(rows)[0].values.clicks, 8);
});
test("Parçalı yedek yeni şirket kurar, ürün onayını ve kaynak referanslarını geri taşımaz", async () => {
  const product = await call("/api/content/records", {
    method: "POST",
    data: {
      companyId: second.id,
      kind: "product",
      data: {
        name: "Ürün",
        sourceUrl: "https://example.com/urun",
        evidence: "Gerçek ölçü",
        validUntil: new Date(Date.now() + 86400000).toISOString(),
        state: "approved",
      },
    },
  });
  assert.equal(product.status, 201);
  const d = await call("/api/drafts", {
    method: "POST",
    data: { ...input(second.id), productId: product.data.id },
  });
  assert.equal(d.status, 201);
  const updated = await call(`/api/drafts/${d.data.id}`, {
    method: "PUT",
    data: { ...d.data, text: "Güncellenmiş ürün metni" },
  });
  assert.equal(updated.status, 200);
  const index = (await call(`/api/content/backup/index?companyId=${second.id}`))
    .data;
  const job = await call("/api/content/restore/start", {
    method: "POST",
    data: index,
  });
  assert.equal(job.status, 201);
  assert.notEqual(job.data.companyId, second.id);
  for (const resource of index.resources.sort((a, b) =>
    a.group === "record" ? -1 : b.group === "record" ? 1 : 0,
  )) {
    const packet = (
      await call(
        `/api/content/backup/part?companyId=${second.id}&group=${resource.group}&id=${resource.id}`,
      )
    ).data;
    const imported = await call(`/api/content/restore/${job.data.id}/part`, {
      method: "POST",
      data: packet,
    });
    assert.equal(imported.status, 200, JSON.stringify(imported));
  }
  assert.equal(
    (
      await call(`/api/content/restore/${job.data.id}/finish`, {
        method: "POST",
        data: {},
      })
    ).status,
    200,
  );
  const products = (
    await call(
      `/api/content/records?companyId=${job.data.companyId}&kind=product`,
    )
  ).data;
  assert.equal(products[0].state, "pending");
  const restored = (await call(`/api/drafts?companyId=${job.data.companyId}`))
    .data;
  assert.equal(restored[0].review.state, "draft");
  assert.equal(restored[0].productId, products[0].id);
  assert.equal((await call(`/api/drafts/${d.data.id}`)).status, 200);
});
test("ZIP bütünlüğü, dosya yolu ve boyut sınırları doğrulanır", () => {
  const zip = createZip([{ name: "metin/icerik.txt", bytes: "Türkçe deneme" }]);
  assert.equal(
    new TextDecoder().decode(readZip(zip)[0].bytes),
    "Türkçe deneme",
  );
  assert.throws(
    () => createZip([{ name: "../disari.txt", bytes: "x" }]),
    /yolu/,
  );
  const broken = zip.slice();
  broken[50] ^= 1;
  assert.throws(() => readZip(broken));
  assert.throws(() => readZip(new Uint8Array(25 * 1024 * 1024)), /24 MB/);
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { createApp } from "../server/app.mjs";
import { platformIds, postWarnings } from "../server/platforms.mjs";

let instance, server, base, dataDir, first, second, image, draft;
const sample = {
  name: "Deneme Atölyesi",
  handle: "@deneme",
  website: "https://example.com",
  tone: "Sade ve samimi",
  audience: "Tasarım meraklıları",
  keywords: "tasarım, el yapımı",
  color: "#326f61",
};
async function request(url, { method = "GET", body, headers = {} } = {}) {
  const response = await fetch(`${base}${url}`, {
    method,
    headers: {
      ...(body && !Buffer.isBuffer(body)
        ? { "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    body: body
      ? Buffer.isBuffer(body)
        ? body
        : JSON.stringify(body)
      : undefined,
  });
  return {
    response,
    data: response.status === 204 ? null : await response.json(),
  };
}
async function start() {
  instance = createApp({ dataDir, distDir: path.join(dataDir, "no-dist") });
  server = instance.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  base = `http://127.0.0.1:${server.address().port}`;
}
async function stop() {
  await new Promise((resolve) => server.close(resolve));
  instance.store.close();
}
before(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), "sosyal-api-"));
  await start();
});
after(async () => {
  await stop();
  await rm(dataDir, { recursive: true, force: true });
});

test("Sağlık kontrolü çalışan SQLite bağlantısını ve manuel modu doğrular", async () => {
  const { response, data } = await request("/api/health");
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.publishing, false);
  assert.equal(data.ai, "manual-chatgpt");
});
test("Şirket profilleri ayrı kimliklerle oluşturulur; hatalı web adresi reddedilir", async () => {
  first = (await request("/api/companies", { method: "POST", body: sample }))
    .data;
  second = (
    await request("/api/companies", {
      method: "POST",
      body: { ...sample, name: "Başka Şirket", keywords: "başkaetiket" },
    })
  ).data;
  assert.ok(first.id);
  assert.notEqual(first.id, second.id);
  assert.equal(
    (
      await request("/api/companies", {
        method: "POST",
        body: { ...sample, website: "javascript:alert(1)" },
      })
    ).response.status,
    400,
  );
});
test("Sekiz platform hazırlanır; kaynak metin kesilmez ve şirket etiketleri kullanılır", async () => {
  const original = "Yeni koleksiyonumuz yayında. ".repeat(30);
  const { response, data } = await request("/api/prepare", {
    method: "POST",
    body: { companyId: first.id, text: original, selected: platformIds },
  });
  assert.equal(response.status, 200);
  assert.equal(data.posts.length, 8);
  assert.ok(data.posts.every((p) => p.caption === original.trim()));
  assert.deepEqual(
    data.posts.find((p) => p.platform === "instagram").hashtags,
    ["#tasarım", "#elyapımı"],
  );
  assert.ok(
    postWarnings(
      data.posts.find((p) => p.platform === "x"),
      false,
    ).some((message) => message.includes("aşıyor")),
  );
});
test("ChatGPT talimatı yalnızca seçili şirketi ve platformları içerir", async () => {
  const { data } = await request("/api/prompt", {
    method: "POST",
    body: {
      companyId: first.id,
      text: "Yeni koleksiyon",
      selected: ["linkedin"],
    },
  });
  assert.ok(data.prompt.includes(first.name));
  assert.ok(
    data.prompt.includes("yalnızca") || data.prompt.includes("Yalnızca"),
  );
  assert.ok(!data.prompt.includes(second.name));
  assert.ok(data.prompt.includes("kanıtlanabilir"));
  assert.ok(data.prompt.includes('"id": "linkedin"'));
});
test("ChatGPT JSON içe aktarımı eksik, yinelenen, fazla ve hatalı sonuçları reddeder", async () => {
  const post = {
    platform: "instagram",
    caption: "Yeni koleksiyon hazır.",
    hashtags: ["#tasarım"],
    title: "",
    alt: "",
  };
  const send = (posts, selected = ["instagram", "linkedin"]) =>
    request("/api/import", {
      method: "POST",
      body: {
        companyId: first.id,
        selected,
        result: JSON.stringify({ posts }),
      },
    });
  assert.equal((await send([post])).response.status, 400);
  assert.equal((await send([post, post])).response.status, 400);
  assert.equal(
    (await send([post, { ...post, platform: "x" }])).response.status,
    400,
  );
  assert.equal(
    (await send([{ ...post, hashtags: ["hatalı etiket"] }], ["instagram"]))
      .response.status,
    400,
  );
  const { response, data } = await request("/api/import", {
    method: "POST",
    body: {
      companyId: first.id,
      selected: ["instagram"],
      result: "```json\n" + JSON.stringify({ posts: [post] }) + "\n```",
    },
  });
  assert.equal(response.status, 200);
  assert.equal(data.posts[0].caption, post.caption);
});
test("Gerçek görsel yüklenir; her platform tam hedef boyutunda JPEG üretir", async () => {
  const input = await sharp({
    create: { width: 640, height: 480, channels: 3, background: "#ff0000" },
  })
    .png()
    .toBuffer();
  const result = await request(`/api/media?companyId=${first.id}`, {
    method: "POST",
    body: input,
    headers: { "Content-Type": "image/png" },
  });
  assert.equal(result.response.status, 201);
  image = result.data;
  const { data: configs } = await request("/api/platforms");
  for (const platform of configs) {
    const response = await fetch(
      `${base}/api/media/${image.id}/${platform.id}.jpg?fit=contain`,
    );
    assert.equal(response.status, 200);
    const metadata = await sharp(
      Buffer.from(await response.arrayBuffer()),
    ).metadata();
    assert.deepEqual(
      [metadata.format, metadata.width, metadata.height],
      ["jpeg", platform.width, platform.height],
    );
  }
});
test("SVG, bozuk görsel ve fazla büyük yük reddedilir", async () => {
  assert.equal(
    (
      await request(`/api/media?companyId=${first.id}`, {
        method: "POST",
        body: Buffer.from("<svg/>"),
        headers: { "Content-Type": "image/svg+xml" },
      })
    ).response.status,
    415,
  );
  assert.equal(
    (
      await request(`/api/media?companyId=${first.id}`, {
        method: "POST",
        body: Buffer.from("broken"),
        headers: { "Content-Type": "image/png" },
      })
    ).response.status,
    400,
  );
  assert.equal(
    (
      await request(`/api/media?companyId=${first.id}`, {
        method: "POST",
        body: Buffer.alloc(15 * 1024 * 1024 + 1),
        headers: { "Content-Type": "image/png" },
      })
    ).response.status,
    413,
  );
});
test("Başka şirketin görseli ve taslağı hedef şirkete bağlanamaz", async () => {
  assert.equal(
    (
      await request("/api/prepare", {
        method: "POST",
        body: {
          companyId: second.id,
          text: "Başka içerik",
          selected: ["facebook"],
          mediaId: image.id,
        },
      })
    ).response.status,
    400,
  );
  const result = await request("/api/drafts", {
    method: "POST",
    body: {
      companyId: first.id,
      name: "Koleksiyon taslağı",
      text: "Yeni koleksiyon",
      selected: ["instagram"],
      posts: [
        {
          platform: "instagram",
          caption: "Yeni koleksiyon hazır.",
          title: "",
          hashtags: ["#tasarım"],
          alt: "Kırmızı örnek görsel",
        },
      ],
      mediaId: image.id,
    },
  });
  assert.equal(result.response.status, 201);
  draft = result.data;
  assert.equal(
    (await request(`/api/drafts?companyId=${second.id}`)).data.length,
    0,
  );
  assert.equal(
    (
      await request(`/api/drafts/${draft.id}`, {
        method: "PUT",
        body: { ...draft, companyId: second.id, mediaId: null },
      })
    ).response.status,
    400,
  );
});
test("Taslak dışa aktarımı yayınlanmış gibi göstermez ve indirilebilir görselleri belirtir", async () => {
  const { response, data } = await request(`/api/drafts/${draft.id}/export`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-disposition"), /attachment/);
  assert.equal(data.published, false);
  assert.equal(data.company.id, first.id);
  assert.match(data.posts[0].mediaDownloadPath, /instagram.jpg/);
});
test("Taslak ve görseller sunucu yeniden başlatıldığında kalır", async () => {
  await stop();
  await start();
  assert.equal(
    (await request(`/api/drafts/${draft.id}`)).data.posts[0].caption,
    draft.posts[0].caption,
  );
  assert.equal((await request("/api/companies")).data.length, 2);
  assert.equal(
    (await fetch(`${base}/api/media/${image.id}/original.jpg`)).status,
    200,
  );
});
test("Yabancı kaynak ve Host başlıkları yerel verilere erişemez", async () => {
  assert.equal(
    (
      await request("/api/companies", {
        method: "POST",
        body: sample,
        headers: { Origin: "https://evil.example" },
      })
    ).response.status,
    403,
  );
  // Node's fetch normalizes Host. Use an HTTP request to actually send a forged host.
  const status = await new Promise((resolve, reject) => {
    const req = http.get(
      `${base}/api/companies`,
      { headers: { Host: "evil.example" } },
      (res) => {
        res.resume();
        resolve(res.statusCode);
      },
    );
    req.on("error", reject);
  });
  assert.equal(status, 403);
});
test("Şirket silme yalnızca ilgili şirketin taslak ve görsellerini kaldırır", async () => {
  assert.equal(
    (await request(`/api/companies/${first.id}`, { method: "DELETE" })).response
      .status,
    204,
  );
  assert.equal((await request(`/api/drafts/${draft.id}`)).response.status, 404);
  assert.equal((await request(`/api/media/${image.id}`)).response.status, 404);
  assert.equal((await request("/api/companies")).data[0].id, second.id);
});

import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { createCloudStore } from "../../worker/store.mjs";
import { tokenDigest } from "../../shared/passwords.mjs";
let mf, db, first, second;
const base = "https://editorial.test",
  tokens = { admin: "A".repeat(43), editor: "E".repeat(43) };
async function call(path, { method = "GET", data, role = "admin" } = {}) {
  const response = await mf.dispatchFetch(base + path, {
    method,
    headers: {
      origin: base,
      cookie: `__Host-studio_session=${tokens[role]}`,
      "content-type": "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  return {
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
  };
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    scriptPath: ".worker-build/index.js",
    compatibilityDate: "2026-07-01",
    compatibilityFlags: ["nodejs_compat"],
    d1Databases: { DB: "editorial" },
    r2Buckets: { MEDIA: "editorial-images" },
    bindings: {
      APP_ENV: "production",
      AUTH_MODE: "password",
      MEDIA_STORAGE: "r2",
    },
    serviceBindings: { ASSETS: () => new Response("Studio") },
  });
  db = await mf.getD1Database("DB");
  for (const name of (await readdir("migrations"))
    .filter((f) => f.endsWith(".sql") && !f.startsWith("0009"))
    .sort())
    for (const sql of (await readFile(`migrations/${name}`, "utf8"))
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  for (const role of ["admin", "editor"]) {
    await db
      .prepare(
        "INSERT INTO users(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,?,?)",
      )
      .bind(
        role,
        role,
        `${role}@example.test`,
        role,
        "fixture-not-a-password",
        role,
        new Date().toISOString(),
      )
      .run();
    await db
      .prepare(
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
      )
      .bind(
        await tokenDigest(tokens[role]),
        role,
        Math.floor(Date.now() / 1000) + 3600,
      )
      .run();
  }
  first = (
    await call("/api/companies", {
      method: "POST",
      data: { name: "Yetkili şirket" },
    })
  ).data;
  second = (
    await call("/api/companies", {
      method: "POST",
      data: { name: "Diğer şirket" },
    })
  ).data;
  await db
    .prepare("INSERT INTO company_access VALUES(?,?)")
    .bind(first.id, "editor")
    .run();
});
after(async () => {
  await mf?.dispose();
});
test("Yönetici düzeltmesi sınırlı marka örneği olur; onay kaldırılınca hafızadan çıkar", async () => {
  const result = await call("/api/content/records", {
    method: "POST",
    data: {
      companyId: first.id,
      kind: "correction",
      data: {
        platform: "facebook",
        before: "Önceki kurgu",
        after: "Onaylı kurgu",
        reason: "Marka dili",
        state: "approved",
      },
    },
  });
  assert.equal(result.status, 201);
  const example = await db
    .prepare("SELECT body FROM ai_memory WHERE id=?")
    .bind(result.data.id)
    .first();
  assert.ok(example.body.includes("Onaylı kurgu"));
  const updated = await call(`/api/content/records/${result.data.id}`, {
    method: "PUT",
    data: {
      companyId: first.id,
      kind: "correction",
      revision: result.data.revision,
      data: { ...result.data, state: "rejected" },
    },
  });
  assert.equal(updated.status, 200);
  assert.equal(
    await db
      .prepare("SELECT id FROM ai_memory WHERE id=?")
      .bind(result.data.id)
      .first(),
    null,
  );
});
test("Etkin AI görsel kirası temizlemeyi durdurur; kira kalkınca kullanılmayan görsel silinir", async () => {
  const media = await createCloudStore(db).saveMedia({
    companyId: first.id,
    width: 50,
    height: 50,
    storage: "r2",
  });
  await db
    .prepare("INSERT INTO media_usage_leases VALUES(?,?,?)")
    .bind("lease-fixture", media.id, new Date(Date.now() + 60000).toISOString())
    .run();
  assert.equal(
    (await call(`/api/content/media/${media.id}`, { method: "DELETE" })).status,
    409,
  );
  await db
    .prepare("DELETE FROM media_usage_leases WHERE id=?")
    .bind("lease-fixture")
    .run();
  assert.equal(
    (await call(`/api/content/media/${media.id}`, { method: "DELETE" })).status,
    204,
  );
});
test("Editoryal liste, tekil kayıt ve yedek uçları şirket ve rol sınırını korur", async () => {
  const campaign = (
    await call("/api/content/records", {
      method: "POST",
      data: {
        companyId: second.id,
        kind: "campaign",
        data: { name: "Gizli kampanya" },
      },
    })
  ).data;
  assert.equal(
    (
      await call(`/api/content/records?companyId=${second.id}&kind=campaign`, {
        role: "editor",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(`/api/content/records/${campaign.id}`, {
        method: "DELETE",
        role: "editor",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call(`/api/content/backup/index?companyId=${first.id}`, {
        role: "editor",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(`/api/content/archives?companyId=${first.id}`, {
        role: "editor",
      })
    ).status,
    403,
  );
  const list = await call(
    `/api/content/records?companyId=${first.id}&kind=campaign`,
    { role: "editor" },
  );
  assert.equal(list.status, 200);
});
test("Editör ürün ve düzeltmeyi onaylayamaz; yönetici onayı kanıt ve süre ister", async () => {
  const product = {
    name: "Ürün",
    state: "approved",
    sourceUrl: "https://example.com/urun",
    evidence: "Kaynakta yazan ölçü",
    validUntil: new Date(Date.now() + 86400000).toISOString(),
  };
  assert.equal(
    (
      await call("/api/content/records", {
        method: "POST",
        role: "editor",
        data: { companyId: first.id, kind: "product", data: product },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("/api/content/records", {
        method: "POST",
        data: {
          companyId: first.id,
          kind: "product",
          data: { ...product, evidence: "" },
        },
      })
    ).status,
    400,
  );
  const result = await call("/api/content/records", {
    method: "POST",
    data: { companyId: first.id, kind: "product", data: product },
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.approvedBy, "admin");
  assert.equal(
    (
      await call(`/api/content/records/${result.data.id}`, {
        method: "PUT",
        role: "editor",
        data: {
          companyId: first.id,
          kind: "product",
          revision: result.data.revision,
          data: { ...product, state: "pending" },
        },
      })
    ).status,
    403,
  );
});
test("D1 aynı taslağın iki sürümünü atomik ayırır; geçmiş ve çöp kutusu şirket kapsamındadır", async () => {
  const d = (
    await call("/api/drafts", {
      method: "POST",
      data: {
        companyId: first.id,
        name: "Ortak",
        text: "Eski",
        selected: ["facebook"],
        posts: [],
      },
    })
  ).data;
  const results = await Promise.all([
    call(`/api/drafts/${d.id}`, { method: "PUT", data: { ...d, text: "A" } }),
    call(`/api/drafts/${d.id}`, { method: "PUT", data: { ...d, text: "B" } }),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 409]);
  assert.equal(
    (await call(`/api/content/drafts/${d.id}/history`, { role: "editor" })).data
      .length,
    1,
  );
  await call(`/api/drafts/${d.id}`, { method: "DELETE" });
  assert.equal((await call(`/api/drafts/${d.id}`)).status, 404);
  assert.equal(
    (
      await call(`/api/content/drafts/${d.id}/restore`, {
        method: "POST",
        role: "editor",
        data: {},
      })
    ).status,
    200,
  );
  const other = (
    await call("/api/drafts", {
      method: "POST",
      data: {
        companyId: second.id,
        name: "Gizli",
        text: "",
        selected: ["facebook"],
        posts: [],
      },
    })
  ).data;
  assert.equal(
    (await call(`/api/content/drafts/${other.id}/history`, { role: "editor" }))
      .status,
    404,
  );
});
test("Yabancı kampanya ve gelecekteki ölçüm kaydı reddedilir", async () => {
  const campaign = (
    await call("/api/content/records", {
      method: "POST",
      data: {
        companyId: second.id,
        kind: "campaign",
        data: { name: "Diğer kampanya" },
      },
    })
  ).data;
  const metric = {
    platform: "facebook",
    sourceUrl: "https://example.com/post",
    measuredAt: new Date().toISOString(),
    values: { clicks: 0 },
  };
  assert.equal(
    (
      await call("/api/content/records", {
        method: "POST",
        role: "editor",
        data: {
          companyId: first.id,
          kind: "metric",
          data: { ...metric, campaignId: campaign.id },
        },
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await call("/api/content/records", {
        method: "POST",
        data: {
          companyId: first.id,
          kind: "metric",
          data: {
            ...metric,
            measuredAt: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/api/content/records", {
        method: "POST",
        role: "editor",
        data: { companyId: first.id, kind: "metric", data: metric },
      })
    ).status,
    201,
  );
});
test("Kaynak kontrolü uydurma referansı geçerli saymaz; geri yükleme kaynak onayı üretmez", async () => {
  const refs = [
    {
      factId: crypto.randomUUID(),
      sourceId: crypto.randomUUID(),
      field: "Fiyat",
      value: "100 TL",
      url: "https://example.com/fiyat",
      validUntil: new Date(Date.now() + 86400000).toISOString(),
    },
  ];
  const checked = await call("/api/content/evidence/check", {
    method: "POST",
    role: "editor",
    data: { companyId: first.id, refs },
  });
  assert.equal(checked.status, 200);
  assert.equal(checked.data[0].valid, false);
  const index = (await call(`/api/content/backup/index?companyId=${first.id}`))
    .data;
  assert.ok(!JSON.stringify(index).includes(tokens.admin));
  const job = (
    await call("/api/content/restore/start", { method: "POST", data: index })
  ).data;
  assert.equal(
    (
      await call(`/api/content/restore/${job.id}/finish`, {
        method: "POST",
        data: {},
      })
    ).status,
    409,
  );
  assert.equal(
    (await call(`/api/content/restore/${job.id}`, { role: "editor" })).status,
    403,
  );
});

test("Reklam notu onay ve süre ister; süresi dolan örnek AI hafızasına verilmez", async () => {
  const data = {
    domain: "advertising",
    platform: "facebook",
    before: "Kurgu Meta denemesi",
    after:
      "Bu ölçüm döneminde daha az nitelikli talep vardı; açılışı tek değişkenli dene.",
    reason: "Kurgu rapor, üç günlük pencere",
    state: "approved",
  };
  assert.equal(
    (
      await call("/api/content/records", {
        method: "POST",
        data: { companyId: first.id, kind: "correction", data },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call("/api/content/records", {
        method: "POST",
        role: "editor",
        data: {
          companyId: first.id,
          kind: "correction",
          data: {
            ...data,
            validUntil: new Date(Date.now() + 86400000).toISOString(),
          },
        },
      })
    ).status,
    403,
  );
  const created = await call("/api/content/records", {
    method: "POST",
    data: {
      companyId: first.id,
      kind: "correction",
      data: {
        ...data,
        validUntil: new Date(Date.now() + 86400000).toISOString(),
      },
    },
  });
  assert.equal(created.status, 201);
  let workspace = await call("/api/ai/workspace?companyId=" + first.id);
  assert.ok(workspace.data.memory.some((m) => m.id === created.data.id));
  await db
    .prepare(
      "UPDATE editorial_records SET data=json_set(data,'$.validUntil','2020-01-01T00:00:00.000Z') WHERE id=?",
    )
    .bind(created.data.id)
    .run();
  workspace = await call("/api/ai/workspace?companyId=" + first.id);
  assert.equal(
    workspace.data.memory.some((m) => m.id === created.data.id),
    false,
  );
});

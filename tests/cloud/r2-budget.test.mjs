import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Miniflare } from "miniflare";
import { createR2Media, R2_LIMITS, r2Usage } from "../../worker/r2-media.mjs";

let mf, db, clock, files, calls, storage;
const bytes = new Uint8Array([1, 2]);
async function budget({
  storageBytes = 0,
  classA = 0,
  classB = 0,
  period = "2026-10",
} = {}) {
  await db
    .prepare(
      "UPDATE r2_budget SET stored_bytes=?,class_a=?,class_b=?,period=? WHERE singleton=1",
    )
    .bind(storageBytes, classA, classB, period)
    .run();
}
before(async () => {
  mf = new Miniflare({
    modules: true,
    script: "export default {fetch(){return new Response('ok')}}",
    d1Databases: { DB: "r2-budget" },
  });
  db = await mf.getD1Database("DB");
  for (const name of [
    "0001_studio.sql",
    "0002_d1_media.sql",
    "0003_r2_budget.sql",
  ])
    for (const sql of (await readFile(`migrations/${name}`, "utf8"))
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
});
after(async () => {
  await mf?.dispose();
});
beforeEach(async () => {
  await db.prepare("DELETE FROM r2_objects").run();
  await budget();
  clock = new Date("2026-10-31T23:59:59Z");
  files = new Map();
  calls = { put: 0, get: 0, delete: 0 };
  storage = createR2Media(
    db,
    {
      async put(key, body, options) {
        calls.put++;
        assert.equal(options.storageClass, "Standard");
        files.set(key, body);
      },
      async get(key) {
        calls.get++;
        return files.get(key) ?? null;
      },
      async delete(keys) {
        calls.delete++;
        for (const key of keys) files.delete(key);
      },
      async list() {
        throw new Error("R2 listelemesi yapılmamalı");
      },
    },
    () => clock,
  );
});

test("10 GB üst sınırında eşzamanlı yüklemeler kapasiteyi aşamaz", async () => {
  await budget({ storageBytes: R2_LIMITS.storageBytes - 2 });
  const results = await Promise.allSettled([
    storage.reserveUpload([{ key: "companies/a/a.jpg", bytes }]),
    storage.reserveUpload([{ key: "companies/a/b.jpg", bytes }]),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const denied = results.find((r) => r.status === "rejected");
  assert.equal(denied.reason.status, 429);
  assert.match(denied.reason.message, /10 GB/);
  assert.equal((await r2Usage(db, clock)).storageBytes, R2_LIMITS.storageBytes);
  assert.equal(
    (await db.prepare("SELECT COUNT(*) AS total FROM r2_objects").first())
      .total,
    1,
  );
  assert.equal(calls.put, 0);
});
test("Class A sınırı tam kabul edilir, sonraki yazım R2 çağrısından önce reddedilir", async () => {
  await budget({ classA: R2_LIMITS.classAPerMonth - 1 });
  await storage.reserveUpload([{ key: "companies/a/a.jpg", bytes }]);
  await storage.put("companies/a/a.jpg", bytes, {});
  await assert.rejects(
    storage.reserveUpload([{ key: "companies/a/b.jpg", bytes }]),
    /Class A/,
  );
  assert.equal(calls.put, 1);
  assert.equal((await r2Usage(db, clock)).classA, R2_LIMITS.classAPerMonth);
  await assert.rejects(storage.put("unreserved", bytes, {}), /rezervasyonu/);
});
test("Class B sınırındaki iki eşzamanlı okumadan yalnızca biri R2'ye ulaşır", async () => {
  await budget({ classB: R2_LIMITS.classBPerMonth - 1 });
  const results = await Promise.allSettled([
    storage.get("a"),
    storage.get("b"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.match(
    results.find((r) => r.status === "rejected").reason.message,
    /Class B/,
  );
  assert.equal(calls.get, 1);
  assert.equal((await r2Usage(db, clock)).classB, R2_LIMITS.classBPerMonth);
});
test("UTC ayı yenilenince işlem sayaçları sıfırlanır, depolama sıfırlanmaz", async () => {
  await budget({
    storageBytes: 123,
    classA: R2_LIMITS.classAPerMonth,
    classB: R2_LIMITS.classBPerMonth,
  });
  clock = new Date("2026-11-01T00:00:00Z");
  assert.deepEqual(await r2Usage(db, clock), {
    period: "2026-11",
    storageBytes: 123,
    classA: 0,
    classB: 0,
  });
  await storage.get("a");
  assert.deepEqual(await r2Usage(db, clock), {
    period: "2026-11",
    storageBytes: 123,
    classA: 0,
    classB: 1,
  });
});
test("Kotalar doluyken D1 listesi ve ücretsiz silme çalışır, kapasite bir kez geri verilir", async () => {
  const key = "companies/a/a.jpg";
  await storage.reserveUpload([{ key, bytes }]);
  await storage.put(key, bytes, {});
  await storage.completeUpload([key]);
  await budget({
    storageBytes: 2,
    classA: R2_LIMITS.classAPerMonth,
    classB: R2_LIMITS.classBPerMonth,
  });
  assert.deepEqual((await storage.list({ prefix: "companies/a/" })).objects, [
    { key },
  ]);
  await storage.delete([key]);
  await storage.delete([key]);
  assert.equal(files.size, 0);
  const usage = await r2Usage(db, clock);
  assert.equal(usage.storageBytes, 0);
  assert.equal(usage.classA, R2_LIMITS.classAPerMonth);
  assert.equal(usage.classB, R2_LIMITS.classBPerMonth);
});
test("Başarısız R2 işlemleri sayılır, başarısız silme kapasiteyi serbest bırakmaz", async () => {
  const failed = createR2Media(
    db,
    {
      async put() {
        throw new Error("put failed");
      },
      async get() {
        throw new Error("get failed");
      },
      async delete() {
        throw new Error("delete failed");
      },
    },
    () => clock,
  );
  const key = "companies/a/a.jpg";
  await failed.reserveUpload([{ key, bytes }]);
  await assert.rejects(failed.put(key, bytes, {}), /put failed/);
  await assert.rejects(failed.get(key), /get failed/);
  await assert.rejects(failed.delete([key]), /delete failed/);
  assert.deepEqual(await r2Usage(db, clock), {
    period: "2026-10",
    storageBytes: 2,
    classA: 1,
    classB: 1,
  });
});

test("Devam eden yüklemenin kapasitesi şirket silme listesine erken açılmaz", async () => {
  const key = "companies/a/uploading.jpg";
  await storage.reserveUpload([{ key, bytes }]);
  await storage.put(key, bytes, {});
  assert.equal(
    (await storage.list({ prefix: "companies/a/" })).objects.length,
    0,
  );
  assert.equal((await r2Usage(db, clock)).storageBytes, 2);
  await storage.completeUpload([key]);
  assert.deepEqual((await storage.list({ prefix: "companies/a/" })).objects, [
    { key },
  ]);
});

test("Şema yükseltmesi eski R2 görsellerini temkinli kapasiteyle sayar; D1 görsellerini saymaz", async () => {
  await db
    .prepare(
      "INSERT INTO companies(id,data,created_at) VALUES('legacy','{}','2026-10-01')",
    )
    .run();
  await db
    .prepare(
      "INSERT INTO media(id,company_id,data) VALUES('old-r2','legacy','{}'),('old-d1','legacy','{\"storage\":\"d1\"}')",
    )
    .run();
  await db.prepare("DROP TABLE r2_objects").run();
  await db.prepare("DROP TABLE r2_budget").run();
  for (const sql of (await readFile("migrations/0003_r2_budget.sql", "utf8"))
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean))
    await db.prepare(sql).run();
  assert.equal((await r2Usage(db, clock)).storageBytes, 17 * 4 * 1024 * 1024);
  assert.equal(
    (await storage.list({ prefix: "companies/legacy/old-r2/" })).objects.length,
    17,
  );
  assert.equal(
    (await storage.list({ prefix: "companies/legacy/old-d1/" })).objects.length,
    0,
  );
  assert.ok(
    await db
      .prepare(
        "SELECT object_key FROM r2_objects WHERE object_key='companies/legacy/old-r2/x_cover.jpg'",
      )
      .first(),
  );
});

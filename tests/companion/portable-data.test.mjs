import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, access } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { dataDirectory } from "../../companion/locations.mjs";
import { migratePortableData } from "../../companion/portable-data.mjs";
import { LocalMemory } from "../../companion/local-memory.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "studio-portable-"));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  return root;
}
test("Veri kökü çalışma dizininden bağımsız BAT klasörüdür; yama ve kod kopyası yeni veri kökü açmaz", async (t) => {
  const root = await fixture(t);
  const folder = join(root, "Masaüstü Türkçe", "companion");
  const source = pathToFileURL(join(folder, "locations.mjs")).href;
  assert.equal(dataDirectory(source, {}), folder);
  for (const version of [join(folder, "apps", "a".repeat(64)), join(folder, "updates", "releases", "b".repeat(64))])
    assert.equal(dataDirectory(pathToFileURL(join(version, "companion/locations.mjs")).href, {}), folder);
  const moved = join(root, "Yeni klasör");
  assert.equal(dataDirectory(source, { STUDIO_DATA_DIR: moved }), moved);
  assert.throws(() => dataDirectory(source, { STUDIO_DATA_DIR: "relative" }));
});

test("Eski cihaz, Firefox, model ve SQLite aynı taşınabilir klasöre kopyalanır; asılları ve yeni kurulumun verileri korunur", async (t) => {
  const root = await fixture(t), legacy = join(root, "AppData", "SosyalStudio"), target = join(root, "Masaüstü", "companion");
  await mkdir(join(legacy, "profiles/company-fixture"), { recursive: true });
  await writeFile(join(legacy, "device.json"), "synthetic-device");
  await writeFile(join(legacy, "profiles/company-fixture/cookies.sqlite"), "synthetic-cookies");
  const memory = new LocalMemory(legacy);
  const companyId = crypto.randomUUID();
  memory.context({ companyId, profile: { name: "Kurgu" }, entries: [] });
  await mkdir(join(legacy, "ai/models/blobs"), { recursive: true });
  const blob = join("ai/models/blobs", `sha256-${"a".repeat(64)}`);
  await writeFile(join(legacy, blob), "synthetic-model");
  await migratePortableData(legacy, target);
  assert.equal(await readFile(join(target, "device.json"), "utf8"), "synthetic-device");
  assert.equal(await readFile(join(target, blob), "utf8"), "synthetic-model");
  assert.equal(new LocalMemory(target).current(companyId).profile.name, "Kurgu");
  assert.equal(await readFile(join(legacy, "device.json"), "utf8"), "synthetic-device");
  await writeFile(join(target, "profiles/company-fixture/cookies.sqlite"), "new-cookie");
  assert.equal(await readFile(join(legacy, "profiles/company-fixture/cookies.sqlite"), "utf8"), "synthetic-cookies");
  await rm(join(target, "device.json"));
  await migratePortableData(legacy, target);
  await assert.rejects(access(join(target, "device.json")), "Sıfırlanan cihaz eski yedekten yeniden getirilmez");
  const other = join(root, "başka kurulum");
  await mkdir(other); await writeFile(join(other, "device.json"), "other-device");
  await migratePortableData(legacy, other);
  assert.equal(await readFile(join(other, "device.json"), "utf8"), "other-device");
  await assert.rejects(access(join(other, "profiles")));
});

test("Yarım kalan veri aktarımı yeniden açılışta tamamlanır; klasör taşındığında göreli yollar korunur", async (t) => {
  const root = await fixture(t), legacy = join(root, "legacy"), target = join(root, "desktop");
  await mkdir(join(target, ".legacy-import/profiles"), { recursive: true });
  await writeFile(join(target, ".legacy-import/profiles/fixture"), "profile");
  await writeFile(join(target, "device.json"), "already-committed");
  await writeFile(join(target, ".portable-migration.json"), JSON.stringify({ source: legacy, names: ["device.json", "profiles"], state: "committing" }));
  await migratePortableData(legacy, target);
  assert.equal(await readFile(join(target, "profiles/fixture"), "utf8"), "profile");
  const moved = join(root, "Yeni masaüstü klasörü");
  await rename(target, moved);
  await migratePortableData(legacy, moved);
  assert.equal(await readFile(join(moved, "device.json"), "utf8"), "already-committed");
  assert.equal(dataDirectory(pathToFileURL(join(moved, "locations.mjs")).href, {}), moved);
});

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, access, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fork } from "node:child_process";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { downloadVerified, extractRuntime, importLegacyModel, modelDirectory } from "../../companion/ai-install.mjs";
import { LocalMemory } from "../../companion/local-memory.mjs";
import { installBundle } from "../../companion/install-bundle.mjs";
import { extractRelease } from "../../companion/release.mjs";
import { LocalAI } from "../../companion/local-ai.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "studio-ai-setup-"));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
  return root;
}
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
async function until(fn) {
  for (let i = 0; i < 300; i++) {
    if (await fn()) return;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error("AI süreci beklenen duruma geçmedi.");
}

test("AI arşivi akışla indirilir; yanlış özet ve yabancı yönlendirme yürütülmeden reddedilir", async (t) => {
  const root = await fixture(t), bytes = Buffer.from("synthetic-runtime");
  const options = { url: "https://github.com/ollama/ollama/releases/download/v0.40.6/fixture.zip",
    path: join(root, "runtime.zip"), sha256: sha(bytes), fetcher: async () => new Response(bytes) };
  await downloadVerified(options);
  assert.deepEqual(await readFile(options.path), bytes);
  await assert.rejects(downloadVerified({ ...options, sha256: "a".repeat(64) }), /özeti/);
  let calls = 0;
  await assert.rejects(downloadVerified({ ...options, fetcher: async () => {
    calls++; return new Response(null, { status: 302, headers: { location: "https://outside.invalid/runtime.zip" } });
  } }), /kaynağı/);
  assert.equal(calls, 1);
});

test("Windows gerçek ZIP açılışı boşluk, tırnak ve Türkçe klasör adlarını kod olarak yorumlamaz", { skip: process.platform !== "win32" }, async (t) => {
  const root = await fixture(t);
  const folder = join(root, "Türkçe ' kurulum");
  await mkdir(folder);
  const archive = join(folder, "paket.zip"), destination = join(folder, "açılan dosyalar");
  await writeFile(archive, await readFile("dist/indir/sosyal-studio-bilgisayar.zip"));
  await extractRuntime(archive, destination);
  assert.match(await readFile(join(destination, "SosyalStudio-Bilgisayar/companion/local-ai.mjs"), "utf8"), /class LocalAI/);
});

test("Eski model yalnız doğrulanmış bloblarla aynı klasöre alınır; kaynak ve diğer modeller korunur", async (t) => {
  const root = await fixture(t), legacy = join(root, "eski-model"), data = join(root, "SosyalStudio");
  const bytes = Buffer.from("fixture-model"), digest = sha(bytes);
  const path = join("manifests/registry.ollama.ai/library/qwen3.5/4b");
  await mkdir(join(legacy, "blobs"), { recursive: true });
  await mkdir(join(legacy, path, ".."), { recursive: true });
  await writeFile(join(legacy, "blobs", `sha256-${digest}`), bytes);
  await writeFile(join(legacy, path), JSON.stringify({ config: { digest: `sha256:${digest}`, size: bytes.length }, layers: [] }));
  await importLegacyModel(data, legacy);
  assert.deepEqual(await readFile(join(modelDirectory(data), "blobs", `sha256-${digest}`)), bytes);
  await access(join(legacy, path));
  await writeFile(join(legacy, path), JSON.stringify({ config: { digest: "sha256:../../outside", size: 1 }, layers: [] }));
  const invalid = join(root, "ikinci");
  await importLegacyModel(invalid, legacy);
  await assert.rejects(access(join(modelDirectory(invalid), path)));
});

test("Yerel SQLite yeniden açılışta kaynakları ve taslakları saklar; şirketler, onay ve silinen güncel bağlam ayrılır", async (t) => {
  const root = await fixture(t), companyId = crypto.randomUUID(), other = crypto.randomUUID();
  let memory = new LocalMemory(root);
  memory.initialize();
  const input = { companyId, profile: { name: "Kurgu şirket" }, entries: [{ body: "Eski bilgi" }], question: "Kurgu özet", mode: "chat", image: "not-stored" };
  memory.context(input);
  memory.research(companyId, { ok: true, pages: [{ url: "https://www.mozilla.org/", finalUrl: "https://www.mozilla.org/", title: "Kurgu kaynak", text: "Doğrulanmamış kaynak metni" }] });
  memory.generated(companyId, input, { answer: "Kurgu yanıt", posts: [] });
  memory.context({ ...input, entries: [] });
  memory.context({ ...input, companyId: other, profile: { name: "Diğer şirket" }, entries: [] });
  memory = new LocalMemory(root);
  const rows = memory.use((db) => ({
    context: db.prepare("SELECT data FROM contexts WHERE company_id=?").get(companyId),
    source: db.prepare("SELECT data FROM sources WHERE company_id=?").get(companyId),
    generated: db.prepare("SELECT data FROM generations WHERE company_id=?").get(companyId),
    otherCount: db.prepare("SELECT COUNT(*) AS n FROM sources WHERE company_id=?").get(other).n,
  }));
  assert.deepEqual(JSON.parse(rows.context.data).entries, []);
  assert.equal(JSON.parse(rows.source.data).state, "unreviewed");
  assert.equal(JSON.parse(rows.generated.data).answer, "Kurgu yanıt");
  assert.ok(!rows.generated.data.includes("not-stored"));
  assert.equal(rows.otherCount, 0);
  assert.ok(memory.stats().bytes < 256 * 1024 ** 2);
});

test("Yardımcı kodu aynı ana klasöre kurulur; yeniden kurulum profil, model ve SQLite dosyasına dokunmaz", async (t) => {
  const root = await fixture(t), source = join(root, "zip"), data = join(root, "SosyalStudio");
  const meta = JSON.parse(await readFile("dist/indir/sosyal-studio-bilgisayar.json"));
  for (const [path, bytes] of extractRelease(await readFile("dist/indir/sosyal-studio-bilgisayar.zip"), meta.version)) {
    await mkdir(join(source, path, ".."), { recursive: true }); await writeFile(join(source, path), bytes);
  }
  await mkdir(join(data, "ai/models"), { recursive: true });
  await writeFile(join(data, "ai/models/fixture"), "model korunur");
  new LocalMemory(data).initialize();
  const installed = await installBundle(source, data);
  assert.ok(installed.startsWith(join(data, "apps")));
  assert.equal(await installBundle(source, data), installed);
  assert.equal(await readFile(join(data, "ai/models/fixture"), "utf8"), "model korunur");
  await access(join(data, "ai/knowledge.sqlite"));
});

test("Başka bir süreç ayrılmış AI portunu kullanıyorsa ona bağlanılmaz veya kapanış komutu gönderilmez", async (t) => {
  const root = await fixture(t);
  let unloads = 0;
  const server = createServer((request, response) => {
    if (request.url.endsWith("generate")) unloads++;
    response.setHeader("Content-Type", "application/json"); response.end('{"models":[]}');
  });
  await new Promise((r) => server.listen(11435, "127.0.0.1", r));
  try {
    const ai = new LocalAI({ directory: root });
    await assert.rejects(ai.startServer(), (e) => e.code === "PORT_IN_USE");
    await ai.close();
    assert.equal((await fetch("http://127.0.0.1:11435/api/tags")).status, 200);
    assert.equal(unloads, 0);
  } finally {
    server.closeAllConnections(); await new Promise((r) => server.close(r));
  }
});

for (const crash of [false, true]) {
  test(`Gerçek AI süreç sahibi: ${crash ? "yardımcı zorla kapanınca" : "normal kapanışta"} model boşaltılır ve yalnız kendi sunucusu durur`, { timeout: 30000 }, async (t) => {
    const root = await fixture(t);
    await writeFile(join(root, "serve"), `
      const http=require('node:http'),fs=require('node:fs');
      fs.writeFileSync('runtime-env.json',JSON.stringify({host:process.env.OLLAMA_HOST,models:process.env.OLLAMA_MODELS,noCloud:process.env.OLLAMA_NO_CLOUD,pid:process.pid}));
      const model={name:'qwen3.5:4b',size:3000000000,digest:'a'.repeat(64),details:{parameter_size:'4.66B',quantization_level:'Q4_K_M'}};
      http.createServer((req,res)=>{let body='';req.on('data',x=>body+=x);req.on('end',()=>{
        if(req.url.endsWith('/generate'))fs.appendFileSync('loads.jsonl',body+'\\n');
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify(req.url.endsWith('/tags')?{models:[model]}:req.url.endsWith('/show')?{capabilities:['completion','vision']}:{done:true}));
      });}).listen(11435,'127.0.0.1');
    `);
    const script = join(root, "helper.mjs");
    await writeFile(script, `
      import {LocalAI} from ${JSON.stringify(pathToFileURL(resolve("companion/local-ai.mjs")).href)};
      const ai=new LocalAI({directory:${JSON.stringify(root)},runtimePath:process.execPath});
      ai.setup({automatic:true});await ai.setupTask;
      if(ai.phase!=='ready')throw new Error('AI başlangıcı: '+ai.failure);
      process.send({type:'ready'});
      process.on('message',async m=>{if(m.type==='stop'){await ai.close();process.exit(0)}});
    `);
    const child = fork(script, [], { stdio: ["ignore", "ignore", "pipe", "ipc"] });
    let ready = false, errors = "";
    child.stderr.on("data", (b) => { errors += b; });
    child.on("message", (m) => { if (m.type === "ready") ready = true; });
    t.after(async () => {
      if (child.exitCode === null && child.signalCode === null) child.kill();
      await until(async () => { try { await fetch("http://127.0.0.1:11435/api/tags"); return false; } catch { return true; } });
    });
    await until(() => { if (child.exitCode !== null) throw new Error(errors); return ready; });
    const env = JSON.parse(await readFile(join(root, "runtime-env.json")));
    assert.equal(env.host, "127.0.0.1:11435");
    assert.equal(env.models, modelDirectory(root));
    assert.equal(env.noCloud, "1");
    const exited = new Promise((r) => child.once("exit", r));
    if (crash) child.kill(); else child.send({ type: "stop" });
    await exited;
    await until(async () => (await readFile(join(root, "loads.jsonl"), "utf8")).includes('"keep_alive":0'));
    await until(async () => { try { await fetch("http://127.0.0.1:11435/api/tags"); return false; } catch { return true; } });
    const loads = (await readFile(join(root, "loads.jsonl"), "utf8")).trim().split("\n").map(JSON.parse);
    assert.equal(loads[0].keep_alive, -1);
    assert.equal(loads.at(-1).keep_alive, 0);
    await access(join(root, "ai/knowledge.sqlite"));
  });
}

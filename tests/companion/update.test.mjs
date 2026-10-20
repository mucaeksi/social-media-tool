import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  writeFile,
  mkdir,
  readdir,
  access,
  rm,
  cp,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { EventEmitter } from "node:events";
import { spawn, fork } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Updater, installDependencies } from "../../companion/updater.mjs";
import { supervise } from "../../companion/supervisor.mjs";
import {
  extractRelease,
  sha256,
  manifestPath,
  archivePath,
  sourceVersion,
} from "../../companion/release.mjs";
import { production } from "../../companion/locations.mjs";

// Exercises the same deterministic archive and manifest shipped to Windows.
const archive = await readFile("dist/indir/sosyal-studio-bilgisayar.zip");
const manifest = JSON.parse(
  await readFile("dist/indir/sosyal-studio-bilgisayar.json"),
);
const previous = "a".repeat(64);
const pause = (ms = 5) => new Promise((r) => setTimeout(r, ms));
async function until(predicate) {
  for (let i = 0; i < 1200; i++) {
    if (await predicate()) return;
    await pause();
  }
  throw new Error("Beklenen olay oluşmadı.");
}
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "sosyal-update-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const updates = join(root, "updates");
  await mkdir(join(root, "profiles/sentetik"), { recursive: true });
  await writeFile(
    join(root, "profiles/sentetik/cookies.sqlite"),
    "sentetik-profil",
  );
  await writeFile(join(root, "device.json"), "sentetik-cihaz");
  let downloads = 0,
    installs = 0;
  const fetcher = async (url, options) => {
    assert.equal(options.redirect, "error");
    assert.equal(new URL(url).origin, production);
    if (url.endsWith(manifestPath)) return Response.json(manifest);
    assert.equal(url, `${production}${archivePath}`);
    downloads++;
    return new Response(archive);
  };
  const installer = async (stage) => {
    installs++;
    assert.match(
      await readFile(join(stage, "companion/start.mjs"), "utf8"),
      /ProfileBrowsers/,
    );
    assert.equal(
      await readFile(join(root, "device.json"), "utf8"),
      "sentetik-cihaz",
    );
  };
  const updater = new Updater({ directory: updates, fetcher, installer });
  return {
    root,
    updates,
    updater,
    fetcher,
    installer,
    counts: () => ({ downloads, installs }),
  };
}

test("indirilen paket kurulmadan önce doğrulanır; geçiş ve geri dönüş cihaz/profili korur", async (t) => {
  const f = await fixture(t);
  assert.equal(sha256(archive), manifest.sha256);
  const files = extractRelease(archive, manifest.version);
  assert.ok(files.has("companion/launch.mjs"));
  assert.ok(files.has("companion/supervisor.mjs"));
  const version = await f.updater.prepare(previous);
  assert.equal(version, manifest.version);
  assert.equal(
    (await f.updater.state()).version,
    null,
    "Hazırlık çalışan sürümü değiştirmez",
  );
  await f.updater.activate(version);
  assert.equal((await f.updater.state()).pending, true);
  assert.equal(await f.updater.rollback(), true);
  assert.equal((await f.updater.state()).version, null);
  assert.equal((await f.updater.state()).failedVersion, version);
  assert.equal(
    await f.updater.prepare(previous),
    null,
    "Hatalı sürüm tekrar kurulmaz",
  );
  assert.deepEqual(f.counts(), { downloads: 1, installs: 1 });
  assert.equal(
    await readFile(join(f.root, "device.json"), "utf8"),
    "sentetik-cihaz",
  );
  assert.equal(
    await readFile(join(f.root, "profiles/sentetik/cookies.sqlite"), "utf8"),
    "sentetik-profil",
  );
});

test("aynı sürüm yeniden indirilmez; onay ve temizlik en fazla iki kod sürümü tutar", async (t) => {
  const f = await fixture(t);
  assert.equal(await f.updater.prepare(manifest.version), null);
  assert.deepEqual(f.counts(), { downloads: 0, installs: 0 });
  await f.updater.prepare(previous);
  await f.updater.activate(manifest.version);
  await f.updater.confirm();
  for (const v of [previous, "b".repeat(64)]) await mkdir(f.updater.root(v));
  await writeFile(
    join(f.updates, "current.json"),
    JSON.stringify({
      version: manifest.version,
      previous,
      failedVersion: null,
      pending: true,
    }),
  );
  await f.updater.confirm();
  assert.equal((await f.updater.state()).pending, false);
  assert.deepEqual(
    (await readdir(join(f.updates, "releases"))).sort(),
    [previous, manifest.version].sort(),
  );
});

test("bozuk özet, yönlendirme, fazla boyut ve eksik indirme çalışan sürümü etkilemez", async (t) => {
  const f = await fixture(t);
  const cases = [
    { metadata: { ...manifest, sha256: previous }, bytes: archive },
    {
      metadata: { ...manifest, archive: "https://baska.example/paket.zip" },
      bytes: archive,
    },
    { metadata: { ...manifest, bytes: 8_000_001 }, bytes: archive },
    { metadata: manifest, bytes: archive.subarray(0, archive.length - 1) },
    { metadata: manifest, bytes: Buffer.concat([archive, Buffer.alloc(10)]) },
  ];
  for (const c of cases) {
    const updater = new Updater({
      directory: f.updates,
      installer: f.installer,
      fetcher: async (url) =>
        url.endsWith(manifestPath)
          ? Response.json(c.metadata)
          : new Response(c.bytes),
    });
    await assert.rejects(updater.prepare(previous));
    assert.equal((await updater.state()).version, null);
  }
  const offline = new Updater({
    directory: f.updates,
    fetcher: async () => {
      throw new Error("offline");
    },
  });
  await assert.rejects(offline.prepare(previous));
  assert.equal(f.counts().installs, 0);
  await assert.rejects(access(join(f.updates, "releases")));
});

test("ZIP yol kaçışı, symlink ve içerik sahteciliği kurulmadan reddedilir", async (t) => {
  const f = await fixture(t);
  const traversal = Buffer.from(archive);
  const pathAt = traversal.indexOf(
    Buffer.from("SosyalStudio-Bilgisayar/companion/start.mjs"),
  );
  traversal.write("../", pathAt);
  const symlink = Buffer.from(archive);
  const central = symlink.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  symlink.writeUInt32LE(0xa1ff0000, central + 38);
  const payload = Buffer.from(archive);
  payload[payload.indexOf(Buffer.from("ProfileBrowsers"))] ^= 1;
  for (const bytes of [
    traversal,
    symlink,
    payload,
    Buffer.concat([archive, Buffer.from("ek-payload")]),
  ]) {
    const metadata = {
      ...manifest,
      sha256: sha256(bytes),
      bytes: bytes.length,
    };
    const updater = new Updater({
      directory: f.updates,
      installer: f.installer,
      fetcher: async (url) =>
        url.endsWith(manifestPath)
          ? Response.json(metadata)
          : new Response(bytes),
    });
    await assert.rejects(updater.prepare(previous));
  }
  assert.equal(f.counts().installs, 0);
  await assert.rejects(access(join(f.updates, "releases")));
});

test("npm kurulumu yarıda kalırsa etkin sürüm değişmez ve hazırlık klasörü silinir", async (t) => {
  const f = await fixture(t);
  const updater = new Updater({
    directory: f.updates,
    fetcher: f.fetcher,
    installer: async () => {
      throw new Error("kurulum kesildi");
    },
  });
  await assert.rejects(updater.prepare(previous));
  assert.equal((await updater.state()).version, null);
  assert.deepEqual(await readdir(f.updates), ["releases"]);
  assert.deepEqual(await readdir(join(f.updates, "releases")), []);
});

function appFixture() {
  const child = new EventEmitter();
  child.connected = true;
  child.busy = true;
  child.requests = 0;
  child.send = (m) => {
    if (m.type === "prepare-update") {
      child.requests++;
      if (!child.busy)
        setImmediate(() => {
          child.emit("message", { type: "update-ready" });
          child.emit("exit", 75);
        });
    }
    if (m.type === "stop") setImmediate(() => child.emit("exit", 0));
  };
  return child;
}
async function supervisorRoot(f) {
  await mkdir(join(f.root, "companion"));
  await writeFile(
    join(f.root, "companion/release.json"),
    JSON.stringify({ version: previous }),
  );
  return f.root;
}

test("güncelleme açık hesap bitene kadar bekler, güvenli kapanıştan sonra etkinleşir", async (t) => {
  const f = await fixture(t),
    child = appFixture();
  const running = supervise({
    root: await supervisorRoot(f),
    updater: f.updater,
    spawnApp: () => child,
    ensureDependencies: async () => {},
    retryInterval: 10,
    log: () => {},
  });
  await pause(20);
  child.emit("message", { type: "ready" });
  await until(() => child.requests > 0);
  assert.equal((await f.updater.state()).version, null);
  child.busy = false;
  assert.equal(await running, 75);
  const state = await f.updater.state();
  assert.equal(state.version, manifest.version);
  assert.equal(state.pending, true, "Yeni süreç hazır olmadan onaylanmaz");
});

test("yeni uygulama başlayamazsa önceki kod seçilir ve bozuk sürüm engellenir", async (t) => {
  const f = await fixture(t),
    child = appFixture();
  await f.updater.prepare(previous);
  await f.updater.activate(manifest.version);
  const running = supervise({
    root: await supervisorRoot(f),
    updater: f.updater,
    spawnApp: () => child,
    ensureDependencies: async () => {},
    log: () => {},
  });
  await pause(20);
  child.emit("exit", 1);
  assert.equal(await running, 75);
  assert.equal((await f.updater.state()).version, null);
  assert.equal((await f.updater.state()).failedVersion, manifest.version);
});

test("çevrimdışı güncelleme kontrolünde uygulama çalışır, normal kapanış güncelleme tetiklemez", async (t) => {
  const f = await fixture(t),
    child = appFixture(),
    logs = [];
  f.updater.prepare = async () => {
    throw new Error("offline");
  };
  const running = supervise({
    root: await supervisorRoot(f),
    updater: f.updater,
    spawnApp: () => child,
    ensureDependencies: async () => {},
    log: (s) => logs.push(s),
  });
  await pause(20);
  child.emit("message", { type: "ready" });
  await until(() => logs.some((s) => s.includes("mevcut sürümle")));
  child.emit("exit", 0);
  assert.equal(await running, 0);
  assert.equal(child.requests, 0);
  assert.equal((await f.updater.state()).version, null);
});

test("bootstrap aday denetleyicideki sözdizimi hatasından geri döner", async (t) => {
  const f = await fixture(t);
  const bundle = join(f.root, "bundle");
  const files = extractRelease(archive, manifest.version);
  files.set("companion/supervisor.mjs", Buffer.from('console.log("FALLBACK_OK"); process.disconnect();'));
  files.set("companion/release.json", Buffer.from(JSON.stringify({ protocol: 1, version: sourceVersion(files) })));
  for (const [path, bytes] of files) {
    await mkdir(join(bundle, path, ".."), { recursive: true });
    await writeFile(join(bundle, path), bytes);
  }
  // A tiny fallback proves the actual bootstrap chooses the previous folder;
  // no model, real social login or production request is made.
  await writeFile(
    join(bundle, "companion/supervisor.mjs"),
    'console.log("FALLBACK_OK"); process.disconnect();',
  );
  const updates = join(f.root, "SosyalStudio/updates");
  await mkdir(join(updates, "releases", manifest.version, "companion"), {
    recursive: true,
  });
  await writeFile(
    join(updates, "releases", manifest.version, "companion/supervisor.mjs"),
    "invalid javascript @",
  );
  await writeFile(
    join(updates, "current.json"),
    JSON.stringify({
      version: manifest.version,
      previous: null,
      failedVersion: null,
      pending: true,
    }),
  );
  const child = spawn(
    process.execPath,
    [resolve(bundle, "companion/launch.mjs")],
    {
      env: { ...process.env, LOCALAPPDATA: f.root },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let output = "";
  child.stdout.on("data", (b) => {
    output += b;
  });
  child.stderr.resume();
  const timer = setTimeout(() => child.kill(), 5000);
  const code = await new Promise((r) => child.once("exit", r));
  clearTimeout(timer);
  assert.equal(code, 0);
  assert.match(output, /FALLBACK_OK/);
  const state = JSON.parse(await readFile(join(updates, "current.json")));
  assert.equal(state.version, null);
  assert.equal(state.failedVersion, manifest.version);
});

test("kilit dosyası kayıt dışı npm kaynağını kurmadan reddeder", async (t) => {
  const f = await fixture(t);
  await mkdir(join(f.root, "companion"));
  await writeFile(
    join(f.root, "companion/package-lock.json"),
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "node_modules/uygunsuz": {
          resolved: "https://baska.example/paket.tgz",
          integrity: "sha512-abcd",
        },
      },
    }),
  );
  await assert.rejects(installDependencies(f.root), /kaynağı doğrulanamadı/);
});

test(
  "gerçek kaynak paketi kilitli npm bağımlılıklarıyla kurulur ve ikinci açılışta tekrar kurulmaz",
  { timeout: 240_000 },
  async (t) => {
    const f = await fixture(t),
      bundle = join(f.root, "kurulum");
    for (const [path, bytes] of extractRelease(archive, manifest.version)) {
      const output = join(bundle, path);
      await mkdir(join(output, ".."), { recursive: true });
      await writeFile(output, bytes);
    }
    await installDependencies(bundle);
    const marker = join(bundle, "companion/.dependencies-ready");
    const digest = await readFile(marker, "utf8");
    assert.equal(
      digest,
      sha256(await readFile(join(bundle, "companion/package-lock.json"))),
    );
    const child = spawn(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        'import puppeteer from "puppeteer-core"; if(typeof puppeteer.launch !== "function") process.exit(1)',
      ],
      { cwd: join(bundle, "companion"), stdio: "ignore" },
    );
    assert.equal(await new Promise((r) => child.once("exit", r)), 0);
    await installDependencies(bundle);
    assert.equal(await readFile(marker, "utf8"), digest);
  },
);

test(
  "gerçek yardımcı IPC güncellemesi bekleyen komutu ve açık Firefox profilini kesmez",
  { timeout: 10_000 },
  async (t) => {
    const f = await fixture(t);
    await mkdir(join(f.root, "SosyalStudio"));
    await writeFile(
      join(f.root, "SosyalStudio/device.json"),
      JSON.stringify({
        origin: production,
        id: "11111111-1111-4111-8111-111111111111",
        token: "x".repeat(43),
      }),
    );
    const preload = join(f.root, "fixture-preload.mjs");
    await writeFile(
      preload,
      `
    import { registerHooks } from "node:module";
    registerHooks({ load(url, context, next) {
      if (url.endsWith("/companion/browser.mjs")) return { format: "module", shortCircuit: true, source: \`
        export class ProfileBrowsers {
          constructor() { this.opened = new Map(); this.manualOpened = new Map(); this.queue = Promise.resolve(); }
          async execute(account, command) {
            await new Promise(r => setTimeout(r, 100));
            if (command.action === "open") this.opened.set("fixture", {});
            if (command.action === "close") this.opened.clear();
            if (command.action === "manual-login") this.manualOpened.set("fixture", {});
            if (command.action === "fixture-normal-closed") this.manualOpened.clear();
            return { closed: command.action === "close" };
          }
          async closeAll() { this.opened.clear(); }
        }
      \` };
      if (url.endsWith("/companion/local-ai.mjs")) return {format:"module", shortCircuit:true, source: "export class LocalAI { constructor(){this.busy=false;} setup(options){if(options.automatic)process.send({type:'fixture-auto-setup'});} async close(){process.send({type:'fixture-ai-closed'});} async execute(){this.busy=true;await new Promise(r=>setTimeout(r,100));this.busy=false;return {ok:true,answer:'fixture',posts:[]};} }"};
      if (url.endsWith("/companion/research.mjs")) return {format:"module", shortCircuit:true, source: "export class WebsiteResearch { async close() {} }"};
      return next(url, context);
    }});
    globalThis.WebSocket = class extends EventTarget {
      static OPEN = 1;
      constructor() {
        super(); this.readyState = 1;
        process.on("message", (m) => {
          if(m?.type === "fixture-ai") this.dispatchEvent(new MessageEvent("message", {data:JSON.stringify({type:"ai-command",id:m.id,input:{action:"generate"}})}));
          if(m?.type === "fixture-command") this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify({ type:"command", id:m.id, account:{}, command:m.command }) }));
        });
        setImmediate(() => this.dispatchEvent(new Event("open")));
      }
      send(data) { const m = JSON.parse(data); if(m.type === "result" || m.type === "ai-result") process.send({type:"fixture-result", id:m.id}); }
      close() { this.readyState = 3; this.dispatchEvent(new Event("close")); }
    };
  `,
    );
    const child = fork(resolve("companion/start.mjs"), [], {
      execArgv: ["--import", pathToFileURL(preload).href],
      env: {
        ...process.env,
        LOCALAPPDATA: f.root,
        STUDIO_FIREFOX: process.execPath,
      },
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    t.after(() => {
      if (child.exitCode === null) child.kill();
    });
    const messages = [];
    child.on("message", (m) => messages.push(m));
    await until(() => messages.some((m) => m.type === "ready"));
    if (process.platform === "win32")
      assert.ok(messages.some((m) => m.type === "fixture-auto-setup"), "Windows açılışında AI kurulumu kendiliğinden başlar");
    child.send({
      type: "fixture-command",
      id: "open",
      command: { action: "open" },
    });
    child.send({ type: "prepare-update" });
    await pause(30);
    assert.equal(child.exitCode, null);
    assert.ok(
      !messages.some((m) => m.type === "update-ready"),
      "Devam eden komut kesilmez",
    );
    await until(() => messages.some((m) => m.id === "open"));
    child.send({ type: "prepare-update" });
    await pause(30);
    assert.equal(child.exitCode, null);
    assert.ok(
      !messages.some((m) => m.type === "update-ready"),
      "Açık profil kesilmez",
    );
    child.send({
      type: "fixture-command",
      id: "close",
      command: { action: "close" },
    });
    child.send({ type: "prepare-update" });
    await until(() => messages.some((m) => m.id === "close"));
    child.send({ type: "fixture-command", id: "normal", command: { action: "manual-login" } });
    await until(() => messages.some((m) => m.id === "normal"));
    child.send({ type: "prepare-update" });
    await pause(30);
    assert.equal(child.exitCode, null);
    assert.ok(!messages.some((m) => m.type === "update-ready"), "Normal giriş penceresi kesilmez");
    child.send({ type: "fixture-command", id: "normal-closed", command: { action: "fixture-normal-closed" } });
    await until(() => messages.some((m) => m.id === "normal-closed"));
    child.send({ type: "fixture-ai", id: "ai" });
    child.send({ type: "prepare-update" });
    await pause(30);
    assert.equal(child.exitCode, null);
    assert.ok(
      !messages.some((m) => m.type === "update-ready"),
      "AI üretimi/kurulumu kesilmez",
    );
    await until(() => messages.some((m) => m.id === "ai"));
    const exited = new Promise((r) => child.once("exit", r));
    child.send({ type: "prepare-update" });
    assert.equal(await exited, 75);
    assert.ok(messages.some((m) => m.type === "update-ready"));
    assert.ok(messages.some((m) => m.type === "fixture-ai-closed"), "Güncelleme öncesi AI süreç sahibi kapanır");
  },
);

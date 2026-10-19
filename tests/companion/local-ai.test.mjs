import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { EventEmitter } from "node:events";
import { pathToFileURL } from "node:url";
import { LocalAI } from "../../companion/local-ai.mjs";
import { LOCAL_MODEL, localPost } from "../../shared/local-ai.mjs";

const model = {
  name: LOCAL_MODEL,
  size: 3000000000,
  digest: "a".repeat(64),
  details: { parameter_size: "4.66B", quantization_level: "Q4_K_M" },
};
const input = {
  action: "generate",
  companyId: "11111111-1111-4111-8111-111111111111",
  profile: {
    name: "Kurgu Mobilya",
    tone: "Sade",
    website: "",
    handle: "",
    audience: "",
    keywords: "",
  },
  entries: [{ kind: "rule", title: "Kaynak", body: "Fiyat uydurma." }],
  question: "Yeni sandalye. Doğal anlatım.",
  mode: "posts",
  selected: ["instagram", "x", "tumblr"],
  image: null,
};
async function fixture(t, fn) {
  const directory = await mkdtemp(join(tmpdir(), "studio-ai-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, "local-ai-model.json"),
    JSON.stringify({ model: LOCAL_MODEL, digest: model.digest }),
  );
  const calls = [];
  const fetcher = async (url, opts) => {
    assert.ok(url.startsWith("http://127.0.0.1:11434/api/"));
    assert.equal(opts.redirect, "error");
    const body = opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url, body });
    return fn ? fn(url, body, opts) : Response.json({ models: [model] });
  };
  return { directory, calls, ai: new LocalAI({ directory, fetcher }) };
}
function responseFor(platform) {
  return {
    title: "Kaynak başlığı",
    caption: `${platform}: sandalye için sade tasarım.`,
    hashtags: [],
    alt: "",
  };
}

test("küçük model, yalnız loopback, sabit kaynak ve sınırlı GPU bağlamıyla platformları ayrı üretir", async (t) => {
  let platformIndex = 0;
  const f = await fixture(t, (url, body) => {
    if (url.endsWith("tags")) return Response.json({ models: [model] });
    assert.equal(body.model, LOCAL_MODEL);
    assert.equal(body.think, false);
    assert.equal(body.keep_alive, "2m");
    assert.equal(body.options.num_ctx, 16384);
    assert.equal(body.options.num_thread, 4);
    assert.ok(body.messages.some((m) => m.content.includes("Kurgu Mobilya")));
    assert.ok(body.messages.some((m) => m.content.includes("Fiyat uydurma")));
    return Response.json({
      done: true,
      done_reason: "stop",
      message: {
        content: JSON.stringify(responseFor(input.selected[platformIndex++])),
      },
    });
  });
  const result = await f.ai.execute(input);
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.posts.map((p) => p.platform),
    input.selected,
  );
  assert.equal(f.ai.busy, false);
  assert.equal(
    (await f.ai.execute({ action: "status" })).status.phase,
    "ready",
  );
});

test("görsel bir kez incelenir; gözlem metin üretiminde kullanılır ve görsel yoksa alt boş kalır", async (t) => {
  let vision = 0;
  const f = await fixture(t, (url, body) => {
    if (url.endsWith("tags")) return Response.json({ models: [model] });
    if (body.messages.some((m) => m.images)) {
      vision++;
      return Response.json({
        done: true,
        message: { content: "Beyaz zemin üzerinde bir sandalye." },
      });
    }
    assert.ok(body.messages.some((m) => m.content.includes("Beyaz zemin")));
    return Response.json({
      done: true,
      message: {
        content: JSON.stringify({
          ...responseFor("instagram"),
          alt: "Beyaz zemin üzerinde sandalye.",
        }),
      },
    });
  });
  const result = await f.ai.execute({
    ...input,
    selected: ["instagram"],
    image: Buffer.from("synthetic-image").toString("base64"),
  });
  assert.equal(vision, 1);
  assert.ok(result.posts[0].alt);
  assert.equal(
    localPost(
      JSON.stringify({ ...responseFor("x"), alt: "Hayali ayrıntı" }),
      "x",
      false,
    ).alt,
    "",
  );
});

test("büyük/değişmiş model ve panelden gelen keyfi model/komut çalıştırılmaz", async (t) => {
  const f = await fixture(t, () =>
    Response.json({ models: [{ ...model, digest: "b".repeat(64) }] }),
  );
  await assert.rejects(f.ai.execute(input), (e) => e.code === "MODEL_MISSING");
  await assert.rejects(f.ai.execute({ action: "shell", command: "ignored" }));
  await assert.rejects(f.ai.execute({ ...input, selected: ["unknown"] }));
  const bad = await fixture(t, () =>
    Response.json({
      models: [
        {
          ...model,
          size: 9000000000,
          details: { quantization_level: "Q8", parameter_size: "14B" },
        },
      ],
    }),
  );
  assert.equal((await bad.ai.status()).phase, "error");
});

test("hatalı/kesilmiş JSON ve platform sınırı aşılırsa önceki içerik yerine sahte başarı dönmez", async (t) => {
  const f = await fixture(t, (url) =>
    url.endsWith("tags")
      ? Response.json({ models: [model] })
      : Response.json({ done: true, message: { content: '{"caption":' } }),
  );
  await assert.rejects(f.ai.execute(input), (e) => e.code === "INVALID_OUTPUT");
  assert.equal(f.ai.busy, false);
  assert.throws(() =>
    localPost(
      JSON.stringify({ ...responseFor("x"), caption: "a".repeat(281) }),
      "x",
      false,
    ),
  );
});

test("üretim sürerken ikinci üretim/kurulum reddedilir; durum sorgusu engellenmez", async (t) => {
  let finish;
  const pending = new Promise((r) => (finish = r));
  const f = await fixture(t, async (url) =>
    url.endsWith("tags")
      ? Response.json({ models: [model] })
      : (await pending,
        Response.json({ done: true, message: { content: "Kısa öneri." } })),
  );
  const first = f.ai.execute({ ...input, mode: "chat" });
  await new Promise((r) => setTimeout(r, 20));
  assert.equal((await f.ai.status()).phase, "generating");
  await assert.rejects(f.ai.execute(input), (e) => e.code === "BUSY");
  assert.throws(
    () => f.ai.setup(),
    (e) => e.code === "BUSY",
  );
  finish();
  await first;
});

test("kurulum arka planda ilerler; model özeti doğrulanır ve profil/cihaz verileri korunur", async (t) => {
  const f = await fixture(t, (url) =>
    url.endsWith("show")
      ? Response.json({ capabilities: ["completion", "vision"] })
      : url.endsWith("pull")
        ? new Response('{"total":100,"completed":50}\n{"status":"success"}\n')
        : Response.json({ models: [model] }),
  );
  await writeFile(join(f.directory, "device.json"), "synthetic-device");
  f.ai.installRuntime = async () => {};
  const status = await f.ai.execute({ action: "setup" });
  assert.equal(status.status.busy, true);
  await f.ai.setupTask;
  assert.equal((await f.ai.status()).phase, "ready");
  assert.equal(
    JSON.parse(await readFile(join(f.directory, "local-ai-model.json"))).digest,
    model.digest,
  );
  assert.equal(
    await readFile(join(f.directory, "device.json"), "utf8"),
    "synthetic-device",
  );
});

test("Windows kurucusu yalnızca sabit WinGet paketi çağırır, shell açılmaz", async (t) => {
  const f = await fixture(t);
  const calls = [];
  f.ai.platform = "win32";
  f.ai.executable = async () => null;
  f.ai.spawnProcess = (exe, args, options) => {
    calls.push({ exe, args, options });
    const child = new EventEmitter();
    setImmediate(() => child.emit("exit", 0));
    return child;
  };
  await f.ai.installRuntime();
  assert.equal(calls[0].exe, "winget.exe");
  assert.ok(calls[0].args.includes("Ollama.Ollama"));
  assert.equal(calls[0].options.shell, undefined);
});

test("v1.1 güncelleyicisi AI eklenen yeni kaynak paketini doğrulayarak açabilir", async (t) => {
  const f = await fixture(t);
  const old = await readFile("tests/fixtures/release-v1.1.mjs", "utf8");
  const path = join(f.directory, "old-release.mjs");
  await writeFile(path, old);
  const legacy = await import(pathToFileURL(path).href);
  const meta = JSON.parse(
    await readFile("dist/indir/sosyal-studio-bilgisayar.json"),
  );
  const files = legacy.extractRelease(
    await readFile("dist/indir/sosyal-studio-bilgisayar.zip"),
    meta.version,
  );
  assert.ok(files.has("companion/local-ai.mjs"));
  assert.ok(files.has("shared/local-ai.mjs"));
});

test("uzun bağlam modele gönderilmeden reddedilir; şirket verisi sessizce kesilmez", async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    f.ai.chat([{ role: "user", content: "kaynak".repeat(10000) }]),
    (e) => e.code === "CONTEXT_TOO_LONG",
  );
  assert.equal(f.calls.length, 0);
});

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { z } from "zod";
import {
  companySchema,
  selectedSchema,
  postSchema,
  briefSchema,
  draftSchema,
} from "../shared/schemas.mjs";
import {
  platforms,
  platformMap,
  adaptWithRules,
  createPrompt,
  postWarnings,
} from "../server/platforms.mjs";
import { createCloudStore } from "./store.mjs";
import { authenticate } from "./auth.mjs";
import { parseMediaForm, objectKey, removeCompanyObjects } from "./media.mjs";

const app = new Hono();
function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
const store = (c) => c.get("store");
async function company(c, id) {
  const result = await store(c).company(id);
  if (!result) fail(404, "Şirket bulunamadı.");
  return result;
}
async function media(c, id, companyId) {
  if (!id) return null;
  const result = await store(c).media(id);
  if (!result || result.companyId !== companyId)
    fail(400, "Görsel bu şirkete ait değil.");
  return result;
}
function validatePosts(posts, selected, all = false) {
  if (new Set(posts.map((p) => p.platform)).size !== posts.length)
    fail(400, "Bir platform birden fazla kez bulunamaz.");
  if (posts.some((p) => !selected.includes(p.platform)))
    fail(400, "Sonuçlarda seçilmemiş bir platform var.");
  if (
    all &&
    (posts.length !== selected.length ||
      selected.some((id) => !posts.some((p) => p.platform === id)))
  )
    fail(400, "ChatGPT sonucu seçili platformların tamamını içermeli.");
}
async function json(c) {
  try {
    return await c.req.json();
  } catch {
    fail(400, "Geçerli JSON okunamadı.");
  }
}

app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("X-Frame-Options", "DENY");
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  if (c.req.path.startsWith("/api/")) c.header("Cache-Control", "no-store");
  const url = new URL(c.req.url),
    origin = c.req.header("origin");
  if (origin && origin !== url.origin)
    return c.json({ error: "İstek kaynağına izin verilmedi." }, 403);
  c.set("store", createCloudStore(c.env.DB));
  if (c.req.path === "/api/health") return next();
  const identity = await authenticate(c.req.raw, c.env);
  if (!identity) {
    if (!c.env.ACCESS_TEAM_DOMAIN || !c.env.ACCESS_AUD)
      return c.json(
        {
          error:
            "Cloudflare Access yapılandırması tamamlanmadı. Panel erişimi kapalı tutuluyor.",
        },
        503,
      );
    return c.json(
      {
        error: "Oturum doğrulanamadı. Cloudflare Access üzerinden giriş yapın.",
      },
      401,
    );
  }
  c.set("identity", identity);
  await next();
});
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 16 * 1024 * 1024,
    onError: (c) => c.json({ error: "İstek boyutu sınırı aşıldı." }, 413),
  }),
);

app.get("/api/health", async (c) => {
  await c.env.DB.prepare("SELECT 1").first();
  return c.json({
    ok: true,
    database: "d1",
    storage: "r2",
    mediaProcessing: "browser",
    publishing: false,
    ai: "manual-chatgpt",
  });
});
app.get("/api/platforms", (c) => c.json(platforms));
app.get("/api/companies", async (c) => c.json(await store(c).companies()));
app.post("/api/companies", async (c) => {
  if ((await store(c).companies()).length >= 30)
    fail(400, "En fazla 30 şirket ekleyebilirsiniz.");
  return c.json(
    await store(c).saveCompany(companySchema.parse(await json(c))),
    201,
  );
});
app.put("/api/companies/:id", async (c) => {
  await company(c, c.req.param("id"));
  return c.json(
    await store(c).saveCompany(
      companySchema.parse(await json(c)),
      c.req.param("id"),
    ),
  );
});
app.delete("/api/companies/:id", async (c) => {
  const id = c.req.param("id");
  await company(c, id);
  await removeCompanyObjects(c.env.MEDIA, id);
  await store(c).deleteCompany(id);
  return c.body(null, 204);
});
app.post("/api/prepare", async (c) => {
  const brief = briefSchema.parse(await json(c));
  const profile = await company(c, brief.companyId);
  await media(c, brief.mediaId, brief.companyId);
  return c.json({
    posts: adaptWithRules({ company: profile, ...brief }),
    source: "rules",
  });
});
app.post("/api/prompt", async (c) => {
  const brief = briefSchema.parse(await json(c));
  const profile = await company(c, brief.companyId);
  await media(c, brief.mediaId, brief.companyId);
  return c.json({
    prompt: createPrompt({
      company: profile,
      ...brief,
      hasMedia: Boolean(brief.mediaId),
    }),
  });
});
app.post("/api/import", async (c) => {
  const input = z
    .object({
      companyId: z.uuid(),
      selected: selectedSchema,
      result: z.string().max(200000),
    })
    .parse(await json(c));
  await company(c, input.companyId);
  let result;
  try {
    result = JSON.parse(
      input.result
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    );
  } catch {
    fail(
      400,
      "Geçerli JSON okunamadı. ChatGPT yanıtındaki JSON nesnesinin tamamını yapıştırın.",
    );
  }
  const { posts } = z
    .object({ posts: z.array(postSchema).min(1).max(8) })
    .parse(result);
  validatePosts(posts, input.selected, true);
  return c.json({ posts, source: "chatgpt-import" });
});
app.get("/api/drafts", async (c) => {
  const id = z.uuid().parse(c.req.query("companyId"));
  await company(c, id);
  return c.json(await store(c).drafts(id));
});
app.get("/api/drafts/:id", async (c) => {
  const draft = await store(c).draft(c.req.param("id"));
  if (!draft) fail(404, "Taslak bulunamadı.");
  return c.json(draft);
});
async function saveDraft(c) {
  const input = draftSchema.parse(await json(c));
  if (new TextEncoder().encode(JSON.stringify(input)).byteLength > 1_000_000)
    fail(413, "Taslak 1 MB kayıt sınırını aşıyor. Metinleri kısaltın.");
  const id = c.req.param("id");
  await company(c, input.companyId);
  await media(c, input.mediaId, input.companyId);
  validatePosts(input.posts, input.selected);
  if (id) {
    const previous = await store(c).draft(id);
    if (!previous) fail(404, "Taslak bulunamadı.");
    if (previous.companyId !== input.companyId)
      fail(400, "Taslak farklı bir şirkete taşınamaz.");
  }
  return c.json(await store(c).saveDraft(input, id), id ? 200 : 201);
}
app.post("/api/drafts", saveDraft);
app.put("/api/drafts/:id", saveDraft);
app.delete("/api/drafts/:id", async (c) => {
  const id = c.req.param("id");
  if (!(await store(c).draft(id))) fail(404, "Taslak bulunamadı.");
  await store(c).deleteDraft(id);
  return c.body(null, 204);
});
app.get("/api/drafts/:id/export", async (c) => {
  const draft = await store(c).draft(c.req.param("id"));
  if (!draft) fail(404, "Taslak bulunamadı.");
  const profile = await company(c, draft.companyId);
  c.header(
    "Content-Disposition",
    `attachment; filename="sosyal-studio-${draft.id}.json"`,
  );
  return c.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    company: profile,
    name: draft.name,
    sourceText: draft.text,
    published: false,
    note: "Hazırlık paketidir. Görselleri ayrıca indirin. Gerçek yayınlama yapılmadı.",
    posts: draft.posts.map((p) => ({
      ...p,
      warnings: postWarnings(p, Boolean(draft.mediaId)),
      mediaDownloadPath: draft.mediaId
        ? `/api/media/${draft.mediaId}/${p.platform}.jpg?fit=${draft.mediaFit}`
        : null,
    })),
  });
});
app.post("/api/media", async (c) => {
  const companyId = z.uuid().parse(c.req.query("companyId"));
  await company(c, companyId);
  if ((await store(c).companyMedia(companyId)).length >= 200)
    fail(400, "Şirket başına 200 görsel sınırına ulaşıldı.");
  if (!c.req.header("content-type")?.startsWith("multipart/form-data"))
    fail(415, "Görseli panelden hazırlayıp yükleyin.");
  const parsed = await parseMediaForm(c.req.raw);
  const id = crypto.randomUUID();
  const keys = parsed.images.map((image) =>
    objectKey(companyId, id, image.key),
  );
  try {
    const uploads = await Promise.allSettled(
      parsed.images.map((image, index) =>
        c.env.MEDIA.put(keys[index], image.bytes, {
          httpMetadata: { contentType: "image/jpeg" },
        }),
      ),
    );
    const failed = uploads.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    return c.json(
      await store(c).saveMedia(
        { companyId, width: parsed.width, height: parsed.height },
        id,
      ),
      201,
    );
  } catch (error) {
    await c.env.MEDIA.delete(keys);
    throw error;
  }
});
app.get("/api/media/:id", async (c) => {
  const image = await store(c).media(c.req.param("id"));
  if (!image) fail(404, "Görsel bulunamadı.");
  return c.json(image);
});
app.get("/api/media/:id/:target", async (c) => {
  const image = await store(c).media(c.req.param("id"));
  if (!image) fail(404, "Görsel bulunamadı.");
  const target = c.req.param("target").replace(/\.jpg$/, ""),
    p = platformMap[target];
  if (target !== "original" && !p) fail(404, "Görsel boyutu bulunamadı.");
  const fit = c.req.query("fit") === "cover" ? "cover" : "contain";
  const object = await c.env.MEDIA.get(
    objectKey(
      image.companyId,
      image.id,
      target === "original" ? target : `${target}_${fit}`,
    ),
  );
  if (!object) fail(404, "Görsel dosyası bulunamadı.");
  c.header("Content-Type", "image/jpeg");
  if (c.req.query("download") === "1")
    c.header(
      "Content-Disposition",
      `attachment; filename="${target}-${p ? `${p.width}x${p.height}` : "original"}.jpg"`,
    );
  return c.body(object.body);
});
app.all("/api/*", (c) => c.json({ error: "İşlem bulunamadı." }, 404));
app.get("/auth/logout", (c) => {
  if (!c.env.ACCESS_TEAM_DOMAIN) return c.redirect("/");
  return c.redirect(
    `https://${c.env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/logout`,
  );
});
app.all("*", (c) => c.env.ASSETS.fetch(c.req.raw));
app.onError((error, c) => {
  if (error instanceof z.ZodError)
    return c.json(
      {
        error: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
      },
      400,
    );
  if (error.status && error.status < 500)
    return c.json({ error: error.message }, error.status);
  console.error("Cloudflare işlem hatası:", error.name);
  return c.json(
    { error: "İşlem tamamlanamadı. Sunucu kayıtlarını kontrol edin." },
    500,
  );
});
export default app;

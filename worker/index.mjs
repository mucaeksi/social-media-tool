import { registerEditorial } from "./editorial.mjs";
import { STUDIO_VERSION } from "../shared/features.mjs";
import { validateDraftRelations } from "./draft-store.mjs";
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
import { scopedStore, registerWorkspaceAccess } from "./workspace-access.mjs";
import { registerKnowledge, evidenceFor } from "./knowledge.mjs";
import {
  registerWorkspaceOperations,
  databaseUsage,
} from "./workspace-operations.mjs";
import { registerPublications } from "./publications.mjs";
import { registerPasswordRoutes } from "./password-auth.mjs";
import { createD1Media } from "./d1-media.mjs";
import { createR2Media, R2_LIMITS, r2Usage } from "./r2-media.mjs";
import { parseMediaForm, objectKey, removeCompanyObjects } from "./media.mjs";
import { browserCommand, registerSocialAccounts } from "./social-accounts.mjs";
import { LOCAL_MODEL, LOCAL_EXPERT_VERSION } from "../shared/local-ai.mjs";
import { registerLocalAI } from "./local-ai.mjs";
import { registerSocialAI } from "./social-ai.mjs";
import { SOCIAL_EXPERT_VERSION } from "../shared/social-expert.mjs";
import {
  registerCompanyComputer,
  computerPublicPaths,
  computerBroker,
} from "./company-computer.mjs";
export { SocialBrowser } from "./social-browser.mjs";
export { CompanyComputer } from "./computer-relay.mjs";

const app = new Hono();
function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
const store = (c) => c.get("store");
const storageMode = (c) => (c.env.MEDIA_STORAGE === "d1" ? "d1" : "r2");
function mediaStore(c, mode = storageMode(c)) {
  if (mode === "d1") return createD1Media(c.env.DB);
  if (!c.env.MEDIA) fail(503, "R2 görsel bağlantısı yapılandırılmadı.");
  return createR2Media(c.env.DB, c.env.MEDIA);
}
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
    "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; frame-src https://live.browser.run; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  );
  if (c.req.path.startsWith("/api/")) c.header("Cache-Control", "no-store");
  const url = new URL(c.req.url),
    origin = c.req.header("origin");
  if (
    c.env.APP_ENV === "production" &&
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  ) {
    url.protocol = "https:";
    return c.redirect(url.toString(), 308);
  }
  if (origin && origin !== url.origin)
    return c.json({ error: "İstek kaynağına izin verilmedi." }, 403);
  if (
    c.env.AUTH_MODE === "password" &&
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
    origin !== url.origin
  )
    return c.json({ error: "İstek kaynağı doğrulanamadı." }, 403);
  c.set("store", createCloudStore(c.env.DB));
  if (
    c.req.path === "/api/health" ||
    c.req.path === "/api/auth/login" ||
    computerPublicPaths.has(c.req.path) ||
    !c.req.path.startsWith("/api/")
  )
    return next();
  const identity = await authenticate(c.req.raw, c.env);
  if (!identity) {
    return c.json(
      {
        error:
          "Oturumunuz doğrulanamadı. Kullanıcı adı ve şifrenizle giriş yapın.",
      },
      401,
    );
  }
  c.set("identity", identity);
  c.set("store", scopedStore(c.get("store"), c.env.DB, identity));
  if (
    ["POST", "PUT"].includes(c.req.method) &&
    ((/^\/api\/content\//.test(c.req.path) &&
      c.req.path !== "/api/content/evidence/check") ||
      /^\/api\/(?:ai\/ask|computer\/ai\/ask|knowledge\/research|drafts(?:\/[^/]+)?|media|companies(?:\/[^/]+)?|quality|metrics|publications|workspace\/restore)$/.test(
        c.req.path,
      ))
  ) {
    const usage = await databaseUsage(c.env.DB);
    if (usage.bytes !== null && usage.bytes >= usage.textWarningAt)
      fail(
        429,
        "D1 güvenli yazma eşiğine (400 MB) ulaştı. Eski kayıtları yedekleyip silin; ücretli plana geçilmedi.",
      );
  }
  await next();
});
app.use(
  "/api/*",
  bodyLimit({
    maxSize: 16 * 1024 * 1024,
    onError: (c) => c.json({ error: "İstek boyutu sınırı aşıldı." }, 413),
  }),
);
app.use(
  "/api/auth/login",
  bodyLimit({
    maxSize: 8192,
    onError: (c) => c.json({ error: "Giriş isteği çok büyük." }, 413),
  }),
);
registerPasswordRoutes(app);
registerWorkspaceAccess(app);
registerKnowledge(app);
registerWorkspaceOperations(app);
registerEditorial(app);
registerPublications(app);
app.use(
  "/api/computer/enroll",
  bodyLimit({
    maxSize: 8192,
    onError: (c) => c.json({ error: "Eşleştirme isteği çok büyük." }, 413),
  }),
);
registerCompanyComputer(app);
registerSocialAccounts(app);
registerSocialAI(app);
registerLocalAI(app);

app.get("/api/health", async (c) => {
  await c.env.DB.prepare("SELECT 1").first();
  return c.json({
    ok: true,
    version: STUDIO_VERSION,
    database: "d1",
    storage: storageMode(c),
    mediaProcessing: "browser",
    publishing: false,
    publicationQueue: true,
    publishingPilot: "facebook-browser-unverified",
    socialBrowser: Boolean(c.env.SOCIAL_BROWSER && c.env.BROWSER_STATE_KEY),
    companyComputer: Boolean(c.env.COMPANY_COMPUTER),
    localAI: c.env.COMPANY_COMPUTER
      ? { model: LOCAL_MODEL, expertVersion: LOCAL_EXPERT_VERSION }
      : null,
    ai:
      c.env.AI && c.env.AI_FREE_ONLY === "true"
        ? "cloudflare"
        : "manual-chatgpt",
    aiExpertVersion: SOCIAL_EXPERT_VERSION,
    auth: c.env.AUTH_MODE === "password" ? "password" : "development",
  });
});
app.get("/api/platforms", (c) => c.json(platforms));
app.get("/api/storage/usage", async (c) =>
  c.json({
    storage: storageMode(c),
    r2: { limits: R2_LIMITS, usage: await r2Usage(c.env.DB) },
  }),
);
app.get("/api/companies", async (c) => c.json(await store(c).companies()));
app.post("/api/companies", async (c) => {
  if (c.get("identity")?.role === "editor")
    fail(403, "Yeni şirketi yönetici oluşturmalıdır.");
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
  if (c.get("identity")?.role === "editor")
    fail(403, "Şirket silmek için yönetici yetkisi gerekli.");
  const id = c.req.param("id");
  await company(c, id);
  if (c.env.SOCIAL_BROWSER || c.env.COMPANY_COMPUTER) {
    const hasAccounts = await c.env.DB.prepare(
      "SELECT id FROM social_accounts WHERE company_id=? LIMIT 1",
    )
      .bind(id)
      .first();
    if (hasAccounts && c.get("identity")?.role !== "admin")
      return c.json(
        {
          error:
            "Sosyal hesabı olan şirketi silmek için yönetici yetkisi gerekli.",
        },
        403,
      );
    if (c.env.COMPANY_COMPUTER)
      await computerBroker(c.env, { action: "remove", companyId: id });
  }
  if (c.env.SOCIAL_BROWSER) {
    const response = await browserCommand(c.env, {
      action: "remove-company",
      account: { companyId: id },
      userId: c.get("identity").id,
    });
    if (!response.ok) return response;
  }
  await removeCompanyObjects(createD1Media(c.env.DB), id);
  if (c.env.MEDIA) await removeCompanyObjects(mediaStore(c, "r2"), id);
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
  profile.sourceRefs = await evidenceFor(c.env.DB, brief.companyId, brief.text);
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
    .object({ posts: z.array(postSchema).min(1).max(9) })
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
  await validateDraftRelations(store(c), c.env.DB, input, c.get("identity"));
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
  const bucket = mediaStore(c);
  if (storageMode(c) === "r2")
    await bucket.reserveUpload(
      parsed.images.map((image, index) => ({
        key: keys[index],
        bytes: image.bytes,
      })),
    );
  try {
    const uploads = await Promise.allSettled(
      parsed.images.map((image, index) =>
        bucket.put(keys[index], image.bytes, {
          httpMetadata: { contentType: "image/jpeg" },
        }),
      ),
    );
    const failed = uploads.find((result) => result.status === "rejected");
    if (failed) throw failed.reason;
    if (storageMode(c) === "r2") await bucket.completeUpload(keys);
    return c.json(
      await store(c).saveMedia(
        {
          companyId,
          width: parsed.width,
          height: parsed.height,
          storage: storageMode(c),
        },
        id,
      ),
      201,
    );
  } catch (error) {
    await bucket.delete(keys);
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
  if (image.deleting) fail(409, "Görsel temizliği sürüyor; yeniden seçin.");
  const target = c.req.param("target").replace(/\.jpg$/, ""),
    p = platformMap[target];
  if (target !== "original" && !p) fail(404, "Görsel boyutu bulunamadı.");
  const fit = c.req.query("fit") === "cover" ? "cover" : "contain";
  const object = await mediaStore(c, image.storage ?? "r2").get(
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
  return c.redirect("/");
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
  if (error.status && (error.status < 500 || error.public))
    return c.json({ error: error.message }, error.status);
  console.error("Cloudflare işlem hatası:", error.name);
  return c.json(
    { error: "İşlem tamamlanamadı. Sunucu kayıtlarını kontrol edin." },
    500,
  );
});
export default {
  fetch: app.fetch,
  scheduled: (_controller, env, ctx) =>
    ctx.waitUntil(computerBroker(env, { action: "wake-publications" })),
};

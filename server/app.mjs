import express from "express";
import { z } from "zod";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { createStore } from "./store.mjs";
import {
  platforms,
  platformIds,
  platformMap,
  adaptWithRules,
  createPrompt,
  postWarnings,
} from "./platforms.mjs";

import {
  companySchema,
  selectedSchema,
  postSchema,
  briefSchema,
  draftSchema,
} from "../shared/schemas.mjs";

function fail(status, message) {
  throw Object.assign(new Error(message), { status });
}
function requireCompany(store, id) {
  const company = store.company(id);
  if (!company) fail(404, "Şirket bulunamadı.");
  return company;
}
function requireMedia(store, id, companyId) {
  if (!id) return null;
  const media = store.media(id);
  if (!media || media.companyId !== companyId)
    fail(400, "Görsel bu şirkete ait değil.");
  return media;
}
function validatePosts(posts, selected, requireAll = false) {
  if (new Set(posts.map((p) => p.platform)).size !== posts.length)
    fail(400, "Bir platform birden fazla kez bulunamaz.");
  if (posts.some((p) => !selected.includes(p.platform)))
    fail(400, "Sonuçlarda seçilmemiş bir platform var.");
  if (
    requireAll &&
    (posts.length !== selected.length ||
      selected.some((id) => !posts.some((p) => p.platform === id)))
  )
    fail(400, "ChatGPT sonucu seçili platformların tamamını içermeli.");
}

export function createApp({
  dataDir = path.resolve("data"),
  distDir = path.resolve("dist"),
} = {}) {
  const store = createStore(dataDir);
  const mediaDir = path.join(dataDir, "media");
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    const host = req.hostname;
    if (!["127.0.0.1", "localhost", "[::1]", "::1"].includes(host))
      return res
        .status(403)
        .json({ error: "Yalnızca yerel erişim desteklenir." });
    const origin = req.get("origin");
    if (origin) {
      const allowed = [
        `http://127.0.0.1:${req.socket.localPort}`,
        `http://localhost:${req.socket.localPort}`,
        "http://127.0.0.1:5173",
        "http://localhost:5173",
      ];
      if (!allowed.includes(origin))
        return res
          .status(403)
          .json({ error: "İstek kaynağına izin verilmedi." });
    }
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  });
  app.use("/api", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "512kb" }));

  app.get("/api/health", (_req, res) => {
    store.db.prepare("SELECT 1").get();
    res.json({
      ok: true,
      database: "sqlite",
      publishing: false,
      ai: "manual-chatgpt",
    });
  });
  app.get("/api/platforms", (_req, res) => res.json(platforms));
  app.get("/api/companies", (_req, res) => res.json(store.companies()));
  app.post("/api/companies", (req, res) => {
    if (store.companies().length >= 30)
      fail(400, "En fazla 30 şirket ekleyebilirsiniz.");
    res.status(201).json(store.saveCompany(companySchema.parse(req.body)));
  });
  app.put("/api/companies/:id", (req, res) => {
    requireCompany(store, req.params.id);
    res.json(store.saveCompany(companySchema.parse(req.body), req.params.id));
  });
  app.delete("/api/companies/:id", async (req, res) => {
    requireCompany(store, req.params.id);
    const images = store.companyMedia(req.params.id);
    store.deleteCompany(req.params.id);
    await Promise.all(
      images.map((m) => rm(path.join(mediaDir, m.file), { force: true })),
    );
    res.status(204).end();
  });

  app.post("/api/prepare", (req, res) => {
    const brief = briefSchema.parse(req.body);
    const company = requireCompany(store, brief.companyId);
    requireMedia(store, brief.mediaId, brief.companyId);
    res.json({ posts: adaptWithRules({ company, ...brief }), source: "rules" });
  });
  app.post("/api/prompt", (req, res) => {
    const brief = briefSchema.parse(req.body);
    const company = requireCompany(store, brief.companyId);
    requireMedia(store, brief.mediaId, brief.companyId);
    res.json({
      prompt: createPrompt({
        company,
        ...brief,
        hasMedia: Boolean(brief.mediaId),
      }),
    });
  });
  app.post("/api/import", (req, res) => {
    const input = z
      .object({
        companyId: z.uuid(),
        selected: selectedSchema,
        result: z.string().max(200000),
      })
      .parse(req.body);
    requireCompany(store, input.companyId);
    let parsed;
    try {
      parsed = JSON.parse(
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
      .parse(parsed);
    validatePosts(posts, input.selected, true);
    res.json({ posts, source: "chatgpt-import" });
  });

  app.get("/api/drafts", (req, res) => {
    const id = z.uuid().parse(req.query.companyId);
    requireCompany(store, id);
    res.json(store.drafts(id));
  });
  app.get("/api/drafts/:id", (req, res) => {
    const draft = store.draft(req.params.id);
    if (!draft) fail(404, "Taslak bulunamadı.");
    res.json(draft);
  });
  const saveDraft = (req, res) => {
    const input = draftSchema.parse(req.body);
    requireCompany(store, input.companyId);
    requireMedia(store, input.mediaId, input.companyId);
    validatePosts(input.posts, input.selected);
    if (req.params.id) {
      const previous = store.draft(req.params.id);
      if (!previous) fail(404, "Taslak bulunamadı.");
      if (previous.companyId !== input.companyId)
        fail(400, "Taslak farklı bir şirkete taşınamaz.");
    }
    res
      .status(req.params.id ? 200 : 201)
      .json(store.saveDraft(input, req.params.id));
  };
  app.post("/api/drafts", saveDraft);
  app.put("/api/drafts/:id", saveDraft);
  app.delete("/api/drafts/:id", (req, res) => {
    if (!store.draft(req.params.id)) fail(404, "Taslak bulunamadı.");
    store.deleteDraft(req.params.id);
    res.status(204).end();
  });
  app.get("/api/drafts/:id/export", (req, res) => {
    const draft = store.draft(req.params.id);
    if (!draft) fail(404, "Taslak bulunamadı.");
    const company = requireCompany(store, draft.companyId);
    const posts = draft.posts.map((p) => ({
      ...p,
      warnings: postWarnings(p, Boolean(draft.mediaId)),
      mediaDownloadPath: draft.mediaId
        ? `/api/media/${draft.mediaId}/${p.platform}.jpg?fit=${draft.mediaFit}`
        : null,
    }));
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="sosyal-studio-${draft.id}.json"`,
    );
    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      company,
      name: draft.name,
      sourceText: draft.text,
      published: false,
      note: "Hazırlık paketidir. Medya bağlantıları bu yerel uygulamada çalışır; görselleri ayrıca indirin. Gerçek yayınlama ve sağlayıcı doğrulaması yapılmadı.",
      posts,
    });
  });

  app.post(
    "/api/media",
    express.raw({
      type: ["image/jpeg", "image/png", "image/webp"],
      limit: "15mb",
    }),
    async (req, res) => {
      const companyId = z.uuid().parse(req.query.companyId);
      requireCompany(store, companyId);
      if (!Buffer.isBuffer(req.body) || !req.body.length)
        fail(415, "JPEG, PNG veya WebP görsel gönderin (en fazla 15 MB).");
      if (store.companyMedia(companyId).length >= 200)
        fail(400, "Şirket başına 200 görsel sınırına ulaşıldı.");
      let output;
      try {
        const image = sharp(req.body, {
          limitInputPixels: 40_000_000,
          animated: false,
        });
        const metadata = await image.metadata();
        if (
          !["jpeg", "png", "webp"].includes(metadata.format) ||
          (metadata.pages ?? 1) > 1
        )
          fail(
            415,
            "Yalnızca tek kare JPEG, PNG ve WebP görseller desteklenir.",
          );
        output = await image
          .rotate()
          .resize({
            width: 4000,
            height: 4000,
            fit: "inside",
            withoutEnlargement: true,
          })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: 90 })
          .toBuffer({ resolveWithObject: true });
      } catch (error) {
        if (error.status) throw error;
        fail(
          400,
          "Görsel okunamadı. Dosyayı veya 40 megapiksel sınırını kontrol edin.",
        );
      }
      await mkdir(mediaDir, { recursive: true, mode: 0o700 });
      const file = `${randomUUID()}.jpg`;
      await writeFile(path.join(mediaDir, file), output.data, { mode: 0o600 });
      res.status(201).json(
        store.saveMedia({
          companyId,
          file,
          width: output.info.width,
          height: output.info.height,
        }),
      );
    },
  );
  app.get("/api/media/:id", (req, res) => {
    const media = store.media(req.params.id);
    if (!media) fail(404, "Görsel bulunamadı.");
    res.json(media);
  });
  app.get("/api/media/:id/:target", async (req, res) => {
    const media = store.media(req.params.id);
    if (!media) fail(404, "Görsel bulunamadı.");
    const target = req.params.target.replace(/\.jpg$/, "");
    const p = target === "original" ? null : platformMap[target];
    if (target !== "original" && !p) fail(404, "Görsel boyutu bulunamadı.");
    const fit = req.query.fit === "cover" ? "cover" : "contain";
    let image = sharp(await readFile(path.join(mediaDir, media.file)));
    if (p)
      image = image.resize(p.width, p.height, { fit, background: "#ffffff" });
    res.type("jpg");
    if (req.query.download === "1")
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${target}-${p ? `${p.width}x${p.height}` : "original"}.jpg"`,
      );
    res.send(await image.jpeg({ quality: 88 }).toBuffer());
  });

  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "İşlem bulunamadı." }),
  );
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get("/{*path}", (_req, res) =>
      res.sendFile(path.join(distDir, "index.html")),
    );
  }
  app.use((error, _req, res, _next) => {
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join("\n"),
      });
    if (error.type === "entity.too.large")
      return res
        .status(413)
        .json({ error: "Dosya veya metin boyutu sınırı aşıldı." });
    if (error instanceof SyntaxError && "body" in error)
      return res.status(400).json({ error: "Geçersiz JSON isteği." });
    if (!error.status || error.status >= 500)
      console.error("İşlem hatası:", error.message);
    res.status(error.status ?? 500).json({
      error:
        error.status && error.status < 500
          ? error.message
          : "İşlem tamamlanamadı. Sunucu kayıtlarını kontrol edin.",
    });
  });
  return { app, store };
}

import { z } from "zod";
import { bodyLimit } from "hono/body-limit";
import { selectedSchema } from "../shared/schemas.mjs";
import { computerBroker } from "./company-computer.mjs";
import { computerError } from "../shared/computer-protocol.mjs";
import {
  LOCAL_MODEL,
  LOCAL_EXPERT_VERSION,
  LOCAL_AI_LIMITS,
  localErrors,
  localInput,
  localPost,
} from "../shared/local-ai.mjs";
import { visionImage } from "./ai-vision.mjs";

export function registerLocalAI(app) {
  app.use(
    "/api/computer/ai/*",
    bodyLimit({
      maxSize: 32000,
      onError: (c) => c.json({ error: "Yerel AI isteği çok büyük." }, 413),
    }),
  );
  async function call(c, input) {
    const device = await c.env.DB.prepare(
      "SELECT d.id FROM company_computers d JOIN users u ON u.id=d.created_by WHERE d.revoked_at IS NULL AND u.role='admin' AND u.enabled=1 LIMIT 1",
    ).first();
    if (!device)
      throw computerError(
        409,
        "Önce Hesap bağlantıları bölümünden şirket bilgisayarını eşleştirin.",
      );
    const response = await computerBroker(c.env, {
      action: "local-ai",
      input,
      userId: c.get("identity").id,
      deviceId: device.id,
    });
    const value = await response.json();
    if (!response.ok)
      throw computerError(
        response.status,
        value.error || "Yerel AI bağlantısı kurulamadı.",
      );
    if (!value.ok)
      throw computerError(
        value.code === "BUSY" ? 409 : 503,
        localErrors[value.code] || localErrors.FAILED,
      );
    return value;
  }
  app.get("/api/computer/ai/status", async (c) =>
    c.json((await call(c, { action: "status" })).status),
  );
  app.post("/api/computer/ai/setup", async (c) =>
    c.json((await call(c, { action: "setup" })).status, 202),
  );
  app.post("/api/computer/ai/ask", async (c) => {
    const input = z
      .object({
        companyId: z.uuid(),
        question: z.string().trim().min(1).max(6000),
        mode: z.enum(["chat", "posts"]),
        selected: selectedSchema.optional(),
        mediaId: z.uuid().nullable().default(null),
      })
      .parse(await c.req.json());
    const profile = await c.get("store").company(input.companyId);
    if (!profile) throw computerError(404, "Şirket bulunamadı.");
    if (input.mode === "posts" && !input.selected)
      throw computerError(400, "İçerik için platform seçin.");
    const media = input.mediaId
      ? await c.get("store").media(input.mediaId)
      : null;
    if (input.mediaId && (!media || media.companyId !== input.companyId))
      throw computerError(400, "Görsel seçili şirkete ait değil.");
    let image = null;
    if (media) {
      const dataUrl = await visionImage(c.env, media);
      image = dataUrl.split(",")[1];
      if (image.length > Math.ceil(LOCAL_AI_LIMITS.imageBytes / 3) * 4)
        throw computerError(
          413,
          "Küçük model için görsel en fazla 600 KB olmalı. Yerel AI seçiliyken görseli yeniden yükleyin.",
        );
    }
    const { results: rows } = await c.env.DB.prepare(
      "SELECT kind,title,body FROM ai_memory WHERE company_id=? ORDER BY created_at,id",
    )
      .bind(input.companyId)
      .all();
    const { name, handle, website, tone, audience, keywords } = profile;
    let payload;
    try {
      payload = localInput({
        action: "generate",
        companyId: input.companyId,
        profile: { name, handle, website, tone, audience, keywords },
        entries: rows,
        question: input.question,
        mode: input.mode,
        selected: input.selected || ["instagram"],
        image,
      });
    } catch {
      throw computerError(
        400,
        "Yerel AI bağlamı çok uzun veya geçersiz. Özet ve şirket hafızasını kısaltın.",
      );
    }
    const result = await call(c, payload);
    if (
      result.companyId !== input.companyId ||
      typeof result.answer !== "string" ||
      !result.answer.trim()
    )
      throw computerError(
        502,
        "Yerel modelin şirketi veya yanıtı doğrulanamadı.",
      );
    if (
      media &&
      (typeof result.observation !== "string" ||
        !result.observation.trim() ||
        result.observation.length > 4000)
    )
      throw computerError(
        502,
        "Görsel gözlemi doğrulanamadı. Önceki içerik korundu.",
      );
    let posts = null;
    if (input.mode === "posts") {
      if (
        !Array.isArray(result.posts) ||
        result.posts.length !== input.selected.length ||
        new Set(result.posts.map((p) => p.platform)).size !==
          input.selected.length
      )
        throw computerError(502, "Seçili platformların tamamı hazırlanamadı.");
      posts = input.selected.map((platform) => {
        const p = result.posts.find((p) => p.platform === platform);
        if (!p) throw computerError(502, "Platform yanıtı eksik.");
        try {
          return localPost(JSON.stringify(p), platform, Boolean(media));
        } catch {
          throw computerError(
            502,
            "Yerel modelin biçimi veya platform sınırları doğrulanamadı. Önceki içerik korundu.",
          );
        }
      });
      const captions = posts.map((p) =>
        p.caption
          .normalize("NFKC")
          .trim()
          .replace(/\s+/gu, " ")
          .toLocaleLowerCase("tr-TR"),
      );
      if (new Set(captions).size !== posts.length)
        throw computerError(
          502,
          "Model bazı platformlara aynı metni yazdı. Önceki içerik korundu.",
        );
    }
    const userId = c.get("identity").id,
      id = crypto.randomUUID(),
      createdAt = new Date().toISOString();
    const observation =
      media && typeof result.observation === "string"
        ? result.observation
        : null;
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO ai_turns(id,company_id,user_id,question,answer,posts,created_at,media_id,image_observation,expert_version,engine,model) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      ).bind(
        id,
        input.companyId,
        userId,
        input.question,
        result.answer,
        posts ? JSON.stringify(posts) : null,
        createdAt,
        input.mediaId,
        observation,
        LOCAL_EXPERT_VERSION,
        "local",
        LOCAL_MODEL,
      ),
      c.env.DB.prepare(
        "DELETE FROM ai_turns WHERE company_id=? AND user_id=? AND id NOT IN (SELECT id FROM ai_turns WHERE company_id=? AND user_id=? ORDER BY created_at DESC,id DESC LIMIT 20)",
      ).bind(input.companyId, userId, input.companyId, userId),
    ]);
    return c.json({
      id,
      companyId: input.companyId,
      question: input.question,
      answer: result.answer,
      posts,
      createdAt,
      mediaId: input.mediaId,
      imageObservation: observation,
      expertVersion: LOCAL_EXPERT_VERSION,
      model: LOCAL_MODEL,
      engine: "local",
      published: false,
      reservedNeurons: 0,
    });
  });
}

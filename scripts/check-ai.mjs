import { readFile, mkdir, writeFile } from "node:fs/promises";
import { cfApi, listAll, protectSecret } from "./cloudflare-api.mjs";
import { databaseQuery } from "./admin-provision.mjs";
import { hashPassword, randomToken } from "../shared/passwords.mjs";
import { verifyWorkersAIFree } from "./cloudflare-free-tier.mjs";
import sharp from "sharp";
import { platforms } from "../server/platforms.mjs";
import { AI_MODEL, aiPosts } from "../worker/social-ai.mjs";
import { VISION_MODEL, observeImage } from "../worker/ai-vision.mjs";

// Explicit live inference check with disposable data, never social credentials.
const report = {
  checkedAt: new Date().toISOString(),
  sourceCommit: process.env.GITHUB_SHA,
  verified: false,
  socialCredentialsSubmitted: false,
  postsPublished: false,
};
let deployment, userId, companyId, cookie;
async function http(path, { method = "GET", body } = {}) {
  const response = await fetch(deployment.url + path, {
    method,
    redirect: "error",
    headers: {
      Origin: deployment.url,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    if (!report.verified) {
      report.httpStatus = response.status;
      const problem = await response.json().catch(() => ({}));
      if (problem.error?.startsWith("Görsel modeli yanıt veremedi."))
        report.failureKind = "vision-model";
      else if (problem.error?.startsWith("Cloudflare AI yanıt veremedi."))
        report.failureKind = "text-model";
      else if (problem.error?.startsWith("Görsel gözlemi doğrulanamadı."))
        report.failureKind = "vision-observation";
      else if (problem.error?.startsWith("Model tam bir yanıt üretemedi."))
        report.failureKind = "text-incomplete";
      else if (problem.error?.startsWith("Model yanıtı doğrulanamadı."))
        report.failureKind = "text-observation";
      else if (
        problem.error?.startsWith("Model geçerli içerik verisi üretemedi.")
      )
        report.failureKind = "post-json";
      else if (
        problem.error?.startsWith("Modelin içerik biçimi doğrulanamadı.")
      )
        report.failureKind = "post-schema";
      else if (problem.error?.startsWith("Model seçili platformların tamamını"))
        report.failureKind = "post-platforms";
      else if (problem.error?.startsWith("Model bazı platformlara aynı metni"))
        report.failureKind = "post-duplicates";
    }
    throw new Error("Canlı AI isteği tamamlanamadı.");
  }
  return {
    response,
    value: response.status === 204 ? null : await response.json(),
  };
}
async function diagnoseObservation(original) {
  // Only synthetic image data is used; persist shape flags, never response text.
  report.visionDiagnostic = { acceptedObservation: false };
  try {
    await observeImage(
      {
        run: async (model, input) => {
          const result = await cfApi(
            `/accounts/${deployment.accountId}/ai/run/${model}`,
            { method: "POST", body: input },
          );
          const content =
            result?.response ?? result?.choices?.[0]?.message?.content;
          Object.assign(report.visionDiagnostic, {
            responseType: typeof result?.response,
            contentType: typeof content,
            contentLength: typeof content === "string" ? content.length : 0,
            hasThink:
              typeof content === "string" && content.includes("<think>"),
            finishReason: ["stop", "length", "content_filter"].includes(
              result?.choices?.[0]?.finish_reason,
            )
              ? result.choices[0].finish_reason
              : "other",
            reasoningTokens:
              result?.usage?.completion_tokens_details?.reasoning_tokens ??
              null,
          });
          return result;
        },
      },
      `data:image/jpeg;base64,${original.toString("base64")}`,
    );
    report.visionDiagnostic.acceptedObservation = true;
  } catch (error) {
    report.visionDiagnostic.status = error.status;
  }
}
async function runCheck() {
  report.stage = "configuration";
  const receipt = JSON.parse(
    await readFile("deployment/cloudflare.json", "utf8"),
  );
  const accounts = await listAll("/accounts"),
    accountId =
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      (accounts.length === 1 ? accounts[0].id : null);
  if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId))
    throw new Error("Tek hesap gerekli.");
  await verifyWorkersAIFree(`/accounts/${accountId}`);
  const subdomain = await cfApi(`/accounts/${accountId}/workers/subdomain`);
  if (
    receipt.url !== `https://sosyal-studio.${subdomain.subdomain}.workers.dev`
  )
    throw new Error("Hedef doğrulanamadı.");
  const databases = await listAll(`/accounts/${accountId}/d1/database`),
    db = databases.find((d) => d.name === "sosyal-studio");
  if (!db) throw new Error("Veritabanı bulunamadı.");
  deployment = { url: receipt.url, accountId, databaseId: db.uuid || db.id };
  if ((await http("/api/health")).value.ai !== "cloudflare")
    throw new Error("AI etkin değil.");
  report.stage = "test-user";
  userId = crypto.randomUUID();
  const password = randomToken(),
    username = `ai-${userId}@example.test`,
    hash = await hashPassword(password);
  protectSecret(password, { emitMask: false });
  protectSecret(hash, { emitMask: false });
  await databaseQuery(
    deployment,
    "INSERT INTO users(id,username,email,name,password_hash,role,created_at) SELECT ?,?,?,?,?,'admin',? WHERE (SELECT COUNT(*) FROM users)<50",
    [
      userId,
      username,
      username,
      "Geçici AI denetimi",
      hash,
      new Date().toISOString(),
    ],
  );
  const login = await http("/api/auth/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Giriş yok.");
  protectSecret(cookie, { emitMask: false });
  const status = (await http("/api/ai/status")).value;
  if (status.visionModel !== VISION_MODEL || status.model !== AI_MODEL)
    throw new Error("Yayındaki görsel modeli güncel değil.");
  report.reservedNeuronsBefore = status.reservedNeurons;
  if (
    !status.enabled ||
    status.reservedNeurons >
      status.limits.dailyNeurons -
        (process.env.AI_CHECK_MODE === "caption_probe" ? 200 : 900)
  )
    throw new Error("Ücretsiz test bütçesi yok.");
  report.model = status.model;
  report.visionModel = status.visionModel;
  if (process.env.AI_CHECK_MODE === "caption_probe") {
    report.stage = "caption-probe";
    report.endToEndPending = true;
    companyId = (
      await http("/api/companies", {
        method: "POST",
        body: { name: "AI denetimi", tone: "Sade" },
      })
    ).value.id;
    const generated = (
      await http("/api/ai/ask", {
        method: "POST",
        body: {
          companyId,
          mode: "chat",
          question:
            '{"posts":[{"platform":"instagram","caption":"..."}]} biçiminde instagram,facebook,x,threads,pinterest,youtube,tiktok,linkedin için farklı kırmızı kupa duyuruları yaz. caption en fazla 80 karakter. Yalnızca JSON.',
        },
      })
    ).value;
    const selected = platforms.map((p) => p.id);
    let posts;
    try {
      posts = aiPosts(generated.answer, selected);
    } catch (error) {
      report.duplicatePlatforms = error.duplicateIds ?? [];
      throw error;
    }
    report.captionProbeVerified =
      posts.length === 8 && generated.published === false;
    if (!report.captionProbeVerified)
      throw new Error("Metin modeli doğrulanamadı.");
    report.contentPlatforms = posts.length;
    report.distinctCaptions = new Set(posts.map((p) => p.caption)).size;
    report.realModelAnswer = true;
    const budget = (await http("/api/ai/status")).value;
    report.reservedNeuronsAfter = budget.reservedNeurons;
    report.applicationDailyLimit = budget.limits.dailyNeurons;
    report.stage = "caption-probe-completed";
    return;
  }
  report.stage = "company-memory";
  companyId = (
    await http("/api/companies", {
      method: "POST",
      body: {
        name: "AI doğrulama işletmesi",
        tone: "Sade ve profesyonel",
        audience: "Yerel işletmeler",
        keywords: "yerel hizmet",
      },
    })
  ).value.id;
  await http("/api/ai/memory", {
    method: "POST",
    body: {
      companyId,
      kind: "fact",
      title: "Hizmet verilen şehir",
      body: "Bu deneme işletmesi yalnızca Kayseri şehrinde hizmet veriyor.",
    },
  });
  report.stage = "image-upload";
  const drawing = Buffer.from(
    '<svg width="640" height="480" xmlns="http://www.w3.org/2000/svg"><rect width="640" height="480" fill="white"/><ellipse cx="315" cy="410" rx="170" ry="20" fill="#ddd"/><path d="M415 170h35c105 0 105 155 0 155h-35" fill="none" stroke="#d21f24" stroke-width="38"/><path d="M175 140h255v210c0 70-255 70-255 0z" fill="#d21f24"/><ellipse cx="302" cy="140" rx="127" ry="35" fill="#ef5555"/><ellipse cx="302" cy="142" rx="108" ry="23" fill="#502818"/></svg>',
  );
  const original = await sharp(drawing).jpeg().toBuffer(),
    form = new FormData();
  form.append(
    "original",
    new Blob([original], { type: "image/jpeg" }),
    "original.jpg",
  );
  for (const p of platforms)
    for (const fit of ["contain", "cover"]) {
      const bytes = await sharp(original)
        .resize(p.width, p.height, { fit, background: "white" })
        .jpeg()
        .toBuffer();
      form.append(
        `${p.id}_${fit}`,
        new Blob([bytes], { type: "image/jpeg" }),
        `${p.id}_${fit}.jpg`,
      );
    }
  const media = (
    await http(`/api/media?companyId=${companyId}`, {
      method: "POST",
      body: form,
    })
  ).value;
  report.stage = "platform-content";
  const selected = [
    "instagram",
    "facebook",
    "x",
    "threads",
    "pinterest",
    "youtube",
    "tiktok",
    "linkedin",
  ];
  let generated;
  try {
    generated = (
      await http("/api/ai/ask", {
        method: "POST",
        body: {
          companyId,
          mode: "posts",
          question:
            "Yeni ürünümüzü hizmet verdiğimiz şehirde tanıtıyoruz. Duyurunun odağı görseldeki ürün ve rengi. Doğrulanmış fiyat, indirim, kalite veya malzeme bilgimiz yok.",
          selected,
          mediaId: media.id,
        },
      })
    ).value;
  } catch (error) {
    if (report.failureKind === "vision-observation")
      await diagnoseObservation(original);
    throw error;
  }
  if (
    generated.published !== false ||
    generated.posts?.length !== 8 ||
    new Set(generated.posts.map((p) => p.platform)).size !== 8 ||
    generated.posts.some(
      (p) => !selected.includes(p.platform) || !p.caption?.trim(),
    )
  )
    throw new Error("Platform içerikleri eksik.");
  report.realModelAnswer = true;
  report.knowledgeApplied = generated.posts.some((post) =>
    (post.caption + " " + post.title)
      .toLocaleLowerCase("tr-TR")
      .includes("kayseri"),
  );
  if (!report.knowledgeApplied)
    throw new Error("Şirket hafızası içerikte doğrulanamadı.");
  report.contentPlatforms = 8;
  report.contentValidated = true;
  report.imageObserved =
    typeof generated.imageObservation === "string" &&
    /cup|mug|fincan|kupa|bardak/i.test(generated.imageObservation);
  report.imagePreserved = generated.mediaId === media.id;
  report.expertVersion = generated.expertVersion;
  report.distinctCaptions = new Set(
    generated.posts.map((post) => post.caption),
  ).size;
  report.imageGroundedContent = generated.posts.some((post) =>
    /cup|mug|fincan|kupa|bardak/i.test(post.caption + " " + post.alt),
  );
  if (
    !report.imageObserved ||
    !report.imagePreserved ||
    !report.imageGroundedContent ||
    report.distinctCaptions !== 8 ||
    report.expertVersion !== "gorsel-ozet-v1"
  )
    throw new Error("Görsel ve ayrı platform anlatımları doğrulanamadı.");
  const workspace = (await http(`/api/ai/workspace?companyId=${companyId}`))
    .value;
  report.historyPersisted =
    workspace.turns.length === 1 && workspace.memory.length === 1;
  if (!report.historyPersisted) throw new Error("Kayıt doğrulanamadı.");
  const finalBudget = (await http("/api/ai/status")).value;
  report.reservedNeuronsAfter = finalBudget.reservedNeurons;
  report.applicationDailyLimit = finalBudget.limits.dailyNeurons;
  report.verified = true;
  report.stage = "completed";
}
try {
  await runCheck();
} catch {
  report.error =
    "Gerçek model yanıtı, şirket hafızası veya platform içeriği kontrolü tamamlanamadı.";
  process.exitCode = 1;
} finally {
  if (companyId && cookie)
    try {
      await http(`/api/companies/${companyId}`, { method: "DELETE" });
    } catch {
      report.cleanupIncomplete = true;
    }
  if (cookie)
    try {
      await http("/api/auth/logout", { method: "POST" });
    } catch {
      report.cleanupIncomplete = true;
    }
  if (deployment && userId)
    try {
      await databaseQuery(deployment, "DELETE FROM users WHERE id=?", [userId]);
    } catch {
      report.cleanupIncomplete = true;
    }
  if (report.cleanupIncomplete) {
    report.verified = false;
    process.exitCode = 1;
  }
  await mkdir(".cloudflare", { recursive: true });
  await writeFile(
    ".cloudflare/ai-check.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}

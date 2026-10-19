import { readFile, mkdir, writeFile } from "node:fs/promises";
import { cfApi, listAll, protectSecret } from "./cloudflare-api.mjs";
import { databaseQuery } from "./admin-provision.mjs";
import { hashPassword, randomToken } from "../shared/passwords.mjs";
import { verifyWorkersAIFree } from "./cloudflare-free-tier.mjs";

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
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    if (!report.verified) report.httpStatus = response.status;
    throw new Error("Canlı AI isteği tamamlanamadı.");
  }
  return {
    response,
    value: response.status === 204 ? null : await response.json(),
  };
}
try {
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
  if (
    !status.enabled ||
    status.reservedNeurons > status.limits.dailyNeurons - 1000
  )
    throw new Error("Ücretsiz test bütçesi yok.");
  report.model = status.model;
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
  report.stage = "model-answer";
  const chat = (
    await http("/api/ai/ask", {
      method: "POST",
      body: {
        companyId,
        mode: "chat",
        question:
          "İşletmemiz hangi şehirde hizmet veriyor? Şirket hafızasına göre yalnızca şehir adını yaz.",
      },
    })
  ).value;
  if (
    typeof chat.answer !== "string" ||
    !chat.answer.toLocaleLowerCase("tr-TR").includes("kayseri") ||
    chat.published !== false
  )
    throw new Error("Şirket hafızası uygulanmadı.");
  report.knowledgeApplied = true;
  report.realModelAnswer = true;
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
  const generated = (
    await http("/api/ai/ask", {
      method: "POST",
      body: {
        companyId,
        mode: "posts",
        question:
          "Kayseri'deki yerel işletmelere hizmet verdiğimizi duyur. Fiyat, indirim veya ürün özelliği uydurma. Her platform için kısa tanıtım metni hazırla.",
        selected,
      },
    })
  ).value;
  if (
    generated.published !== false ||
    generated.posts?.length !== 8 ||
    new Set(generated.posts.map((p) => p.platform)).size !== 8 ||
    generated.posts.some(
      (p) => !selected.includes(p.platform) || !p.caption?.trim(),
    )
  )
    throw new Error("Platform içerikleri eksik.");
  report.contentPlatforms = 8;
  report.contentValidated = true;
  const workspace = (await http(`/api/ai/workspace?companyId=${companyId}`))
    .value;
  report.historyPersisted =
    workspace.turns.length === 2 && workspace.memory.length === 1;
  if (!report.historyPersisted) throw new Error("Kayıt doğrulanamadı.");
  report.verified = true;
  report.stage = "completed";
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

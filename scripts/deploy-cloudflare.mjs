import { spawnSync } from "node:child_process";
import { STUDIO_VERSION } from "../shared/features.mjs";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { provisionCloudflare } from "./provision-cloudflare.mjs";
import { smokeCloudflare } from "./smoke-cloudflare.mjs";
import {
  applyAdminRequest,
  prepareAdminKey,
  databaseQuery,
} from "./admin-provision.mjs";
import { detachLegacyAccess } from "./password-deployment.mjs";
import { safeMessage } from "./cloudflare-api.mjs";
import { ensureBrowserSecret } from "./browser-secret.mjs";

const receipt = {
  status: "running",
  source_commit: process.env.GITHUB_SHA || null,
  workflow_url:
    process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  updated_at: new Date().toISOString(),
  url: null,
};
function wrangler(args) {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/wrangler.mjs",
      ...args,
      "--config",
      ".cloudflare/wrangler.deploy.json",
    ],
    { stdio: "inherit", env: process.env },
  );
  if (result.status !== 0)
    throw new Error(
      `Wrangler ${args[0]} başarısız oldu. Actions kayıtlarını inceleyin.`,
    );
}
try {
  const deployment = await provisionCloudflare();
  receipt.zero_trust = deployment.zeroTrust;
  receipt.workers_ai = deployment.workersAI;
  receipt.url = deployment.url;
  wrangler(["d1", "migrations", "apply", "DB", "--remote"]);
  const adminVerification = await applyAdminRequest(deployment);
  if (
    !(
      await databaseQuery(
        deployment,
        "SELECT id FROM users WHERE role='admin' AND enabled=1 LIMIT 1",
      )
    ).length
  )
    throw new Error(
      "Yetkili yönetici hesabı bulunamadı; şifreli giriş sürümü yayımlanmadı.",
    );
  await prepareAdminKey(deployment);
  wrangler(["deploy"]);
  await ensureBrowserSecret(deployment);
  await detachLegacyAccess(deployment);
  receipt.social_profiles = await smokeCloudflare(
    deployment,
    adminVerification,
  );
  receipt.status = "success";
  receipt.verified = true;
  receipt.components = {
    worker: deployment.worker,
    database: "Cloudflare D1",
    media: deployment.mediaStorage === "d1" ? "Cloudflare D1" : "Cloudflare R2",
    login: "Kullanıcı adı ve şifre — D1 oturumları",
    socialBrowser: "Cloudflare Browser Run — deneysel hesap girişi",
    companyComputer:
      `Windows Firefox ${STUDIO_VERSION} — şirket başına tek pencere, sosyal ağ sekmeleri, kalıcı profiller ve yerel AI; gerçek hesap/model kontrolü bilgisayarda yapılmalı`,
    ai: "Cloudflare Workers AI — görsel + özet, platform metinleri ve şirket hafızası",
    knowledge:
      "KKTC profili, kanıtlı kaynak onayı, şirket erişimleri ve kalite defteri",
    publishing:
      "Aynı Firefox penceresinde dokuz platform için onaylı fotoğraf/metin kuyruğu ve yeni gönderi bağlantısı denetimi; gerçek sosyal hesapta henüz doğrulanmadı. Eski Facebook pilotu ayrıca korunur.",
  };
  if (process.env.GITHUB_STEP_SUMMARY)
    await appendFile(
      process.env.GITHUB_STEP_SUMMARY,
      `## Sosyal Studio yayında\n\n${deployment.url}\n\nD1, görsel depolaması, arayüz ve giriş koruması doğrulandı.\n`,
    );
} catch (error) {
  receipt.status = "failed";
  receipt.verified = false;
  receipt.error = safeMessage(error.message);
  console.error(receipt.error);
  process.exitCode = 1;
} finally {
  await mkdir(".cloudflare", { recursive: true });
  await writeFile(
    ".cloudflare/deployment.json",
    JSON.stringify(receipt, null, 2) + "\n",
  );
}

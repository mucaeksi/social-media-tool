import { spawnSync } from "node:child_process";
import { mkdir, writeFile, appendFile } from "node:fs/promises";
import { provisionCloudflare } from "./provision-cloudflare.mjs";
import { smokeCloudflare } from "./smoke-cloudflare.mjs";
import { safeMessage } from "./cloudflare-api.mjs";

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
  receipt.url = deployment.url;
  wrangler(["d1", "migrations", "apply", "DB", "--remote"]);
  wrangler(["deploy"]);
  await smokeCloudflare(deployment);
  receipt.status = "success";
  receipt.verified = true;
  receipt.components = {
    worker: deployment.worker,
    database: "Cloudflare D1",
    media: deployment.mediaStorage === "d1" ? "Cloudflare D1" : "Cloudflare R2",
    login: "Cloudflare Access — doğrulanmış tüm e-postalar",
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

import { mkdir, writeFile } from "node:fs/promises";
import { cfApi, listAll } from "./cloudflare-api.mjs";
import {
  verifyZeroTrustFree,
  verifyWorkersAIFree,
} from "./cloudflare-free-tier.mjs";

export async function provisionCloudflare() {
  const name = "sosyal-studio",
    databaseName = "sosyal-studio",
    bucketName = "sosyal-studio-media";
  let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!accountId) {
    const accounts = await listAll("/accounts");
    if (accounts.length !== 1)
      throw new Error(
        `Token ${accounts.length} hesaba erişiyor. Hedef hesap için GitHub repository variable CLOUDFLARE_ACCOUNT_ID ayarlayın.`,
      );
    accountId = accounts[0].id;
  }
  if (!/^[a-f0-9]{32}$/i.test(accountId))
    throw new Error("Cloudflare hesap kimliği geçersiz.");
  const base = `/accounts/${accountId}`;
  const existingWorker = await cfApi(
    `${base}/workers/scripts/${name}/settings`,
    { allow404: true },
  );
  if (
    existingWorker &&
    !existingWorker.bindings?.some(
      (binding) =>
        binding.name === "APPLICATION_ID" &&
        binding.text === "mucaeksi/social-media-tool",
    )
  ) {
    throw new Error(
      "Aynı adlı Worker başka bir uygulamaya ait; üzerine yazılmadı.",
    );
  }
  const zeroTrust = await verifyZeroTrustFree(base);
  const workersAI = await verifyWorkersAIFree(base);
  const databases = await listAll(`${base}/d1/database`);
  let db = databases.find((item) => item.name === databaseName);
  if (!db) {
    db = await cfApi(`${base}/d1/database`, {
      method: "POST",
      body: { name: databaseName },
    });
    console.log("D1 veritabanı oluşturuldu.");
  }
  const databaseId = db.uuid || db.id;
  if (!databaseId) throw new Error("D1 veritabanı kimliği alınamadı.");
  let mediaStorage = "r2";
  try {
    const bucket = await cfApi(`${base}/r2/buckets/${bucketName}`, {
      allow404: true,
    });
    if (!bucket) {
      await cfApi(`${base}/r2/buckets`, {
        method: "POST",
        body: { name: bucketName },
      });
      console.log("R2 görsel deposu oluşturuldu.");
    }
  } catch (error) {
    if (!error.codes?.includes(10042)) throw error;
    mediaStorage = "d1";
    console.log(
      "R2 hesapta etkin değil. Görseller Cloudflare D1 üzerinde saklanacak.",
    );
  }
  let subdomain = await cfApi(`${base}/workers/subdomain`, { allow404: true });
  if (!subdomain?.subdomain)
    subdomain = await cfApi(`${base}/workers/subdomain`, {
      method: "PUT",
      body: { subdomain: `sosyalstudio-${accountId.slice(0, 12)}` },
    });
  if (!/^[a-z0-9-]+$/.test(subdomain?.subdomain ?? ""))
    throw new Error("Workers alt alan adı alınamadı.");
  const hostname = `${name}.${subdomain.subdomain}.workers.dev`;
  const apps = await listAll(`${base}/access/apps`);
  const application = apps.find((item) => item.domain === hostname);
  if (application && application.name !== "Sosyal Studio")
    throw new Error(
      "Hedef alan adında farklı bir Access uygulaması var; üzerine yazılmadı.",
    );
  const wrangler = {
    name,
    main: "../worker/index.mjs",
    account_id: accountId,
    compatibility_date: "2026-07-01",
    compatibility_flags: ["nodejs_compat"],
    browser: { binding: "BROWSER" },
    ai: { binding: "AI" },
    durable_objects: {
      bindings: [
        { name: "SOCIAL_BROWSER", class_name: "SocialBrowser" },
        { name: "COMPANY_COMPUTER", class_name: "CompanyComputer" },
      ],
    },
    migrations: [
      { tag: "social-browser-v1", new_sqlite_classes: ["SocialBrowser"] },
      { tag: "company-computer-v1", new_sqlite_classes: ["CompanyComputer"] },
    ],
    workers_dev: true,
    preview_urls: false,
    assets: {
      directory: "../dist",
      binding: "ASSETS",
      not_found_handling: "single-page-application",
      run_worker_first: true,
    },
    d1_databases: [
      {
        binding: "DB",
        database_name: databaseName,
        database_id: databaseId,
        migrations_dir: "../migrations",
      },
    ],
    ...(mediaStorage === "r2"
      ? { r2_buckets: [{ binding: "MEDIA", bucket_name: bucketName }] }
      : {}),
    vars: {
      APPLICATION_ID: "mucaeksi/social-media-tool",
      APP_ENV: "production",
      MEDIA_STORAGE: mediaStorage,
      AUTH_MODE: "password",
      AI_FREE_ONLY: "true",
    },
  };
  const deployment = {
    url: `https://${hostname}`,
    accountId,
    databaseId,
    bucketName: mediaStorage === "r2" ? bucketName : null,
    mediaStorage,
    legacyAccessAppId: application?.id ?? null,
    worker: name,
    zeroTrust,
    workersAI,
  };
  await mkdir(".cloudflare", { recursive: true });
  await writeFile(
    ".cloudflare/wrangler.deploy.json",
    JSON.stringify(wrangler, null, 2),
  );
  await writeFile(
    ".cloudflare/resources.json",
    JSON.stringify(deployment, null, 2),
  );
  console.log(
    "Cloudflare veritabanı, görsel deposu, Workers alan adı ve şifreli giriş yapılandırması hazırlandı.",
  );
  return deployment;
}

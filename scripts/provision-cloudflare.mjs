import { mkdir, writeFile } from "node:fs/promises";
import { cfApi, listAll } from "./cloudflare-api.mjs";

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
  const existingWorker = await cfApi(`${base}/workers/scripts/${name}/settings`, { allow404: true });
  if (existingWorker && !existingWorker.bindings?.some((binding) => binding.name === 'APPLICATION_ID' && binding.text === 'mucaeksi/social-media-tool')) {
    throw new Error('Aynı adlı Worker başka bir uygulamaya ait; üzerine yazılmadı.');
  }
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
  let bucket = await cfApi(`${base}/r2/buckets/${bucketName}`, {
    allow404: true,
  });
  if (!bucket) {
    bucket = await cfApi(`${base}/r2/buckets`, {
      method: "POST",
      body: { name: bucketName },
    });
    console.log("R2 görsel deposu oluşturuldu.");
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
  let organization = await cfApi(`${base}/access/organizations`, {
    allow404: true,
  });
  if (!organization)
    organization = await cfApi(`${base}/access/organizations`, {
      method: "POST",
      body: {
        name: "Sosyal Studio",
        auth_domain: `sosyalstudio-${accountId.slice(0, 12)}.cloudflareaccess.com`,
      },
    });
  const teamDomain = organization.auth_domain;
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain ?? ""))
    throw new Error("Cloudflare Zero Trust takım alan adı alınamadı.");
  const providers = await cfApi(`${base}/access/identity_providers`);
  let otp = providers.find((provider) => provider.type === "onetimepin");
  if (!otp)
    otp = await cfApi(`${base}/access/identity_providers`, {
      method: "POST",
      body: { name: "E-posta giriş kodu", type: "onetimepin", config: {} },
    });
  const apps = await listAll(`${base}/access/apps`);
  let application = apps.find((item) => item.domain === hostname);
  if (application && application.name !== "Sosyal Studio")
    throw new Error(
      "Hedef alan adında farklı bir Access uygulaması var; üzerine yazılmadı.",
    );
  const config = {
    name: "Sosyal Studio",
    type: "self_hosted",
    domain: hostname,
    session_duration: "24h",
    allowed_idps: [otp.id],
    auto_redirect_to_identity: false,
  };
  if (!application) {
    application = await cfApi(`${base}/access/apps`, {
      method: "POST",
      body: {
        ...config,
        policies: [
          {
            name: "Doğrulanmış tüm e-postalar",
            decision: "allow",
            include: [{ everyone: {} }],
          },
        ],
      },
    });
  } else {
    application = await cfApi(`${base}/access/apps/${application.id}`, {
      method: "PUT",
      body: config,
    });
    const policies = await cfApi(
      `${base}/access/apps/${application.id}/policies`,
    );
    if (
      !policies.some((policy) => policy.name === "Doğrulanmış tüm e-postalar")
    ) {
      await cfApi(`${base}/access/apps/${application.id}/policies`, {
        method: "POST",
        body: {
          name: "Doğrulanmış tüm e-postalar",
          decision: "allow",
          include: [{ everyone: {} }],
        },
      });
    }
  }
  if (!application.aud || !application.id)
    throw new Error("Access uygulama kimliği alınamadı; dağıtım yapılmadı.");
  const wrangler = {
    name,
    main: "../worker/index.mjs",
    account_id: accountId,
    compatibility_date: "2026-07-01",
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
    r2_buckets: [{ binding: "MEDIA", bucket_name: bucketName }],
    vars: {
      APPLICATION_ID: 'mucaeksi/social-media-tool',
      APP_ENV: "production",
      ACCESS_TEAM_DOMAIN: teamDomain,
      ACCESS_AUD: application.aud,
    },
  };
  const deployment = {
    url: `https://${hostname}`,
    accountId,
    databaseId,
    bucketName,
    accessAppId: application.id,
    worker: name,
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
    "Cloudflare D1, R2, Workers alan adı ve e-posta doğrulaması hazırlandı.",
  );
  return deployment;
}

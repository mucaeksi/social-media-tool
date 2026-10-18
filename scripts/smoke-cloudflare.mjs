import sharp from "sharp";
import { cfApi, protectSecret } from "./cloudflare-api.mjs";
import { platforms } from "../server/platforms.mjs";

export async function smokeCloudflare(deployment) {
  const base = `/accounts/${deployment.accountId}/access`;
  let service, policy, companyId, headers;
  const http = async (route, options = {}) => {
    const response = await fetch(`${deployment.url}${route}`, {
      ...options,
      headers: { ...headers, ...options.headers },
      redirect: "manual",
    });
    if (!response.ok)
      throw new Error(
        `Canlı kontrol ${route}: HTTP ${response.status}. Access yapılandırmasını ve Workers günlüklerini inceleyin.`,
      );
    return response;
  };
  try {
    service = await cfApi(`${base}/service_tokens`, {
      method: "POST",
      body: {
        name: `Sosyal Studio CI ${process.env.GITHUB_RUN_ID || Date.now()}`,
        duration: "1h",
      },
    });
    protectSecret(service.client_secret);
    protectSecret(service.client_id);
    policy = await cfApi(`${base}/apps/${deployment.accessAppId}/policies`, {
      method: "POST",
      body: {
        name: `Geçici CI ${process.env.GITHUB_RUN_ID || Date.now()}`,
        decision: "non_identity",
        include: [{ service_token: { token_id: service.id } }],
      },
    });
    headers = {
      "CF-Access-Client-Id": service.client_id,
      "CF-Access-Client-Secret": service.client_secret,
    };
    let ready = false,
      lastStatus = 0;
    // Access policies and a just-published Worker can take a short time to propagate.
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await fetch(`${deployment.url}/api/health`, {
        headers,
        redirect: "manual",
      });
      lastStatus = response.status;
      if (
        response.ok &&
        (response.headers.get("content-type") || "").includes(
          "application/json",
        )
      ) {
        const result = await response.json();
        if (result.ok && result.database === "d1" && result.storage === "r2") {
          ready = true;
          break;
        }
      }
      if (attempt < 11)
        await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    if (!ready)
      throw new Error(
        `Canlı sağlık kontrolü tamamlanamadı (HTTP ${lastStatus}).`,
      );
    const root = await http("/");
    if (!(await root.text()).includes("Sosyal Studio"))
      throw new Error("Canlı arayüz doğrulanamadı.");
    const configs = await (await http("/api/platforms")).json();
    if (configs.length !== 8) throw new Error("Canlı platform listesi eksik.");
    const company = await (
      await http("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `Dağıtım kontrolü ${Date.now()}` }),
      })
    ).json();
    companyId = company.id;
    const form = new FormData();
    const original = await sharp({
      create: { width: 320, height: 240, channels: 3, background: "#326f61" },
    })
      .jpeg()
      .toBuffer();
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
    const image = await (
      await http(`/api/media?companyId=${companyId}`, {
        method: "POST",
        body: form,
      })
    ).json();
    const downloaded = Buffer.from(
      await (
        await http(`/api/media/${image.id}/instagram.jpg?fit=contain`)
      ).arrayBuffer(),
    );
    const metadata = await sharp(downloaded).metadata();
    if (metadata.width !== 1080 || metadata.height !== 1350)
      throw new Error("Canlı R2 görseli doğrulanamadı.");
    const draft = await (
      await http("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          name: "Dağıtım kontrolü",
          text: "Kontrol metni",
          selected: ["instagram"],
          posts: [{ platform: "instagram", caption: "Kontrol metni" }],
          mediaId: image.id,
        }),
      })
    ).json();
    const read = await (await http(`/api/drafts/${draft.id}`)).json();
    if (read.companyId !== companyId)
      throw new Error("Canlı D1 taslak kaydı doğrulanamadı.");
    await http(`/api/companies/${companyId}`, { method: "DELETE" });
    companyId = null;
    console.log(
      "Canlı arayüz, D1 kayıt/okuma ve R2 yükleme/indirme kontrolü başarılı. Deneme verileri silindi.",
    );
  } finally {
    let cleanupError;
    try {
      if (companyId && headers)
        await http(`/api/companies/${companyId}`, { method: "DELETE" });
    } catch (error) {
      cleanupError = error;
    }
    try {
      if (policy)
        await cfApi(
          `${base}/apps/${deployment.accessAppId}/policies/${policy.id}`,
          { method: "DELETE" },
        );
    } finally {
      if (service)
        await cfApi(`${base}/service_tokens/${service.id}`, {
          method: "DELETE",
        });
    }
    if (cleanupError) throw cleanupError;
  }
}

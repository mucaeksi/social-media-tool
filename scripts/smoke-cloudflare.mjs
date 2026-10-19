import sharp from "sharp";
import { protectSecret } from "./cloudflare-api.mjs";
import { databaseQuery } from "./admin-provision.mjs";
import {
  hashPassword,
  randomToken,
  tokenDigest,
} from "../shared/passwords.mjs";
import { platforms } from "../server/platforms.mjs";

export async function smokeCloudflare(deployment, adminVerification) {
  let probeId, companyId;
  let headers = { Origin: deployment.url };
  const http = async (route, options = {}) => {
    const response = await fetch(`${deployment.url}${route}`, {
      ...options,
      headers: { ...headers, ...options.headers },
      redirect: "manual",
    });
    if (!response.ok)
      throw new Error(
        `Canlı kontrol ${route}: HTTP ${response.status}. Giriş yapılandırmasını ve Workers günlüklerini inceleyin.`,
      );
    return response;
  };
  try {
    // The public login must work without an Access e-mail code or service token.
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
        if (
          result.ok &&
          result.auth === "password" &&
          result.database === "d1" &&
          result.socialBrowser === true &&
          result.ai === "cloudflare" &&
          result.aiExpertVersion === "gorsel-ozet-v1" &&
          result.storage === deployment.mediaStorage
        ) {
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
    const anonymous = await fetch(`${deployment.url}/api/companies`, {
      redirect: "manual",
    });
    if (anonymous.status !== 401)
      throw new Error(
        "Oturumsuz API erişimi kapalı değil veya eski Access katmanı hâlâ etkin.",
      );
    async function login(username, password) {
      const response = await http("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const cookie = response.headers.get("set-cookie");
      if (
        !cookie?.includes("HttpOnly") ||
        !cookie.includes("Secure") ||
        !cookie.includes("SameSite=Strict")
      )
        throw new Error("Canlı oturum çerezi güvenli değil.");
      headers.Cookie = cookie.split(";")[0];
      protectSecret(headers.Cookie);
      const result = await response.json();
      if (result.user?.username !== username)
        throw new Error("Canlı kullanıcı girişi doğrulanamadı.");
      return result.user;
    }
    if (adminVerification) {
      const admin = await login(
        adminVerification.username,
        adminVerification.password,
      );
      if (admin.role !== adminVerification.role)
        throw new Error("Oluşturulan kullanıcının yetkisi doğrulanamadı.");
      if (admin.role === "admin") await http("/api/admin/users");
      const revoked = headers.Cookie;
      await http("/api/auth/logout", { method: "POST" });
      delete headers.Cookie;
      const retry = await fetch(`${deployment.url}/api/companies`, {
        headers: { Cookie: revoked },
      });
      if (retry.status !== 401)
        throw new Error("Çıkış yapılan oturum iptal edilmedi.");
    }
    const count = (
      await databaseQuery(deployment, "SELECT COUNT(*) AS total FROM users")
    )[0].total;
    if (count < 50) {
      probeId = crypto.randomUUID();
      const password = randomToken();
      protectSecret(password);
      const passwordHash = await hashPassword(password);
      protectSecret(passwordHash);
      const username = `ci-${probeId}`;
      await databaseQuery(
        deployment,
        "INSERT INTO users(id,username,email,name,password_hash,role,created_at) VALUES(?,?,?,?,?,'editor',?)",
        [
          probeId,
          username,
          `${username}@example.invalid`,
          "Geçici dağıtım kontrolü",
          passwordHash,
          new Date().toISOString(),
        ],
      );
      await login(username, password);
      if (
        (await fetch(`${deployment.url}/api/admin/users`, { headers }))
          .status !== 403
      )
        throw new Error("Editör yönetici bilgilerine erişebiliyor.");
    } else {
      const [admin] = await databaseQuery(
        deployment,
        "SELECT id FROM users WHERE role='admin' AND enabled=1 LIMIT 1",
      );
      const token = randomToken();
      headers.Cookie = `__Host-studio_session=${token}`;
      protectSecret(headers.Cookie);
      await databaseQuery(
        deployment,
        "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
        [
          await tokenDigest(token),
          admin.id,
          Math.floor(Date.now() / 1000) + 300,
        ],
      );
    }
    const configs = await (await http("/api/platforms")).json();
    const aiStatus = await (await http("/api/ai/status")).json();
    if (!aiStatus.enabled || aiStatus.limits?.dailyNeurons !== 9000)
      throw new Error("Canlı AI binding veya ücretsiz bütçe doğrulanamadı.");
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
      throw new Error("Canlı görsel doğrulanamadı.");
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
      "Canlı arayüz, D1 kayıt/okuma ve Cloudflare görsel yükleme/indirme kontrolü başarılı. Deneme verileri silindi.",
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
      if (headers.Cookie) await http("/api/auth/logout", { method: "POST" });
    } finally {
      if (probeId)
        await databaseQuery(deployment, "DELETE FROM users WHERE id=?", [
          probeId,
        ]);
    }
    if (cleanupError) throw cleanupError;
  }
}

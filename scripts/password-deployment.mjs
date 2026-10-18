import { cfApi } from "./cloudflare-api.mjs";
import { databaseQuery } from "./admin-provision.mjs";

export async function detachLegacyAccess(deployment) {
  if (!deployment.legacyAccessAppId) return;
  const base = `/accounts/${deployment.accountId}`;
  const settings = await cfApi(
    `${base}/workers/scripts/${deployment.worker}/settings`,
  );
  const binding = (name, value) =>
    settings.bindings?.some((b) => b.name === name && b.text === value);
  if (
    !binding("AUTH_MODE", "password") ||
    !binding("APPLICATION_ID", "mucaeksi/social-media-tool") ||
    !binding("APP_ENV", "production")
  )
    throw new Error(
      "Şifreli Worker yayını doğrulanamadı; eski Access girişi korunuyor.",
    );
  if (
    !(
      await databaseQuery(
        deployment,
        "SELECT id FROM users WHERE role='admin' AND enabled=1 LIMIT 1",
      )
    ).length
  )
    throw new Error(
      "Yönetici kaydı doğrulanamadı; eski Access girişi korunuyor.",
    );
  const path = `${base}/access/apps/${deployment.legacyAccessAppId}`;
  const application = await cfApi(path, { allow404: true });
  if (!application) return;
  if (
    application.name !== "Sosyal Studio" ||
    application.domain !== new URL(deployment.url).hostname
  )
    throw new Error("Başka Access uygulaması kaldırılmaz.");
  await cfApi(path, { method: "DELETE" });
  console.log(
    "Şifreli Worker ve yönetici kaydı doğrulandı; yalnızca bu sitenin eski e-posta kodu giriş katmanı kaldırıldı.",
  );
}

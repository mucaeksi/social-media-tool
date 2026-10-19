import { randomBytes } from "node:crypto";
import { cfApi, protectSecret } from "./cloudflare-api.mjs";

export async function ensureBrowserSecret(deployment) {
  const endpoint = `/accounts/${deployment.accountId}/workers/scripts/${deployment.worker}`;
  const settings = await cfApi(`${endpoint}/settings`);
  const existing = settings.bindings?.find(
    (binding) => binding.name === "BROWSER_STATE_KEY",
  );
  if (existing?.type === "secret_text") return;
  if (existing)
    throw new Error(
      "Sosyal oturum anahtarı beklenen secret türünde değil; üzerine yazılmadı.",
    );
  const key = randomBytes(32).toString("base64url");
  protectSecret(key, { emitMask: false });
  await cfApi(`${endpoint}/secrets`, {
    method: "PUT",
    body: { name: "BROWSER_STATE_KEY", type: "secret_text", text: key },
  });
  console.log(
    "Sosyal hesap oturumları için özel şifreleme anahtarı hazırlandı.",
  );
}

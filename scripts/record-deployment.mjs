import { readFile } from "node:fs/promises";
import { safeMessage } from "./cloudflare-api.mjs";

const repository = process.env.GITHUB_REPOSITORY,
  token = process.env.GITHUB_TOKEN;
if (!repository || !token)
  throw new Error("GitHub dağıtım kaydı için Actions bağlamı gerekli.");
const source = process.env.RECEIPT_SOURCE || ".cloudflare/deployment.json";
const destination =
  process.env.RECEIPT_DESTINATION || "deployment/cloudflare.json";
if (
  ![
    "deployment/cloudflare.json",
    "deployment/auth-bootstrap.json",
    "deployment/browser-check.json",
    "deployment/browser-panel.json",
    "deployment/platform-research.json",
  ].includes(destination)
)
  throw new Error("Dağıtım sonuç yolu geçersiz.");
const file = JSON.parse(await readFile(source, "utf8"));
const endpoint = `https://api.github.com/repos/${repository}/contents/${destination}`;
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};
const current = await fetch(`${endpoint}?ref=main`, { headers });
if (!current.ok && current.status !== 404)
  throw new Error(`GitHub dağıtım kaydı okunamadı: HTTP ${current.status}`);
const existing = current.ok ? await current.json() : null;
const response = await fetch(endpoint, {
  method: "PUT",
  headers,
  body: JSON.stringify({
    message: "chore: Cloudflare dağıtım sonucunu kaydet [skip ci]",
    branch: "main",
    content: Buffer.from(JSON.stringify(file, null, 2) + "\n").toString(
      "base64",
    ),
    ...(existing ? { sha: existing.sha } : {}),
  }),
});
if (!response.ok)
  throw new Error(
    safeMessage(
      `GitHub dağıtım kaydı yazılamadı: HTTP ${response.status}. Workflow özetindeki canlı adres korunur.`,
    ),
  );
console.log("Dağıtım sonucu ve doğrulanan adres main dalına kaydedildi.");

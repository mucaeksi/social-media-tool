const secrets = new Set();
if (process.env.GITHUB_TOKEN) secrets.add(process.env.GITHUB_TOKEN);

export function protectSecret(value) {
  if (!value) return;
  secrets.add(value);
  if (process.env.GITHUB_ACTIONS === "true")
    process.stdout.write(`::add-mask::${value}\n`);
}
export function safeMessage(message) {
  let result = String(message);
  for (const value of secrets)
    if (value) result = result.split(value).join("[gizli]");
  return result.slice(0, 1200);
}
export async function cfApi(
  endpoint,
  { method = "GET", body, allow404 = false } = {},
) {
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API;
  if (token) secrets.add(token);
  if (!token)
    throw new Error(
      "GitHub repository secret CLOUDFLARE_API eksik. Secret değeri kaynak koddan okunmaz.",
    );
  const response = await fetch(
    `https://api.cloudflare.com/client/v4${endpoint}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30000),
    },
  );
  if (allow404 && response.status === 404) return null;
  if (response.status === 204) return null;
  const data = await response.json();
  if (!response.ok || data.success === false) {
    const details = (data.errors ?? [])
      .map((error) => `${error.code}: ${error.message}`)
      .join("; ");
    throw Object.assign(
      new Error(
        safeMessage(
          `Cloudflare ${method} ${endpoint}: HTTP ${response.status}. ${details}`,
        ),
      ),
      {
        status: response.status,
        codes: (data.errors ?? []).map((error) => error.code),
      },
    );
  }
  return data.result;
}
export async function listAll(endpoint) {
  const all = [];
  for (let page = 1; page <= 100; page++) {
    const result = await cfApi(
      `${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=50&page=${page}`,
    );
    if (!Array.isArray(result))
      throw new Error("Cloudflare liste yanıtı beklenenden farklı.");
    all.push(...result);
    if (result.length < 50) return all;
  }
  throw new Error(
    "Cloudflare kaynak listesi tamamlanamadı; mevcut kaynaklar değiştirilmedi.",
  );
}

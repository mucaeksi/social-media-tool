const secrets = new Set();
if (process.env.GITHUB_TOKEN) secrets.add(process.env.GITHUB_TOKEN);

export function protectSecret(value, { emitMask = true } = {}) {
  if (!value) return;
  secrets.add(value);
  if (typeof value === "string")
    secrets.add(JSON.stringify(value).slice(1, -1));
  if (emitMask && process.env.GITHUB_ACTIONS === "true") {
    const escaped = String(value)
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    process.stdout.write(`::add-mask::${escaped}\n`);
  }
}
export function safeMessage(message) {
  let result = String(message);
  for (const value of secrets)
    if (value) result = result.split(value).join("[gizli]");
  return result.slice(0, 1200);
}
export async function cfApi(
  endpoint,
  { method = "GET", body, allow404 = false, rawResponse = false } = {},
) {
  const token = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API;
  if (token) secrets.add(token);
  if (!token)
    throw new Error(
      "GitHub repository secret CLOUDFLARE_API eksik. Secret değeri kaynak koddan okunmaz.",
    );
  let response;
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(
      `https://api.cloudflare.com/client/v4${endpoint}`,
      {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
        redirect: "error",
      },
    );
    // Only repeat reads with a known temporary upstream failure. A write may
    // already have succeeded; retrying it could duplicate a resource or action.
    if (
      method !== "GET" ||
      ![502, 503, 504].includes(response.status) ||
      attempt === 2
    )
      break;
    await response.body?.cancel();
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** attempt));
  }
  if (allow404 && response.status === 404) return null;
  if (response.status === 204) return null;
  let data;
  try {
    data = await response.json();
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
  } catch {
    // Never put an HTML error body (which may contain reflected credentials or
    // provider internals) in CI logs or the committed deployment receipt.
    throw Object.assign(
      new Error(
        safeMessage(
          `Cloudflare ${method} ${endpoint}: HTTP ${response.status}. Geçerli JSON yanıtı alınamadı; dağıtım durduruldu.`,
        ),
      ),
      { status: response.status, codes: [] },
    );
  }
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
  return rawResponse ? data : data.result;
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

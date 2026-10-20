export const RESEARCH_LIMITS = Object.freeze({
  pages: 5,
  bytes: 1_000_000,
  text: 12000,
  daily: 20,
});
export function webUrl(value, hosts) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new Error("Geçerli bir HTTPS adresi gerekli.");
  }
  const host = u.hostname.toLowerCase();
  if (
    [...u.searchParams.keys()].some((k) =>
      /^(?:access_token|token|password|secret|auth|session|sid|code|signature|api_key)$/i.test(
        k,
      ),
    )
  )
    throw new Error(
      "Belirteç veya giriş kodu içeren adresler kaynak olarak kaydedilemez.",
    );
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    value.length > 2048 ||
    !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example|onion)$/.test(
      host,
    ) ||
    (hosts && !hosts.includes(host))
  )
    throw new Error(
      "Yalnız onaylı herkese açık HTTPS alan adları incelenebilir.",
    );
  u.hash = "";
  return u.href;
}
export function researchInput(value) {
  if (
    !value ||
    !Array.isArray(value.urls) ||
    value.urls.length < 1 ||
    value.urls.length > 5 ||
    !Array.isArray(value.hosts) ||
    value.hosts.length < 1 ||
    value.hosts.length > 6 ||
    !["static", "firefox"].includes(value.mode)
  )
    throw new Error("Araştırma isteği geçersiz.");
  const hosts = [
    ...new Set(
      value.hosts.map((h) => new URL(webUrl(`https://${h}/`)).hostname),
    ),
  ];
  return {
    hosts,
    urls: [...new Set(value.urls.map((u) => webUrl(u, hosts)))],
    mode: value.mode,
  };
}
export function validResearchResult(v) {
  return (
    v &&
    typeof v === "object" &&
    ((v.ok === false && v.code === "RESEARCH_FAILED") ||
      (v.ok === true &&
        Array.isArray(v.pages) &&
        v.pages.length > 0 &&
        v.pages.length <= 5 &&
        v.pages.every(
          (p) =>
            typeof p.url === "string" &&
            typeof p.finalUrl === "string" &&
            typeof p.title === "string" &&
            p.title.length <= 300 &&
            typeof p.text === "string" &&
            p.text.length > 0 &&
            p.text.length <= 12000,
        )))
  );
}

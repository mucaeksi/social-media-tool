export const BROWSER_LIMITS = Object.freeze({
  dailyMs: 600_000,
  sessionMs: 180_000,
  idleMs: 30_000,
});

export const browserPlatforms = {
  x: {
    login: "https://x.com/i/flow/login",
    home: "https://x.com/home",
    roots: ["x.com", "twitter.com"],
    cookie: "auth_token",
  },
  instagram: {
    login: "https://www.instagram.com/accounts/login/",
    home: "https://www.instagram.com/",
    roots: ["instagram.com"],
    cookie: "sessionid",
  },
  facebook: {
    login: "https://www.facebook.com/login/",
    home: "https://www.facebook.com/",
    roots: ["facebook.com"],
    cookie: "c_user",
  },
  threads: {
    login: "https://www.threads.com/login",
    home: "https://www.threads.com/",
    roots: ["threads.com", "threads.net", "instagram.com"],
    cookie: "sessionid",
  },
  pinterest: {
    login: "https://www.pinterest.com/login/",
    home: "https://www.pinterest.com/",
    roots: ["pinterest.com"],
    cookie: "_pinterest_sess",
  },
  youtube: {
    login:
      "https://accounts.google.com/ServiceLogin?service=youtube&continue=https%3A%2F%2Fwww.youtube.com%2F",
    home: "https://www.youtube.com/",
    roots: ["youtube.com", "google.com"],
    cookie: "SAPISID",
  },
  tiktok: {
    login: "https://www.tiktok.com/login",
    home: "https://www.tiktok.com/",
    roots: ["tiktok.com"],
    cookie: "sessionid",
  },
  linkedin: {
    login: "https://www.linkedin.com/login",
    home: "https://www.linkedin.com/feed/",
    roots: ["linkedin.com"],
    cookie: "li_at",
  },
};

export function domainMatches(hostname, roots) {
  const host = hostname.replace(/^\./, "").toLowerCase();
  return roots.some((root) => host === root || host.endsWith(`.${root}`));
}
export function accountCookies(cookies, platform, now = Date.now()) {
  const config = browserPlatforms[platform];
  if (!config) throw new Error("Desteklenmeyen platform.");
  return cookies.filter(
    (cookie) =>
      domainMatches(cookie.domain, config.roots) &&
      (cookie.expires === undefined ||
        cookie.expires <= 0 ||
        cookie.expires * 1000 > now),
  );
}
function encode(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}
function decode(value) {
  if (typeof value !== "string" || !/^[\w-]+$/.test(value))
    throw new Error("Oturum anahtarı geçersiz.");
  return Uint8Array.from(
    atob(value.replaceAll("-", "+").replaceAll("_", "/")),
    (c) => c.charCodeAt(0),
  );
}
const identity = (account) =>
  new TextEncoder().encode(
    JSON.stringify([account.id, account.companyId, account.platform]),
  );
async function key(value) {
  const bytes = decode(value);
  if (bytes.length !== 32)
    throw new Error("Oturum şifreleme anahtarı hazır değil.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}
export async function sealCookies(cookies, account, secret) {
  const bytes = new TextEncoder().encode(
    JSON.stringify(accountCookies(cookies, account.platform)),
  );
  if (bytes.length > 128_000)
    throw new Error("Hesap oturumu kayıt sınırını aşıyor.");
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: identity(account) },
    await key(secret),
    bytes,
  );
  // Encode in chunks: spreading a 128 KB buffer exceeds some runtimes' stack.
  const data = new Uint8Array(encrypted);
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return JSON.stringify({ v: 1, iv: encode(iv), data: btoa(binary) });
}
export async function openCookies(value, account, secret) {
  const envelope = JSON.parse(value);
  if (
    envelope.v !== 1 ||
    typeof envelope.data !== "string" ||
    envelope.data.length > 180_000
  )
    throw new Error("Kayıtlı oturum okunamadı.");
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: decode(envelope.iv),
      additionalData: identity(account),
    },
    await key(secret),
    Uint8Array.from(atob(envelope.data), (c) => c.charCodeAt(0)),
  );
  const cookies = JSON.parse(new TextDecoder().decode(decrypted));
  if (!Array.isArray(cookies)) throw new Error("Kayıtlı oturum okunamadı.");
  return accountCookies(cookies, account.platform);
}

export function reserveBrowserTime(budget, now = Date.now()) {
  const day = new Date(now).toISOString().slice(0, 10);
  const usedMs = budget?.day === day ? budget.usedMs : 0;
  const midnight = Date.parse(`${day}T00:00:00Z`) + 86_400_000;
  const available = Math.min(BROWSER_LIMITS.dailyMs - usedMs, midnight - now);
  const duration = Math.min(
    BROWSER_LIMITS.sessionMs,
    available - BROWSER_LIMITS.idleMs,
  );
  if (duration < 15_000)
    throw Object.assign(
      new Error(
        "Günlük 10 dakikalık tarayıcı bütçesi doldu. Yeni UTC gününde tekrar deneyin.",
      ),
      { status: 429 },
    );
  return {
    budget: { day, usedMs: usedMs + duration + BROWSER_LIMITS.idleMs },
    duration,
    reservedMs: duration + BROWSER_LIMITS.idleMs,
  };
}

export function settleBrowserTime(budget, active, endedAt = Date.now()) {
  const day = new Date(endedAt).toISOString().slice(0, 10);
  if (day === active.day && budget?.day === day) {
    const charged =
      Math.max(0, endedAt - active.startedAt) + BROWSER_LIMITS.idleMs;
    return {
      day,
      usedMs: Math.max(0, budget.usedMs - active.reservedMs + charged),
    };
  }
  const midnight = Date.parse(`${day}T00:00:00Z`);
  const overlap = Math.max(0, endedAt - Math.max(active.startedAt, midnight));
  return {
    day,
    usedMs:
      (budget?.day === day ? budget.usedMs : 0) +
      overlap +
      BROWSER_LIMITS.idleMs,
  };
}

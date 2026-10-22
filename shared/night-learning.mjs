import { webUrl } from "./research-protocol.mjs";
import { adProviders, adProviderIds } from "./advertising.mjs";
export const AD_GUIDES = Object.freeze(
  adProviders.map((p) =>
    Object.freeze({
      platform: p.platforms[0],
      provider: p.id,
      topic: "advertising",
      url: p.guide,
    }),
  ),
);

export const NIGHT_LIMITS = Object.freeze({
  requests: 20,
  notes: 100,
  retentionDays: 14,
  planDays: 7,
});
export const OFFICIAL_GUIDES = Object.freeze(
  [
    ["facebook", "https://www.facebook.com/business/learn"],
    ["instagram", "https://creators.instagram.com/"],
    ["threads", "https://help.instagram.com/"],
    ["x", "https://business.x.com/en/basics"],
    ["pinterest", "https://business.pinterest.com/creative-best-practices/"],
    ["youtube", "https://support.google.com/youtube/answer/141805"],
    ["tiktok", "https://www.tiktok.com/creators/creator-portal/en-us/"],
    ["linkedin", "https://www.linkedin.com/help/linkedin"],
    ["tumblr", "https://help.tumblr.com/"],
  ].map(([platform, url]) => Object.freeze({ platform, url })),
);
const clock = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Famagusta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  hourCycle: "h23",
});
export function nightTime(now = new Date()) {
  const p = Object.fromEntries(
    clock.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  return { day: `${p.year}-${p.month}-${p.day}`, active: Number(p.hour) < 7 };
}
export function nightInput(input) {
  if (
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(
      input.companyId || "",
    )
  )
    throw new Error("Şirket kimliği geçersiz.");
  const base = { action: input.action, companyId: input.companyId };
  if (input.action === "night-status") return base;
  if (input.action === "night-review") {
    if (
      !/^[a-f0-9-]{36}$/i.test(input.noteId || "") ||
      !["approved", "rejected"].includes(input.state)
    )
      throw new Error("Gece notu geçersiz.");
    return { ...base, noteId: input.noteId, state: input.state };
  }
  if (
    input.action !== "night-sync" ||
    typeof input.companyName !== "string" ||
    input.companyName.length > 200 ||
    !Array.isArray(input.sources) ||
    input.sources.length > 11 ||
    (input.enabled !== undefined && typeof input.enabled !== "boolean")
  )
    throw new Error("Gece planı geçersiz.");
  const sources = input.sources.map((source) => {
    if (!Number.isFinite(Date.parse(source.validUntil)))
      throw new Error("Kaynak süresi geçersiz.");
    if (
      source.priority !== undefined &&
      (!Number.isInteger(source.priority) ||
        source.priority < 0 ||
        source.priority > 2)
    )
      throw new Error("Kaynak önceliği geçersiz.");
    return {
      url: webUrl(source.url),
      validUntil: new Date(source.validUntil).toISOString(),
      ...(source.priority === undefined ? {} : { priority: source.priority }),
    };
  });
  const platforms = input.platforms === undefined ? undefined : input.platforms;
  if (
    input.adContext !== undefined &&
    (typeof input.adContext !== "string" || input.adContext.length > 3000)
  )
    throw new Error("Reklam bağlamı çok uzun.");
  if (input.advertising !== undefined && typeof input.advertising !== "boolean")
    throw new Error("Reklam araştırma seçimi geçersiz.");
  if (
    input.adProviders !== undefined &&
    (!Array.isArray(input.adProviders) ||
      input.adProviders.length > 7 ||
      input.adProviders.some((p) => !adProviderIds.includes(p)))
  )
    throw new Error("Reklam platformu geçersiz.");
  if (
    platforms !== undefined &&
    (!Array.isArray(platforms) ||
      platforms.length > 9 ||
      platforms.some((p) => !OFFICIAL_GUIDES.some((g) => g.platform === p)))
  )
    throw new Error("Gece platform seçimi geçersiz.");
  return {
    ...base,
    companyName: input.companyName,
    sources,
    ...(input.adContext === undefined ? {} : { adContext: input.adContext }),
    ...(input.advertising === undefined
      ? {}
      : {
          advertising: input.advertising,
          adProviders: input.adProviders || adProviderIds,
        }),
    ...(platforms ? { platforms } : {}),
    ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
  };
}
export function validNightStatus(value) {
  try {
    return Boolean(
      value &&
      typeof value.enabled === "boolean" &&
      typeof value.running === "boolean" &&
      typeof value.syncedAt === "string" &&
      Array.isArray(value.notes) &&
      value.notes.length <= 20 &&
      value.notes.every(
        (n) =>
          /^[a-f0-9-]{36}$/i.test(n.id) &&
          webUrl(n.url) &&
          typeof n.summary === "string" &&
          n.summary.length <= 4000 &&
          ["pending", "approved", "rejected"].includes(n.state),
      ) &&
      (value.attempts === undefined ||
        (Array.isArray(value.attempts) &&
          value.attempts.length <= 20 &&
          value.attempts.every(
            (a) =>
              webUrl(a.url) &&
              ["saved", "unchanged", "failed", "cancelled", "running"].includes(
                a.state,
              ),
          ))),
    );
  } catch {
    return false;
  }
}

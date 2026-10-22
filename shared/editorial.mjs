import { z } from "zod";
import { platformIds } from "../server/platforms.mjs";

const short = (n = 300) => z.string().trim().max(n).default("");
const id = z.uuid().nullable().default(null);
const url = z
  .string()
  .max(2048)
  .refine(
    (v) =>
      !v ||
      (URL.canParse(v) &&
        new URL(v).protocol === "https:" &&
        !new URL(v).username &&
        !new URL(v).password),
    "Bağlantı HTTPS olmalı.",
  )
  .default("");
const date = z
  .string()
  .refine((v) => !v || Number.isFinite(Date.parse(v)), "Tarih geçersiz.")
  .default("")
  .transform((v) => (v ? new Date(v).toISOString() : ""));
const platforms = z
  .array(z.enum(platformIds))
  .max(9)
  .refine((v) => new Set(v).size === v.length)
  .default([]);
export const editorialKinds = [
  "campaign",
  "product",
  "idea",
  "experiment",
  "correction",
  "metric",
  "benchmark",
  "plan",
];
export const reviewStates = [
  "draft",
  "review",
  "changes",
  "approved",
  "planned",
];
export const recordSchemas = {
  campaign: z.object({
    name: short(120).refine(Boolean, "Kampanya adı gerekli."),
    goal: short(),
    audience: short(),
    offer: short(600),
    cta: short(),
    owner: short(120),
    startsAt: date,
    endsAt: date,
    platforms,
    productId: id,
    pillar: short(120),
  }),
  product: z.object({
    name: short(120).refine(Boolean, "Ürün adı gerekli."),
    sku: short(100),
    dimensions: short(),
    material: short(),
    care: short(600),
    colors: short(),
    price: short(100),
    delivery: short(),
    sourceUrl: url,
    evidence: short(2000),
    validUntil: date,
    state: z.enum(["pending", "approved"]).default("pending"),
  }),
  idea: z.object({
    title: short(150).refine(Boolean, "Fikir başlığı gerekli."),
    question: short(2000),
    sourceUrl: url,
    pillar: short(120),
    campaignId: id,
    status: z.enum(["open", "used"]).default("open"),
  }),
  experiment: z.object({
    name: short(120).refine(Boolean),
    campaignId: id,
    platform: z.enum(platformIds),
    variable: z.enum(["hook", "cover", "cta"]),
    hypothesis: short(600),
    variants: z
      .array(z.object({ label: short(100), draftId: id }))
      .min(2)
      .max(4),
    windowHours: z.number().int().min(1).max(720).default(72),
    conclusion: short(2000),
  }),
  correction: z.object({
    draftId: id,
    platform: z.enum(platformIds),
    before: short(6000),
    after: short(6000).refine(Boolean),
    reason: short(600),
    state: z.enum(["pending", "approved", "rejected"]).default("pending"),
  }),
  metric: z.object({
    sourceUrl: url.refine(Boolean),
    measuredAt: date.refine(Boolean),
    platform: z.enum(platformIds),
    draftId: id,
    jobId: id,
    campaignId: id,
    variant: short(100),
    windowHours: z.number().int().min(1).max(8760).default(72),
    values: z.object(
      Object.fromEntries(
        [
          "impressions",
          "reach",
          "saves",
          "shares",
          "clicks",
          "messages",
          "leads",
          "visits",
        ].map((k) => [
          k,
          z.number().int().min(0).max(1e9).nullable().default(null),
        ]),
      ),
    ),
  }),
  benchmark: z.object({
    scenario: short(120).refine(Boolean),
    model: short(120),
    modelDigest: short(128),
    expertVersion: short(120),
    sourceVersion: short(128),
    mediaId: id,
    answer: short(6000),
    corrected: short(6000),
    durationMs: z.number().int().min(0).max(86400000).nullable().default(null),
    editingSeconds: z.number().int().min(0).max(86400).nullable().default(null),
    validOutput: z.boolean(),
    hallucination: z.boolean(),
    scores: z.object({
      grounding: z.number().int().min(0).max(4),
      brand: z.number().int().min(0).max(4),
      local: z.number().int().min(0).max(4),
      platform: z.number().int().min(0).max(4),
    }),
  }),
  plan: z.object({
    name: short(150).refine(Boolean),
    scheduledAt: date.refine(Boolean),
    timezone: z
      .enum(["Asia/Famagusta", "Europe/Istanbul"])
      .default("Asia/Famagusta"),
    platform: z.enum([...platformIds, "google-business", "whatsapp"]),
    format: z
      .enum(["post", "carousel", "story", "video", "pin", "faq"])
      .default("post"),
    campaignId: id,
    draftId: id,
    owner: short(120),
    note: short(2000),
    state: z.enum(["idea", "ready", "manual-done"]).default("idea"),
    resultUrl: url,
  }),
};
export const preferencesSchema = z.object({
  platforms: platforms.refine((v) => v.length > 0, "En az bir platform seçin."),
  compact: z.boolean().default(false),
});
export const initialChannels = ["instagram", "facebook", "linkedin", "threads"];
export function campaignUrl(input) {
  const u = new URL(input.url);
  if (u.protocol !== "https:" || u.username || u.password)
    throw new Error("HTTPS bağlantı gerekli.");
  u.searchParams.set("utm_source", input.platform);
  u.searchParams.set("utm_medium", input.medium || "organic_social");
  u.searchParams.set("utm_campaign", input.campaign.trim());
  if (input.variant) u.searchParams.set("utm_content", input.variant.trim());
  return u.href;
}
export function latestMeasurements(rows) {
  // Platform counters are cumulative snapshots. Keep the latest per post and
  // observation window; never add two snapshots of the same post together.
  const result = new Map();
  for (const r of [...rows].sort(
    (a, b) => Date.parse(b.measuredAt) - Date.parse(a.measuredAt),
  )) {
    const key = JSON.stringify([r.platform, r.sourceUrl, r.windowHours]);
    if (!result.has(key)) result.set(key, r);
  }
  return [...result.values()];
}
export function draftAssetIds(draft) {
  return [
    ...new Set(
      [
        draft.mediaId,
        ...(draft.gallery || []).map((a) => a.mediaId),
        ...Object.values(draft.platformMedia || {}),
      ].filter(Boolean),
    ),
  ];
}
export const conflict = () =>
  Object.assign(
    new Error(
      "Taslak başka bir yerde değişti. Güncel sürümü karşılaştırın veya çalışmanızı kopya kaydedin.",
    ),
    { status: 409, public: true },
  );

import { z } from "zod";
import { platformIds } from "../server/platforms.mjs";

z.config(z.locales.tr());

const text = (max = 8000) => z.string().max(max);
export const regionalSchema = z.object({
  sector: text(300).default(""),
  districts: text(300).default(""),
  segments: text(300).default(""),
  languages: text(100).default("Türkçe"),
  delivery: text(400).default(""),
  currency: text(200).default(""),
  contact: text(400).default(""),
  hours: text(200).default(""),
  goal: text(300).default(""),
  restrictions: text(400).default(""),
  timezone: z
    .enum(["Asia/Famagusta", "Europe/Istanbul"])
    .default("Asia/Famagusta"),
});
export const companySchema = z.object({
  preferredPlatforms: z.array(z.enum(platformIds)).min(1).max(9).optional(),
  regional: regionalSchema.optional(),
  name: z.string().trim().min(1, "Şirket adı gerekli.").max(80),
  handle: text(60).default(""),
  website: z
    .string()
    .max(250)
    .refine(
      (value) => !value || (/^https?:\/\//i.test(value) && URL.canParse(value)),
      "Web adresini https:// ile girin.",
    )
    .default(""),
  tone: text(300).default("Samimi ve profesyonel"),
  audience: text(500).default(""),
  keywords: text(500).default(""),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#326f61"),
});
export const selectedSchema = z
  .array(z.enum(platformIds))
  .min(1, "En az bir platform seçin.")
  .max(9)
  .refine((v) => new Set(v).size === v.length, "Platformlar tekrarlanamaz.");
export const postSchema = z.object({
  platform: z.enum(platformIds),
  title: text(500).default(""),
  caption: text(70000),
  hashtags: z
    .array(
      z
        .string()
        .regex(
          /^#[\p{L}\p{N}_]+$/u,
          "Etiketler # ile başlamalı ve boşluk içermemeli.",
        )
        .max(100),
    )
    .max(30)
    .default([]),
  alt: text(2000).default(""),
});
export const briefSchema = z.object({
  companyId: z.uuid(),
  text: z.string().trim().min(1, "İçerik metni gerekli.").max(8000),
  selected: selectedSchema,
  mediaId: z.uuid().nullable().default(null),
});
export const draftSchema = z.object({
  productRefs: z
    .array(
      z.object({
        id: z.uuid(),
        revision: z.number().int().positive(),
        sourceUrl: z.url().refine((v) => new URL(v).protocol === "https:"),
        validUntil: z.iso.datetime(),
      }),
    )
    .max(2)
    .default([]),
  originalPosts: z.array(postSchema).max(9).optional(),
  generation: z
    .object({
      turnId: text(200),
      model: text(200),
      expertVersion: text(120),
      sourceVersion: text(128),
      durationMs: z.number().int().nonnegative().optional(),
    })
    .optional(),
  revision: z.number().int().nonnegative().optional(),
  archived: z.boolean().default(false),
  campaignId: z.uuid().nullable().default(null),
  productId: z.uuid().nullable().default(null),
  review: z
    .object({
      state: z
        .enum(["draft", "review", "changes", "approved", "planned"])
        .default("draft"),
      owner: text(120).default(""),
      comment: text(2000).default(""),
      reviewedBy: text(200).optional(),
      reviewedAt: z.iso.datetime().optional(),
    })
    .default({ state: "draft", owner: "", comment: "" }),
  gallery: z
    .array(z.object({ mediaId: z.uuid(), alt: text(2000).default("") }))
    .max(10)
    .default([]),
  platformMedia: z.partialRecord(z.enum(platformIds), z.uuid()).default({}),
  platformFits: z
    .partialRecord(z.enum(platformIds), z.enum(["contain", "cover"]))
    .default({}),
  production: z
    .object({
      format: z.enum(["post", "carousel", "story", "video"]).default("post"),
      hook: text(500).default(""),
      scenes: text(4000).default(""),
      subtitles: text(4000).default(""),
      cover: text(500).default(""),
      cta: text(500).default(""),
    })
    .optional(),
  sourceRefs: z
    .array(
      z.object({
        sourceId: z.uuid(),
        factId: z.uuid(),
        field: text(100),
        value: text(600),
        url: z
          .url()
          .max(2048)
          .refine((v) => new URL(v).protocol === "https:"),
        validUntil: z.iso.datetime(),
      }),
    )
    .max(6)
    .optional(),
  companyId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  text: text(),
  selected: selectedSchema,
  posts: z.array(postSchema).max(9),
  mediaId: z.uuid().nullable().default(null),
  mediaFit: z.enum(["contain", "cover"]).default("contain"),
});

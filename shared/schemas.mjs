import { z } from "zod";
import { platformIds } from "../server/platforms.mjs";

z.config(z.locales.tr());

const text = (max = 8000) => z.string().max(max);
export const companySchema = z.object({
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
  .max(8)
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
  companyId: z.uuid(),
  name: z.string().trim().min(1).max(120),
  text: text(),
  selected: selectedSchema,
  posts: z.array(postSchema).max(8),
  mediaId: z.uuid().nullable().default(null),
  mediaFit: z.enum(["contain", "cover"]).default("contain"),
});

export type PlatformId =
  | "instagram"
  | "facebook"
  | "x"
  | "threads"
  | "pinterest"
  | "youtube"
  | "tiktok"
  | "linkedin"
  | "tumblr";
export type SocialPlatformId = PlatformId | "tumblr";
export type Platform = {
  id: PlatformId;
  name: string;
  kind: string;
  limit: number;
  titleLimit?: number;
  width: number;
  height: number;
  format: string;
  hashtags: number;
  hint: string;
  needsVideo: boolean;
  docs: string;
  requirement: string;
  ruleVersion: string;
  ruleUpdatedAt: string;
  providerCheckedAt: string | null;
};
export type CompanyInput = {
  preferredPlatforms?: PlatformId[];
  regional?: Partial<
    Record<
      | "sector"
      | "districts"
      | "segments"
      | "languages"
      | "delivery"
      | "currency"
      | "contact"
      | "hours"
      | "goal"
      | "restrictions"
      | "timezone",
      string
    >
  >;
  name: string;
  handle: string;
  website: string;
  tone: string;
  audience: string;
  keywords: string;
  color: string;
};
export type Company = CompanyInput & { id: string };
export type Post = {
  platform: PlatformId;
  title: string;
  caption: string;
  hashtags: string[];
  alt: string;
};
export type Media = {
  deleting?: boolean;
  id: string;
  companyId: string;
  width: number;
  height: number;
};
export type DraftInput = {
  productRefs?: {
    id: string;
    revision: number;
    sourceUrl: string;
    validUntil: string;
  }[];
  originalPosts?: Post[];
  generation?: {
    turnId: string;
    model: string;
    expertVersion: string;
    sourceVersion: string;
    durationMs?: number;
  };
  revision?: number;
  archived?: boolean;
  campaignId?: string | null;
  productId?: string | null;
  review?: {
    state: "draft" | "review" | "changes" | "approved" | "planned";
    owner: string;
    comment: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
  gallery?: { mediaId: string; alt: string }[];
  platformMedia?: Partial<Record<PlatformId, string>>;
  platformFits?: Partial<Record<PlatformId, "contain" | "cover">>;
  production?: {
    format: "post" | "carousel" | "story" | "video";
    hook: string;
    scenes: string;
    subtitles: string;
    cover: string;
    cta: string;
  };
  sourceRefs?: SourceRef[];
  companyId: string;
  name: string;
  text: string;
  selected: PlatformId[];
  posts: Post[];
  mediaId: string | null;
  mediaFit: "contain" | "cover";
};
export type Draft = DraftInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
export type AuthUser = {
  enabled?: boolean;
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "editor";
  local?: boolean;
};
export type SourceRef = {
  sourceId: string;
  factId: string;
  field: string;
  value: string;
  url: string;
  validUntil: string;
};

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
};
export type CompanyInput = {
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
  id: string;
  companyId: string;
  width: number;
  height: number;
};
export type DraftInput = {
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
  id: string;
  username: string;
  email: string;
  name: string;
  role: "admin" | "editor";
  local?: boolean;
};

export type Publisher = {
  name: string;
  hosts: string[];
  limit: number;
  images: number;
  create: string[];
  publish: string[];
  fields: string;
  actor: string;
};
export const tabPublishing: {
  platforms: Record<string, Publisher>;
  profile(value: string, platform: string): string | null;
  canonical(value: string, platform: string): string | null;
  postURL(value: string, platform: string): string | null;
  ownedURL(value: string, target: string, platform: string): boolean;
};
export function tabPublishingExtensionSource(): string;

export const editorialKinds: string[];
export const reviewStates: string[];
export const initialChannels: string[];
export function campaignUrl(input: {
  url: string;
  platform: string;
  medium?: string;
  campaign: string;
  variant?: string;
}): string;
export function latestMeasurements<
  T extends {
    platform: string;
    sourceUrl: string;
    measuredAt: string;
    windowHours: number;
  },
>(rows: T[]): T[];
export function draftAssetIds(draft: unknown): string[];

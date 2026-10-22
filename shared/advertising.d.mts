export type AdProvider = {
  id: string;
  name: string;
  platforms: string[];
  home: string;
  hosts: string[];
  paths: string[];
  guide: string;
};
export const adProviders: AdProvider[];
export const adProviderIds: string[];
export const AD_GUIDE_VERSION: string;
export const advertisingRules: string;
export function advertisingKPIs(
  values: Record<string, number | null>,
  paid: {
    spend: number | null;
    conversions: number | null;
    revenue: number | null;
    revenueVerified: boolean;
  },
): Record<string, number | null>;
export function advertisingExtensionSource(): string;

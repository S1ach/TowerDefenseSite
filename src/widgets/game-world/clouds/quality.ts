export type CloudQuality = 'low' | 'medium' | 'high';
export type CloudSetting = 'off' | CloudQuality;
// `share` is the fraction of CLOUD_COUNT (see formations.ts) that stays visible at this quality.
export const CLOUD_PRESETS = {
  low: { width: 64, height: 32, steps: 8, share: 0.5 },
  medium: { width: 128, height: 64, steps: 12, share: 1 },
  high: { width: 256, height: 128, steps: 18, share: 1 },
} as const;
export function lowerCloudQuality(quality: CloudQuality): CloudQuality {
  return quality === 'high' ? 'medium' : 'low';
}

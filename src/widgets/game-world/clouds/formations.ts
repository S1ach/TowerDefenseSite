/** Cloud placement is pure data: no Three.js here, so it runs in node tests. */
import { mulberry32 } from '../../../game/math/random';

/** Total clouds at full quality; presets in quality.ts take a share of this number. */
export const CLOUD_COUNT = 16;
/** Deterministic seed: the sky looks the same on every load and in tests. */
export const CLOUD_SEED = 20260913;
/** Base sprite width in world units; the texture aspect (2:1 with a lower haze) sets the height. */
const BASE_WIDTH = 20;

export interface CloudLayer {
  name: 'near' | 'mid' | 'far';
  /** Share of CLOUD_COUNT that belongs to this layer. */
  share: number;
  /** Height band below the floating island (the island bottom sits at y = -11). */
  y: [number, number];
  /** Distance from the island centre on the ground plane; the near band starts past the island rim. */
  radius: [number, number];
  /** Random multiplier of BASE_WIDTH. Far clouds are smaller, near clouds larger. */
  scale: [number, number];
  /** Sway speed range (radians per second) for the shared oscillation logic. */
  speed: [number, number];
  /** Shared material settings: far clouds are paler and always use the low texture plus fog. */
  opacity: number;
  color: string;
  detail: 'full' | 'low';
}

export const CLOUD_LAYERS: readonly CloudLayer[] = [
  { name: 'near', share: 0.3, y: [-7, -9], radius: [15, 28], scale: [1.1, 1.8], speed: [0.018, 0.03], opacity: 0.88, color: '#ffffff', detail: 'full' },
  { name: 'mid', share: 0.4, y: [-9.5, -12], radius: [22, 34], scale: [0.8, 1.4], speed: [0.011, 0.019], opacity: 0.62, color: '#f0f7f3', detail: 'full' },
  { name: 'far', share: 0.3, y: [-13, -16], radius: [32, 46], scale: [0.6, 1.1], speed: [0.006, 0.011], opacity: 0.3, color: '#c8dcd6', detail: 'low' },
];

export interface CloudFormation {
  layer: number;
  position: [number, number, number];
  size: [number, number];
  /** Individual sway: speed, phase and amplitude keep clouds out of sync. */
  speed: number;
  phase: number;
  amplitude: number;
}

/** Minimum ground distance between two clouds, relative to their widths; stricter inside one layer. */
export function minimumDistance(a: CloudFormation, b: CloudFormation) {
  return (a.size[0] + b.size[0]) * (a.layer === b.layer ? 0.36 : 0.22);
}

/** How many clouds each layer gets for a given total; the mid layer absorbs rounding. */
export function layerCounts(total: number) {
  const near = Math.round(total * CLOUD_LAYERS[0].share);
  const far = Math.round(total * CLOUD_LAYERS[2].share);
  return [near, Math.max(0, total - near - far), far];
}

/** Places clouds layer by layer (near first, so quality cuts drop the far ones) with rejection sampling. */
export function buildFormations(total = CLOUD_COUNT, seed = CLOUD_SEED): CloudFormation[] {
  const random = mulberry32(seed);
  const between = ([min, max]: [number, number]) => min + (max - min) * random();
  const result: CloudFormation[] = [];
  layerCounts(total).forEach((count, layer) => {
    const spec = CLOUD_LAYERS[layer];
    for (let n = 0; n < count; n++) {
      let best: CloudFormation | null = null, bestGap = -Infinity;
      // Up to 80 attempts; if none is free the least crowded candidate is kept so the count stays exact.
      for (let attempt = 0; attempt < 80; attempt++) {
        const width = BASE_WIDTH * between(spec.scale);
        const angle = random() * Math.PI * 2, radius = between(spec.radius);
        const candidate: CloudFormation = {
          layer,
          position: [Math.cos(angle) * radius, between(spec.y), Math.sin(angle) * radius],
          size: [width, width * between([0.4, 0.5])],
          speed: between(spec.speed), phase: random() * Math.PI * 2, amplitude: between([0.7, 1.6]),
        };
        let gap = Infinity;
        for (const other of result) {
          const distance = Math.hypot(candidate.position[0] - other.position[0], candidate.position[2] - other.position[2]);
          gap = Math.min(gap, distance - minimumDistance(candidate, other));
        }
        if (gap > bestGap) { best = candidate; bestGap = gap; }
        if (gap >= 0) break;
      }
      if (best) result.push(best);
    }
  });
  return result;
}

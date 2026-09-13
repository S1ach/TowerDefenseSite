import { battlefield } from '../config/battlefield';
import type { Position } from '../entities/types';

/** Towers must stay this far inside the field edge, off the road and away from each other. */
const FIELD_MARGIN = 0.8;
const ROAD_CLEARANCE = 0.7;
const TOWER_SPACING = 1.6;

export const segments = battlefield.path.slice(1).map(([x, z], i) => {
  const [ax, az] = battlefield.path[i];
  return { ax, az, x, z, length: Math.hypot(x - ax, z - az) };
});
export const pathLength = segments.reduce((sum, s) => sum + s.length, 0);
export function pointOnPath(distance: number): Position {
  let remaining = Math.max(0, distance);
  for (const s of segments) {
    if (remaining <= s.length) {
      const t = remaining / s.length;
      return { x: s.ax + (s.x - s.ax) * t, z: s.az + (s.z - s.az) * t };
    }
    remaining -= s.length;
  }
  const [x, z] = battlefield.path[battlefield.path.length - 1];
  return { x, z };
}
export function distanceToPath(p: Position) {
  return Math.min(...segments.map(s => {
    const t = Math.max(0, Math.min(1, ((p.x - s.ax) * (s.x - s.ax) + (p.z - s.az) * (s.z - s.az)) / s.length ** 2));
    return Math.hypot(p.x - (s.ax + t * (s.x - s.ax)), p.z - (s.az + t * (s.z - s.az)));
  }));
}
export function placementError(p: Position, occupied: Position[]): string | null {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) return 'Некорректные координаты';
  if (Math.abs(p.x) > battlefield.width / 2 - FIELD_MARGIN || Math.abs(p.z) > battlefield.depth / 2 - FIELD_MARGIN) return 'За границей поля';
  if (distanceToPath(p) < battlefield.roadWidth / 2 + ROAD_CLEARANCE) return 'Нельзя строить на дороге';
  if (occupied.some(t => Math.hypot(t.x - p.x, t.z - p.z) < TOWER_SPACING)) return 'Слишком близко к другой башне';
  return null;
}

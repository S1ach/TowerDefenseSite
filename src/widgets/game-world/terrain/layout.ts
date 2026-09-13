/** Island layout math: pure functions with no Three.js, so they run in node tests. */
import { battlefield } from '../../../game/config/battlefield';

export const HALF_W = battlefield.width / 2;
export const HALF_D = battlefield.depth / 2;
/** Island outline is a superellipse: semi-axes just past the field, exponent 5 gives soft rounded corners. */
export const ISLAND = { a: HALF_W + 2.6, b: HALF_D + 2.6, exponent: 5 };
/** Fixed landmarks on the rim; the road runs into both. */
export const LANDMARKS = { spawn: [-13.7, 5] as const, fortress: [13.8, -5] as const };
/** Corner rounding radius for the visual road. Enemies walk the logical path, which stays inside the road width. */
export const FILLET_RADIUS = 1.15;
/** How far the road continues past both path ends so it disappears under the portal and the fortress. */
export const ROAD_OVERRUN = 1.3;

/** Distance from the island centre to the cliff edge in direction theta (radians, on the ground plane). */
export function outlineRadius(theta: number) {
  const { a, b, exponent } = ISLAND;
  const c = Math.abs(Math.cos(theta) / a) ** exponent, s = Math.abs(Math.sin(theta) / b) ** exponent;
  return (c + s) ** (-1 / exponent);
}
/** Distance from the centre to the edge of the rectangular play field in direction theta. */
export function fieldRadius(theta: number) {
  const c = Math.abs(Math.cos(theta)), s = Math.abs(Math.sin(theta));
  return Math.min(c > 1e-9 ? HALF_W / c : Infinity, s > 1e-9 ? HALF_D / s : Infinity);
}
/** Ring angles: evenly spaced plus the exact field-corner angles, so the field rectangle is never clipped. */
export function outlineAngles(segments = 72): number[] {
  const angles = Array.from({ length: segments }, (_, i) => -Math.PI + (i / segments) * Math.PI * 2);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) angles.push(Math.atan2(sz * HALF_D, sx * HALF_W));
  angles.sort((a, b) => a - b);
  return angles.filter((angle, i) => i === 0 || angle - angles[i - 1] > 1e-6);
}

export type Point = [number, number];
/** Road centreline: straight runs with quadratic-Bezier fillets at each turn, extended past both ends. */
export function roadCenterline(samplesPerCorner = 7): Point[] {
  const path = battlefield.path;
  const direction = (from: Point | readonly [number, number], to: Point | readonly [number, number]): Point => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
    return [(to[0] - from[0]) / length, (to[1] - from[1]) / length];
  };
  const first = direction(path[0], path[1]), last = direction(path[path.length - 2], path[path.length - 1]);
  const result: Point[] = [[path[0][0] - first[0] * ROAD_OVERRUN, path[0][1] - first[1] * ROAD_OVERRUN], [path[0][0], path[0][1]]];
  for (let i = 1; i < path.length - 1; i++) {
    const previous = path[i - 1], current = path[i], next = path[i + 1];
    const into = direction(previous, current), out = direction(current, next);
    const room = Math.min(Math.hypot(current[0] - previous[0], current[1] - previous[1]), Math.hypot(next[0] - current[0], next[1] - current[1])) / 2;
    const t = Math.min(FILLET_RADIUS, room);
    const a: Point = [current[0] - into[0] * t, current[1] - into[1] * t];
    const b: Point = [current[0] + out[0] * t, current[1] + out[1] * t];
    for (let s = 0; s <= samplesPerCorner; s++) {
      const u = s / samplesPerCorner, v = 1 - u;
      result.push([v * v * a[0] + 2 * v * u * current[0] + u * u * b[0], v * v * a[1] + 2 * v * u * current[1] + u * u * b[1]]);
    }
  }
  const end = path[path.length - 1];
  result.push([end[0], end[1]], [end[0] + last[0] * ROAD_OVERRUN, end[1] + last[1] * ROAD_OVERRUN]);
  return result;
}

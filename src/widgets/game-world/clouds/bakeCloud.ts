import { DataTexture, LinearFilter, RGBAFormat, SRGBColorSpace } from 'three';
import { CLOUD_PRESETS, type CloudQuality } from './quality';

// A bounded, once-per-quality volume integration. No ray marching runs per frame.
// The six broad ellipsoids define cumulus lobes; detail only perturbs their density.
const lobes = [
  [-0.58, -0.15, 0, 0.32, 0.35, 0.48], [-0.3, 0.05, 0, 0.4, 0.53, 0.6],
  [0.05, 0.17, 0, 0.39, 0.62, 0.65], [0.4, -0.03, 0, 0.36, 0.45, 0.5],
  [0.67, -0.18, 0, 0.23, 0.28, 0.4], [0, -0.26, 0, 0.7, 0.29, 0.6],
];
const cache = new Map<CloudQuality, DataTexture>();
function density(x: number, y: number, z: number) {
  let value = 0;
  for (const [cx, cy, cz, sx, sy, sz] of lobes) {
    const radius = ((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2 + ((z - cz) / sz) ** 2;
    value = Math.max(value, Math.max(0, 1 - radius));
  }
  return value * (0.91 + 0.09 * Math.sin(x * 27 + z * 9) * Math.sin(y * 21 - z * 11));
}
export function bakeCloud(quality: CloudQuality) {
  const cached = cache.get(quality);
  if (cached) return cached;
  const { width, height, steps } = CLOUD_PRESETS[quality];
  const pixels = new Uint8Array(width * height * 4);
  const step = 2 / steps;
  for (let py = 0; py < height; py++) for (let px = 0; px < width; px++) {
    const x = (px + 0.5) / width * 2.2 - 1.1;
    const y = (py + 0.5) / height * 2 - 1;
    let transmittance = 1, light = 0;
    for (let i = 0; i < steps; i++) {
      const z = -1 + (i + 0.5) * step;
      const rho = density(x, y, z);
      if (rho < 0.001) continue;
      const absorption = 1 - Math.exp(-rho * step * 7);
      // One lighting sample, no secondary march; brighter upper and left surfaces.
      const shade = Math.exp(-density(x - 0.17, y + 0.25, z - 0.12) * 1.3);
      light += transmittance * absorption * (0.71 + 0.29 * shade);
      transmittance *= 1 - absorption;
      if (transmittance < 0.025) break;
    }
    const alpha = 1 - transmittance, index = (py * width + px) * 4;
    const brightness = alpha > 0 ? light / alpha : 1;
    pixels[index] = Math.round(247 * brightness);
    pixels[index + 1] = Math.round(253 * brightness);
    pixels[index + 2] = Math.round(247 * brightness);
    pixels[index + 3] = Math.round(alpha * 255);
  }
  const texture = new DataTexture(pixels, width, height, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = texture.magFilter = LinearFilter;
  texture.generateMipmaps = false; texture.needsUpdate = true;
  cache.set(quality, texture);
  return texture;
}

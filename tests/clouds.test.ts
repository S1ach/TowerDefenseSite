import test from 'node:test';
import assert from 'node:assert/strict';
import { bakeCloud } from '../src/widgets/game-world/clouds/bakeCloud';
import { CLOUD_PRESETS, lowerCloudQuality } from '../src/widgets/game-world/clouds/quality';
import { CLOUD_COUNT, CLOUD_LAYERS, buildFormations, layerCounts, minimumDistance } from '../src/widgets/game-world/clouds/formations';

test('cloud impostors have transparent borders, visible volume and bounded cached textures', () => {
  for (const quality of ['low', 'medium', 'high'] as const) {
    const texture = bakeCloud(quality);
    assert.equal(texture, bakeCloud(quality), 'quality changes must reuse the baked texture');
    const { width, height } = CLOUD_PRESETS[quality];
    const data = texture.image.data as Uint8Array;
    assert.equal(texture.image.width, width);
    assert.ok(width <= 256 && height <= 128);
    let maximumAlpha = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3];
      maximumAlpha = Math.max(maximumAlpha, alpha);
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) assert.equal(alpha, 0, 'no rectangular edges');
    }
    assert.ok(maximumAlpha > 220, 'the cloud must contain a dense core');
  }
});
test('cloud formations are deterministic, layered by depth and never clump together', () => {
  const clouds = buildFormations();
  assert.equal(clouds.length, CLOUD_COUNT);
  assert.deepEqual(clouds, buildFormations(), 'same seed must give the same sky');
  assert.deepEqual(layerCounts(CLOUD_COUNT).reduce((a, b) => a + b, 0), CLOUD_COUNT);
  for (const cloud of clouds) {
    const layer = CLOUD_LAYERS[cloud.layer];
    assert.ok(cloud.position[1] >= layer.y[1] && cloud.position[1] <= layer.y[0], 'height stays inside its band');
    const radius = Math.hypot(cloud.position[0], cloud.position[2]);
    assert.ok(radius >= layer.radius[0] && radius <= layer.radius[1], 'distance stays inside its band');
    assert.ok(cloud.size[0] >= 20 * layer.scale[0] && cloud.size[0] <= 20 * layer.scale[1], 'scale stays inside its band');
  }
  const previous = clouds.slice(0, -1).findIndex((cloud, i) => cloud.layer > clouds[i + 1].layer);
  assert.equal(previous, -1, 'near clouds come first so quality cuts remove far ones');
  for (let i = 0; i < clouds.length; i++) for (let j = i + 1; j < clouds.length; j++) {
    const distance = Math.hypot(clouds[i].position[0] - clouds[j].position[0], clouds[i].position[2] - clouds[j].position[2]);
    assert.ok(distance >= minimumDistance(clouds[i], clouds[j]), `clouds ${i} and ${j} overlap`);
  }
  const speeds = new Set(clouds.map(cloud => `${cloud.speed}/${cloud.phase}`));
  assert.equal(speeds.size, clouds.length, 'no two clouds sway in sync');
});
test('cloud fallback terminates at low without changing gameplay quality', () => {
  assert.equal(lowerCloudQuality('high'), 'medium');
  assert.equal(lowerCloudQuality('medium'), 'low');
  assert.equal(lowerCloudQuality('low'), 'low');
});

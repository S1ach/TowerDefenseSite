import test from 'node:test';
import assert from 'node:assert/strict';
import { battlefield } from '../src/game/config/battlefield';
import { distanceToPath } from '../src/game/math/path';
import { FILLET_RADIUS, HALF_D, HALF_W, fieldRadius, outlineAngles, outlineRadius, roadCenterline } from '../src/widgets/game-world/terrain/layout';
import { OBJECTS, groundHeight, sceneryProblem } from '../src/widgets/game-world/IslandTerrain';

test('island outline encloses the play field with a rim on every side', () => {
  const angles = outlineAngles();
  assert.deepEqual([...angles].sort((a, b) => a - b), angles, 'angles are sorted');
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const corner = Math.atan2(sz * HALF_D, sx * HALF_W);
    assert.ok(angles.some(angle => Math.abs(angle - corner) < 1e-9), 'field corners are ring vertices');
    assert.ok(outlineRadius(corner) - Math.hypot(HALF_W, HALF_D) > 0.8, 'cliff edge clears the field corner');
  }
  for (const angle of angles) assert.ok(outlineRadius(angle) - fieldRadius(angle) > 0.8, 'rim never thinner than 0.8');
});

test('visual road follows the logical path closely enough for enemies to stay on it', () => {
  const line = roadCenterline();
  const [startX, startZ] = battlefield.path[0], [endX, endZ] = battlefield.path[battlefield.path.length - 1];
  assert.ok(line[0][0] < startX, 'road starts before the spawn point');
  assert.ok(line[line.length - 1][0] > endX, 'road runs past the fortress point');
  const maxDeviation = FILLET_RADIUS * (Math.SQRT2 - 1) + 0.05;
  for (const [x, z] of line.slice(1, -1)) assert.ok(distanceToPath({ x, z }) <= maxDeviation, `centreline drifts ${distanceToPath({ x, z })} at ${x},${z}`);
  assert.ok(maxDeviation < battlefield.roadWidth / 2, 'corner cut stays inside the road width');
  assert.deepEqual([line[1], line[line.length - 2]], [[startX, startZ], [endX, endZ]]);
});

// Only hard constraints: the layout itself is hand-tuned, so spacing and rounding are the author's choice.
test('hand-placed scenery stands on the island, off the field, road and landmarks', () => {
  assert.ok(OBJECTS.length > 0, 'layout is not empty');
  OBJECTS.forEach((object, index) => {
    assert.equal(sceneryProblem(object), null, `OBJECTS[${index}] (${object.type} ${object.x}, ${object.z})`);
    assert.equal(groundHeight(object.x, object.z), 0, 'island top is flat, bases sit at y = 0');
    if (object.scale !== undefined) assert.ok(object.scale > 0.4 && object.scale < 2, 'scale stays in a sane range');
  });
});

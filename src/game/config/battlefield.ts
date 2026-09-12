/** Domain coordinates: X/Z are ground axes; Y is height. No Three.js dependency. */
export type GroundPoint = readonly [x: number, z: number];
export const battlefield = {
  width: 26,
  depth: 20,
  roadWidth: 1.8,
  path: [[-13, 5], [-7, 5], [-7, -4], [0, -4], [0, 4], [7, 4], [7, -5], [13, -5]] as readonly GroundPoint[],
};
export const cameraConfig = {
  position: [26, 29, 30] as [number, number, number],
  target: [0, 0, 0] as [number, number, number],
  minDistance: 19,
  maxDistance: 55,
};

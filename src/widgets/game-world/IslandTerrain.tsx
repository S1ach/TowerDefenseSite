/**
 * Procedural low-poly island: terrain, road, portal, fortress, rim props, sky, lighting and the idle sway.
 * Everything here is built from primitives; layout math lives in ./terrain/layout.ts so it can be unit-tested.
 * Gameplay coordinates are untouched: the field is still 26 × 20 at y = 0 and the road follows battlefield.path.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  BackSide, BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry,
  Float32BufferAttribute, Group, InstancedMesh, Matrix4, MeshStandardMaterial, Object3D, OctahedronGeometry, Quaternion,
  TorusGeometry, Vector3,
} from 'three';
import { battlefield } from '../../game/config/battlefield';
import { distanceToPath } from '../../game/math/path';
import { LANDMARKS, fieldRadius, outlineAngles, outlineRadius, roadCenterline } from './terrain/layout';

// ───────────────────────── scenery (edit by hand) ─────────────────────────
/** Temporary placement aids: axes and a console.log of the clicked ground point. Set to false when done. */
const DEBUG = true;

/** 'tree' — ёлка, 'round' — лиственное дерево, 'rock' — камень. */
export type SceneryType = 'tree' | 'round' | 'rock';
/** rotY (радианы) и scale необязательны: без rotY поворот берётся из номера строки, без scale — 1. */
export interface SceneryObject { type: SceneryType; x: number; z: number; rotY?: number; scale?: number }

/**
 * Единственный источник расстановки. Поле занимает |x| ≤ 13, |z| ≤ 10, обод острова доходит примерно до |x| ≤ 15, |z| ≤ 12
 * (по углам меньше). Портал стоит в (-14, 5), крепость в (14, -5): вокруг них оставлено свободное место.
 * Высота не задаётся: остров плоский, всё стоит на y = 0.
 */
export const OBJECTS: SceneryObject[] = [
  // северный край (z = -11 … -12)
  { type: 'tree', x: -5, z: -11 },
  { type: 'round', x: -5, z: -12, rotY: 0.8 },
  { type: 'tree', x: -3.5, z: -11, scale: 1.1 },
  { type: 'rock', x: -3, z: -12, rotY: 0.4, scale: 0.9 },
  { type: 'tree', x: 4, z: -11, scale: 0.9 },
  { type: 'round', x: -7, z: -12, rotY: 2.1 },
  { type: 'tree', x: 8, z: -11, scale: 1.15 },
  { type: 'rock', x: 11, z: -11, rotY: 1.3, scale: 1.2 },
  // восточный край (x = 14 … 15), крепость в (14, -5)
  { type: 'round', x: 12, z: -9, rotY: 0.3 },
  { type: 'tree', x: 15, z: -1, scale: 1.1 },
  { type: 'tree', x: 15, z: 7, scale: 1.1 },
  { type: 'rock', x: 15, z: 1, rotY: 0.7, scale: 0.8 },
  { type: 'round', x: 14, z: 3, rotY: 1.6 },
  { type: 'tree', x: 14, z: 6 },
  { type: 'rock', x: 13.8, z: 7.5, rotY: 2.1, scale: 1.1 },
  // южный край (z = 11 … 12)
  { type: 'tree', x: 2.5, z: 11, scale: 1.05 },
  { type: 'round', x: 7, z: 12, rotY: 0.9 },
  { type: 'rock', x: 1, z: 11, rotY: 1.1, scale: 0.7 },
  { type: 'tree', x: 1, z: 12 },
  { type: 'tree', x: -0.5, z: 11, scale: 0.95 },
  { type: 'rock', x: -8, z: 11.5, rotY: 0.2, scale: 1.3 },
  { type: 'round', x: -10, z: 11, rotY: 2.8 },
  { type: 'tree', x: -12, z: 11, scale: 1.1 },
  // западный край (x = -14 … -15), портал в (-14, 5)
  { type: 'tree', x: -14, z: -1, scale: 1.2 },
  { type: 'rock', x: -15, z: -5, rotY: 1.9, scale: 1.0 },
  { type: 'round', x: -14, z: -2.5, rotY: 0.5 },
  { type: 'tree', x: -15, z: 1, scale: 1.05 },
  { type: 'rock', x: -14, z: 9, rotY: 0.6, scale: 0.9 },
];

/** One muted daylight palette for the whole scene; the HUD page background uses skyHorizon too. */
export const palette = {
  skyTop: '#8db8d2', skyHorizon: '#c3d6d0', skyBottom: '#b3c9c3',
  hemiSky: '#e9f3f8', hemiGround: '#6f8c6a', sun: '#fff3e0',
  field: '#7c9e6e', rim: '#6d9c5f', grassSide: '#5d8c52',
  soil: '#a3845a', rock: '#8a857c', rockDeep: '#6f6c68',
  road: '#cf9c5f', shoulder: '#b8a678',
  trunk: '#7a5a3c', canopy: ['#4fb049', '#427649', '#6ea564'], stone: '#8f8f8a',
  wallStone: '#a3a39c', wallDark: '#7d7d77', roof: '#c2694f', portal: '#3e3a55',
};

// ───────────────────────── geometry helpers ─────────────────────────
type Vec = [number, number, number];
const Y_AXIS = new Vector3(0, 1, 0);
/** Cheap deterministic hash in [0, 1) for per-face colour jitter (gives low-poly facets some life). */
const hash = (n: number) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

/** Accumulates coloured, non-indexed triangles; `tri` fixes winding so faces point the way we ask. */
class Builder {
  positions: number[] = []; colors: number[] = [];
  private face = 0;
  tri(a: Vec, b: Vec, c: Vec, color: Color, orient: 'up' | 'down' | 'out', jitter = 0) {
    const nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]);
    const ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]);
    const nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const cx = (a[0] + b[0] + c[0]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
    const facing = orient === 'up' ? ny : orient === 'down' ? -ny : nx * cx + nz * cz;
    if (facing < 0) [b, c] = [c, b];
    const k = jitter ? 1 + (hash(this.face) * 2 - 1) * jitter : 1;
    this.face++;
    this.positions.push(...a, ...b, ...c);
    for (let i = 0; i < 3; i++) this.colors.push(color.r * k, color.g * k, color.b * k);
  }
  /** Appends a ready primitive with a flat colour; winding of Three.js primitives is already correct. */
  add(geometry: BufferGeometry, hex: string, jitter = 0) {
    const source = geometry.index ? geometry.toNonIndexed() : geometry;
    const position = source.attributes.position, color = new Color(hex);
    for (let i = 0; i < position.count; i += 3) {
      const k = jitter ? 1 + (hash(this.face) * 2 - 1) * jitter : 1;
      this.face++;
      for (let v = 0; v < 3; v++) {
        this.positions.push(position.getX(i + v), position.getY(i + v), position.getZ(i + v));
        this.colors.push(color.r * k, color.g * k, color.b * k);
      }
    }
    if (source !== geometry) source.dispose();
    geometry.dispose();
  }
  build() {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colors, 3));
    geometry.computeVertexNormals(); geometry.computeBoundingSphere();
    return geometry;
  }
}
/** Moves a primitive into place (translate, yaw, uniform or per-axis scale). */
function placed(geometry: BufferGeometry, [x, y, z]: Vec, rotationY = 0, scale: number | Vec = 1) {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return geometry.applyMatrix4(new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromAxisAngle(Y_AXIS, rotationY), new Vector3(...s)));
}

// ───────────────────────── terrain ─────────────────────────
/** Cliff rings from the grass lip down to the rock tip: [height, outline scale, noise amplitude, band colour]. */
const CLIFF_LAYERS = [
  { y: 0, scale: 1, noise: 0, color: palette.grassSide },        // grass edge, exact outline
  { y: -0.55, scale: 1.02, noise: 0, color: palette.soil },      // slight overhang under the grass
  { y: -1.3, scale: 0.995, noise: 0.01, color: palette.soil },   // soil stays almost vertical so it reads from above
  { y: -3.2, scale: 0.97, noise: 0.02, color: palette.rock },    // soil → rock
  { y: -5.8, scale: 0.86, noise: 0.035, color: palette.rock },
  { y: -8.4, scale: 0.6, noise: 0.045, color: palette.rockDeep },
  { y: -10.5, scale: 0.28, noise: 0.05, color: palette.rockDeep },
];
const CLIFF_TIP: Vec = [0.3, -11.3, -0.2];
/** Road sits a hair above the lawn (no polygonOffset needed at this depth range); shoulders in between. */
const ROAD_Y = 0.034, SHOULDER_Y = 0.018, SHOULDER_EXTRA = 0.35;

/** Flat ribbon along a centreline: per-sample tangent → side normal → two triangles per segment. */
function ribbon(builder: Builder, line: [number, number][], halfWidth: number, y: number, color: string, jitter: number) {
  const tint = new Color(color);
  const sides = line.map((point, i) => {
    const previous = line[Math.max(0, i - 1)], next = line[Math.min(line.length - 1, i + 1)];
    const tx = next[0] - previous[0], tz = next[1] - previous[1], length = Math.hypot(tx, tz) || 1;
    const nx = -tz / length * halfWidth, nz = tx / length * halfWidth;
    return { left: [point[0] + nx, y, point[1] + nz] as Vec, right: [point[0] - nx, y, point[1] - nz] as Vec };
  });
  for (let i = 0; i < sides.length - 1; i++) {
    builder.tri(sides[i].left, sides[i].right, sides[i + 1].right, tint, 'up', jitter);
    builder.tri(sides[i].left, sides[i + 1].right, sides[i + 1].left, tint, 'up', jitter);
  }
}

function buildFortress(builder: Builder, [x, z]: readonly [number, number]) {
  builder.add(placed(new CylinderGeometry(1.45, 1.65, 0.5, 8), [x, 0.25, z], Math.PI / 8), palette.wallDark, 0.05);   // stone base
  builder.add(placed(new CylinderGeometry(1.05, 1.2, 2.3, 8), [x, 1.65, z], Math.PI / 8), palette.wallStone, 0.04);  // body
  builder.add(placed(new CylinderGeometry(1.32, 1.18, 0.38, 8), [x, 2.95, z], Math.PI / 8), palette.wallDark, 0.05);  // battlement ring
  for (let i = 0; i < 8; i++) {                                                                                       // merlons
    const angle = (i / 8) * Math.PI * 2 + Math.PI / 8;
    builder.add(placed(new BoxGeometry(0.34, 0.32, 0.34), [x + Math.cos(angle) * 1.16, 3.3, z + Math.sin(angle) * 1.16], -angle), palette.wallStone, 0.04);
  }
  builder.add(placed(new ConeGeometry(1.36, 1.45, 8), [x, 3.85, z], Math.PI / 8), palette.roof, 0.05);                // roof
  builder.add(placed(new OctahedronGeometry(0.16, 0), [x, 4.68, z]), palette.wallDark);                               // finial
  builder.add(placed(new BoxGeometry(0.22, 0.85, 0.55), [x - 1.12, 0.92, z]), palette.portal);                        // door faces the road
}
function buildPortal(builder: Builder, [x, z]: readonly [number, number]) {
  builder.add(placed(new CylinderGeometry(1.3, 1.45, 0.3, 8), [x, 0.15, z], Math.PI / 8), palette.wallDark, 0.05);    // pedestal
  builder.add(placed(new TorusGeometry(1.0, 0.18, 6, 14), [x, 1.2, z], Math.PI / 2), palette.wallStone, 0.05);       // stone ring, axis along the road
  builder.add(placed(new CircleGeometry(0.86, 14), [x, 1.2, z], Math.PI / 2), palette.portal);                        // dark gate, faces +x
  builder.add(placed(new CircleGeometry(0.86, 14), [x, 1.2, z], -Math.PI / 2), palette.portal);                       // and −x
  for (const side of [-1, 1]) builder.add(placed(new BoxGeometry(0.42, 0.9, 0.42), [x, 0.75, z + side * 1.25]), palette.wallStone, 0.04);
}

/** Island body, rim, road, portal and fortress merged into one static geometry (one draw call). */
function buildTerrain() {
  const builder = new Builder();
  const angles = outlineAngles();
  const inner = angles.map(t => [Math.cos(t) * fieldRadius(t), Math.sin(t) * fieldRadius(t)]);
  const outer = angles.map(t => [Math.cos(t) * outlineRadius(t), Math.sin(t) * outlineRadius(t)]);
  const rings = CLIFF_LAYERS.map((layer, li) => outer.map(([x, z], i) => {
    const k = layer.scale * (1 + layer.noise * Math.sin(i * 2.3 + li * 1.7));
    const dy = li >= 3 ? Math.sin(i * 1.9 + li) * 0.09 * li : 0;   // rock layers get uneven edges
    return [x * k, layer.y + dy, z * k] as Vec;
  }));
  const field = new Color(palette.field), rim = new Color(palette.rim);
  for (let i = 0; i < angles.length; i++) {
    const next = (i + 1) % angles.length;
    const a: Vec = [inner[i][0], 0, inner[i][1]], b: Vec = [inner[next][0], 0, inner[next][1]];
    builder.tri([0, 0, 0], b, a, field, 'up');                                    // play field: part of the same surface
    builder.tri(a, [outer[next][0], 0, outer[next][1]], [outer[i][0], 0, outer[i][1]], rim, 'up', 0.03);
    builder.tri(a, b, [outer[next][0], 0, outer[next][1]], rim, 'up', 0.03);       // rim between field and cliff edge
    for (let li = 0; li < CLIFF_LAYERS.length - 1; li++) {
      const color = new Color(CLIFF_LAYERS[li].color), jitter = li >= 3 ? 0.07 : 0.04;
      builder.tri(rings[li][i], rings[li][next], rings[li + 1][i], color, 'out', jitter);
      builder.tri(rings[li][next], rings[li + 1][next], rings[li + 1][i], color, 'out', jitter);
    }
    builder.tri(CLIFF_TIP, rings[rings.length - 1][i], rings[rings.length - 1][next], new Color(palette.rockDeep), 'down', 0.06);
  }
  const line = roadCenterline();
  ribbon(builder, line, battlefield.roadWidth / 2 + SHOULDER_EXTRA, SHOULDER_Y, palette.shoulder, 0.03);
  ribbon(builder, line, battlefield.roadWidth / 2, ROAD_Y, palette.road, 0.025);
  buildPortal(builder, LANDMARKS.spawn);
  buildFortress(builder, LANDMARKS.fortress);
  return builder.build();
}

// ───────────────────────── props (instanced) ─────────────────────────
/** Ground height under a scenery object. The island top is flat, so it is 0 everywhere on the island. */
export function groundHeight(_x: number, _z: number) { return 0; }
/** Returns a human-readable problem for an object that would float or sit on the road, or null if it is fine. */
export function sceneryProblem({ x, z }: SceneryObject): string | null {
  const theta = Math.atan2(z, x), radius = Math.hypot(x, z);
  if (radius > outlineRadius(theta) - 0.3) return 'за краем острова (повиснет в воздухе)';
  if (distanceToPath({ x, z }) < battlefield.roadWidth / 2 + 0.6) return 'на дороге';
  for (const [name, [lx, lz]] of Object.entries(LANDMARKS)) if (Math.hypot(x - lx, z - lz) < 2.4) return `внутри ${name === 'spawn' ? 'портала' : 'крепости'}`;
  return null;
}
function propGeometry(kind: SceneryType) {
  const b = new Builder();
  if (kind === 'tree') {
    b.add(placed(new CylinderGeometry(0.12, 0.17, 0.6, 6), [0, 0.3, 0]), palette.trunk);
    b.add(placed(new ConeGeometry(0.8, 1.0, 7), [0, 0.95, 0]), palette.canopy[1], 0.05);
    b.add(placed(new ConeGeometry(0.62, 0.9, 7), [0, 1.55, 0], 0.3), palette.canopy[0], 0.05);
    b.add(placed(new ConeGeometry(0.42, 0.8, 7), [0, 2.1, 0], 0.6), palette.canopy[2], 0.05);
  } else if (kind === 'round') {
    b.add(placed(new CylinderGeometry(0.14, 0.19, 0.9, 6), [0, 0.45, 0]), palette.trunk);
    b.add(placed(new DodecahedronGeometry(0.72, 0), [0, 1.45, 0], 0.4, [1, 0.9, 1]), palette.canopy[0], 0.06);
    b.add(placed(new DodecahedronGeometry(0.45, 0), [0.28, 1.72, 0.22], 1.1), palette.canopy[2], 0.06);
  } else {
    b.add(placed(new DodecahedronGeometry(0.5, 0), [0, 0.22, 0], 0, [1.25, 0.65, 1]), palette.stone, 0.08);
    b.add(placed(new DodecahedronGeometry(0.28, 0), [0.5, 0.14, 0.25], 0.9, [1, 0.7, 1]), palette.stone, 0.08);
  }
  return b.build();
}
/** One InstancedMesh per type: one geometry and the shared material for every object of that type. */
function Props({ kind, material }: { kind: SceneryType; material: MeshStandardMaterial }) {
  const placements = useMemo(() => OBJECTS.map((object, index) => ({ object, index })).filter(entry => entry.object.type === kind), [kind]);
  const geometry = useMemo(() => propGeometry(kind), [kind]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const mesh = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const target = mesh.current; if (!target) return;
    const object = new Object3D(), color = new Color();
    placements.forEach(({ object: spec, index }, i) => {
      // Defaults: a deterministic pseudo-random yaw from the row number, scale 1, base exactly on the ground.
      const rotY = spec.rotY ?? hash(index + 3) * Math.PI * 2, scale = spec.scale ?? 1;
      object.position.set(spec.x, groundHeight(spec.x, spec.z), spec.z); object.rotation.set(0, rotY, 0); object.scale.setScalar(scale); object.updateMatrix();
      target.setMatrixAt(i, object.matrix);
      target.setColorAt(i, color.setScalar(0.92 + hash(index + 11) * 0.14));   // slight brightness variation per instance
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
    target.computeBoundingSphere();
  }, [placements]);
  return placements.length ? <instancedMesh ref={mesh} args={[geometry, material, placements.length]} castShadow receiveShadow /> : null;
}
/** Placement aids, active only while DEBUG is true: axes (x red, y green, z blue) and an object check in the console. */
function DebugHelpers() {
  useEffect(() => {
    OBJECTS.forEach((object, index) => { const problem = sceneryProblem(object); if (problem) console.warn(`OBJECTS[${index}] (${object.type} ${object.x}, ${object.z}): ${problem}`); });
  }, []);
  return <>
    <axesHelper args={[8]} position={[0, 0.08, 0]} raycast={() => null} />
  </>;
}

/** The static island with its road and landmarks plus instanced rim props. */
export function IslandTerrain() {
  const geometry = useMemo(buildTerrain, []);
  const material = useMemo(() => new MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, metalness: 0 }), []);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  // pointerup instead of click: the invisible build plane above the field stops click propagation.
  const logGround = DEBUG ? (event: { delta: number; point: Vector3 }) => { if (event.delta < 5) console.log(`ground: x ${Math.round(event.point.x)}, z ${Math.round(event.point.z)}  (exact ${event.point.x.toFixed(2)}, ${event.point.z.toFixed(2)})`); } : undefined;
  return <group name="IslandTerrain">
    <mesh geometry={geometry} material={material} castShadow receiveShadow onPointerUp={logGround} />
    {(['tree', 'round', 'rock'] as const).map(kind => <Props key={kind} kind={kind} material={material} />)}
    {DEBUG && <DebugHelpers />}
  </group>;
}

// ───────────────────────── sky, light, sway ─────────────────────────
const SKY_VERTEX = /* glsl */ `varying vec3 vDirection; void main() { vDirection = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SKY_FRAGMENT = /* glsl */ `
  uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; varying vec3 vDirection;
  void main() {
    float h = normalize(vDirection).y;
    vec3 color = h >= 0.0 ? mix(horizon, top, pow(h, 0.55)) : mix(horizon, bottom, pow(-h, 0.7));
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }`;
/** Vertical gradient on an inverted sphere; no tone mapping so the palette colours come through as authored. */
export function Sky() {
  const uniforms = useMemo(() => ({ top: { value: new Color(palette.skyTop) }, horizon: { value: new Color(palette.skyHorizon) }, bottom: { value: new Color(palette.skyBottom) } }), []);
  return <mesh frustumCulled={false} renderOrder={-10}>
    <sphereGeometry args={[170, 24, 12]} />
    <shaderMaterial side={BackSide} depthWrite={false} fog={false} uniforms={uniforms} vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} />
  </mesh>;
}
/** Warm key light with soft shadows sized to the island, plus sky/ground fill. */
export function SceneLighting() {
  return <>
    <hemisphereLight args={[palette.hemiSky, palette.hemiGround, 1.0]} />
    <directionalLight position={[18, 30, 12]} intensity={2.9} color={palette.sun} castShadow
      shadow-mapSize={[2048, 2048]} shadow-camera-left={-22} shadow-camera-right={22} shadow-camera-top={22} shadow-camera-bottom={-22}
      shadow-camera-near={8} shadow-camera-far={90} shadow-bias={-0.00035} shadow-normalBias={0.035} />
  </>;
}
/** Slow sway of the whole island group (gameplay objects ride along, so nothing detaches). */
export function FloatingIsland({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  const still = useMemo(() => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  useFrame(({ clock }) => {
    if (!group.current || still) return;
    const t = clock.elapsedTime;
    group.current.position.y = Math.sin(t * 0.55) * 0.09;
    group.current.rotation.z = Math.sin(t * 0.41) * 0.004;
    group.current.rotation.x = Math.cos(t * 0.33) * 0.003;
  });
  return <group ref={group}>{children}</group>;
}

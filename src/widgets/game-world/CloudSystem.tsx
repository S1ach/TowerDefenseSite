import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Frustum, Matrix4, SpriteMaterial, type Sprite } from 'three';
import { bakeCloud } from './clouds/bakeCloud';
import { CLOUD_PRESETS, lowerCloudQuality, type CloudQuality } from './clouds/quality';
import { CLOUD_COUNT, CLOUD_LAYERS, buildFormations } from './clouds/formations';

export const cloudMetrics = { quality: 'off' as string, visible: 0, fallback: false };
// Near, mid and far bands below the island; generated once, deterministic (see clouds/formations.ts).
const formations = buildFormations(CLOUD_COUNT);

export function CloudSystem({ quality = 'medium', enabled = true }: { quality?: CloudQuality; enabled?: boolean }) {
  return enabled ? <CloudLayers key={quality} requested={quality} /> : null;
}
function CloudLayers({ requested }: { requested: CloudQuality }) {
  const [effective, setEffective] = useState(requested);
  const sprites = useRef<(Sprite | null)[]>([]);
  const timer = useRef({ elapsed: 0, sampleTime: 0, frames: 0, slowWindows: 0, distant: false });
  const frustum = useMemo(() => new Frustum(), []);
  const matrix = useMemo(() => new Matrix4(), []);
  const lowTexture = useMemo(() => bakeCloud('low'), []);
  const texture = useMemo(() => bakeCloud(effective), [effective]);
  // One shared material per layer (opacity and tint differ per band); sprites already share one geometry.
  const materials = useMemo(() => CLOUD_LAYERS.map(layer => new SpriteMaterial({
    map: lowTexture, color: layer.color, opacity: layer.opacity, transparent: true, depthWrite: false, depthTest: true, alphaTest: 0.004, toneMapped: false, fog: true,
  })), [lowTexture]);
  useEffect(() => () => materials.forEach(material => material.dispose()), [materials]);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { reducedMotion.current = media.matches; };
    update(); media.addEventListener('change', update);
    return () => { media.removeEventListener('change', update); cloudMetrics.quality = 'off'; cloudMetrics.visible = 0; cloudMetrics.fallback = false; };
  }, []);
  useFrame(({ camera }, delta) => {
    const state = timer.current;
    // Ignore background-tab stalls; do not mistake a paused tab for a slow GPU.
    if (document.hidden || delta > 0.25) { state.sampleTime = 0; state.frames = 0; state.slowWindows = 0; return; }
    state.elapsed += delta;
    state.sampleTime += delta; state.frames++;
    if (state.sampleTime >= 2) {
      const fps = state.frames / state.sampleTime;
      state.slowWindows = fps < 50 && state.elapsed > 4 ? state.slowWindows + 1 : 0;
      if (state.slowWindows >= 2 && effective !== 'low') {
        setEffective(lowerCloudQuality(effective)); state.slowWindows = 0;
      }
      state.sampleTime = 0; state.frames = 0;
    }
    // Hysteresis prevents switching texture repeatedly at the distance threshold.
    const distance = camera.position.length();
    if (distance > 49) state.distant = true;
    else if (distance < 45) state.distant = false;
    const actual = state.distant ? 'low' : effective;
    // Lower quality keeps a share of the clouds; far ones are generated last, so they drop first.
    const count = Math.round(CLOUD_COUNT * CLOUD_PRESETS[actual].share);
    const detailed = actual === 'low' ? lowTexture : texture;
    materials.forEach((material, layer) => { material.map = CLOUD_LAYERS[layer].detail === 'low' ? lowTexture : detailed; });
    frustum.setFromProjectionMatrix(matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    let visible = 0;
    sprites.current.forEach((sprite, i) => {
      if (!sprite) return;
      sprite.visible = i < count && frustum.intersectsSprite(sprite);
      if (!sprite.visible) return;
      visible++;
      const spec = formations[i];
      // Same sway as before, but each cloud has its own speed, phase and amplitude.
      if (!reducedMotion.current) sprite.position.x = spec.position[0] + Math.sin(state.elapsed * spec.speed + spec.phase) * spec.amplitude;
    });
    cloudMetrics.quality = actual; cloudMetrics.visible = visible;
    cloudMetrics.fallback = effective !== requested;
  });
  return <group name="CloudSystem">
    {formations.map((spec, i) => <sprite key={i} ref={node => { sprites.current[i] = node; }}
      position={spec.position} scale={[spec.size[0], spec.size[1], 1]} material={materials[spec.layer]} />)}
  </group>;
}

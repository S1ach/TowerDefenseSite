import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D } from 'three';
import { engine } from '../../game/core/GameEngine';

const BURST_LIFETIME = 0.6;
const PARTICLES_PER_BURST = 6;
const MAX_BURSTS = 48;
const KILL_COLOR = '#ffcc84';
const BASE_HIT_COLOR = '#ff5d6e';

interface Burst { x: number; z: number; age: number; color: string }
/** Effects only listen to events; removing them does not change the outcome of a fight. */
export function CombatEffects() {
  const bursts = useRef<Burst[]>([]);
  const mesh = useRef<InstancedMesh>(null);
  const object = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  useEffect(() => engine.events.subscribe(event => {
    if (event.type === 'gameReset') bursts.current = [];
    if (event.type !== 'enemyKilled' && event.type !== 'baseDamaged') return;
    const enemy = engine.state.enemies.find(e => e.id === event.entityId);
    if (enemy) bursts.current.push({ x: enemy.x, z: enemy.z, age: 0, color: event.type === 'baseDamaged' ? BASE_HIT_COLOR : KILL_COLOR });
    if (bursts.current.length > MAX_BURSTS) bursts.current.shift();
  }), []);
  useFrame((_state, delta) => {
    if (!mesh.current) return;
    let index = 0;
    for (const burst of bursts.current) {
      if (!engine.state.paused) burst.age += delta;
      for (let particle = 0; particle < PARTICLES_PER_BURST; particle++) {
        const angle = particle * Math.PI * 2 / PARTICLES_PER_BURST;
        object.position.set(burst.x + Math.cos(angle) * burst.age * 2, 0.3 + Math.sin(burst.age * Math.PI) * 0.9, burst.z + Math.sin(angle) * burst.age * 2);
        object.scale.setScalar(Math.max(0, 0.13 * (1 - burst.age / BURST_LIFETIME)));
        object.updateMatrix(); mesh.current.setMatrixAt(index, object.matrix); mesh.current.setColorAt(index, color.set(burst.color)); index++;
      }
    }
    bursts.current = bursts.current.filter(b => b.age < BURST_LIFETIME);
    mesh.current.count = index; mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, MAX_BURSTS * PARTICLES_PER_BURST]} frustumCulled={false}><boxGeometry/><meshBasicMaterial toneMapped={false}/></instancedMesh>;
}

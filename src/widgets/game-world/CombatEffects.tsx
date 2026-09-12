import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D } from 'three';
import { engine } from '../../game/core/GameEngine';
interface Burst { x: number; z: number; age: number; color: string }
/** Эффекты слушают события; их отсутствие не меняет исход боя. */
export function CombatEffects() {
  const bursts = useRef<Burst[]>([]);
  const mesh = useRef<InstancedMesh>(null);
  const object = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  useEffect(() => engine.events.subscribe(event => {
    if (event.type === 'gameReset') bursts.current = [];
    if (event.type !== 'enemyKilled' && event.type !== 'baseDamaged') return;
    const enemy = engine.state.enemies.find(e => e.id === event.entityId);
    if (enemy) bursts.current.push({ x: enemy.x, z: enemy.z, age: 0, color: event.type === 'baseDamaged' ? '#ff5d6e' : '#ffcc84' });
    if (bursts.current.length > 48) bursts.current.shift();
  }), []);
  useFrame((_state, delta) => {
    if (!mesh.current) return;
    let index = 0;
    for (const burst of bursts.current) {
      if (!engine.state.paused) burst.age += delta;
      for (let particle = 0; particle < 6; particle++) {
        const angle = particle * Math.PI / 3;
        object.position.set(burst.x + Math.cos(angle) * burst.age * 2, 0.3 + Math.sin(burst.age * Math.PI) * 0.9, burst.z + Math.sin(angle) * burst.age * 2);
        object.scale.setScalar(Math.max(0, 0.13 * (1 - burst.age / 0.6)));
        object.updateMatrix(); mesh.current.setMatrixAt(index, object.matrix); mesh.current.setColorAt(index, color.set(burst.color)); index++;
      }
    }
    bursts.current = bursts.current.filter(b => b.age < 0.6);
    mesh.current.count = index; mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
  });
  return <instancedMesh ref={mesh} args={[undefined, undefined, 288]} frustumCulled={false}><boxGeometry/><meshBasicMaterial toneMapped={false}/></instancedMesh>;
}

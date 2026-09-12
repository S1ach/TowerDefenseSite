import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, Object3D } from 'three';
import { engine } from '../../game/core/GameEngine';
import { pointOnPath } from '../../game/math/path';
import { ENEMIES, TOWERS } from '../../game/config/balance';
const CAPACITY = 1024;
/** Все враги рисуются одним InstancedMesh: позиции обновляются без React setState. */
export function Units() {
  const bodies = useRef<InstancedMesh>(null);
  const health = useRef<InstancedMesh>(null);
  const shots = useRef<InstancedMesh>(null);
  const object = useMemo(() => new Object3D(), []);
  const color = useMemo(() => new Color(), []);
  useFrame(() => {
    const { enemies, projectiles, paused, pauseAI } = engine.state;
    const alpha = paused || pauseAI ? 1 : engine.loop.alpha;
    if (bodies.current && health.current) {
      bodies.current.count = health.current.count = Math.min(enemies.length, CAPACITY);
      enemies.slice(0, CAPACITY).forEach((enemy, i) => {
        const p = pointOnPath(enemy.previousProgress + (enemy.progress - enemy.previousProgress) * alpha);
        const size = enemy.type === 'tank' ? 0.8 : enemy.type === 'fast' ? 0.38 : 0.55;
        object.position.set(p.x, size / 2 + 0.1, p.z); object.scale.set(size, size, size);
        object.rotation.set(0, enemy.progress * 0.1, 0); object.updateMatrix();
        bodies.current!.setMatrixAt(i, object.matrix); bodies.current!.setColorAt(i, color.set(ENEMIES[enemy.type].color));
        object.position.y = size + 0.35; object.scale.set(0.75 * enemy.hp / enemy.maxHp, 0.07, 0.09); object.rotation.set(0, 0, 0); object.updateMatrix();
        health.current!.setMatrixAt(i, object.matrix);
      });
      bodies.current.instanceMatrix.needsUpdate = health.current.instanceMatrix.needsUpdate = true;
      if (bodies.current.instanceColor) bodies.current.instanceColor.needsUpdate = true;
    }
    if (shots.current) {
      shots.current.count = Math.min(projectiles.length, CAPACITY);
      projectiles.slice(0, CAPACITY).forEach((shot, i) => {
        object.position.set(shot.x, 0.7, shot.z); object.scale.setScalar(shot.type === 'cannon' ? 0.18 : 0.09); object.updateMatrix();
        shots.current!.setMatrixAt(i, object.matrix); shots.current!.setColorAt(i, color.set(TOWERS[shot.type].color));
      });
      shots.current.instanceMatrix.needsUpdate = true;
      if (shots.current.instanceColor) shots.current.instanceColor.needsUpdate = true;
    }
  });
  return <>
    <instancedMesh ref={bodies} args={[undefined, undefined, CAPACITY]} frustumCulled={false} castShadow><boxGeometry /><meshStandardMaterial roughness={0.5} /></instancedMesh>
    <instancedMesh ref={health} args={[undefined, undefined, CAPACITY]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#aaff7f" /></instancedMesh>
    <instancedMesh ref={shots} args={[undefined, undefined, CAPACITY]} frustumCulled={false}><sphereGeometry args={[1, 6, 4]} /><meshBasicMaterial toneMapped={false} /></instancedMesh>
  </>;
}

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D } from 'three';
import { engine } from '../../game/core/GameEngine';
import { pointOnPath } from '../../game/math/path';
import type { EnemyType, TowerType } from '../../game/entities/types';
import { useKitParts } from './KitModel';

const CAPACITY = 1024;
const enemyModels: Record<EnemyType, string> = { basic: 'enemy-ufo-a', fast: 'enemy-ufo-b', tank: 'enemy-ufo-d' };
const ammoModels: Record<TowerType, string> = { machine: 'weapon-ammo-bullet', cannon: 'weapon-ammo-cannonball', sniper: 'weapon-ammo-arrow' };
const enemyScale: Record<EnemyType, number> = { basic: 0.85, fast: 0.65, tank: 1.2 };
const healthBarHeight: Record<EnemyType, number> = { basic: 1.3, fast: 1.3, tank: 1.65 };
const ammoScale: Record<TowerType, number> = { machine: 0.65, cannon: 0.65, sniper: 0.85 };
const HOVER_HEIGHT = 0.42;
const HOVER_AMPLITUDE = 0.07;
const PROJECTILE_HEIGHT = 1.2;

/** Interpolated path position between the last two simulation steps. */
function enemyPosition(enemy: { previousProgress: number; progress: number }, alpha: number) {
  return pointOnPath(enemy.previousProgress + (enemy.progress - enemy.previousProgress) * alpha);
}
function renderAlpha() {
  const state = engine.state;
  return state.paused || state.pauseAI ? 1 : engine.loop.alpha;
}

/** One instanced batch per model: enemies of a type, or projectiles of a tower type. */
function ModelBatch({ type, projectile = false }: { type: EnemyType | TowerType; projectile?: boolean }) {
  const parts = useKitParts(projectile ? ammoModels[type as TowerType] : enemyModels[type as EnemyType]);
  const refs = useRef<(InstancedMesh | null)[]>([]);
  const object = useMemo(() => new Object3D(), []);
  useFrame(() => {
    const state = engine.state;
    const alpha = renderAlpha();
    let count = 0;
    if (projectile) {
      for (const shot of state.projectiles) {
        if (shot.type !== type || count >= CAPACITY) continue;
        const target = state.enemies.find(enemy => enemy.id === shot.targetEnemyId);
        object.position.set(shot.x, PROJECTILE_HEIGHT, shot.z); object.scale.setScalar(ammoScale[shot.type]);
        object.rotation.set(0, target ? Math.atan2(target.x - shot.x, target.z - shot.z) : 0, 0); object.updateMatrix();
        refs.current.forEach(mesh => mesh?.setMatrixAt(count, object.matrix)); count++;
      }
    } else {
      for (const enemy of state.enemies) {
        if (enemy.type !== type || count >= CAPACITY) continue;
        const p = enemyPosition(enemy, alpha);
        object.position.set(p.x, HOVER_HEIGHT + Math.sin(state.elapsed * 2 + enemy.id) * HOVER_AMPLITUDE, p.z);
        object.scale.setScalar(enemyScale[enemy.type]);
        object.rotation.set(0, enemy.progress * 0.25, 0); object.updateMatrix();
        refs.current.forEach(mesh => mesh?.setMatrixAt(count, object.matrix)); count++;
      }
    }
    refs.current.forEach(mesh => { if (mesh) { mesh.count = count; mesh.instanceMatrix.needsUpdate = true; } });
  });
  return <>{parts.map((part, i) => <instancedMesh key={i} ref={node => { refs.current[i] = node; if (node) node.count = 0; }} args={[part.geometry, part.material, CAPACITY]} frustumCulled={false} castShadow={!projectile} dispose={null} />)}</>;
}
export function Units() {
  const health = useRef<InstancedMesh>(null);
  const object = useMemo(() => new Object3D(), []);
  useFrame(() => {
    if (!health.current) return;
    const state = engine.state;
    const alpha = renderAlpha();
    health.current.count = Math.min(state.enemies.length, CAPACITY);
    state.enemies.slice(0, CAPACITY).forEach((enemy, i) => {
      const p = enemyPosition(enemy, alpha);
      object.position.set(p.x, healthBarHeight[enemy.type], p.z);
      object.scale.set(0.75 * enemy.hp / enemy.maxHp, 0.055, 0.08); object.updateMatrix();
      health.current!.setMatrixAt(i, object.matrix);
    });
    health.current.instanceMatrix.needsUpdate = true;
  });
  return <>
    {(['basic', 'fast', 'tank'] as const).map(type => <ModelBatch key={type} type={type} />)}
    {(['machine', 'cannon', 'sniper'] as const).map(type => <ModelBatch key={type} type={type} projectile />)}
    <instancedMesh ref={health} args={[undefined, undefined, CAPACITY]} frustumCulled={false}><boxGeometry /><meshBasicMaterial color="#6440ad" /></instancedMesh>
  </>;
}

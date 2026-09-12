import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { engine } from '../../game/core/GameEngine';
import type { Tower, TowerType } from '../../game/entities/types';
import { statsFor, TOWERS } from '../../game/config/balance';
import { selectTower, useAppDispatch, useAppSelector } from '../../app/store/store';

export function TowerModel({ type, level = 1, ghost = false, color }: { type: TowerType; level?: number; ghost?: boolean; color?: string }) {
  const tint = color ?? TOWERS[type].color;
  return <group>
    <mesh castShadow={!ghost} position={[0, 0.15, 0]}><cylinderGeometry args={[0.6, 0.7, 0.3, 6]} /><meshStandardMaterial color={ghost ? tint : '#273c37'} transparent={ghost} opacity={0.5} /></mesh>
    <mesh castShadow={!ghost} position={[0, 0.52, 0]}><boxGeometry args={[0.65, 0.5 + level * 0.1, 0.65]} /><meshStandardMaterial color={tint} transparent={ghost} opacity={0.5} metalness={0.5} roughness={0.4} /></mesh>
    <mesh castShadow={!ghost} position={[0, 0.78, 0.55]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[type === 'cannon' ? 0.17 : 0.08, 0.13, type === 'sniper' ? 1.4 : 0.85, 8]} /><meshStandardMaterial color={ghost ? tint : '#dce8da'} transparent={ghost} opacity={0.5} /></mesh>
    {Array.from({ length: level }, (_, i) => <mesh key={i} position={[(i - (level - 1) / 2) * 0.18, 0.98, 0]}><boxGeometry args={[0.1, 0.08, 0.12]} /><meshBasicMaterial color={tint} /></mesh>)}
  </group>;
}
export function Range({ x, z, radius, color = '#d1ff96' }: { x: number; z: number; radius: number; color?: string }) {
  return <mesh position={[x, 0.085, z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[radius - 0.04, radius, 72]} /><meshBasicMaterial color={color} transparent opacity={0.6} depthWrite={false} /></mesh>;
}
function PlacedTower({ tower, selected }: { tower: Tower; selected: boolean }) {
  const turret = useRef<Group>(null);
  const dispatch = useAppDispatch();
  useFrame(() => {
    const current = engine.state.towers.find(t => t.id === tower.id);
    const target = engine.state.enemies.find(e => e.id === current?.targetId);
    if (turret.current && target) turret.current.rotation.y = Math.atan2(target.x - tower.x, target.z - tower.z);
  });
  return <group position={[tower.x, 0, tower.z]} onClick={event => { event.stopPropagation(); if (event.delta < 5) dispatch(selectTower(tower.id)); }}>
    <group ref={turret}><TowerModel type={tower.type} level={tower.level} /></group>
    {selected && <Range x={0} z={0} radius={0.85} />}
  </group>;
}
export function Towers() {
  const towers = useAppSelector(s => s.game.towers);
  const settings = useAppSelector(s => s.settings);
  return <>{towers.map(t => <group key={t.id}>
    <PlacedTower tower={t} selected={settings.selectedId === t.id} />
    {(settings.showRanges || settings.selectedId === t.id) && <Range x={t.x} z={t.z} radius={statsFor(t.type, t.level).range} color={TOWERS[t.type].color} />}
    {settings.showCollision && <Range x={t.x} z={t.z} radius={0.8} color="#ff8d90" />}
  </group>)}</>;
}

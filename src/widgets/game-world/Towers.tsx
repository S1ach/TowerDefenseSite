import { useRef, type Ref } from 'react';
import { KitModel, weapons } from './KitModel';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { engine } from '../../game/core/GameEngine';
import type { Tower, TowerType } from '../../game/entities/types';
import { statsFor, TOWERS } from '../../game/config/balance';
import { selectTower, useAppDispatch, useAppSelector } from '../../app/store/store';

export function TowerModel({ type, level = 1, ghost = false, color, turretRef }: { type: TowerType; level?: number; ghost?: boolean; color?: string; turretRef?: Ref<Group> }) {
  const foundation = level === 3 ? 'tower-round-bottom-c' : level === 2 ? 'tower-round-bottom-b' : 'tower-round-bottom-a';
  const height = 0.6 + (level - 1) * 0.2;
  return <group scale={1.25}>
    <group scale={[1, height / 0.6, 1]}><KitModel name={foundation} ghost={ghost} color={color} /></group>
    <group position={[0, height, 0]}><KitModel name="tower-round-top-a" ghost={ghost} color={color} /></group>
    <group ref={turretRef} position={[0, height + 0.27, 0]}><KitModel name={weapons[type]} ghost={ghost} color={color} /></group>
  </group>;
}
export function Range({ x, z, radius, color = '#694dcc' }: { x: number; z: number; radius: number; color?: string }) {
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
    <TowerModel type={tower.type} level={tower.level} turretRef={turret} />
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

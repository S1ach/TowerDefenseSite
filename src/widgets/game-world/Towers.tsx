import { useRef, type Ref } from 'react';
import { KitModel, weapons } from './KitModel';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { engine } from '../../game/core/GameEngine';
import type { Tower, TowerType } from '../../game/entities/types';
import { statsFor, TOWERS } from '../../game/config/balance';
import { selectTower, useAppDispatch, useAppSelector } from '../../app/store/store';
import { isDrag } from './pointer';

const FOUNDATIONS = ['tower-round-bottom-a', 'tower-round-bottom-b', 'tower-round-bottom-c'];
const MODEL_SCALE = 1.25;
const BASE_HEIGHT = 0.6;
const HEIGHT_PER_LEVEL = 0.2;
const WEAPON_OFFSET = 0.27;
const FOOTPRINT_RADIUS = 0.85;
const COLLISION_RADIUS = 0.8;

export function TowerModel({ type, level = 1, ghost = false, color, turretRef }: { type: TowerType; level?: number; ghost?: boolean; color?: string; turretRef?: Ref<Group> }) {
  const height = BASE_HEIGHT + (level - 1) * HEIGHT_PER_LEVEL;
  return <group scale={MODEL_SCALE}>
    <group scale={[1, height / BASE_HEIGHT, 1]}><KitModel name={FOUNDATIONS[level - 1]} ghost={ghost} color={color} /></group>
    <group position={[0, height, 0]}><KitModel name="tower-round-top-a" ghost={ghost} color={color} /></group>
    <group ref={turretRef} position={[0, height + WEAPON_OFFSET, 0]}><KitModel name={weapons[type]} ghost={ghost} color={color} /></group>
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
  return <group position={[tower.x, 0, tower.z]} onClick={event => { event.stopPropagation(); if (!isDrag(event)) dispatch(selectTower(tower.id)); }}>
    <TowerModel type={tower.type} level={tower.level} turretRef={turret} />
    {selected && <Range x={0} z={0} radius={FOOTPRINT_RADIUS} />}
  </group>;
}
export function Towers() {
  const towers = useAppSelector(s => s.game.towers);
  const settings = useAppSelector(s => s.settings);
  return <>{towers.map(t => <group key={t.id}>
    <PlacedTower tower={t} selected={settings.selectedId === t.id} />
    {(settings.showRanges || settings.selectedId === t.id) && <Range x={t.x} z={t.z} radius={statsFor(t.type, t.level).range} color={TOWERS[t.type].color} />}
    {settings.showCollision && <Range x={t.x} z={t.z} radius={COLLISION_RADIUS} color="#ff8d90" />}
  </group>)}</>;
}

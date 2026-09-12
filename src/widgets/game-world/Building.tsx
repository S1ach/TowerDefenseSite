import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { engine } from '../../game/core/GameEngine';
import { statsFor } from '../../game/config/balance';
import type { Position } from '../../game/entities/types';
import { chooseTower, selectTower, syncUI, useAppDispatch, useAppSelector } from '../../app/store/store';
import { Range, TowerModel } from './Towers';
export function Building() {
  const type = useAppSelector(s => s.settings.building);
  const dispatch = useAppDispatch();
  const [hover, setHover] = useState<Position | null>(null);
  const [valid, setValid] = useState(false);
  const previous = useRef(false);
  useFrame(() => {
    const next = !!type && !!hover && !engine.validatePlacement(type, hover);
    if (next !== previous.current) { previous.current = next; setValid(next); }
  });
  return <>
    <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={e => { const p = { x: Math.round(e.point.x * 2) / 2, z: Math.round(e.point.z * 2) / 2 }; setHover(old => old?.x === p.x && old.z === p.z ? old : p); }}
      onPointerOut={() => setHover(null)}
      onClick={e => { if (e.delta > 4) return; e.stopPropagation(); if (type) { const p = { x: Math.round(e.point.x * 2) / 2, z: Math.round(e.point.z * 2) / 2 }; if (!engine.build(type, p)) { dispatch(chooseTower(null)); syncUI(); } } else dispatch(selectTower(null)); }}>
      <planeGeometry args={[26, 20]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
    {type && hover && <>
      <group position={[hover.x, 0, hover.z]}><TowerModel type={type} ghost color={valid ? '#baf27d' : '#ff626e'} /></group>
      <Range x={hover.x} z={hover.z} radius={statsFor(type, 1).range} color={valid ? '#baf27d' : '#ff626e'} />
    </>}
  </>;
}

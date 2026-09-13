import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
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
      <group position={[hover.x, 0, hover.z]}>
        <TowerModel type={type} ghost color={valid ? '#baf27d' : '#ff626e'} />
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial color={valid ? '#47ad71' : '#e54d60'} transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.2, 24]} />
          <meshBasicMaterial color={valid ? '#247947' : '#bc2940'} depthWrite={false} />
        </mesh>
        <Html position={[0, 2.2, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
          <div className={`placement-marker ${valid ? '' : 'invalid'}`}>
            <strong>{valid ? '✓ Можно поставить' : '✕ Нельзя поставить'}</strong>
            <span>X: {hover.x} · Z: {hover.z}</span>
          </div>
        </Html>
      </group>
      <Range x={hover.x} z={hover.z} radius={statsFor(type, 1).range} color={valid ? '#baf27d' : '#ff626e'} />
    </>}
  </>;
}

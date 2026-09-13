import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { engine } from '../../game/core/GameEngine';
import { statsFor } from '../../game/config/balance';
import { battlefield } from '../../game/config/battlefield';
import type { Position } from '../../game/entities/types';
import { chooseTower, selectTower, syncUI, useAppDispatch, useAppSelector } from '../../app/store/store';
import { Range, TowerModel } from './Towers';
import { isDrag, snapToGrid } from './pointer';

const VALID = { ghost: '#baf27d', pad: '#47ad71', dot: '#247947' };
const INVALID = { ghost: '#ff626e', pad: '#e54d60', dot: '#bc2940' };
const snapPoint = (point: { x: number; z: number }): Position => ({ x: snapToGrid(point.x), z: snapToGrid(point.z) });

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
  const colors = valid ? VALID : INVALID;
  function handleClick(point: { x: number; z: number }) {
    if (!type) { dispatch(selectTower(null)); return; }
    if (!engine.build(type, snapPoint(point))) { dispatch(chooseTower(null)); syncUI(); }
  }
  return <>
    <mesh position={[0, 0.075, 0]} rotation={[-Math.PI / 2, 0, 0]}
      onPointerMove={e => { const p = snapPoint(e.point); setHover(old => old?.x === p.x && old.z === p.z ? old : p); }}
      onPointerOut={() => setHover(null)}
      onClick={e => { if (isDrag(e)) return; e.stopPropagation(); handleClick(e.point); }}>
      <planeGeometry args={[battlefield.width, battlefield.depth]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
    {type && hover && <>
      <group position={[hover.x, 0, hover.z]}>
        <TowerModel type={type} ghost color={colors.ghost} />
        <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial color={colors.pad} transparent opacity={0.25} depthWrite={false} />
        </mesh>
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.2, 24]} />
          <meshBasicMaterial color={colors.dot} depthWrite={false} />
        </mesh>
        <Html position={[0, 2.2, 0]} center style={{ pointerEvents: 'none' }} zIndexRange={[1, 0]}>
          <div className={`placement-marker ${valid ? '' : 'invalid'}`}>
            <strong>{valid ? '✓ Можно поставить' : '✕ Нельзя поставить'}</strong>
            <span>X: {hover.x} · Z: {hover.z}</span>
          </div>
        </Html>
      </group>
      <Range x={hover.x} z={hover.z} radius={statsFor(type, 1).range} color={colors.ghost} />
    </>}
  </>;
}

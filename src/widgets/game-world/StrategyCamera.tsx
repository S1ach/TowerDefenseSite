import { useEffect, useRef, type ComponentRef } from 'react';
import { OrbitControls } from '@react-three/drei';
import { cameraConfig } from '../../game/config/battlefield';

export function StrategyCamera({ resetKey }: { resetKey: number }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => { controls.current?.reset(); }, [resetKey]);
  return <OrbitControls ref={controls} makeDefault target={cameraConfig.target}
    enablePan={false} enableDamping dampingFactor={0.08}
    minDistance={cameraConfig.minDistance} maxDistance={cameraConfig.maxDistance}
    minPolarAngle={0.25} maxPolarAngle={Math.PI / 2.5} />;
}

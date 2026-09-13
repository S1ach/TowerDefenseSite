import { useEffect, useRef, type ComponentRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { cameraConfig } from '../../game/config/battlefield';

export function StrategyCamera({ resetKey }: { resetKey: number }) {
  const { camera, size } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => { controls.current?.reset(); }, [resetKey]);
  useEffect(() => {
    // Apply after reset: OrbitControls restores its own initial zoom value.
    camera.zoom = Math.min(1, size.width / size.height / 1.9);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, resetKey]);
  return <OrbitControls ref={controls} makeDefault target={cameraConfig.target}
    enablePan={false} enableDamping dampingFactor={0.08}
    minDistance={cameraConfig.minDistance} maxDistance={cameraConfig.maxDistance}
    minPolarAngle={0.25} maxPolarAngle={Math.PI / 2.5} />;
}

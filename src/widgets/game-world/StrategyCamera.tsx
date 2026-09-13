import { useEffect, useRef, type ComponentRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { cameraConfig } from '../../game/config/battlefield';

/** Viewports narrower than this aspect ratio zoom out so the whole island stays in frame. */
const REFERENCE_ASPECT = 1.9;

export function StrategyCamera({ resetKey }: { resetKey: number }) {
  const { camera, size } = useThree();
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useEffect(() => { controls.current?.reset(); }, [resetKey]);
  useEffect(() => {
    // Apply after reset: OrbitControls restores its own initial zoom value.
    camera.zoom = Math.min(1, size.width / size.height / REFERENCE_ASPECT);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, resetKey]);
  return <OrbitControls ref={controls} makeDefault target={cameraConfig.target}
    enablePan={false} enableDamping dampingFactor={0.08}
    minDistance={cameraConfig.minDistance} maxDistance={cameraConfig.maxDistance}
    minPolarAngle={0.25} maxPolarAngle={Math.PI / 2.5} />;
}

import { Component, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import { battlefield, cameraConfig } from '../../game/config/battlefield';
import { Battlefield } from './Battlefield';
import { StrategyCamera } from './StrategyCamera';
import { SimulationDriver } from './SimulationDriver';
import { Units } from './Units';
import { CombatEffects } from './CombatEffects';
import { Towers } from './Towers';
import { Building } from './Building';
import { DebugPath } from './DebugPath';

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <div className="scene-error">Не удалось загрузить поле боя. Включите WebGL и аппаратное ускорение, затем обновите страницу.</div> : this.props.children; }
}

export function GameWorld({ resetKey }: { resetKey: number }) {
  return <div className="world" role="region" aria-label={`Интерактивное поле боя размером ${battlefield.width} на ${battlefield.depth}. Перетаскивайте для поворота, используйте колесо мыши или жест двумя пальцами для масштабирования.`}>
    <SceneBoundary><Canvas shadows dpr={[1, 1.75]} camera={{ position: cameraConfig.position, fov: 43, near: 0.1, far: 250 }} fallback={<div className="scene-error">Для отображения поля боя необходим WebGL.</div>}>
      <color attach="background" args={['#101b18']} />
      <fog attach="fog" args={['#101b18', 65, 125]} />
      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#dfefd7', '#263a31', 1.4]} />
      <directionalLight position={[10, 22, 8]} intensity={2.2} castShadow shadow-mapSize={[1024, 1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-normalBias={0.04} />
      <SimulationDriver />
      <Battlefield />
      <Units />
      <CombatEffects />
      <Towers />
      <Building />
      <DebugPath />
      <StrategyCamera resetKey={resetKey} />
    </Canvas></SceneBoundary>
  </div>;
}

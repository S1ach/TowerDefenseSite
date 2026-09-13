import { Component, Suspense, type ReactNode } from 'react';
import { Html } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { battlefield, cameraConfig } from '../../game/config/battlefield';
import { KitReady } from './KitModel';
import { CloudSystem } from './CloudSystem';
import { useAppSelector } from '../../app/store/store';
import { FloatingIsland, IslandTerrain, SceneLighting, Sky, palette } from './IslandTerrain';
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
  render() { return this.state.failed ? <div className="scene-error">Не удалось загрузить поле боя. Проверьте соединение и поддержку WebGL, затем обновите страницу.</div> : this.props.children; }
}

export function GameWorld({ resetKey }: { resetKey: number }) {
  const clouds = useAppSelector(s => s.settings.cloudQuality);
  return <div className="world" role="region" aria-label={`Интерактивное поле боя размером ${battlefield.width} на ${battlefield.depth}. Перетаскивайте для поворота, используйте колесо мыши или жест двумя пальцами для масштабирования.`}>
    <SceneBoundary><Canvas shadows="soft" dpr={[1, 2]} gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.toneMapping = ACESFilmicToneMapping; gl.outputColorSpace = SRGBColorSpace; }}
      camera={{ position: cameraConfig.position, fov: 43, near: 0.1, far: 250 }} fallback={<div className="scene-error">Для отображения поля боя необходим WebGL.</div>}>
      <color attach="background" args={[palette.skyBottom]} />
      <fog attach="fog" args={[palette.skyHorizon, 60, 130]} />
      <SceneLighting />
      <Sky />
      <Suspense fallback={<Html center><div className="asset-loading">Загружаем долину…</div></Html>}>
      <KitReady />
      <SimulationDriver />
      <FloatingIsland>
        <IslandTerrain />
        <Units />
        <CombatEffects />
        <Towers />
        <Building />
        <DebugPath />
      </FloatingIsland>
      <CloudSystem enabled={clouds !== 'off'} quality={clouds === 'off' ? 'medium' : clouds} />
      <StrategyCamera resetKey={resetKey} />
      </Suspense>
    </Canvas></SceneBoundary>
  </div>;
}

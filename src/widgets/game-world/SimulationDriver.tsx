import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { engine } from '../../game/core/GameEngine';
import { store, syncUI } from '../../app/store/store';
export const renderMetrics = { fps: 0, calls: 0, triangles: 0 };
export function SimulationDriver() {
  const time = useRef(0);
  const frames = useRef(0);
  useFrame(({ gl }, delta) => {
    engine.state.pauseAI = store.getState().settings.pauseAI;
    engine.advance(delta);
    time.current += delta; frames.current++;
    if (time.current >= 0.1) {
      renderMetrics.fps = Math.round(frames.current / time.current);
      renderMetrics.calls = gl.info.render.calls; renderMetrics.triangles = gl.info.render.triangles;
      syncUI(); time.current = 0; frames.current = 0;
    }
  }, -2);
  return null;
}

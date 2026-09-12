import { useState } from 'react';
import { GameWorld } from '../../widgets/game-world/GameWorld';
import { GameHud } from '../../widgets/game-hud/GameHud';
export function GamePage() {
  const [resetKey, setResetKey] = useState(0);
  return <main className="game-page"><div className="battlefield-view"><GameWorld resetKey={resetKey}/></div><GameHud onResetView={() => setResetKey(key => key + 1)}/></main>;
}

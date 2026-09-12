import type { GameState } from '../entities/types';
export function createGameState(): GameState {
  return { gold: 500, baseHp: 20, score: 0, kills: 0, wave: 0, status: 'ready',
    enemies: [], towers: [], projectiles: [], spawnQueue: [], spawnTimer: 0,
    nextWaveTimer: 20, paused: false, speed: 1, autoNext: false, pauseAI: false, elapsed: 0 };
}

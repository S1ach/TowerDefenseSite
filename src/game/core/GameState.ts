import type { GameState } from '../entities/types';
import { BASE_HP, STARTING_GOLD, WAVE_BREAK_SECONDS } from '../config/balance';
export function createGameState(): GameState {
  return { gold: STARTING_GOLD, baseHp: BASE_HP, score: 0, kills: 0, wave: 0, status: 'ready',
    enemies: [], towers: [], projectiles: [], spawnQueue: [], spawnTimer: 0,
    nextWaveTimer: WAVE_BREAK_SECONDS, paused: false, speed: 1, autoNext: false, pauseAI: false, elapsed: 0 };
}

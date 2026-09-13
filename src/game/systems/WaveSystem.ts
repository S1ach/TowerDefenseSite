import { ENEMIES, HP_GROWTH_PER_WAVE, WAVES } from '../config/balance';
import type { GameState } from '../entities/types';
import type { EventBus } from '../core/EventBus';
import { pointOnPath } from '../math/path';
export function startWave(state: GameState, events: EventBus) {
  if (state.status !== 'ready' || state.wave >= WAVES.length) return false;
  const config = WAVES[state.wave];
  state.wave++;
  state.status = 'wave';
  state.spawnQueue = config.enemies.flatMap(group => Array.from({ length: group.count }, () => ({ type: group.type, delay: group.spawnInterval })));
  state.spawnTimer = 0;
  events.emit({ type: 'waveStarted', value: state.wave });
  return true;
}
export function spawnEnemies(state: GameState, delta: number, events: EventBus, nextId: () => number) {
  state.spawnTimer -= delta;
  while (state.spawnQueue.length && state.spawnTimer <= 0) {
    const spawn = state.spawnQueue.shift()!;
    const config = ENEMIES[spawn.type];
    const hp = Math.round(config.hp * (1 + (state.wave - 1) * HP_GROWTH_PER_WAVE));
    const enemy = { ...pointOnPath(0), id: nextId(), type: spawn.type, hp, maxHp: hp, speed: config.speed, reward: config.reward, damage: config.damage, progress: 0, previousProgress: 0, state: 'moving' as const };
    state.enemies.push(enemy);
    state.spawnTimer += spawn.delay;
    events.emit({ type: 'enemySpawned', entityId: enemy.id });
  }
}

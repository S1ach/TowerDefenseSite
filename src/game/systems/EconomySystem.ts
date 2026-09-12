import type { Enemy, GameState } from '../entities/types';
import type { EventBus } from '../core/EventBus';
export function rewardKill(state: GameState, enemy: Enemy, events: EventBus) {
  if (enemy.state !== 'moving') return;
  enemy.state = 'dead';
  state.gold += enemy.reward;
  state.score += enemy.reward * 10;
  state.kills++;
  events.emit({ type: 'enemyKilled', entityId: enemy.id, value: enemy.reward });
}

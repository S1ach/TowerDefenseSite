import type { GameState } from '../entities/types';
import type { EventBus } from '../core/EventBus';
import { pathLength, pointOnPath } from '../math/path';
export function moveEnemies(state: GameState, delta: number, events: EventBus) {
  for (const enemy of state.enemies) {
    if (enemy.state !== 'moving') continue;
    enemy.previousProgress = enemy.progress;
    enemy.progress += enemy.speed * delta;
    Object.assign(enemy, pointOnPath(enemy.progress));
    if (enemy.progress >= pathLength) {
      enemy.state = 'reached-base';
      state.baseHp = Math.max(0, state.baseHp - enemy.damage);
      events.emit({ type: 'baseDamaged', entityId: enemy.id, value: enemy.damage });
    }
  }
}

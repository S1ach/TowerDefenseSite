import type { Enemy, Tower } from '../entities/types';
import { statsFor } from '../config/balance';
export function selectTarget(tower: Tower, enemies: Enemy[]): Enemy | undefined {
  const range = statsFor(tower.type, tower.level).range;
  let best: Enemy | undefined;
  let bestValue = -Infinity;
  for (const enemy of enemies) {
    if (enemy.state !== 'moving' || enemy.hp <= 0) continue;
    const distance = Math.hypot(enemy.x - tower.x, enemy.z - tower.z);
    if (distance > range) continue;
    const value = tower.strategy === 'first' ? enemy.progress : tower.strategy === 'closest' ? -distance : tower.strategy === 'strongest' ? enemy.hp : -enemy.hp;
    if (value > bestValue) { bestValue = value; best = enemy; }
  }
  return best;
}

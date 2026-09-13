import type { GameState } from '../entities/types';
import type { EventBus } from '../core/EventBus';
import { statsFor, TOWERS } from '../config/balance';
import { selectTarget } from './TargetingSystem';
import type { ProjectileSystem } from './ProjectileSystem';

/** A shot that has not reached its target within this time is dropped. */
const PROJECTILE_LIFETIME = 3;

export function updateCombat(state: GameState, delta: number, events: EventBus, projectiles: ProjectileSystem, nextId: () => number) {
  for (const tower of state.towers) {
    tower.cooldown = Math.max(0, tower.cooldown - delta);
    const target = selectTarget(tower, state.enemies);
    tower.targetId = target?.id;
    if (!target || tower.cooldown > 0) continue;
    const stats = statsFor(tower.type, tower.level);
    tower.cooldown = 1 / stats.fireRate;
    state.projectiles.push(projectiles.create({ id: nextId(), sourceTowerId: tower.id, targetEnemyId: target.id,
      x: tower.x, z: tower.z, type: tower.type, damage: stats.damage, speed: TOWERS[tower.type].projectileSpeed, ttl: PROJECTILE_LIFETIME }));
    events.emit({ type: 'shot', entityId: tower.id });
  }
}

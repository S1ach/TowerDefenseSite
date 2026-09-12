import type { GameState, Projectile } from '../entities/types';
import type { EventBus } from '../core/EventBus';
import { rewardKill } from './EconomySystem';
/** Повторно используем снаряды: это наиболее часто создаваемые объекты. */
export class ProjectileSystem {
  private pool: Projectile[] = [];
  create(data: Projectile) { const item = this.pool.pop(); return item ? Object.assign(item, data) : data; }
  clear(state: GameState) { state.projectiles.length = 0; this.pool.length = 0; }
  update(state: GameState, delta: number, events: EventBus) {
    const enemies = new Map(state.enemies.map(enemy => [enemy.id, enemy]));
    let write = 0;
    for (const shot of state.projectiles) {
      const target = enemies.get(shot.targetEnemyId);
      shot.ttl -= delta;
      let active = !!target && target.state === 'moving' && shot.ttl > 0;
      if (active && target) {
        const distance = Math.hypot(target.x - shot.x, target.z - shot.z);
        const travel = shot.speed * delta;
        if (distance <= travel) {
          target.hp = Math.max(0, target.hp - shot.damage);
          if (!target.hp) rewardKill(state, target, events);
          active = false;
        } else { shot.x += (target.x - shot.x) / distance * travel; shot.z += (target.z - shot.z) / distance * travel; }
      }
      if (active) state.projectiles[write++] = shot;
      else if (this.pool.length < 512) this.pool.push(shot);
    }
    state.projectiles.length = write;
  }
}

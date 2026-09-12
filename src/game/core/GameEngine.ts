import { createGameState } from './GameState';
import { GameLoop } from './GameLoop';
import { EventBus } from './EventBus';
import { savedGameSchema } from './saveSchema';
import { investment, TOWERS, upgradeCost, WAVES } from '../config/balance';
import type { Position, SavedGame, TargetStrategy, TowerType } from '../entities/types';
import { placementError } from '../math/path';
import { moveEnemies } from '../systems/MovementSystem';
import { spawnEnemies, startWave } from '../systems/WaveSystem';
import { updateCombat } from '../systems/CombatSystem';
import { ProjectileSystem } from '../systems/ProjectileSystem';
export class GameEngine {
  state = createGameState();
  readonly loop = new GameLoop();
  readonly events = new EventBus();
  private projectiles = new ProjectileSystem();
  private sequence = 0;
  private nextId = () => ++this.sequence;
  advance(delta: number) {
    if (this.state.paused || this.state.status === 'defeat' || this.state.status === 'victory') return;
    this.loop.advance(delta, this.state.speed, step => this.update(step));
  }
  private update(delta: number) {
    const s = this.state;
    if (s.status === 'defeat' || s.status === 'victory') return;
    s.elapsed += delta;
    if (s.status === 'ready') {
      if (s.autoNext && s.wave > 0) { s.nextWaveTimer -= delta; if (s.nextWaveTimer <= 0) this.startWave(); }
      return;
    }
    if (!s.pauseAI) {
      spawnEnemies(s, delta, this.events, this.nextId);
      moveEnemies(s, delta, this.events);
      if (s.baseHp <= 0) { s.status = 'defeat'; this.events.emit({ type: 'gameOver', value: s.score }); return; }
      updateCombat(s, delta, this.events, this.projectiles, this.nextId);
      this.projectiles.update(s, delta, this.events);
      s.enemies = s.enemies.filter(e => e.state === 'moving');
    }
    if (!s.enemies.length && !s.spawnQueue.length) {
      s.gold += 50 + s.wave * 10;
      s.score += 100 * s.wave;
      s.status = s.wave === WAVES.length ? 'victory' : 'ready';
      s.nextWaveTimer = 20;
      this.projectiles.clear(s);
      s.towers.forEach(t => { t.targetId = undefined; t.cooldown = 0; });
      this.events.emit({ type: 'waveCompleted', value: s.wave });
      if (s.status === 'victory') this.events.emit({ type: 'gameOver', value: s.score });
    }
  }
  startWave() { return startWave(this.state, this.events); }
  validatePlacement(type: TowerType, position: Position) {
    if (this.state.status === 'defeat' || this.state.status === 'victory') return 'Игра завершена';
    return placementError(position, this.state.towers) ?? (this.state.gold < TOWERS[type].cost ? 'Недостаточно золота' : null);
  }
  build(type: TowerType, position: Position): string | null {
    const error = this.validatePlacement(type, position);
    if (error) return error;
    this.state.gold -= TOWERS[type].cost;
    const tower = { ...position, id: this.nextId(), type, level: 1, cooldown: 0, invested: TOWERS[type].cost, strategy: 'first' as const };
    this.state.towers.push(tower);
    this.events.emit({ type: 'towerBuilt', entityId: tower.id });
    return null;
  }
  upgrade(id: number): string | null {
    if (this.state.status === 'defeat' || this.state.status === 'victory') return 'Игра завершена';
    const tower = this.state.towers.find(t => t.id === id);
    if (!tower) return 'Башня не найдена';
    if (tower.level >= 3) return 'Достигнут максимальный уровень';
    const cost = upgradeCost(tower.type, tower.level);
    if (this.state.gold < cost) return 'Недостаточно золота';
    this.state.gold -= cost; tower.invested += cost; tower.level++;
    this.events.emit({ type: 'towerUpgraded', entityId: id });
    return null;
  }
  sell(id: number) {
    if (this.state.status === 'defeat' || this.state.status === 'victory') return;
    const tower = this.state.towers.find(t => t.id === id);
    if (!tower) return;
    this.state.gold += Math.floor(tower.invested * 7 / 10);
    this.state.towers = this.state.towers.filter(t => t.id !== id);
    this.events.emit({ type: 'towerSold', entityId: id });
  }
  setStrategy(id: number, strategy: TargetStrategy) { const tower = this.state.towers.find(t => t.id === id); if (tower) tower.strategy = strategy; }
  reset() { this.state = createGameState(); this.loop.reset(); this.projectiles.clear(this.state); this.sequence = 0; this.events.emit({ type: 'gameReset' }); }
  save(): SavedGame {
    if (this.state.status !== 'ready' && this.state.status !== 'victory') throw new Error('Сохранение доступно между волнами. Сначала завершите текущую волну.');
    const { wave, gold, baseHp, score, kills, towers } = this.state;
    return { version: 1, wave, gold, baseHp, score, kills, towers: towers.map(({ type, level, x, z, strategy }) => ({ type, level, x, z, strategy })) };
  }
  load(data: unknown) {
    const save = savedGameSchema.parse(data);
    this.reset();
    Object.assign(this.state, { wave: save.wave, gold: save.gold, baseHp: save.baseHp, score: save.score, kills: save.kills, status: save.wave === WAVES.length ? 'victory' : 'ready' });
    this.state.towers = save.towers.map(t => ({ ...t, id: this.nextId(), invested: investment(t.type, t.level), cooldown: 0 }));
  }
  snapshot() {
    const s = this.state;
    return { gold: s.gold, baseHp: s.baseHp, score: s.score, kills: s.kills, wave: s.wave, status: s.status,
      remaining: s.enemies.length + s.spawnQueue.length, enemyCount: s.enemies.length, projectileCount: s.projectiles.length,
      towers: s.towers.map(t => ({ ...t })), paused: s.paused, speed: s.speed, nextWaveTimer: Math.ceil(s.nextWaveTimer), autoNext: s.autoNext };
  }
}
export const engine = new GameEngine();

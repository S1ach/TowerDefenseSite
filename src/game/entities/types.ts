export type TowerType = 'machine' | 'cannon' | 'sniper';
export type EnemyType = 'basic' | 'fast' | 'tank';
export type TargetStrategy = 'first' | 'closest' | 'strongest' | 'weakest';
export type Position = { x: number; z: number };
export interface Enemy extends Position {
  id: number; type: EnemyType; hp: number; maxHp: number; speed: number;
  reward: number; damage: number; progress: number; previousProgress: number;
  state: 'spawning' | 'moving' | 'dead' | 'reached-base';
}
export interface Tower extends Position {
  id: number; type: TowerType; level: number; cooldown: number; invested: number;
  strategy: TargetStrategy; targetId?: number;
}
export interface Projectile extends Position {
  id: number; sourceTowerId: number; targetEnemyId: number; speed: number;
  damage: number; type: TowerType; ttl: number;
}
export interface WaveGroup { type: EnemyType; count: number; spawnInterval: number }
export interface WaveConfig { wave: number; enemies: WaveGroup[] }
export type GameStatus = 'ready' | 'wave' | 'victory' | 'defeat';
export interface GameState {
  gold: number; baseHp: number; score: number; kills: number; wave: number;
  status: GameStatus; enemies: Enemy[]; towers: Tower[]; projectiles: Projectile[];
  spawnQueue: { type: EnemyType; delay: number }[]; spawnTimer: number;
  nextWaveTimer: number; paused: boolean; speed: 1 | 2 | 4; autoNext: boolean;
  pauseAI: boolean; elapsed: number;
}
export interface SavedGame {
  version: 1; wave: number; gold: number; baseHp: number; score: number; kills: number;
  towers: Pick<Tower, 'type' | 'level' | 'x' | 'z' | 'strategy'>[];
}
export type EventType = 'gameReset' | 'enemySpawned' | 'enemyKilled' | 'towerBuilt' | 'towerUpgraded' | 'towerSold' | 'waveStarted' | 'waveCompleted' | 'baseDamaged' | 'gameOver' | 'shot';
export interface GameEvent { type: EventType; entityId?: number; value?: number }

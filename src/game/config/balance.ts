import type { EnemyType, TowerType, WaveConfig } from '../entities/types';

export const STARTING_GOLD = 500;
export const BASE_HP = 20;
export const MAX_LEVEL = 3;
export const WAVE_BREAK_SECONDS = 20;
export const MAX_TOWERS = 150;
/** Enemy health grows by this fraction of the base value on every wave after the first. */
export const HP_GROWTH_PER_WAVE = 0.18;
const LEVEL_DAMAGE = [1, 1.6, 2.5];
const LEVEL_RANGE_BONUS = 0.65;
const LEVEL_FIRE_RATE_BONUS = 0.2;
const UPGRADE_BASE = 0.7;
const UPGRADE_STEP = 0.4;

export const TOWERS = {
  machine: { name: 'Пулемёт', cost: 100, damage: 8, range: 4.4, fireRate: 4, projectileSpeed: 28, color: '#5b47b7', description: 'Частые выстрелы. Хорош против быстрых целей.' },
  cannon: { name: 'Пушка', cost: 180, damage: 45, range: 5.4, fireRate: 0.85, projectileSpeed: 15, color: '#cd632b', description: 'Тяжёлые снаряды. Универсальная защита.' },
  sniper: { name: 'Баллиста', cost: 250, damage: 130, range: 9, fireRate: 0.34, projectileSpeed: 65, color: '#277ea2', description: 'Большая дальность. Пробивает тяжёлые цели.' },
} satisfies Record<TowerType, { name: string; cost: number; damage: number; range: number; fireRate: number; projectileSpeed: number; color: string; description: string }>;
export const ENEMIES = {
  basic: { name: 'Тарелка', hp: 65, speed: 1.65, reward: 12, damage: 1, color: '#bc581e' },
  fast: { name: 'Перехватчик', hp: 40, speed: 3.2, reward: 14, damage: 1, color: '#ac4079' },
  tank: { name: 'Тяжёлый НЛО', hp: 330, speed: 0.95, reward: 38, damage: 3, color: '#7254ba' },
} satisfies Record<EnemyType, { name: string; hp: number; speed: number; reward: number; damage: number; color: string }>;
export const WAVES: WaveConfig[] = Array.from({ length: 12 }, (_, i) => ({ wave: i + 1, enemies: [
  { type: 'basic', count: 10 + i * 2, spawnInterval: Math.max(0.35, 0.9 - i * 0.035) },
  ...(i >= 1 ? [{ type: 'fast' as const, count: 3 + i * 2, spawnInterval: 0.45 }] : []),
  ...(i >= 2 ? [{ type: 'tank' as const, count: i - 1, spawnInterval: 1.2 }] : []),
] }));

export const statsFor = (type: TowerType, level: number) => ({
  damage: Math.round(TOWERS[type].damage * LEVEL_DAMAGE[level - 1]),
  range: TOWERS[type].range + (level - 1) * LEVEL_RANGE_BONUS,
  fireRate: TOWERS[type].fireRate * (1 + (level - 1) * LEVEL_FIRE_RATE_BONUS),
});
export const upgradeCost = (type: TowerType, level: number) => Math.round(TOWERS[type].cost * (UPGRADE_BASE + (level - 1) * UPGRADE_STEP));
export const investment = (type: TowerType, level: number) => TOWERS[type].cost + (level > 1 ? upgradeCost(type, 1) : 0) + (level > 2 ? upgradeCost(type, 2) : 0);
/** Selling refunds 70 % of everything spent on the tower. */
export const sellValue = (invested: number) => Math.floor(invested * 7 / 10);
/** Gold granted when a wave is fully repelled. */
export const waveReward = (wave: number) => 50 + wave * 10;

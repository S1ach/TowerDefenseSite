import type { EnemyType, TowerType, WaveConfig } from '../entities/types';
export const TOWERS = {
  machine: { name: 'Пулемёт', cost: 100, damage: 8, range: 4.4, fireRate: 4, projectileSpeed: 28, color: '#baf27d', description: 'Частые выстрелы. Хорош против быстрых целей.' },
  cannon: { name: 'Пушка', cost: 180, damage: 45, range: 5.4, fireRate: 0.85, projectileSpeed: 15, color: '#ffbd78', description: 'Тяжёлые снаряды. Универсальная защита.' },
  sniper: { name: 'Снайпер', cost: 250, damage: 130, range: 9, fireRate: 0.34, projectileSpeed: 65, color: '#8dddfb', description: 'Большая дальность. Пробивает тяжёлые цели.' },
} satisfies Record<TowerType, { name: string; cost: number; damage: number; range: number; fireRate: number; projectileSpeed: number; color: string; description: string }>;
export const ENEMIES = {
  basic: { name: 'Пехота', hp: 65, speed: 1.65, reward: 12, damage: 1, color: '#f6b980' },
  fast: { name: 'Разведчик', hp: 40, speed: 3.2, reward: 14, damage: 1, color: '#f78aaa' },
  tank: { name: 'Танк', hp: 330, speed: 0.95, reward: 38, damage: 3, color: '#b8a2fa' },
} satisfies Record<EnemyType, { name: string; hp: number; speed: number; reward: number; damage: number; color: string }>;
export const WAVES: WaveConfig[] = Array.from({ length: 12 }, (_, i) => ({ wave: i + 1, enemies: [
  { type: 'basic', count: 10 + i * 2, spawnInterval: Math.max(0.35, 0.9 - i * 0.035) },
  ...(i >= 1 ? [{ type: 'fast' as const, count: 3 + i * 2, spawnInterval: 0.45 }] : []),
  ...(i >= 2 ? [{ type: 'tank' as const, count: i - 1, spawnInterval: 1.2 }] : []),
] }));
export const statsFor = (type: TowerType, level: number) => ({
  damage: Math.round(TOWERS[type].damage * [1, 1.6, 2.5][level - 1]),
  range: TOWERS[type].range + (level - 1) * 0.65,
  fireRate: TOWERS[type].fireRate * (1 + (level - 1) * 0.2),
});
export const upgradeCost = (type: TowerType, level: number) => Math.round(TOWERS[type].cost * (0.7 + (level - 1) * 0.4));
export const investment = (type: TowerType, level: number) => TOWERS[type].cost + (level > 1 ? upgradeCost(type, 1) : 0) + (level > 2 ? upgradeCost(type, 2) : 0);

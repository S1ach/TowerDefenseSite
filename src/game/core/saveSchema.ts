import { z } from 'zod';
import { placementError } from '../math/path';
import { BASE_HP, MAX_LEVEL, MAX_TOWERS, WAVES } from '../config/balance';
export const savedGameSchema = z.object({
  version: z.literal(1), wave: z.number().int().min(0).max(WAVES.length), gold: z.number().int().min(0).max(1000000),
  baseHp: z.number().int().min(1).max(BASE_HP), score: z.number().int().min(0).max(100000000), kills: z.number().int().min(0).max(1000000),
  towers: z.array(z.object({ type: z.enum(['machine', 'cannon', 'sniper']), level: z.number().int().min(1).max(MAX_LEVEL),
    x: z.number().finite(), z: z.number().finite(), strategy: z.enum(['first', 'closest', 'strongest', 'weakest']) }).strict()).max(MAX_TOWERS),
}).strict().superRefine((save, context) => {
  save.towers.forEach((tower, i) => {
    const error = placementError(tower, save.towers.slice(0, i));
    if (error) context.addIssue({ code: 'custom', message: error, path: ['towers', i] });
  });
});

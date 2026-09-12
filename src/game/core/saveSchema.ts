import { z } from 'zod';
import { placementError } from '../math/path';
export const savedGameSchema = z.object({
  version: z.literal(1), wave: z.number().int().min(0).max(12), gold: z.number().int().min(0).max(1000000),
  baseHp: z.number().int().min(1).max(20), score: z.number().int().min(0).max(100000000), kills: z.number().int().min(0).max(1000000),
  towers: z.array(z.object({ type: z.enum(['machine', 'cannon', 'sniper']), level: z.number().int().min(1).max(3),
    x: z.number().finite(), z: z.number().finite(), strategy: z.enum(['first', 'closest', 'strongest', 'weakest']) }).strict()).max(150),
}).strict().superRefine((save, context) => {
  save.towers.forEach((tower, i) => {
    const error = placementError(tower, save.towers.slice(0, i));
    if (error) context.addIssue({ code: 'custom', message: error, path: ['towers', i] });
  });
});

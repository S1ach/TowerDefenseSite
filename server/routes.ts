import { Router } from 'express';
import { z } from 'zod';
import { db } from './db';
import { authLimit, clearSession, hashPassword, requireUser, setSession, verifyPassword } from './auth';
import { savedGameSchema } from '../src/game/core/saveSchema';
import type { SavedGame } from '../src/game/entities/types';

const credentials = z.object({ email: z.email().max(254).transform(s => s.toLowerCase()), password: z.string().min(8).max(128) });
const userId = (res: { locals: Record<string, unknown> }) => res.locals.userId as string;
const towerRows = (towers: SavedGame['towers']) => towers.map(t => ({ type: t.type, level: t.level, positionX: t.x, positionZ: t.z, strategy: t.strategy }));

export const router = Router();
router.get('/health', async (_req, res) => { await db.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); });
router.post('/auth/register', authLimit, async (req, res) => {
  const data = credentials.extend({ name: z.string().trim().min(2).max(40) }).parse(req.body);
  const passwordHash = await hashPassword(data.password);
  const user = await db.user.create({ data: { email: data.email, name: data.name, passwordHash }, select: { id: true, name: true } });
  setSession(res, user.id); res.status(201).json(user);
});
router.post('/auth/login', authLimit, async (req, res) => {
  const data = credentials.parse(req.body);
  const user = await db.user.findUnique({ where: { email: data.email } });
  if (!user || !await verifyPassword(data.password, user.passwordHash)) { res.status(401).json({ error: 'Неверная почта или пароль.' }); return; }
  setSession(res, user.id); res.json({ id: user.id, name: user.name });
});
router.post('/auth/logout', (_req, res) => { clearSession(res); res.json({ ok: true }); });
router.get('/auth/me', requireUser, async (_req, res) => {
  const user = await db.user.findUnique({ where: { id: userId(res) }, select: { id: true, name: true } });
  if (!user) { res.status(401).json({ error: 'Аккаунт не найден.' }); return; }
  res.json(user);
});
router.get('/games', requireUser, async (_req, res) => res.json(await db.gameSession.findMany({ where: { userId: userId(res) }, select: { id: true, wave: true, score: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 50 })));
router.post('/games', requireUser, async (req, res) => {
  const { towers, ...data } = savedGameSchema.parse(req.body);
  const game = await db.gameSession.create({ data: { ...data, userId: userId(res), towers: { create: towerRows(towers) } } });
  res.status(201).json({ id: game.id });
});
router.get('/games/:id', requireUser, async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const game = await db.gameSession.findFirst({ where: { id, userId: userId(res) }, include: { towers: true } });
  if (!game) { res.status(404).json({ error: 'Сохранение не найдено.' }); return; }
  res.json({ version: 1, wave: game.wave, gold: game.gold, baseHp: game.baseHp, score: game.score, kills: game.kills, towers: game.towers.map(t => ({ type: t.type, level: t.level, x: t.positionX, z: t.positionZ, strategy: t.strategy })) });
});
router.post('/games/:id/save', requireUser, async (req, res) => {
  const id = z.uuid().parse(req.params.id);
  const { towers, ...data } = savedGameSchema.parse(req.body);
  const owner = userId(res);
  const owned = await db.gameSession.findFirst({ where: { id, userId: owner }, select: { id: true } });
  if (!owned) { res.status(404).json({ error: 'Сохранение не найдено.' }); return; }
  await db.$transaction(async tx => {
    await tx.gameSession.update({ where: { id }, data: { ...data, towers: { deleteMany: {}, create: towerRows(towers) } } });
    await tx.gameResult.upsert({ where: { gameId: id }, create: { gameId: id, userId: owner, score: data.score, wave: data.wave }, update: { score: data.score, wave: data.wave } });
  });
  res.json({ id });
});
router.get('/leaderboard', async (_req, res) => res.json(await db.gameResult.findMany({ take: 20, orderBy: { score: 'desc' }, select: { id: true, score: true, wave: true, user: { select: { name: true } } } })));

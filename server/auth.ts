import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import type { RequestHandler, Request, Response } from 'express';
const deriveKey = promisify(scrypt);
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32 || secret.startsWith('replace-with')) throw new Error('Задайте случайный JWT_SECRET длиной минимум 32 символа в .env');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, 64) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  const actual = await deriveKey(password, salt, 64) as Buffer;
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
export function userFromCookie(cookie = ''): string | null {
  const token = cookie.split(';').map(part => part.trim()).find(part => part.startsWith('sentinel_token='))?.slice(15);
  if (!token) return null;
  try { const payload = jwt.verify(token, secret!, { algorithms: ['HS256'], issuer: 'sentinel', audience: 'sentinel-player' }); return typeof payload !== 'string' && typeof payload.sub === 'string' ? payload.sub : null; } catch { return null; }
}
export function setSession(response: Response, userId: string) {
  const token = jwt.sign({}, secret!, { subject: userId, expiresIn: '2h', issuer: 'sentinel', audience: 'sentinel-player' });
  response.cookie('sentinel_token', token, { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', maxAge: 2 * 3600000, path: '/' });
}
export const requireUser: RequestHandler = (request, response, next) => {
  const id = userFromCookie(request.headers.cookie);
  if (!id) { response.status(401).json({ error: 'Войдите в аккаунт.' }); return; }
  response.locals.userId = id; next();
};
const attempts = new Map<string, { count: number; expires: number }>();
export const authLimit: RequestHandler = (request: Request, response, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  const key = request.ip ?? 'unknown';
  const record = attempts.get(key) ?? { count: 0, expires: now + 60000 };
  record.count++; attempts.set(key, record);
  if (record.count > 15) { response.status(429).json({ error: 'Слишком много попыток. Повторите через минуту.' }); return; }
  next();
};

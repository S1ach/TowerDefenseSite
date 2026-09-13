import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';
import type { CookieOptions, RequestHandler, Response } from 'express';
import { isProduction } from './config';

const SESSION_COOKIE = 'sentinel_token';
const SESSION_TTL_SECONDS = 2 * 3600;
const KEY_LENGTH = 64;
const AUTH_ATTEMPTS_PER_MINUTE = 15;
const AUTH_WINDOW_MS = 60000;
const JWT_CLAIMS = { issuer: 'sentinel', audience: 'sentinel-player' };
const cookieOptions: CookieOptions = { httpOnly: true, sameSite: 'strict', secure: isProduction, path: '/' };

const deriveKey = promisify(scrypt);
const secret = readSecret();
function readSecret() {
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32 || value.startsWith('replace-with')) throw new Error('Задайте случайный JWT_SECRET длиной минимум 32 символа в .env');
  return value;
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = await deriveKey(password, salt, KEY_LENGTH) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  const actual = await deriveKey(password, salt, KEY_LENGTH) as Buffer;
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}
export function userFromCookie(cookie = ''): string | null {
  const token = cookie.split(';').map(part => part.trim()).find(part => part.startsWith(`${SESSION_COOKIE}=`))?.slice(SESSION_COOKIE.length + 1);
  if (!token) return null;
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], ...JWT_CLAIMS });
    return typeof payload !== 'string' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch { return null; }
}
export function setSession(response: Response, userId: string) {
  const token = jwt.sign({}, secret, { subject: userId, expiresIn: SESSION_TTL_SECONDS, ...JWT_CLAIMS });
  response.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_TTL_SECONDS * 1000 });
}
export function clearSession(response: Response) {
  response.clearCookie(SESSION_COOKIE, cookieOptions);
}
export const requireUser: RequestHandler = (request, response, next) => {
  const id = userFromCookie(request.headers.cookie);
  if (!id) { response.status(401).json({ error: 'Войдите в аккаунт.' }); return; }
  response.locals.userId = id; next();
};
const attempts = new Map<string, { count: number; expires: number }>();
export const authLimit: RequestHandler = (request, response, next) => {
  const now = Date.now();
  for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
  const key = request.ip ?? 'unknown';
  const record = attempts.get(key) ?? { count: 0, expires: now + AUTH_WINDOW_MS };
  record.count++; attempts.set(key, record);
  if (record.count > AUTH_ATTEMPTS_PER_MINUTE) { response.status(429).json({ error: 'Слишком много попыток. Повторите через минуту.' }); return; }
  next();
};

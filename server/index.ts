import 'dotenv/config';
import express, { type ErrorRequestHandler } from 'express';
import cors from 'cors';
import { createServer } from 'node:http';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { router } from './routes';
import { attachRealtime } from './realtime';
import { db } from './db';
const app = express();
app.disable('x-powered-by');
const origin = process.env.CLIENT_ORIGIN ?? 'http://127.0.0.1:5173';
app.use(cors({ origin, credentials: true }));
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin && req.headers.origin !== origin) { res.status(403).json({ error: 'Источник запроса запрещён.' }); return; }
  next();
});
app.use(express.json({ limit: '128kb' }));
app.use('/api', router);
app.use('/', router);
const errors: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) { res.status(400).json({ error: 'Проверьте введённые данные и сохранение.' }); return; }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') { res.status(409).json({ error: 'Такой аккаунт уже существует.' }); return; }
  if (error instanceof SyntaxError) { res.status(400).json({ error: 'Некорректный JSON.' }); return; }
  console.error(error instanceof Error ? error.message : 'Unknown server error');
  res.status(503).json({ error: 'Сервис временно недоступен. Проверьте подключение PostgreSQL.' });
};
app.use(errors);
const server = createServer(app);
const io = attachRealtime(server);
server.listen(Number(process.env.PORT ?? 3001), '127.0.0.1', () => console.log('Sentinel API: http://127.0.0.1:3001'));
const stop = () => { io.close(); server.close(); void db.$disconnect().finally(() => process.exit(0)); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);

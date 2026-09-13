import { Server } from 'socket.io';
import type { Server as HttpServer } from 'node:http';
import { z } from 'zod';
import { db } from './db';
import { userFromCookie } from './auth';
import { clientOrigin } from './config';

/** Hosts may push at most one snapshot per interval; faster ones are dropped. */
const SNAPSHOT_MIN_INTERVAL_MS = 190;
const snapshotSchema = z.object({ gold: z.number().int().min(0).max(1000000), baseHp: z.number().min(0).max(20), wave: z.number().int().min(0).max(12), score: z.number().min(0).max(100000000),
  enemies: z.array(z.object({ id: z.number().int(), x: z.number().min(-14).max(14), z: z.number().min(-11).max(11), hp: z.number().min(0), maxHp: z.number().positive(), type: z.enum(['basic','fast','tank']) })).max(512),
  towers: z.array(z.object({ id: z.number().int(), x: z.number().min(-14).max(14), z: z.number().min(-11).max(11), type: z.enum(['machine','cannon','sniper']), level: z.number().int().min(1).max(3) })).max(150),
});
export function attachRealtime(server: HttpServer) {
  const io = new Server(server, { cors: { origin: clientOrigin, credentials: true }, maxHttpBufferSize: 100000, allowRequest: (req, callback) => callback(null, !req.headers.origin || req.headers.origin === clientOrigin) });
  const hosts = new Map<string, string>();
  io.on('connection', socket => {
    let hosted: string | null = null;
    let watched: string | null = null;
    let last = 0;
    const stop = () => { if (hosted && hosts.get(hosted) === socket.id) { hosts.delete(hosted); io.to(hosted).emit('streamEnded'); } hosted = null; };
    socket.on('host', async (input: unknown) => {
      try {
        const id = z.uuid().parse(input);
        const userId = userFromCookie(socket.handshake.headers.cookie);
        if (!userId || !await db.gameSession.findFirst({ where: { id, userId } })) { socket.emit('streamError', 'Войдите и выберите своё серверное сохранение.'); return; }
        if (hosts.has(id) && hosts.get(id) !== socket.id) { socket.emit('streamError', 'Эта сессия уже транслируется.'); return; }
        stop(); hosted = id; hosts.set(id, socket.id); socket.emit('hosting', id);
      } catch { socket.emit('streamError', 'Не удалось открыть трансляцию.'); }
    });
    socket.on('watch', (input: unknown) => {
      const result = z.uuid().safeParse(input);
      if (!result.success || !hosts.has(result.data)) { socket.emit('streamError', 'Трансляция не найдена или уже завершена.'); return; }
      if (watched) void socket.leave(watched);
      watched = result.data; void socket.join(watched); socket.emit('watching', watched);
    });
    socket.on('snapshot', (input: unknown) => {
      if (!hosted || Date.now() - last < SNAPSHOT_MIN_INTERVAL_MS) return;
      const parsed = snapshotSchema.safeParse(input);
      if (!parsed.success) return;
      last = Date.now(); socket.to(hosted).emit('snapshot', parsed.data);
    });
    socket.on('stop', stop);
    socket.on('disconnect', stop);
  });
  return io;
}

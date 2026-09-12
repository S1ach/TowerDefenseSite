import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { engine } from '../../game/core/GameEngine';
import { battlefield } from '../../game/config/battlefield';
import { ENEMIES, TOWERS } from '../../game/config/balance';
import type { EnemyType, TowerType } from '../../game/entities/types';
interface Snapshot {
  gold: number; baseHp: number; wave: number; score: number;
  enemies: { id: number; x: number; z: number; type: EnemyType }[];
  towers: { id: number; x: number; z: number; type: TowerType; level: number }[];
}
function SpectatorMap({ snapshot }: { snapshot: Snapshot }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const target = useRef(snapshot);
  const positions = useRef(new Map<number, { x: number; z: number }>());
  useEffect(() => { target.current = snapshot; }, [snapshot]);
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const draw = (now: number) => {
      const context = canvas.current?.getContext('2d');
      if (context) {
        const delta = Math.min((now - previous) / 1000, 0.1); previous = now;
        const sx = (x: number) => (x + 14) * 20;
        const sy = (z: number) => (z + 11) * 20;
        context.fillStyle = '#203b2d'; context.fillRect(0, 0, 560, 440);
        context.strokeStyle = '#9fae91'; context.lineWidth = 32; context.beginPath();
        battlefield.path.forEach(([x,z], i) => { if (!i) context.moveTo(sx(x), sy(z)); else context.lineTo(sx(x), sy(z)); }); context.stroke();
        for (const tower of target.current.towers) { context.fillStyle = TOWERS[tower.type].color; context.fillRect(sx(tower.x) - 7, sy(tower.z) - 7, 14, 14); }
        const ids = new Set(target.current.enemies.map(e => e.id));
        for (const id of positions.current.keys()) if (!ids.has(id)) positions.current.delete(id);
        for (const enemy of target.current.enemies) {
          const p = positions.current.get(enemy.id) ?? { x: enemy.x, z: enemy.z };
          const alpha = 1 - Math.exp(-delta * 14);
          p.x += (enemy.x - p.x) * alpha; p.z += (enemy.z - p.z) * alpha;
          positions.current.set(enemy.id, p);
          context.fillStyle = ENEMIES[enemy.type].color; context.beginPath(); context.arc(sx(p.x), sy(p.z), 5, 0, Math.PI * 2); context.fill();
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas className="spectator-map" ref={canvas} width={560} height={440} aria-label="Трансляция поля боя: квадраты — башни, круги — враги"/>;
}
export function useSpectator(gameId: string | null) {
  const socket = useRef<Socket | null>(null);
  const [room, setRoom] = useState('');
  const [hosting, setHosting] = useState(false);
  const [message, setMessage] = useState('Трансляция доступна по коду, пока открыта игровая вкладка.');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  useEffect(() => {
    const connection = io({ autoConnect: false, withCredentials: true, reconnectionAttempts: 3 });
    socket.current = connection;
    connection.on('hosting', () => { setHosting(true); setMessage('Трансляция запущена. Передайте код зрителю.'); });
    connection.on('watching', () => { setSnapshot(null); setMessage('Подключено. Ожидаем состояние игры…'); });
    connection.on('snapshot', (data: Snapshot) => { setSnapshot(data); setMessage('Прямой эфир · карта наблюдения'); });
    connection.on('streamEnded', () => { setMessage('Трансляция завершена.'); setSnapshot(null); });
    connection.on('streamError', (error: string) => setMessage(error));
    connection.on('connect_error', () => { setHosting(false); setMessage('Сервер наблюдения недоступен.'); });
    connection.on('disconnect', () => { setHosting(false); setSnapshot(null); setMessage('Соединение закрыто. Подключитесь повторно.'); });
    return () => { connection.disconnect(); socket.current = null; };
  }, []);
  useEffect(() => {
    if (!hosting) return;
    const timer = window.setInterval(() => {
      const s = engine.state;
      socket.current?.emit('snapshot', { gold: s.gold, baseHp: s.baseHp, wave: s.wave, score: s.score,
        enemies: s.enemies.map(({ id, type, x, z, hp, maxHp }) => ({ id, type, x, z, hp, maxHp })),
        towers: s.towers.map(({ id, type, x, z, level }) => ({ id, type, x, z, level })) });
    }, 200);
    return () => window.clearInterval(timer);
  }, [hosting]);
  function connect(mode: 'host' | 'watch') {
    const connection = socket.current;
    if (!connection) return;
    setMessage('Подключение…');
    const action = () => connection.emit(mode, mode === 'host' ? gameId : room.trim());
    if (connection.connected) action(); else { connection.once('connect', action); connection.connect(); }
  }
  function stop() { socket.current?.emit('stop'); setHosting(false); setMessage('Трансляция остановлена.'); }
  useEffect(() => { socket.current?.emit('stop'); setHosting(false); }, [gameId]);
  return { room, setRoom, hosting, message, snapshot, connect, stop };
}
export function SpectatorPanel({ gameId, stream }: { gameId: string | null; stream: ReturnType<typeof useSpectator> }) {
  const { room, setRoom, hosting, message, snapshot, connect, stop } = stream;
  return <section className="session-section"><h3>Наблюдение</h3><p>{message}</p>
    {gameId && <><div className="room-code">Код: <code>{gameId}</code></div><button onClick={() => { if (hosting) stop(); else connect('host'); }}>{hosting ? 'Остановить трансляцию' : 'Транслировать игру'}</button></>}
    <div className="inline-form"><input aria-label="Код трансляции" placeholder="Код трансляции" value={room} onChange={e => setRoom(e.target.value)}/><button disabled={!room.trim()} onClick={() => connect('watch')}>Смотреть</button></div>
    {snapshot && <><p>Волна {snapshot.wave} · База {snapshot.baseHp}/20 · Золото {snapshot.gold} · Счёт {snapshot.score}</p><SpectatorMap snapshot={snapshot}/></>}
  </section>;
}

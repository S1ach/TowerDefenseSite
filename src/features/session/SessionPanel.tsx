import { useEffect, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { api } from '../../shared/api/client';
import { engine } from '../../game/core/GameEngine';
import { chooseTower, selectTower, syncUI, useAppDispatch, useAppSelector } from '../../app/store/store';
import { SpectatorPanel, useSpectator } from './SpectatorPanel';
const LOCAL_KEY = 'sentinel-save-v1';
interface User { id: string; name: string }
interface Session { id: string; wave: number; score: number; updatedAt: string }
interface Result { id: string; score: number; wave: number; user: { name: string } }
export function SessionPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [gameId, setGameId] = useState<string | null>(null);
  const stream = useSpectator(gameId);
  useEffect(() => engine.events.subscribe(event => { if (event.type === 'gameReset') setGameId(null); }), []);
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmLoad, setConfirmLoad] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const status = useAppSelector(s => s.game.status);
  useEffect(() => { if (!open) return; let cancelled = false; void api<User>('/auth/me').then(data => { if (!cancelled) setUser(data); }).catch(() => {}); return () => { cancelled = true; }; }, [open]);
  async function action(task: () => Promise<void> | void) {
    setBusy(true); setMessage('');
    try { await task(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось выполнить действие.'); }
    finally { setBusy(false); }
  }
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    await action(async () => { const data = await api<User>(register ? '/auth/register' : '/auth/login', { email: form.get('email'), password: form.get('password'), ...(register ? { name: form.get('name') } : {}) }); setUser(data); setMessage(`Вы вошли как ${data.name}.`); setSessions(await api<Session[]>('/games')); });
  }
  async function loadSelected() {
    const id = confirmLoad;
    setConfirmLoad(null);
    await action(async () => {
      const data: unknown = id === 'local' ? JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') : await api(`/games/${id}`);
      if (!data) throw new Error('Локальное сохранение не найдено.');
      engine.load(data); setGameId(id === 'local' ? null : id); dispatch(chooseTower(null)); dispatch(selectTower(null)); syncUI(); setMessage('Игра загружена.');
    });
  }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className="modal session-modal"><Dialog.Title>Сохранения и сеть</Dialog.Title><Dialog.Description>Сохраняйте прогресс между волнами. Локальный слот работает без сервера.</Dialog.Description><Dialog.Close className="modal-close" aria-label="Закрыть"><X size={19}/></Dialog.Close>
    <div className="session-section"><h3>На этом устройстве</h3><div className="modal-actions"><button disabled={busy || !['ready','victory'].includes(status)} onClick={() => void action(() => { localStorage.setItem(LOCAL_KEY, JSON.stringify(engine.save())); setMessage('Прогресс сохранён в браузере.'); })}>Сохранить локально</button><button disabled={busy} onClick={() => setConfirmLoad('local')}>Загрузить</button></div></div>
    <section className="session-section"><h3>{user ? `Аккаунт: ${user.name}` : 'Серверные сохранения'}</h3>
      {!user ? <form onSubmit={event => void authenticate(event)} className="auth-form">{register && <label className="field">Имя<input name="name" autoComplete="nickname" required minLength={2} maxLength={40}/></label>}<label className="field">Почта<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label className="field">Пароль<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} required minLength={8} maxLength={128}/></label><div className="modal-actions"><button className="primary" disabled={busy}>{register ? 'Зарегистрироваться' : 'Войти'}</button><button type="button" onClick={() => setRegister(!register)}>{register ? 'Уже есть аккаунт' : 'Создать аккаунт'}</button></div></form> : <>
        <div className="modal-actions"><button disabled={busy || !['ready','victory'].includes(status)} onClick={() => void action(async () => { const save = engine.save(); const result = await api<{id: string}>(gameId ? `/games/${gameId}/save` : '/games', save); setGameId(result.id); if (!gameId) await api(`/games/${result.id}/save`, save); setSessions(await api<Session[]>('/games')); setMessage('Сохранено на сервере.'); })}>Сохранить на сервере</button><button disabled={busy} onClick={() => void action(async () => { setSessions(await api<Session[]>('/games')); })}>Обновить список</button><button disabled={busy} onClick={() => void action(async () => { await api('/auth/logout', {}); setUser(null); setGameId(null); setSessions([]); })}>Выйти</button></div>
        {sessions.map(session => <div className="save-row" key={session.id}><span>Волна {session.wave} · {session.score} очков<small>{new Date(session.updatedAt).toLocaleString('ru')}</small></span><button disabled={busy} onClick={() => setConfirmLoad(session.id)}>Загрузить</button></div>)}
      </>}
    </section>
    {confirmLoad && <div className="load-confirm" role="alert"><p>Загрузка заменит текущую игру. Несохранённый прогресс будет потерян.</p><div className="modal-actions"><button disabled={busy} onClick={() => void loadSelected()}>Заменить и загрузить</button><button onClick={() => setConfirmLoad(null)}>Отмена</button></div></div>}
    <p className="session-message" role="status">{busy ? 'Выполняется…' : message}</p>
    <section className="session-section"><h3>Таблица результатов</h3><p>Учебный рейтинг по сохранённым результатам. Расчёт игры выполняется на клиенте.</p><button disabled={busy} onClick={() => void action(async () => { const rows = await api<Result[]>('/leaderboard'); setResults(rows); if (!rows.length) setMessage('В рейтинге пока нет результатов.'); })}>Показать рейтинг</button>{results.map((row,i) => <div className="save-row" key={row.id}><span>{i + 1}. {row.user.name}</span><b>{row.score} · волна {row.wave}</b></div>)}</section>
    <SpectatorPanel gameId={gameId} stream={stream}/>
  </Dialog.Content></Dialog.Portal></Dialog.Root>;
}

import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { api } from '../../shared/api/client';
import { SpectatorPanel, useSpectator } from './SpectatorPanel';

interface Result { id: string; score: number; wave: number; user: { name: string } }
export function SessionPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (value: boolean) => void }) {
  const [results, setResults] = useState<Result[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const stream = useSpectator(null);
  async function showLeaderboard() {
    setBusy(true); setMessage('');
    try {
      const rows = await api<Result[]>('/leaderboard');
      setResults(rows);
      if (!rows.length) setMessage('В рейтинге пока нет результатов.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось загрузить рейтинг.');
    } finally { setBusy(false); }
  }
  return <Dialog.Root open={open} onOpenChange={onOpenChange}><Dialog.Portal>
    <Dialog.Overlay className="modal-overlay"/>
    <Dialog.Content className="modal session-modal">
      <Dialog.Title>Наблюдение и рейтинг</Dialog.Title>
      <Dialog.Description>Смотрите трансляции по коду и таблицу результатов.</Dialog.Description>
      <Dialog.Close className="modal-close" aria-label="Закрыть"><X size={19}/></Dialog.Close>
      <section className="session-section"><h3>Таблица результатов</h3>
        <button disabled={busy} onClick={() => void showLeaderboard()}>Показать рейтинг</button>
        {results.map((row, i) => <div className="save-row" key={row.id}><span>{i + 1}. {row.user.name}</span><b>{row.score} · волна {row.wave}</b></div>)}
      </section>
      <p className="session-message" role="status">{busy ? 'Выполняется…' : message}</p>
      <SpectatorPanel gameId={null} stream={stream}/>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

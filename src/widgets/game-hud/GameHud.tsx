import { useEffect, useState } from 'react';
import { Coins, Shield, Waves, Crosshair, Play, Pause, RotateCcw, Bug, X, ChevronUp, Trash2, Zap, Target, Radio, Save } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { engine } from '../../game/core/GameEngine';
import { TOWERS, WAVES, ENEMIES, statsFor, upgradeCost } from '../../game/config/balance';
import type { TowerType, TargetStrategy } from '../../game/entities/types';
import { chooseTower, selectTower, syncUI, toggleDebug, toggleSetting, useAppDispatch, useAppSelector } from '../../app/store/store';
import { renderMetrics } from '../game-world/SimulationDriver';
import { SessionPanel } from '../../features/session/SessionPanel';
const icons = { machine: Zap, cannon: Crosshair, sniper: Target };
const eventNames: Record<string, string> = { waveStarted: 'Волна началась', waveCompleted: 'Волна отражена · получена награда', baseDamaged: 'База под ударом', towerBuilt: 'Башня построена', towerUpgraded: 'Башня улучшена', towerSold: 'Башня продана' };
export function GameHud({ onResetView }: { onResetView: () => void }) {
  const game = useAppSelector(s => s.game);
  const settings = useAppSelector(s => s.settings);
  const dispatch = useAppDispatch();
  const [message, setMessage] = useState('Постройте башни рядом с дорогой и запустите первую волну.');
  const [restartOpen, setRestartOpen] = useState(false);
  const [dismissedEnd, setDismissedEnd] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const selected = game.towers.find(t => t.id === settings.selectedId);
  const ended = game.status === 'defeat' || game.status === 'victory';
  useEffect(() => engine.events.subscribe(event => { if (eventNames[event.type]) setMessage(eventNames[event.type]); }), []);
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).closest('button,a,input,select,textarea,[role="dialog"]')) return;
      if (event.code === 'Escape') { dispatch(chooseTower(null)); dispatch(selectTower(null)); }
      if (document.querySelector('[role="dialog"]')) return;
      if (event.code === 'Space') { event.preventDefault(); engine.state.paused = !engine.state.paused; syncUI(); }
    };
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey);
  }, [dispatch]);
  function newGame() { setDismissedEnd(false); engine.reset(); dispatch(chooseTower(null)); dispatch(selectTower(null)); syncUI(); setRestartOpen(false); setMessage('Новая оборона. В вашем распоряжении 500 золота.'); }
  return <>
    <header className="topbar"><a className="brand" href="/" aria-label="Sentinel — главная"><span className="brand-mark">S</span>SENTINEL<span className="brand-sub">ЗАЩИТА БАЗЫ</span></a>
      <div className="resources"><span title="Золото"><Coins size={18} className="gold"/><b>{game.gold}</b></span><span title="Здоровье базы"><Shield size={18}/><b>{game.baseHp}</b><small>/ 20</small></span><span title="Волна"><Waves size={18}/><b>{game.wave}</b><small>/ {WAVES.length}</small></span><span title="Осталось врагов"><Crosshair size={18}/><b>{game.remaining}</b></span></div>
      <button className="icon-button" onClick={() => setSessionOpen(true)} title="Сохранения и сеть" aria-label="Сохранения и сеть"><Save size={19}/></button>
    </header>
    <div className="hud-heading"><span className="eyebrow">СЕКТОР 001</span><h1>Переправа</h1><p>{game.paused ? 'Игра на паузе' : ended ? 'Операция завершена' : game.status === 'wave' ? 'Защитите базу от наступления' : 'Подготовьте линию обороны'}</p></div>
    <aside className="shop panel"><div className="panel-label">АРСЕНАЛ <span>{game.towers.length} башен</span></div>
      {(Object.keys(TOWERS) as TowerType[]).map(type => { const config = TOWERS[type]; const Icon = icons[type]; return <button key={type} className={`tower-card ${settings.building === type ? 'active' : ''}`} disabled={game.gold < config.cost || ended} aria-pressed={settings.building === type} onClick={() => dispatch(chooseTower(settings.building === type ? null : type))}>
        <span className="tower-icon" style={{ color: config.color }}><Icon size={25}/></span><span className="tower-copy"><strong>{config.name}</strong><small>{config.description}</small></span><span className="price">{config.cost}<Coins size={12}/></span>
      </button>; })}
      {settings.building ? <div className="build-hint">Выберите место на земле. Зелёный контур — можно строить, красный — нельзя.<button onClick={() => dispatch(chooseTower(null))}>Отмена <X size={13}/></button></div> : <p className="shop-hint">Выберите башню, затем нажмите на свободное место рядом с дорогой.</p>}
    </aside>
    {selected && <aside className="selection panel"><div className="panel-label">БАШНЯ #{selected.id}<button className="bare" aria-label="Закрыть выбор" onClick={() => dispatch(selectTower(null))}><X size={16}/></button></div><h2>{TOWERS[selected.type].name} <small>Ур. {selected.level}</small></h2>
      <dl className="stats"><div><dt>Урон</dt><dd>{statsFor(selected.type, selected.level).damage}</dd></div><div><dt>Дальность</dt><dd>{statsFor(selected.type, selected.level).range.toFixed(1)}</dd></div><div><dt>Выстрелов/с</dt><dd>{statsFor(selected.type, selected.level).fireRate.toFixed(2)}</dd></div><div><dt>Цель</dt><dd>{selected.targetId ? `#${selected.targetId}` : 'Поиск'}</dd></div></dl>
      <label className="field">Приоритет цели<select value={selected.strategy} onChange={e => { engine.setStrategy(selected.id, e.target.value as TargetStrategy); syncUI(); }}><option value="first">Ближе к базе</option><option value="closest">Ближе к башне</option><option value="strongest">Самый сильный</option><option value="weakest">Самый слабый</option></select></label>
      <button className="primary full" disabled={ended || selected.level === 3 || game.gold < upgradeCost(selected.type, selected.level)} onClick={() => { const error = engine.upgrade(selected.id); if (error) setMessage(error); syncUI(); }}><ChevronUp size={17}/>{selected.level === 3 ? 'Максимальный уровень' : `Улучшить · ${upgradeCost(selected.type, selected.level)}`}</button>
      <button className="full sell" disabled={ended} onClick={() => { engine.sell(selected.id); dispatch(selectTower(null)); syncUI(); }}><Trash2 size={15}/>Продать · {Math.floor(selected.invested * 7 / 10)}</button>
    </aside>}
    {!selected && game.status === 'ready' && <aside className="wave-preview panel"><div className="panel-label">СЛЕДУЮЩАЯ ВОЛНА <span>{game.wave + 1}</span></div>{WAVES[game.wave]?.enemies.map(group => <div key={group.type}><span style={{ color: ENEMIES[group.type].color }}>{ENEMIES[group.type].name}</span><b>× {group.count}</b></div>)}<p>Награда: {50 + (game.wave + 1) * 10} золота</p></aside>}
    <div className="map-tools"><button className="icon-button" onClick={onResetView} title="Сбросить вид" aria-label="Сбросить вид"><RotateCcw size={17}/></button><button className="icon-button" aria-label="Отладочная панель" aria-pressed={settings.debug} onClick={() => dispatch(toggleDebug())}><Bug size={17}/></button><button className="icon-button" aria-label="Наблюдение и сохранения" onClick={() => setSessionOpen(true)}><Radio size={17}/></button></div>
    {settings.debug && <aside className="debug panel"><div className="panel-label">ДИАГНОСТИКА</div><div className="debug-values">FPS: {renderMetrics.fps} · шаг: 20 Гц<br/>Враги: {game.enemyCount} · башни: {game.towers.length}<br/>Снаряды: {game.projectileCount}<br/>Вызовы отрисовки: {renderMetrics.calls}<br/>Треугольники: {renderMetrics.triangles.toLocaleString('ru')}</div>{(['showPath', 'showRanges', 'showCollision', 'pauseAI'] as const).map((key,i) => <label key={key}><input type="checkbox" checked={settings[key]} onChange={() => dispatch(toggleSetting(key))}/>{['Путь врагов', 'Радиусы башен', 'Зоны столкновений', 'Остановить ИИ'][i]}</label>)}</aside>}
    <footer className="game-footer"><div className="status-line" role="status">{message}</div><div className="command-bar"><div className="playback"><button className="icon-button" aria-label={game.paused ? 'Продолжить' : 'Пауза'} disabled={ended} onClick={() => { engine.state.paused = !engine.state.paused; syncUI(); }}>{game.paused ? <Play size={18}/> : <Pause size={18}/>}</button>{([1, 2, 4] as const).map(speed => <button key={speed} aria-pressed={game.speed === speed} className={game.speed === speed ? 'active' : ''} onClick={() => { engine.state.speed = speed; syncUI(); }}>{speed}×</button>)}</div><div className="score">СЧЁТ <b>{game.score.toLocaleString('ru')}</b></div><label className="auto-next"><input type="checkbox" checked={game.autoNext} onChange={e => { engine.state.autoNext = e.target.checked; syncUI(); }}/>Автоволна{game.autoNext && game.status === 'ready' && game.wave > 0 ? ` · ${game.nextWaveTimer} с` : ''}</label><button className="primary start-wave" disabled={game.status !== 'ready'} onClick={() => { engine.startWave(); syncUI(); }}><Play size={16}/>{game.status === 'wave' ? `Волна ${game.wave} · ${game.remaining} врагов` : ended ? 'Игра завершена' : `Начать волну ${game.wave + 1}`}</button><button className="icon-button" aria-label="Новая игра" onClick={() => setRestartOpen(true)}><RotateCcw size={17}/></button></div><div className="keyboard-hint">Перетаскивание — обзор · Колесо / жест — масштаб · Пробел — пауза · Esc — отмена</div></footer>
    <Dialog.Root open={restartOpen || (ended && !dismissedEnd)} onOpenChange={value => { setRestartOpen(value); if (!value && ended) setDismissedEnd(true); }}><Dialog.Portal><Dialog.Overlay className="modal-overlay"/><Dialog.Content className="modal"><Dialog.Title>{ended ? game.status === 'victory' ? 'База защищена!' : 'Оборона прорвана' : 'Начать новую игру?'}</Dialog.Title><Dialog.Description>{ended ? `Пройдено волн: ${game.status === 'victory' ? game.wave : Math.max(0, game.wave - 1)}. Счёт: ${game.score}. Уничтожено врагов: ${game.kills}.` : 'Текущий прогресс будет сброшен. Сохранения останутся доступны.'}</Dialog.Description><div className="modal-actions"><button className="primary" onClick={newGame}>Новая оборона</button><Dialog.Close asChild><button>{ended ? "Посмотреть поле" : "Отмена"}</button></Dialog.Close></div></Dialog.Content></Dialog.Portal></Dialog.Root>
    <SessionPanel open={sessionOpen} onOpenChange={setSessionOpen}/>
  </>;
}

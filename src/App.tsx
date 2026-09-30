import { useEffect, useState } from 'react';
import { Anchor, ArrowRight, Crosshair, RotateCw, Shuffle, Radio, Shield, Waves, RotateCcw, Check, Info, Trophy, Activity, Cpu } from 'lucide-react';
import Board from './Board';
import World from './scene/World';
import { gameKey, enqueue } from './account/storage';
import { flushResults } from './account/results';
import useMedia from './useMedia';
import { FLEET, Game, Cell, freshGame, decodeSave, place, randomFleet, cellsFor, canPlace, fire, botTarget, isSunk } from './game';

const names: Record<number, string> = { 1: 'Патрульный катер', 2: 'Корвет', 3: 'Эсминец', 4: 'Авианосец' };
function load(key: string) { try { const raw = localStorage.getItem(key); const g = raw && decodeSave(raw) || freshGame(); return { ...g, matchId: g.matchId || crypto.randomUUID() }; } catch { return { ...freshGame(), matchId: crypto.randomUUID() }; } }

export default function App({ userId, onAccount, accountLabel }: { userId?: string; onAccount: () => void; accountLabel: string }) {
  const storageKey = gameKey(userId);
  const [game, setGame] = useState<Game>(() => load(storageKey));
  const [syncNotice, setSyncNotice] = useState('');
  const [selected, setSelected] = useState(() => FLEET.findIndex((_, id) => !game.player.ships.some(s => s.id === id)));
  const [vertical, setVertical] = useState(false);
  const [hover, setHover] = useState<Cell | null>(null);
  const [notice, setNotice] = useState('');
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const [help, setHelp] = useState(false);
  const [field, setField] = useState<'player' | 'bot'>(() => game.phase === 'setup' ? 'player' : 'bot');
  const [economy, setEconomy] = useState(() => { try { return localStorage.getItem('fleet:reduce-motion') === 'true'; } catch { return false; } });
  const reduced = useMedia('(prefers-reduced-motion: reduce)');
  const narrow = useMedia('(max-width: 760px)');
  const moving = !economy && !reduced;
  const setup = game.phase === 'setup';
  const finished = game.phase === 'finished';
  const ready = game.player.ships.length === 10;
  useEffect(() => { try { localStorage.setItem('fleet:reduce-motion', String(economy)); } catch { /* Game remains usable when storage is unavailable. */ } }, [economy]);

  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(game)); setSaved(true); } catch { setSaved(false); } }, [game, storageKey]);
  useEffect(() => {
    if (!userId) return;
    let live = true;
    const sync = async () => {
      try {
        if (game.phase === 'finished' && game.matchId) enqueue({ id: game.matchId, user_id: userId, outcome: game.winner === 'player' ? 'win' : 'loss', shots: game.bot.shots.length, finished_at: new Date().toISOString() });
        await flushResults(userId); if (live) setSyncNotice(game.phase === 'finished' ? 'Результат сохранён в профиле.' : '');
      } catch { if (live) setSyncNotice('Результат пока не отправлен в профиль. Проверьте подключение и повторите синхронизацию в профиле.'); }
    };
    void sync(); window.addEventListener('online', sync);
    return () => { live = false; window.removeEventListener('online', sync); };
  }, [userId, game.phase, game.matchId]);
  useEffect(() => {
    if (game.phase !== 'battle' || game.turn !== 'bot') return;
    const timer = setTimeout(() => setGame(g => g.phase === 'battle' && g.turn === 'bot' ? fire(g, 'bot', botTarget(g.player.shots)) : g), 850);
    return () => clearTimeout(timer);
  }, [game]);

  function reset() { setGame({ ...freshGame(), matchId: crypto.randomUUID() }); setSelected(0); setHover(null); setNotice(''); setConfirm(false); setField('player'); }
  function deploy(c: Cell) {
    if (!setup || ready) return;
    const ships = place(game.player.ships, selected, c, vertical);
    if (ships === game.player.ships) { setNotice('Между кораблями нужна свободная клетка, в том числе по диагонали.'); return; }
    setGame({ ...game, player: { ...game.player, ships } });
    setSelected(FLEET.findIndex((_, id) => !ships.some(s => s.id === id))); setNotice('');
  }
  function start() { setGame({ ...game, phase: 'battle' }); setHover(null); setNotice(''); setField('bot'); }
  const preview = setup && hover && selected >= 0 && !ready ? cellsFor(hover, FLEET[selected], vertical) : [];
  const playerLost = game.player.ships.filter(s => isSunk(s, game.player.shots)).length;
  const enemyLost = game.bot.ships.filter(s => isSunk(s, game.bot.shots)).length;
  const lastLog = game.log[0] || '';
  const lastResult = lastLog.includes('потоплен') ? 'sunk' : lastLog.includes('попадание') ? 'hit' : lastLog ? 'miss' : 'waiting';
  const title = setup ? 'Разверните свой флот' : finished ? game.winner === 'player' ? 'Сектор под контролем' : 'Операция завершена' : 'Держите противника на прицеле';
  const status = setup ? ready ? 'Флот готов к выходу' : 'Подготовка к операции' : finished ? game.winner === 'player' ? 'Победа, командир' : 'Ваш флот уничтожен' : game.turn === 'player' ? 'Ваш ход, командир' : 'Ход бота · противник стреляет';

  return <div className={`app-shell phase-${game.phase} ${moving ? 'motion-on' : 'motion-off'}`}>
    <World moving={moving} />
    <header className="topbar">
      <a className="brand" href="./"><span className="brand-icon"><Anchor size={25} /></span><span>ФЛОТ<span className="brand-divider">/</span><b>СЕКТОР 10</b><small>ТАКТИЧЕСКИЙ КОМАНДНЫЙ ЦЕНТР</small></span></a>
      <div className="header-right"><span className="connection"><i /> СУМЕРЕЧНЫЙ АРХИПЕЛАГ</span><button className="button graphics-toggle" aria-label={economy || reduced ? 'Спокойное море' : 'Живое море'} aria-pressed={economy || reduced} disabled={reduced} onClick={() => setEconomy(!economy)} title={reduced ? 'Системная настройка уменьшения движения включена' : 'Уменьшить движение: остановить волны, качку, акул и частицы'}><Cpu size={16} /><span>{economy || reduced ? 'Спокойное море' : 'Живое море'}</span></button><button className="icon-button" aria-label="Правила игры" aria-expanded={help} onClick={() => setHelp(!help)}><Info size={20} /></button></div>
    </header>
    <main>
      <div className="account-bar"><span>{userId ? 'Личный флот · история в профиле' : 'Гостевой флот · сохранение на устройстве'}</span><button className="button secondary" onClick={onAccount}>{accountLabel}</button></div>
      {syncNotice && <p className="account-notice" role="status">{syncNotice}</p>}
      <section className="page-heading"><div><div className="eyebrow"><span /> СУМЕРЕЧНЫЙ АРХИПЕЛАГ <span className="operation-number">/ СЕКТОР 10</span></div><h1>{title}<span>.</span></h1><p>За скалами собирается гроза. Маяк ещё держит курс.</p></div><div className="weather-readout" aria-hidden="true"><Waves size={30} /><span>СЕВЕРНЫЙ ТИХИЙ ОКЕАН<b>19:42 <i> / </i> СИНИЙ ЧАС</b></span></div><button className="button secondary new-game" onClick={() => setConfirm(true)}><RotateCcw size={16} /> Новая игра</button></section>
      {help && <section className="help-panel"><h2>Приказ командования</h2><p>Разместите 10 кораблей, оставляя между ними клетку, включая диагонали. Корабль занимает клетки вправо или вниз от выбранной. Попадание сохраняет ход, промах передаёт его. Уничтожьте весь флот противника для победы. На сенсорном экране сначала выберите клетку, затем подтвердите действие кнопкой под полем. «Крупные клетки» увеличивают поле; его можно сдвигать в сторону.</p></section>}
      <section className={`operation-strip ${!setup && !finished && game.turn === 'bot' ? 'bot-turn' : ''} ${finished ? 'finished' : ''}`} aria-live="polite">
        <div className="operation-state"><span className="status-icon">{finished ? <Trophy /> : setup ? <Anchor /> : <Crosshair />}</span><div><small>{setup ? '01 / РАССТАНОВКА' : finished ? '03 / ИТОГ ОПЕРАЦИИ' : '02 / МОРСКОЙ БОЙ'}</small><strong>{status}</strong></div></div>
        {!setup && <div className={`strip-contact contact-${lastResult}`}><small>ПОСЛЕДНИЙ ВЫСТРЕЛ</small><strong>{lastLog || 'Ожидаем первый контакт'}</strong></div>}
        <div className="mission-counters"><div><span>{setup ? 'Размещено' : 'Ваш флот'}</span><strong>{setup ? game.player.ships.length : 10 - playerLost}<small> / 10</small></strong></div><div><span>{setup ? 'Боевые клетки' : 'Потоплено'}</span><strong className="orange">{setup ? game.player.ships.reduce((n, s) => n + s.length, 0) : enemyLost}<small> / {setup ? 20 : 10}</small></strong></div></div>
      </section>
      <div className="workspace">
        <section className="fields-panel">
          <div className="mobile-tabs" role="tablist" aria-label="Выбор поля"><button role="tab" aria-selected={field === 'player'} onClick={() => setField('player')}><Shield size={17} /> Ваш флот <b>{setup ? game.player.ships.length : 10 - playerLost}</b></button><button role="tab" aria-selected={field === 'bot'} onClick={() => setField('bot')}><Crosshair size={17} /> Противник <b>{10 - enemyLost}</b></button></div>
          {setup && <div className="deployment-toolbar"><div><Anchor size={17} /><span>{ready ? 'Все корабли на позиции' : `${names[FLEET[selected]]} · ${FLEET[selected]} кл.`}</span><select className="mobile-ship-select" aria-label="Выбрать корабль" disabled={ready} value={ready ? '' : FLEET[selected]} onChange={e => { setSelected(FLEET.findIndex((n, id) => n === Number(e.target.value) && !game.player.ships.some(s => s.id === id))); setNotice(''); setField('player'); }}>{ready ? <option value="">Флот готов</option> : [4, 3, 2, 1].filter(n => FLEET.some((length, id) => length === n && !game.player.ships.some(s => s.id === id))).map(n => <option key={n} value={n}>{names[n]} · {n} кл.</option>)}</select></div><button className="button rotate" disabled={ready} onClick={() => setVertical(!vertical)}><RotateCw size={16} /> Повернуть <b>{vertical ? '↓' : '→'}</b></button></div>}
          {notice && <p className="placement-notice" role="alert">{notice}</p>}
          <div className="fields-grid">
            {(!narrow || field === 'player') && <article className="field-card ally-card"><div className="field-heading"><div><span className="field-emblem"><Shield size={20} /></span><div><small>АКВАТОРИЯ АЛЬФА</small><h2>Ваш флот</h2></div></div><span className="tag teal">СОЮЗНЫЙ СЕКТОР</span></div>
              <Board data={game.player} active={setup && !ready} onCell={deploy} onHover={setHover} preview={preview} valid={canPlace(game.player.ships, preview)} label="Ваше поле" moving={moving} />
              <div className="board-caption"><span className="tiny-dot teal-dot" />{setup ? 'Выберите позицию для корабля' : `${10 - playerLost} кораблей в строю`}<span>СЕКТОР A–10</span></div></article>}
            {(!narrow || field === 'bot') && <article className="field-card enemy-card"><div className="field-heading"><div><span className="field-emblem"><Crosshair size={20} /></span><div><small>АКВАТОРИЯ БРАВО</small><h2>Противник</h2></div></div><span className="tag">{setup ? 'НЕТ КОНТАКТА' : finished ? 'БОЙ ЗАВЕРШЁН' : 'ЗОНА ПОИСКА'}</span></div>
              <Board data={game.bot} enemy active={game.phase === 'battle' && game.turn === 'player'} onCell={c => setGame(g => fire(g, 'player', c))} label="Поле противника" moving={moving} />
              <div className="board-caption"><span className="tiny-dot orange-dot" />{setup ? 'Ожидание начала операции' : finished ? 'Операция завершена' : game.turn === 'player' ? 'Выберите цель для выстрела' : 'Ожидайте своего хода'}<span>СЕКТОР B–10</span></div></article>}
          </div>
          <div className="legend"><span><i className="legend-ship" /> Ваш корабль</span><span><i className="legend-miss" /> Промах</span><span><b>✦</b> Попадание</span><span><i className="legend-sunk">×</i> Потоплен</span><span className="view-label"><Waves size={15} /> ТАКТИЧЕСКИЙ ВИД</span></div>
          <div className={`intel result-${lastResult}`} aria-live="polite" aria-atomic="true"><span className="intel-icon">{lastResult === 'sunk' ? <Anchor /> : lastResult === 'hit' ? <Crosshair /> : <Radio />}</span><div><small>{setup ? 'СООБЩЕНИЕ КОМАНДОВАНИЯ' : 'ПОСЛЕДНИЙ КОНТАКТ'}</small><strong>{setup ? ready ? 'Флот готов. Можно начинать.' : 'Займите позиции, командир.' : lastLog || 'Первый выстрел за вами.'}</strong><p>{setup ? 'Между кораблями нужна одна свободная клетка.' : lastResult === 'hit' || lastResult === 'sunk' ? 'Цель поражена. Стреляющий сохраняет ход.' : 'Точность важнее скорости. Выбирайте цель.'}</p></div><Activity className="intel-wave" size={42} /></div>
        </section>
        <aside className="command-panel"><div className="panel-title"><div><small>УПРАВЛЕНИЕ ОПЕРАЦИЕЙ</small><h2>{setup ? 'Состав флота' : finished ? 'Итог боя' : 'Боевая сводка'}</h2></div><Anchor size={21} /></div>
          {setup ? <>
            <p className="panel-description">Выберите корабль, затем его позицию на своём поле.</p>
            <div className="fleet-list">{[4, 3, 2, 1].map(length => {
              const remaining = FLEET.map((n, id) => n === length ? id : -1).filter(id => id >= 0 && !game.player.ships.some(s => s.id === id));
              return <button key={length} className={`fleet-choice ${FLEET[selected] === length ? 'selected' : ''} ${!remaining.length ? 'complete' : ''}`} disabled={!remaining.length} onClick={() => { setSelected(remaining[0]); setNotice(''); setField('player'); }}>
                <span className={`ship-silhouette ship-${length}`}><i /><i /><i /></span><span className="ship-name"><strong>{names[length]}</strong><small>{Array.from({ length }, (_, i) => <i key={i} />)}<span>{length} кл.</span></small></span><span className="ship-count">{remaining.length ? `×${remaining.length}` : <Check size={18} />}</span>
              </button>;
            })}</div>
            <div className="placement-actions"><button className="button secondary" onClick={() => { setGame({ ...game, player: { ships: randomFleet(), shots: [] } }); setSelected(-1); setNotice(''); setHover(null); setField('player'); }}><Shuffle size={17} /> Авторасстановка</button><button className="icon-button reset" aria-label="Сбросить расстановку" title="Сбросить расстановку" onClick={() => { setGame({ ...game, player: { ships: [], shots: [] } }); setSelected(0); setNotice(''); setHover(null); setField('player'); }}><RotateCcw size={18} /></button></div>
            <div className="deployment-status"><span>Готовность флота</span><strong>{game.player.ships.length * 10}%</strong></div><div className="progress-track"><i style={{ width: `${game.player.ships.length * 10}%` }} /></div>
            <button className="button primary start" disabled={!ready} onClick={start}>Начать операцию <ArrowRight size={19} /></button><p className="panel-hint">{ready ? 'Все системы готовы. Ваш первый ход.' : `Осталось разместить: ${10 - game.player.ships.length}`}</p>
          </> : <>
            {finished && <div className={`victory-card ${game.winner === 'bot' ? 'defeat' : ''}`}><Trophy size={36} /><strong>{game.winner === 'player' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ'}</strong><p>{game.winner === 'player' ? 'Флот противника уничтожен. Море под вашим контролем.' : 'Противник взял сектор. Новая операция — новый шанс.'}</p><button className="button primary start" onClick={reset}>Новая операция <ArrowRight size={17} /></button></div>}
            <div className="fleet-health"><div><span>Ваш флот</span><b>{10 - playerLost} / 10</b></div><div className="health-segments">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 10 - playerLost ? 'alive' : ''} />)}</div><div><span>Флот противника</span><b>{10 - enemyLost} / 10</b></div><div className="health-segments enemy-health">{Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 10 - enemyLost ? 'alive' : ''} />)}</div></div>
            <details className="log-details" open={!narrow}><summary>Журнал боя <span>{game.player.shots.length + game.bot.shots.length} выстрелов</span></summary><div className="battle-log">{game.log.length ? game.log.map((l, i) => <p key={`${game.player.shots.length + game.bot.shots.length}-${i}`} className={l.includes('мимо') ? 'log-miss' : 'log-hit'}><span>{String(game.player.shots.length + game.bot.shots.length - i).padStart(2, '0')}</span>{l}</p>) : <p>Флот на позиции. Ожидаем первый выстрел.</p>}</div></details>
          </>}
          <div className="command-note"><Shield size={18} /><span>{setup ? '10 кораблей · 20 клеток\nОдин флот. Одна цель.' : 'Попадание даёт ещё один ход. Промах передаёт ход противнику.'}</span></div>
        </aside>
      </div>
      <div className="bottom-notes"><span><Waves size={16} /> Открытое море · игра против бота</span><span><span className={`tiny-dot ${saved ? 'teal-dot' : 'orange-dot'}`} />{saved ? 'Прогресс сохранён на устройстве' : 'Сохранение недоступно в этом браузере'}</span></div>
    </main><footer><span>ФЛОТ / СЕКТОР 10 <b>© 2026</b></span><span>ДЕРЖАТЬ КУРС. КОНТРОЛИРОВАТЬ СЕКТОР.</span></footer>
    {confirm && <div className="modal-backdrop" onKeyDown={e => { if (e.key === 'Escape') setConfirm(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-title"><span className="brand-icon"><Anchor size={30} /></span><small>НОВАЯ МИССИЯ</small><h2 id="new-title">Снова в открытое море?</h2><p>Текущая партия будет заменена новой расстановкой.</p><div><button className="button secondary" autoFocus onClick={() => setConfirm(false)}>Продолжить партию</button><button className="button primary" onClick={reset}>Новая игра <ArrowRight size={16} /></button></div></div></div>}
  </div>;
}

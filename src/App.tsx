import { tr, t } from './i18n';
import { useEffect, useState, useRef } from 'react';
import { Anchor, ArrowRight, Crosshair, RotateCw, Shuffle, Radio, Shield, Waves, RotateCcw, Check, Info, Trophy, Activity, Cpu } from 'lucide-react';
import { LanguageSwitch } from './i18n';
import { useWallet, savedGame, saveGame } from './shop/store';
import { catalog } from './shop/catalog';
import { rotatePlaced, area, resolveAction, type Card } from './abilities';
import { sonarPing } from './shop/sound';
import Board from './Board';
import { SoundButton, useShotSound } from './Audio';
import World from './scene/World';
import { gameKey, enqueue } from './account/storage';
import { flushResults } from './account/results';
import useMedia from './useMedia';
import { chooseShot, LEVELS, validDifficulty, type Difficulty } from './bot';
import { FLEET, Game, Cell, freshGame, decodeSave, place, randomFleet, cellsFor, canPlace, fire, isSunk, same } from './game';

const names: Record<number, string> = { 1: 'Патрульный катер', 2: 'Корвет', 3: 'Эсминец', 4: 'Авианосец' };
function load(key: string) { try { const raw = localStorage.getItem(key); const g = raw && decodeSave(raw) || freshGame(); return { ...g, matchId: g.matchId || crypto.randomUUID() }; } catch { return { ...freshGame(), matchId: crypto.randomUUID() }; } }

export default function App({ userId, onAccount, accountLabel, onShop }: { onShop: () => void; userId?: string; onAccount: () => void; accountLabel: string }) {
  const storageKey = gameKey(userId);
  const {wallet,run,busy,ready:walletReady,error:walletError}=useWallet(userId);
  const [card,setCard]=useState<Card|null>(null);
  const [target,setTarget]=useState<Cell|null>(null);
  const [rotated,setRotated]=useState<number|null>(null);
  const [emotion,setEmotion]=useState('');
  const actionGate=useRef(false);
  useEffect(()=>{if(!emotion)return;const id=setTimeout(()=>setEmotion(''),2200);return()=>clearTimeout(id);},[emotion]);
  const [game, setGame] = useState<Game>(() => savedGame(userId) || load(storageKey));
  useEffect(()=>{if(walletReady&&wallet.game?.matchId===game.matchId&&wallet.game?.ability?.id&&wallet.game.ability.id!==game.ability?.id)setGame(wallet.game);},[walletReady]);
  const [preferredDifficulty, setPreferredDifficulty] = useState<Difficulty>(() => { try { const v = localStorage.getItem('fleet:difficulty'); return validDifficulty(v) ? v : 'tactician'; } catch { return 'tactician'; } });
  const difficulty = validDifficulty(game.difficulty) ? game.difficulty : game.phase === 'setup' ? preferredDifficulty : 'tactician';
  useShotSound(game.player.shots.length + game.bot.shots.length);
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

  useEffect(() => { try { saveGame(game,userId); setSaved(true); } catch { setSaved(false); } }, [game, storageKey]);
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
    const timer = setTimeout(() => setGame(g => g.phase === 'battle' && g.turn === 'bot' ? fire(g, 'bot', chooseShot(g.player.shots, validDifficulty(g.difficulty) ? g.difficulty : 'tactician')) : g), 850);
    return () => clearTimeout(timer);
  }, [game]);

  useEffect(()=>{if(game.phase==='finished'&&walletReady)void run({type:'reward',game});},[game.phase,game.matchId,walletReady]);
  function reset() { setCard(null);setTarget(null);setRotated(null); setGame({ ...freshGame(), matchId: crypto.randomUUID() }); setSelected(0); setHover(null); setNotice(''); setConfirm(false); setField('player'); }
  function deploy(c: Cell) {
    if (!setup) return;
    const existing=game.player.ships.find(s=>s.cells.some(p=>same(p,c)));
    if(existing){turnPlaced(existing.id);return;}
    if(ready)return;
    setRotated(null);
    const ships = place(game.player.ships, selected, c, vertical);
    if (ships === game.player.ships) { setNotice('Между кораблями нужна свободная клетка, в том числе по диагонали.'); return; }
    setGame({ ...game, player: { ...game.player, ships } });
    setSelected(FLEET.findIndex((_, id) => !ships.some(s => s.id === id))); setNotice('');
  }
  function turnPlaced(id:number) {
    if(game.player.ships.find(s=>s.id===id)?.length===1){setNotice('Катер занимает одну клетку — поворот не меняет позицию.');setRotated(id);return;}
    const ships=rotatePlaced(game.player.ships,id);setRotated(id);
    setNotice(ships===game.player.ships?'Поворот невозможен: рядом нет свободного места.':'Корабль повёрнут.');
    if(ships!==game.player.ships)setGame({...game,player:{...game.player,ships}});
  }
  async function applyCard() {
    if(!card||actionGate.current)return;actionGate.current=true;
    try{const result=await run({type:'action',game,action:{type:'card',card,cell:target||undefined,id:crypto.randomUUID()}});
      if(result?.game){setGame(result.game);if(card==='sonar')sonarPing();setCard(null);setTarget(null);}
    }finally{actionGate.current=false;}
  }
  function start() { setGame({ ...game, difficulty, phase: 'battle' }); setHover(null); setNotice(''); setField('bot'); }
  function rotate() {
    if (!setup) return;
    if(rotated!==null){turnPlaced(rotated);return;}
    if(ready)return;
    const next = !vertical; setVertical(next);
    setNotice(hover && !canPlace(game.player.ships, cellsFor(hover,FLEET[selected],next)) ? 'После поворота корабль выходит за поле или касается другого. Выберите свободную позицию.' : '');
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if(e.code !== 'KeyR' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || (e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]'))return; e.preventDefault(); rotate(); };
    window.addEventListener('keydown',key); return () => window.removeEventListener('keydown',key);
  },[setup,ready,vertical,hover,selected,game.player.ships,rotated]);
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
      <a className="brand" href="./"><span className="brand-icon"><Anchor size={25} /></span><span>{t("ФЛОТ")}<span className="brand-divider">/</span><b>{t("СЕКТОР 10")}</b><small>{t("ТАКТИЧЕСКИЙ КОМАНДНЫЙ ЦЕНТР")}</small></span></a>
      <div className="header-right"><LanguageSwitch/><button className="button secondary" onClick={onShop}>{t("Магазин · ◈ ")}{tr(walletReady?wallet.balance:'—')}</button>{tr(userId && <button className="button header-profile" onClick={onAccount}>{t("Профиль")}</button>)}<SoundButton /><span className="connection"><i />{t(" СУМЕРЕЧНЫЙ АРХИПЕЛАГ")}</span><button className="button graphics-toggle" aria-label={tr(economy || reduced ? 'Спокойное море' : 'Живое море')} aria-pressed={economy || reduced} disabled={reduced} onClick={() => setEconomy(!economy)} title={tr(reduced ? 'Системная настройка уменьшения движения включена' : 'Уменьшить движение: остановить волны, качку, акул и частицы')}><Cpu size={16} /><span>{tr(economy || reduced ? 'Спокойное море' : 'Живое море')}</span></button><button className="icon-button" aria-label={t("Правила игры")} aria-expanded={help} onClick={() => setHelp(!help)}><Info size={20} /></button></div>
    </header>
    <main>
      <div className="account-bar"><span>{tr(userId ? 'Личный флот · история в профиле' : 'Гостевой флот · сохранение на устройстве')}</span><button className="button secondary" onClick={onAccount}>{tr(accountLabel)}</button></div>
      {tr(walletError && <p role="alert" className="account-notice">{tr(walletError)}</p>)}{tr(syncNotice && <p className="account-notice" role="status">{tr(syncNotice)}</p>)}
      <section className="difficulty-panel" aria-label={t("Сложность бота")}>{tr(setup ? <><label>{t("Сложность бота ")}<select aria-label={t("Сложность бота")} value={difficulty} onChange={e=>{const value=e.target.value as Difficulty;setPreferredDifficulty(value);setGame(g=>({...g,difficulty:value}));try{localStorage.setItem('fleet:difficulty',value);}catch{}}}>{tr(Object.entries(LEVELS).map(([key,v])=><option key={key} value={key}>{tr(v.name)}</option>))}</select></label><p>{tr(LEVELS[difficulty].description)}</p><details><summary>{t("Чем отличаются уровни")}</summary>{tr(Object.values(LEVELS).map(v=><p key={v.name}><b>{tr(v.name)}:</b> {tr(v.description)}</p>))}</details></> : <span>{t("Противник: ")}<b>{tr(LEVELS[difficulty].name)}</b></span>)}</section>
      {tr(setup && <section className="mode-panel"><label>{t("Режим боя ")}<select aria-label={t("Режим боя")} value={game.mode||'classic'} onChange={e=>setGame({...game,mode:e.target.value as 'classic'|'boosted'})}><option value="classic">{t("Классический бой")}</option><option value="boosted">{t("Бой с усилениями")}</option></select></label><p>{tr(game.mode==='boosted'?'Купленные карты доступны только в ваш ход.':'Классические правила, без карточек.')}</p></section>)}
      {tr(help && <div className="settings-panel"><LanguageSwitch/><label><input type="checkbox" checked={wallet.hidden} onChange={e=>void run({type:'hide',value:e.target.checked})}/>{t(" Скрыть эмоции")}</label></div>)}
      <section className="page-heading"><div><div className="eyebrow"><span />{t(" СУМЕРЕЧНЫЙ АРХИПЕЛАГ ")}<span className="operation-number">{t("/ СЕКТОР 10")}</span></div><h1>{tr(title)}<span>.</span></h1><p>{t("За скалами собирается гроза. Маяк ещё держит курс.")}</p></div><div className="weather-readout" aria-hidden="true"><Waves size={30} /><span>{t("СЕВЕРНЫЙ ТИХИЙ ОКЕАН")}<b>19:42 <i> / </i>{t(" СИНИЙ ЧАС")}</b></span></div><button className="button secondary new-game" onClick={() => setConfirm(true)}><RotateCcw size={16} />{t(" Новая игра")}</button></section>
      {tr(help && <section className="help-panel"><h2>{t("Приказ командования")}</h2><p>{t("Разместите 10 кораблей, оставляя между ними клетку, включая диагонали. Корабль занимает клетки вправо или вниз от выбранной. Попадание сохраняет ход, промах передаёт его. Уничтожьте весь флот противника для победы. На сенсорном экране сначала выберите клетку, затем подтвердите действие кнопкой под полем. «Крупные клетки» увеличивают поле; его можно сдвигать в сторону.")}</p></section>)}
      <section className={`operation-strip ${!setup && !finished && game.turn === 'bot' ? 'bot-turn' : ''} ${finished ? 'finished' : ''}`} aria-live="polite">
        <div className="operation-state"><span className="status-icon">{tr(finished ? <Trophy /> : setup ? <Anchor /> : <Crosshair />)}</span><div><small>{tr(setup ? '01 / РАССТАНОВКА' : finished ? '03 / ИТОГ ОПЕРАЦИИ' : '02 / МОРСКОЙ БОЙ')}</small><strong>{tr(status)}</strong></div></div>
        {tr(!setup && <div className={`strip-contact contact-${lastResult}`}><small>{t("ПОСЛЕДНИЙ ВЫСТРЕЛ")}</small><strong>{tr(lastLog || 'Ожидаем первый контакт')}</strong></div>)}
        <div className="mission-counters"><div><span>{tr(setup ? 'Размещено' : 'Ваш флот')}</span><strong>{tr(setup ? game.player.ships.length : 10 - playerLost)}<small> / 10</small></strong></div><div><span>{tr(setup ? 'Боевые клетки' : 'Потоплено')}</span><strong className="orange">{tr(setup ? game.player.ships.reduce((n, s) => n + s.length, 0) : enemyLost)}<small> / {tr(setup ? 20 : 10)}</small></strong></div></div>
      </section>
      {tr(!setup && <section className="ability-panel">
        {tr(finished && <p className="reward-notice">{tr(wallet.rewards.includes(game.matchId||'') ? `Награда за партию: +${game.winner==='player'?80:35} жетонов` : 'Награда ожидает сохранения.')}</p>)}
        {tr(!wallet.hidden && <div className="emotion-panel">{tr(wallet.equipped.map(id=>{const item=catalog.find(i=>i.id===id)!;return <button className="button" key={id} onClick={()=>setEmotion(item.name)}>{tr(item.icon)} {tr(item.name)}</button>;}))}{tr(emotion&&<span className="emotion-bubble" role="status">{tr(emotion)}</span>)}</div>)}
        {tr(!finished && game.mode==='boosted' && <><div className="card-buttons">{tr(catalog.filter(i=>i.kind==='card').map(i=><button key={i.id} className="button secondary" disabled={!walletReady||busy||game.turn!=='player'||!wallet.items[i.id]} aria-pressed={card===i.id} onClick={()=>{setCard(i.id as Card);setTarget(null);setField('bot');}}>{tr(i.icon)} {tr(i.name)} ×{tr(wallet.items[i.id]||0)}</button>))}</div>
          {tr(card&&<div className="ability-confirm"><strong>{tr(catalog.find(i=>i.id===card)!.name)}</strong><p>{tr(catalog.find(i=>i.id===card)!.description)}</p><p>{tr(card==='sonar'||card==='bomb'?'Выберите верхнюю левую клетку области, затем подтвердите применение.':'Нажмите «Применить карту» для подтверждения.')}</p><button className="button primary" disabled={busy||game.turn!=='player'||((card==='sonar'||card==='bomb')&&!target)} onClick={()=>void applyCard()}>{t("Применить карту")}</button><button className="button" disabled={busy} onClick={()=>{setCard(null);setTarget(null);}}>{t("Отмена")}</button></div>)}
          {tr(game.bonus&&<p role="status">{t("Бонус активен: следующий выстрел сохраняет ход.")}</p>)}
          {tr(game.ability&&<p role="status">{tr(game.ability.card==='sonar'?`Гидролокатор: непоражённых сегментов — ${game.ability.count}`:`Применено: ${catalog.find(i=>i.id===game.ability!.card)!.name}`)}</p>)}
        </>)}
      </section>)}
      <div className="workspace">
        <section className="fields-panel">
          <div className="mobile-tabs" role="tablist" aria-label={t("Выбор поля")}><button role="tab" aria-selected={field === 'player'} onClick={() => setField('player')}><Shield size={17} />{t(" Ваш флот ")}<b>{tr(setup ? game.player.ships.length : 10 - playerLost)}</b></button><button role="tab" aria-selected={field === 'bot'} onClick={() => setField('bot')}><Crosshair size={17} />{t(" Противник ")}<b>{tr(10 - enemyLost)}</b></button></div>
          {tr(setup && <div className="deployment-toolbar"><div><Anchor size={17} /><span>{tr(ready ? 'Все корабли на позиции' : `${names[FLEET[selected]]} · ${FLEET[selected]} кл.`)}</span><select className="mobile-ship-select" aria-label={t("Выбрать корабль")} disabled={ready} value={ready ? '' : FLEET[selected]} onChange={e => { setSelected(FLEET.findIndex((n, id) => n === Number(e.target.value) && !game.player.ships.some(s => s.id === id))); setNotice(''); setField('player'); }}>{tr(ready ? <option value="">{t("Флот готов")}</option> : [4, 3, 2, 1].filter(n => FLEET.some((length, id) => length === n && !game.player.ships.some(s => s.id === id))).map(n => <option key={n} value={n}>{tr(names[n])} · {tr(n)}{t(" кл.")}</option>))}</select></div><button className="button rotate" disabled={ready&&rotated===null} onClick={rotate} title={t("Повернуть корабль · R")}><RotateCw size={16} />{t(" Повернуть ")}<b>{tr(vertical ? '↓' : '→')}</b></button></div>)}
          {tr(notice && <p className="placement-notice" role="alert">{tr(notice)}</p>)}
          <div className="fields-grid">
            {tr((!narrow || field === 'player') && <article className="field-card ally-card"><div className="field-heading"><div><span className="field-emblem"><Shield size={20} /></span><div><small>{t("АКВАТОРИЯ АЛЬФА")}</small><h2>{t("Ваш флот")}</h2></div></div><span className="tag teal">{t("СОЮЗНЫЙ СЕКТОР")}</span></div>
              <Board data={game.player} active={setup} rotateOnTouch={setup} onCell={deploy} onHover={setHover} preview={rotated!==null?game.player.ships.find(s=>s.id===rotated)?.cells||preview:preview} valid={rotated!==null||canPlace(game.player.ships, preview)} label="Ваше поле" moving={moving} />
              <div className="board-caption"><span className="tiny-dot teal-dot" />{tr(setup ? 'Выберите позицию для корабля' : `${10 - playerLost} кораблей в строю`)}<span>{t("СЕКТОР A–10")}</span></div></article>)}
            {tr((!narrow || field === 'bot') && <article className="field-card enemy-card"><div className="field-heading"><div><span className="field-emblem"><Crosshair size={20} /></span><div><small>{t("АКВАТОРИЯ БРАВО")}</small><h2>{t("Противник")}</h2></div></div><span className="tag">{tr(setup ? 'НЕТ КОНТАКТА' : finished ? 'БОЙ ЗАВЕРШЁН' : 'ЗОНА ПОИСКА')}</span></div>
              <Board data={game.bot} enemy revealed={game.revealed} ability={game.ability} allowUsed={!!card} preview={target&&card&&(card==='sonar'||card==='bomb')?area(target,card==='sonar'?3:2):[]} valid={!target||!card||area(target,card==='sonar'?3:2).every(c=>c.x<10&&c.y<10)} active={game.phase === 'battle' && game.turn === 'player' && !busy} onCell={c => {if(card)setTarget(c);else setGame(g => resolveAction(g,{type:'shoot',cell:c}));}} label="Поле противника" moving={moving} />
              <div className="board-caption"><span className="tiny-dot orange-dot" />{tr(setup ? 'Ожидание начала операции' : finished ? 'Операция завершена' : game.turn === 'player' ? 'Выберите цель для выстрела' : 'Ожидайте своего хода')}<span>{t("СЕКТОР B–10")}</span></div></article>)}
          </div>
          <div className="legend"><span><i className="legend-ship" />{t(" Ваш корабль")}</span><span><i className="legend-miss" />{t(" Промах")}</span><span><b>✦</b>{t(" Попадание")}</span><span><i className="legend-sunk">×</i>{t(" Потоплен")}</span><span className="view-label"><Waves size={15} />{t(" ТАКТИЧЕСКИЙ ВИД")}</span></div>
          <div className={`intel result-${lastResult}`} aria-live="polite" aria-atomic="true"><span className="intel-icon">{tr(lastResult === 'sunk' ? <Anchor /> : lastResult === 'hit' ? <Crosshair /> : <Radio />)}</span><div><small>{tr(setup ? 'СООБЩЕНИЕ КОМАНДОВАНИЯ' : 'ПОСЛЕДНИЙ КОНТАКТ')}</small><strong>{tr(setup ? ready ? 'Флот готов. Можно начинать.' : 'Займите позиции, командир.' : lastLog || 'Первый выстрел за вами.')}</strong><p>{tr(setup ? 'Между кораблями нужна одна свободная клетка.' : lastResult === 'hit' || lastResult === 'sunk' ? 'Цель поражена. Стреляющий сохраняет ход.' : 'Точность важнее скорости. Выбирайте цель.')}</p></div><Activity className="intel-wave" size={42} /></div>
        </section>
        <aside className="command-panel"><div className="panel-title"><div><small>{t("УПРАВЛЕНИЕ ОПЕРАЦИЕЙ")}</small><h2>{tr(setup ? 'Состав флота' : finished ? 'Итог боя' : 'Боевая сводка')}</h2></div><Anchor size={21} /></div>
          {tr(setup ? <>
            <p className="panel-description">{t("Выберите корабль, затем его позицию на своём поле.")}</p>
            <div className="fleet-list">{tr([4, 3, 2, 1].map(length => {
              const remaining = FLEET.map((n, id) => n === length ? id : -1).filter(id => id >= 0 && !game.player.ships.some(s => s.id === id));
              return <button key={length} className={`fleet-choice ${FLEET[selected] === length ? 'selected' : ''} ${!remaining.length ? 'complete' : ''}`} disabled={!remaining.length} onClick={() => { setRotated(null); setSelected(remaining[0]); setNotice(''); setField('player'); }}>
                <span className={`ship-silhouette ship-${length}`}><i /><i /><i /></span><span className="ship-name"><strong>{tr(names[length])}</strong><small>{tr(Array.from({ length }, (_, i) => <i key={i} />))}<span>{tr(length)}{t(" кл.")}</span></small></span><span className="ship-count">{tr(remaining.length ? `×${remaining.length}` : <Check size={18} />)}</span>
              </button>;
            }))}</div>
            <div className="placement-actions"><button className="button secondary" onClick={() => { setGame({ ...game, player: { ships: randomFleet(), shots: [] } }); setRotated(null);setSelected(-1); setNotice(''); setHover(null); setField('player'); }}><Shuffle size={17} />{t(" Авторасстановка")}</button><button className="icon-button reset" aria-label={t("Сбросить расстановку")} title={t("Сбросить расстановку")} onClick={() => { setGame({ ...game, player: { ships: [], shots: [] } }); setRotated(null);setSelected(0); setNotice(''); setHover(null); setField('player'); }}><RotateCcw size={18} /></button></div>
            <div className="deployment-status"><span>{t("Готовность флота")}</span><strong>{tr(game.player.ships.length * 10)}%</strong></div><div className="progress-track"><i style={{ width: `${game.player.ships.length * 10}%` }} /></div>
            <button className="button primary start" disabled={!ready} onClick={start}>{t("Начать операцию ")}<ArrowRight size={19} /></button><p className="panel-hint">{tr(ready ? 'Все системы готовы. Ваш первый ход.' : `Осталось разместить: ${10 - game.player.ships.length}`)}</p>
          </> : <>
            {tr(finished && <div className={`victory-card ${game.winner === 'bot' ? 'defeat' : ''}`}><Trophy size={36} /><strong>{tr(game.winner === 'player' ? 'ПОБЕДА' : 'ПОРАЖЕНИЕ')}</strong><p>{tr(game.winner === 'player' ? 'Флот противника уничтожен. Море под вашим контролем.' : 'Противник взял сектор. Новая операция — новый шанс.')}</p><button className="button primary start" onClick={reset}>{t("Новая операция ")}<ArrowRight size={17} /></button></div>)}
            <div className="fleet-health"><div><span>{t("Ваш флот")}</span><b>{tr(10 - playerLost)} / 10</b></div><div className="health-segments">{tr(Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 10 - playerLost ? 'alive' : ''} />))}</div><div><span>{t("Флот противника")}</span><b>{tr(10 - enemyLost)} / 10</b></div><div className="health-segments enemy-health">{tr(Array.from({ length: 10 }, (_, i) => <i key={i} className={i < 10 - enemyLost ? 'alive' : ''} />))}</div></div>
            <details className="log-details" open={!narrow}><summary>{t("Журнал боя ")}<span>{tr(game.player.shots.length + game.bot.shots.length)}{t(" выстрелов")}</span></summary><div className="battle-log">{tr(game.log.length ? game.log.map((l, i) => <p key={`${game.player.shots.length + game.bot.shots.length}-${i}`} className={l.includes('мимо') ? 'log-miss' : 'log-hit'}><span>{tr(String(game.player.shots.length + game.bot.shots.length - i).padStart(2, '0'))}</span>{tr(l)}</p>) : <p>{t("Флот на позиции. Ожидаем первый выстрел.")}</p>)}</div></details>
          </>)}
          <div className="command-note"><Shield size={18} /><span>{tr(setup ? '10 кораблей · 20 клеток\nОдин флот. Одна цель.' : 'Попадание даёт ещё один ход. Промах передаёт ход противнику.')}</span></div>
        </aside>
      </div>
      <div className="bottom-notes"><span><Waves size={16} />{t(" Открытое море · игра против бота")}</span><span><span className={`tiny-dot ${saved ? 'teal-dot' : 'orange-dot'}`} />{tr(saved ? 'Прогресс сохранён на устройстве' : 'Сохранение недоступно в этом браузере')}</span></div>
    </main><footer><span>{t("ФЛОТ / СЕКТОР 10 ")}<b>© 2026</b></span><span>{t("ДЕРЖАТЬ КУРС. КОНТРОЛИРОВАТЬ СЕКТОР.")}</span></footer>
    {tr(confirm && <div className="modal-backdrop" onKeyDown={e => { if (e.key === 'Escape') setConfirm(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-title"><span className="brand-icon"><Anchor size={30} /></span><small>{t("НОВАЯ МИССИЯ")}</small><h2 id="new-title">{t("Снова в открытое море?")}</h2><p>{t("Текущая партия будет заменена новой расстановкой.")}</p><div><button className="button secondary" autoFocus onClick={() => setConfirm(false)}>{t("Продолжить партию")}</button><button className="button primary" onClick={reset}>{t("Новая игра ")}<ArrowRight size={16} /></button></div></div></div>)}
  </div>;
}

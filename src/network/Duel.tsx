import { useEffect,useRef,useState } from 'react';
import Board from '../Board';
import { FLEET,LETTERS,canPlace,cellsFor,place,randomFleet,type Cell,type Ship } from '../game';
import { rotatePlaced } from '../abilities';
import useMedia from '../useMedia';
import { duel,errorText,pendingKey,type Command,type Room,type RoomList } from './api';

const statusText={waiting:'Ожидание друга',setup:'Расстановка',battle:'Бой',finished:'Партия окончена'};
export default function Duel({userId,onLeaders}:{userId:string;onLeaders:()=>void}) {
  const [room,setRoom]=useState<Room|null>(null),[rooms,setRooms]=useState<RoomList>([]);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[connected,setConnected]=useState(false);
  const [fleet,setFleet]=useState<Ship[]>([]),[vertical,setVertical]=useState(false),[hover,setHover]=useState<Cell|null>(null);
  const [selected,setSelected]=useState(0),[copied,setCopied]=useState(false);
  const gate=useRef(false),current=useRef<Room|null>(null),alive=useRef(true),pending=useRef<Command|null>(null);
  const params=new URLSearchParams(location.search),invite=params.get('invite');
  const roomId=useRef(params.get('room'));
  const quiet=useMedia('(prefers-reduced-motion: reduce)');
  const draftKey=(r:Room)=>`fleet:duel:draft:${userId}:${r.id}:${r.round}`;
  function accept(next:Room){
    if(!alive.current)return;
    const old=current.current;
    if(old?.id===next.id&&old.revision>next.revision)return;
    if(old?.id!==next.id||old.round!==next.round){
      let draft:Ship[]=[];try{draft=JSON.parse(localStorage.getItem(draftKey(next))||'[]');}catch{}
      // Local draft is only a convenience; the server validates the submitted fleet.
      if(!Array.isArray(draft)||draft.some(s=>!s||!Array.isArray(s.cells)))draft=[];
      setFleet(next.ready?next.own.ships:draft);setSelected(FLEET.findIndex((_,i)=>!draft.some(s=>s.id===i)));setHover(null);
    }else if(next.ready)setFleet(next.own.ships);
    current.current=next;roomId.current=next.id;setRoom(next);setConnected(true);
    const url=new URL(location.href);url.searchParams.delete('invite');url.searchParams.set('room',next.id);history.replaceState(null,'',url);
  }
  async function send(command:Command,durable=false){
    if(gate.current)return;gate.current=true;if(alive.current)setBusy(true);
    try{
      if(durable){localStorage.setItem(pendingKey(userId),JSON.stringify(command));pending.current=command;}
      const result=await duel(command);
      if(durable){localStorage.removeItem(pendingKey(userId));pending.current=null;}
      accept(result);if(alive.current)setError('');
    }catch(e){
      const code=(e as {code?:string}).code;
      if(durable&&code&&(code==='P0001'||code.startsWith('22')||code.startsWith('23'))){localStorage.removeItem(pendingKey(userId));pending.current=null;}
      if(alive.current){setError(errorText(e));setConnected(false);}
    }finally{gate.current=false;if(alive.current)setBusy(false);}
  }
  useEffect(()=>{
    alive.current=true;
    try{pending.current=JSON.parse(localStorage.getItem(pendingKey(userId))||'null');}catch{}
    const refresh=()=>{
      if(pending.current){void send(pending.current,true);return;}
      if(roomId.current){void send({type:'read',id:roomId.current});return;}
    };
    refresh();
    void duel<RoomList>({type:'list'}).then(r=>{if(alive.current){setRooms(r);if(!roomId.current&&!pending.current)setConnected(true);}}).catch(e=>{if(alive.current)setError(errorText(e));});
    const timer=setInterval(refresh,2000);window.addEventListener('online',refresh);
    return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('online',refresh);};
  },[userId]);
  useEffect(()=>{if(room&&!room.ready)try{localStorage.setItem(draftKey(room),JSON.stringify(fleet));}catch{}},[fleet,room?.id,room?.round]);
  const setup=room?.status==='setup'&&!room.ready;
  const preview=setup&&hover&&selected>=0?cellsFor(hover,FLEET[selected],vertical):[];
  function deploy(cell:Cell){
    if(!setup||busy)return;
    const existing=fleet.find(s=>s.cells.some(c=>c.x===cell.x&&c.y===cell.y));
    if(existing){setFleet(rotatePlaced(fleet,existing.id));return;}
    const next=place(fleet,selected,cell,vertical);setFleet(next);setSelected(FLEET.findIndex((_,id)=>!next.some(s=>s.id===id)));
  }
  function action(type:string,extra:Record<string,unknown>={}){if(room&&!pending.current)void send({type,id:room.id,round:room.round,request:crypto.randomUUID(),...extra},true);}
  const state=room?.status==='setup'&&room.ready?'Ожидание расстановки соперника':room?.status==='battle'?room.myTurn?'Ваш ход':'Ход соперника':room?statusText[room.status]:'Игра с другом';
  return <section className="duel-page"><div className="duel-heading"><div><small>СЕТЕВАЯ ОПЕРАЦИЯ · КЛАССИКА</small><h1>{state}</h1></div><button className="button secondary" onClick={onLeaders}>Таблица лидеров</button></div>
    <p>10 кораблей, попадание сохраняет ход. Купленные карты способностей в игре с другом недоступны.</p>
    <p className="duel-connection" role="status">{error||(!connected?'Подключение к серверу…':busy?'Синхронизация…':'Состояние подтверждено сервером · обновление каждые 2 секунды')}</p>
    {!room?<><div className="duel-controls"><button className="button primary" disabled={busy||!!pending.current} onClick={()=>void send({type:'create',id:crypto.randomUUID()},true)}>Создать комнату</button>{invite&&<button className="button primary" disabled={busy||!!pending.current} onClick={()=>void send({type:'join',invite},true)}>Присоединиться по приглашению</button>}</div>
      {rooms.length>0&&<><h2>Ваши комнаты</h2><div className="duel-controls">{rooms.map(r=><button key={r.id} className="button secondary" disabled={busy} onClick={()=>void send({type:'read',id:r.id})}>{statusText[r.status]} · {r.id.slice(0,8)} · раунд {r.round}</button>)}</div></>}
    </>:<>
      <p>Раунд {room.round} · Соперник: {room.opponent||'ещё не присоединился'}</p>
      {room.invite&&<div className="invite-box"><label>Ссылка для друга<input readOnly value={`${location.origin}${location.pathname}?invite=${room.invite}`} onFocus={e=>e.target.select()}/></label><button className="button primary" onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}${location.pathname}?invite=${room.invite}`);setCopied(true);}catch{setError('Выделите и скопируйте ссылку из поля вручную.');}}}>{copied?'Ссылка скопирована':'Копировать ссылку'}</button><p>Друг должен войти в свой аккаунт и подтвердить присоединение.</p></div>}
      {setup&&<div className="duel-controls"><select aria-label="Корабль для расстановки" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{selected<0&&<option value={-1}>Флот готов</option>}{FLEET.map((n,id)=>!fleet.some(s=>s.id===id)&&<option key={id} value={id}>{n} клетки · корабль {id+1}</option>)}</select><button className="button secondary" onClick={()=>setVertical(v=>!v)}>Повернуть {vertical?'↓':'→'}</button><button className="button secondary" onClick={()=>{setFleet(randomFleet());setSelected(-1);}}>Авторасстановка</button><button className="button secondary" onClick={()=>{setFleet([]);setSelected(0);}}>Сбросить</button><button className="button primary" disabled={fleet.length!==10||busy||!!pending.current} onClick={()=>action('place',{fleet})}>Готов к бою</button></div>}
      {room.status!=='waiting'&&<div className="duel-fields"><article className="field-card"><h2>Ваш флот</h2><Board data={{ships:room.ready?room.own.ships:fleet,shots:room.own.shots}} active={!!setup&&!busy} onCell={deploy} onHover={setHover} preview={preview} valid={canPlace(fleet,preview)} rotateOnTouch label="Ваше поле" moving={!quiet}/></article><article className="field-card"><h2>{room.opponent||'Противник'}</h2><Board data={room.enemy} enemy={room.status!=='finished'} active={room.status==='battle'&&!!room.myTurn&&!busy&&connected&&!pending.current} onCell={c=>action('shoot',c)} label="Поле противника" moving={!quiet}/></article></div>}
      {room.status==='finished'&&<div className="duel-result"><h2>{room.won?'Победа!':'Поражение'}</h2><p>Результат записан сервером и учтён в таблице лидеров.</p><button className="button primary" disabled={busy||room.rematchRequested} onClick={()=>action('rematch')}>{room.rematchRequested?'Ожидаем согласия друга':room.opponentRematch?'Принять реванш':'Реванш'}</button></div>}
      {!!room.enemy.shots.length&&<p className="duel-last">Последний выстрел: {LETTERS[room.enemy.shots.at(-1)!.x]}{room.enemy.shots.at(-1)!.y+1} · {{miss:'промах',hit:'попадание',sunk:'потоплен'}[room.enemy.shots.at(-1)!.result]}</p>}
    </>}
  </section>;
}

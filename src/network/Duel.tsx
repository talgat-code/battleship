import EmotionBar from '../emotions/EmotionBar';
import RoomChat from './RoomChat';
import { useEffect,useRef,useState } from 'react';
import Board from '../Board';
import { FLEET,LETTERS,canPlace,cellsFor,place,randomFleet,type Cell,type Ship,type Game } from '../game';
import { rotatePlaced,area,abilityMessage,type Card } from '../abilities';
import {supabase} from '../account/client';
import AbilityPanel from '../shop/AbilityPanel';
import {newWallet} from '../shop/economy';
import useConnection from './useConnection';
import {useSound} from '../Audio';
import useMedia from '../useMedia';
import { duel,errorText,pendingKey,type Command,type Room,type RoomList } from './api';

const statusText={waiting:'Ожидание друга',setup:'Расстановка',battle:'Бой',finished:'Партия окончена'};
export default function Duel({userId,onLeaders,onShop}:{userId:string;onLeaders:()=>void;onShop:()=>void}) {
  const [room,setRoom]=useState<Room|null>(null),[rooms,setRooms]=useState<RoomList>([]);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[connected,setConnected]=useState(false);
  const [fleet,setFleet]=useState<Ship[]>([]),[vertical,setVertical]=useState(false),[hover,setHover]=useState<Cell|null>(null);
  const [selected,setSelected]=useState(0),[copied,setCopied]=useState(false);
  const [card,setCard]=useState<Card|null>(null),[target,setTarget]=useState<Cell|null>(null),[joinCode,setJoinCode]=useState('');
  const {shoot,impact}=useSound();
  const sound=useRef({shoot,impact});sound.current={shoot,impact};
  const reading=useRef(false),refreshNeeded=useRef(false),blockUntil=useRef(0);
  const gate=useRef(false),current=useRef<Room|null>(null),alive=useRef(true),pending=useRef<Command|null>(null);
  const params=new URLSearchParams(location.search),invite=params.get('invite');
  const roomId=useRef(params.get('room'));
  const quiet=useMedia('(prefers-reduced-motion: reduce)');
  const draftKey=(r:Room)=>`fleet:duel:draft:${userId}:${r.id}:${r.round}`;
  function accept(next:Room){
    if(!alive.current)return;
    const old=current.current;
    if(old?.id===next.id&&old.revision>next.revision)return;
    if(old?.id===next.id&&old.round===next.round){
      const newShots=[...next.own.shots.slice(old.own.shots.length),...next.enemy.shots.slice(old.enemy.shots.length)];
      if(newShots.length){sound.current.shoot();sound.current.impact(newShots.some(s=>s.result==='sunk')?'sunk':newShots.some(s=>s.result==='hit')?'hit':'miss');}
    }
    if(old?.id!==next.id||old.round!==next.round){
      let draft:Ship[]=[];try{draft=JSON.parse(localStorage.getItem(draftKey(next))||'[]');}catch{}
      // Local draft is only a convenience; the server validates the submitted fleet.
      if(!Array.isArray(draft)||draft.some(s=>!s||!Array.isArray(s.cells)))draft=[];
      setFleet(next.ready?next.own.ships:draft);setSelected(FLEET.findIndex((_,i)=>!draft.some(s=>s.id===i)));setHover(null);
    }else if(next.ready)setFleet(next.own.ships);
    current.current=next;roomId.current=next.id;setRoom(next);setConnected(true);
    const url=new URL(location.href);url.searchParams.delete('invite');url.searchParams.set('room',next.id);url.searchParams.set('view','friend');history.replaceState(null,'',url);
    try{localStorage.setItem(`fleet:room:${userId}`,next.id);}catch{/* The URL still restores this server room. */}window.dispatchEvent(new Event('fleet:room'));
  }
  async function send(command:Command,durable=false){
    if(gate.current)return;gate.current=true;if(alive.current)setBusy(true);
    try{
      if(durable){pending.current=command;try{localStorage.setItem(pendingKey(userId),JSON.stringify(command));}catch{}}
      const result=await duel(command);
      if(durable){pending.current=null;try{localStorage.removeItem(pendingKey(userId));}catch{}}
      accept(result);if(alive.current){setError('');if(command.type==='card'){setCard(null);setTarget(null);blockUntil.current=Date.now()+450;}}
    }catch(e){
      const code=(e as {code?:string}).code;
      if(durable&&code&&(code==='P0001'||code.startsWith('22')||code.startsWith('23'))){pending.current=null;try{localStorage.removeItem(pendingKey(userId));}catch{}}
      if(alive.current){setError(errorText(e));if(!code||!['P0001','22','23'].some(c=>code.startsWith(c)))setConnected(false);}
    }finally{gate.current=false;if(alive.current){setBusy(false);if(refreshNeeded.current){refreshNeeded.current=false;void refresh();}}}
  }
  async function refresh(){
    if(gate.current){refreshNeeded.current=true;return;}
    if(pending.current){void send(pending.current,true);return;}
    if(!roomId.current)return;
    if(reading.current){refreshNeeded.current=true;return;}
    reading.current=true;
    const requestedRoom=roomId.current;
    try{const next=await duel({type:'read',id:requestedRoom});if(roomId.current===requestedRoom){accept(next);if(alive.current)setError('');}}catch(e){if(alive.current&&roomId.current===requestedRoom){setConnected(false);setError(errorText(e));}}finally{reading.current=false;if(alive.current&&refreshNeeded.current){refreshNeeded.current=false;void refresh();}}
  }
  const live=useConnection(room?.id,()=>void refresh(),!!room?.arsenal);
  useEffect(()=>{
    alive.current=true;
    try{pending.current=JSON.parse(localStorage.getItem(pendingKey(userId))||'null');}catch{}
    void refresh();
    void duel<RoomList>({type:'list'}).then(r=>{if(alive.current){setRooms(r);if(!roomId.current&&!pending.current)setConnected(true);}}).catch(e=>{if(alive.current)setError(errorText(e));});
    if(supabase)void supabase.rpc('fleet_shop',{command:{type:'read'}}).then(()=>{if(alive.current)void refresh();});
    const retry=()=>void refresh();
    const offline=()=>setConnected(false);
    const timer=setInterval(()=>{if(!current.current)retry();},3000);window.addEventListener('online',retry);
    window.addEventListener('offline',offline);
    return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('online',retry);window.removeEventListener('offline',offline);};
  },[userId]);
  useEffect(()=>{const cancel=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!gate.current){setCard(null);setTarget(null);}};window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);},[]);
  useEffect(()=>{setCard(null);setTarget(null);},[room?.round,room?.myTurn]);
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
  const targeted=card==='sonar'||card==='bomb';
  const selection=targeted&&target?area(target,card==='sonar'?3:2):[];
  function apply(cell?:Cell){if(!card||gate.current||Date.now()<blockUntil.current)return;if(targeted&&(!cell||!area(cell,card==='sonar'?3:2).every(c=>c.x<10&&c.y<10))){setError('Область должна целиком находиться внутри поля. Карта не потрачена.');return;}action('card',{card,...cell});}
  function join(){try{const text=joinCode.trim();const code=text.includes('?')?new URL(text).searchParams.get('invite'):text;if(!code||!/^[0-9a-f-]{36}$/i.test(code))throw Error();void send({type:'join',invite:code},true);}catch{setError('Вставьте ссылку приглашения или полный код комнаты.');}}
  function lobby(){if(gate.current||pending.current)return;current.current=null;roomId.current=null;setRoom(null);setCard(null);setTarget(null);const url=new URL(location.href);url.searchParams.delete('room');url.searchParams.delete('invite');history.replaceState(null,'',url);void duel<RoomList>({type:'list'}).then(setRooms).catch(e=>setError(errorText(e)));}
  const viewGame:Game=room?{version:1,phase:room.status==='battle'?'battle':room.status==='finished'?'finished':'setup',turn:room.myTurn?'player':'bot',player:room.own,bot:room.enemy,bonus:room.bonus,ability:room.ability,log:[]}:{} as Game;
  const recent=(event:Room['ability'])=>event&&Date.now()-(event.createdAt||0)<6000?event:undefined;
  const state=room?.status==='setup'&&room.ready?'Ожидание расстановки соперника':room?.status==='battle'?room.myTurn?'Ваш ход':'Ход соперника':room?statusText[room.status]:'Игра с другом';
  return <section className="duel-page"><div className="duel-heading"><div><small>СЕТЕВАЯ ОПЕРАЦИЯ</small><h1>{state}</h1></div><button className="button secondary" onClick={onLeaders}>Таблица лидеров</button></div>
    <p>{!room||!room.arsenal?'Классический бой: 10 кораблей, без карт способностей. Попадание сохраняет ход.':'10 кораблей, попадание сохраняет ход. Доступные карты можно применить в свой ход.'}</p>
    <p className="duel-connection" role="status" data-live={live}>{busy?'Отправка хода…':!connected?'Соединение потеряно · повторное подключение…':room&&!live?'Связь установлена · резервные обновления':room?.status==='battle'&&!room.myTurn?'Ожидание соперника':'Связь установлена'}{error&&<span role="alert"> · {error}</span>}</p>
    {!room?<><div className="duel-controls"><button className="button primary" disabled={busy||!!pending.current} onClick={()=>void send({type:'create',id:crypto.randomUUID()},true)}>Создать комнату</button>{invite&&<button className="button primary" disabled={busy||!!pending.current} onClick={()=>void send({type:'join',invite},true)}>Присоединиться по приглашению</button>}</div>
      <form className="duel-join" onSubmit={e=>{e.preventDefault();join();}}><label>Код или ссылка приглашения<input value={joinCode} onChange={e=>setJoinCode(e.target.value)} required/></label><button className="button secondary" disabled={busy}>Войти в комнату</button></form>
      {rooms.length>0&&<><h2>Ваши комнаты</h2><div className="duel-controls">{rooms.map(r=><button key={r.id} className="button secondary" disabled={busy} onClick={()=>void send({type:'read',id:r.id})}>{statusText[r.status]} · {r.id.slice(0,8)} · раунд {r.round}</button>)}</div></>}
    </>:<>
      <div className="duel-heading"><p>Раунд {room.round} · Соперник: {room.opponent||'ещё не присоединился'}</p><button className="button secondary" disabled={busy||!!pending.current} onClick={lobby}>Мои комнаты</button></div>
      {room.invite&&<div className="invite-box"><label>Ссылка для друга<input readOnly value={`${location.origin}${location.pathname}?invite=${room.invite}`} onFocus={e=>e.target.select()}/></label><button className="button primary" onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}${location.pathname}?invite=${room.invite}`);setCopied(true);}catch{setError('Выделите и скопируйте ссылку из поля вручную.');}}}>{copied?'Ссылка скопирована':'Копировать ссылку'}</button><p>Друг должен войти в свой аккаунт и подтвердить присоединение.</p></div>}
      {setup&&<div className="duel-controls"><select aria-label="Корабль для расстановки" value={selected} onChange={e=>setSelected(Number(e.target.value))}>{selected<0&&<option value={-1}>Флот готов</option>}{FLEET.map((n,id)=>!fleet.some(s=>s.id===id)&&<option key={id} value={id}>{n} клетки · корабль {id+1}</option>)}</select><button className="button secondary" onClick={()=>setVertical(v=>!v)}>Повернуть {vertical?'↓':'→'}</button><button className="button secondary" onClick={()=>{setFleet(randomFleet());setSelected(-1);}}>Авторасстановка</button><button className="button secondary" onClick={()=>{setFleet([]);setSelected(0);}}>Сбросить</button><button className="button primary" disabled={fleet.length!==10||busy||!!pending.current} onClick={()=>action('place',{fleet})}>Готов к бою</button></div>}
      {room.status!=='waiting'&&<>
        {room.status!=='setup'&&room.arsenal&&<AbilityPanel game={viewGame} wallet={room.arsenal||newWallet()} ready={!!room.arsenal&&connected} busy={busy} card={card} onSelect={c=>{setCard(c);setTarget(null);setError('');}} onCancel={()=>{setCard(null);setTarget(null);}} onApply={()=>apply()} onShop={onShop} error=""/>}
        <div className="duel-battle-area"><div className="duel-fields"><article className="field-card"><h2>Ваш флот</h2><Board ability={recent(room.opponentAbility)} data={{ships:room.ready?room.own.ships:fleet,shots:room.own.shots}} active={!!setup&&!busy} onCell={deploy} onHover={setHover} preview={preview} valid={canPlace(fleet,preview)} rotateOnTouch label="Ваше поле" moving={!quiet}/></article><article className="field-card duel-enemy"><h2 title={room.opponent||'Противник'}>{room.opponent||'Противник'}</h2><Board markSunk revealed={room.revealed} ability={recent(room.ability)} targeting={targeted} allowUsed={targeted} preview={selection} valid={selection.every(c=>c.x<10&&c.y<10)} onHover={c=>{if(targeted)setTarget(c);}} data={room.enemy} enemy={room.status!=='finished'} active={room.status==='battle'&&!!room.myTurn&&!busy&&connected&&!pending.current} onCell={c=>{if(Date.now()<blockUntil.current)return;if(card){if(targeted)apply(c);}else action('shoot',c);}} label="Поле противника" moving={!quiet}/></article></div>
          <aside className="battle-side-controls"><EmotionBar key={`${room.id}:${room.round}`} room={room} userId={userId} live={live} overlayTarget=".duel-enemy .cell-grid"/></aside>
        </div>
        {room.opponentAbility&&<p className="opponent-card-result">Соперник · {abilityMessage(room.opponentAbility)}</p>}
      </>}
      {room.status==='finished'&&<div className="duel-result"><h2>{room.won?'Победа!':'Поражение'}</h2><p>Результат записан сервером и учтён в таблице лидеров.</p><button className="button primary" disabled={busy||room.rematchRequested} onClick={()=>action('rematch')}>{room.rematchRequested?'Ожидаем согласия друга':room.opponentRematch?'Принять реванш':'Реванш'}</button></div>}
      {!!room.enemy.shots.length&&<p className="duel-last">Последний выстрел: {LETTERS[room.enemy.shots.at(-1)!.x]}{room.enemy.shots.at(-1)!.y+1} · {{miss:'промах',hit:'попадание',sunk:'потоплен'}[room.enemy.shots.at(-1)!.result]}</p>}
      <RoomChat key={`${userId}:${room.id}`} roomId={room.id} userId={userId} opponent={room.opponent}/>
    </>}
  </section>;
}

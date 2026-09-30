import {useEffect,useId,useRef,useState} from 'react';
import {MessageCircle,Send,ChevronDown} from 'lucide-react';
import {chat,chatError,readPending,storePending,type ChatMessage,type ChatReply,type PendingMessage} from './chat';
import './chat.css';

/** One instance per account/room; messages never use the battle command queue. */
export default function RoomChat({roomId,userId,opponent}:{roomId:string;userId:string;opponent:string|null}){
  const key=`fleet:chat:pending:${userId}:${roomId}`,panelId=useId();
  const [open,setOpen]=useState(false),[messages,setMessages]=useState<ChatMessage[]>([]),[unread,setUnread]=useState(0);
  const [pending,setPending]=useState<PendingMessage|null>(()=>readPending(key));
  const [text,setText]=useState(()=>readPending(key)?.body||''),[sending,setSending]=useState(false),[error,setError]=useState('');
  const draft=useRef(text);
  const [online,setOnline]=useState(false),[loaded,setLoaded]=useState(false);
  const cursor=useRef<string|undefined>(undefined),seen=useRef(new Set<string>()),initialized=useRef(false);
  const alive=useRef(false),reading=useRef(false),gate=useRef(false),isOpen=useRef(open),pendingRef=useRef(pending),log=useRef<HTMLDivElement>(null);
  isOpen.current=open;
  function savePending(value:PendingMessage|null){pendingRef.current=value;setPending(value);storePending(key,value);}
  function accept(reply:ChatReply){
    if(!alive.current)return;
    const fresh=reply.messages.filter(m=>!seen.current.has(m.sequence));
    for(const m of fresh){seen.current.add(m.sequence);if(!cursor.current||BigInt(m.sequence)>BigInt(cursor.current))cursor.current=m.sequence;}
    if(initialized.current&&!isOpen.current)setUnread(n=>n+fresh.filter(m=>m.sender!==userId).length);
    initialized.current=true;setLoaded(true);setOnline(true);
    if(fresh.length)setMessages(old=>[...old,...fresh].sort((a,b)=>BigInt(a.sequence)<BigInt(b.sequence)?-1:1).slice(-100));
    const p=pendingRef.current;
    if(p&&(reply.ack===p.request||reply.messages.some(m=>m.sender===userId&&m.request===p.request))){savePending(null);draft.current='';setText('');setError('');}
  }
  async function refresh(){
    if(gate.current||reading.current||document.hidden)return;
    reading.current=true;
    try{const reply=await chat({type:'read',room:roomId,after:cursor.current});accept(reply);if(alive.current&&!pendingRef.current)setError('');}
    catch(e){if(alive.current){setOnline(false);setError(chatError(e,false));}}
    finally{reading.current=false;}
  }
  async function send(){
    if(gate.current||(!pendingRef.current&&!draft.current.trim()))return;
    gate.current=true;setSending(true);setError('');
    const p=pendingRef.current||{request:crypto.randomUUID(),body:draft.current.trim()};savePending(p);
    try{accept(await chat({type:'send',room:roomId,after:cursor.current,...p}));}
    catch(e){if(alive.current){setOnline(false);setError(chatError(e));}}
    finally{gate.current=false;if(alive.current)setSending(false);}
  }
  useEffect(()=>{
    alive.current=true;void refresh();
    const timer=setInterval(()=>void refresh(),2500),resume=()=>void refresh(),offline=()=>setOnline(false);
    window.addEventListener('online',resume);window.addEventListener('offline',offline);window.addEventListener('focus',resume);document.addEventListener('visibilitychange',resume);
    return()=>{alive.current=false;clearInterval(timer);window.removeEventListener('online',resume);window.removeEventListener('offline',offline);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
  },[roomId,userId]);
  useEffect(()=>{if(open&&log.current)log.current.scrollTop=log.current.scrollHeight;},[open,messages]);
  return <section className="room-chat" aria-label="Чат комнаты">
    <button className="room-chat-toggle" aria-expanded={open} aria-controls={panelId} onClick={()=>{setOpen(v=>!v);setUnread(0);}}>
      <MessageCircle size={19}/><strong>Чат с другом</strong><span className="room-chat-caption">{unread?`${unread} новых`:online?'Только участники комнаты':'Подключение…'}</span><ChevronDown size={17} className={open?'is-open':''}/>
    </button>
    <div id={panelId} hidden={!open} className="room-chat-panel">
      <div ref={log} className="room-chat-log" role="log" aria-label="Сообщения комнаты" aria-live="polite" aria-relevant="additions" tabIndex={0}>
        {!messages.length&&<p className="room-chat-empty">{loaded?opponent?'Поздоровайтесь с капитаном. История сохраняется в этой комнате.':'Напишите другу — он увидит сообщение после присоединения.':'Загружаем сообщения…'}</p>}
        {messages.map(m=><div className={`room-chat-message${m.sender===userId?' is-own':''}`} key={m.sequence}>
          <small>{m.sender===userId?'Вы':opponent||'Друг'} · раунд {m.round} · <time dateTime={m.sentAt}>{new Date(m.sentAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</time></small><p>{m.body}</p>
        </div>)}
      </div>
      {error&&<p className="room-chat-error" role="alert">{error}</p>}
      <form onSubmit={e=>{e.preventDefault();void send();}}>
        <div className="room-chat-input"><label htmlFor={`${panelId}-input`}>Сообщение другу</label><textarea id={`${panelId}-input`} value={text} onChange={e=>{draft.current=e.target.value;setText(e.target.value);}} maxLength={300} rows={2} readOnly={!!pending} placeholder="Попутного ветра, капитан!" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send();}}}/></div>
        <button className="button primary" type="submit" disabled={sending||!text.trim()}><Send size={15}/>{sending?'Отправка…':pending?'Повторить':'Отправить'}</button>
      </form>
      <small className="room-chat-hint">{text.length}/300 · Enter — отправить · Shift+Enter — новая строка · пауза 2 с</small>
    </div>
  </section>;
}

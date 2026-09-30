import {supabase} from '../account/client';
export type ChatMessage={sequence:string;request:string;sender:string;round:number;body:string;sentAt:string};
export type ChatReply={messages:ChatMessage[];ack:string|null};
export type PendingMessage={request:string;body:string};
export async function chat(command:{type:'read'|'send';room:string;after?:string;request?:string;body?:string}):Promise<ChatReply>{
  if(!supabase)throw new Error('Supabase not configured');
  const {data,error}=await supabase.rpc('fleet_chat',{command}).abortSignal(AbortSignal.timeout(10000));
  if(error)throw error;
  return data as ChatReply;
}
export function chatError(error:unknown,sending=true){
  const {code,message}=(error||{}) as {code?:string;message?:string};
  if(code==='PGRST202'||code==='42883')return 'Чат ещё не подключён на сервере. Бой доступен; администратору нужно применить миграцию 009.';
  if(message==='Room unavailable')return 'Чат доступен только участникам этой комнаты.';
  if(message==='Chat cooldown')return 'Пауза между сообщениями — 2 секунды. Попробуйте ещё раз.';
  if(message==='Invalid message')return 'Введите от 1 до 300 символов.';
  if(message==='Request already used')return 'Это сообщение уже отправлено. Обновите чат.';
  return sending?'Нет подтверждения сервера. Повторите отправку — дубль не появится.':'Не удалось обновить чат. Восстанавливаем соединение…';
}
export function readPending(key:string):PendingMessage|null{
  try{const p=JSON.parse(localStorage.getItem(key)||'null');return p&&typeof p.body==='string'&&p.body.trim().length>0&&p.body.length<=300&&typeof p.request==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(p.request)?p:null;}catch{return null;}
}
export function storePending(key:string,value:PendingMessage|null){try{if(value)localStorage.setItem(key,JSON.stringify(value));else localStorage.removeItem(key);}catch{/* The in-memory pending request still prevents duplicate sends. */}}

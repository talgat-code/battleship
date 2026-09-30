import { useEffect, useState } from 'react';
import { supabase } from '../account/client';
import { gameKey } from '../account/storage';
import { newWallet, transact, type Command, type Wallet } from './economy';
import type { Game } from '../game';
const key=(user?:string)=>`fleet:wallet:v1:${user||'guest'}`;
function read(user?:string):Wallet {
  const raw=localStorage.getItem(key(user));
  if(!raw)return newWallet();
  const value=JSON.parse(raw) as Wallet;
  if(value.version!==1||!Number.isInteger(value.balance)||value.balance<0)throw Error('Не удалось прочитать сохранение магазина.');
  return value;
}
function write(value:Wallet,user?:string) { localStorage.setItem(key(user),JSON.stringify(value));window.dispatchEvent(new Event('fleet-wallet')); }
export function savedGame(user?:string) {try{return read(user).game;}catch{return undefined;}}
export function saveGame(game:Game,user?:string) {
  // One authoritative local snapshot contains both consumed inventory and game state.
  write({...read(user),game},user);
  localStorage.setItem(gameKey(user),JSON.stringify(game)); // backwards-compatible game export
}
export function useWallet(user?:string) {
  const [wallet,setWallet]=useState<Wallet>(()=>{try{return read(user);}catch{return newWallet();}});
  const [error,setError]=useState('');
  const [ready,setReady]=useState(!user);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    const update=()=>{try{setWallet(read(user));}catch{setError('Не удалось прочитать сохранение магазина.');}};
    window.addEventListener('fleet-wallet',update);window.addEventListener('storage',update);
    let live=true;
    if(user){
      setReady(false);
      void (async()=>{try {
        if(!supabase)throw Error();
        const pending=localStorage.getItem(key(user)+':pending');
        const request=pending?JSON.parse(pending):{type:'read'};
        const {data,error}=await supabase.rpc('fleet_shop',{command:request});
        if(error){if(error.code==='P0001')localStorage.removeItem(key(user)+':pending');throw error;}
        if(live){write({...data,game:request.type==='consume'?data.game:read(user).game},user);localStorage.removeItem(key(user)+':pending');setReady(true);}
      }catch{if(live)setError('Магазин аккаунта недоступен. Проверьте подключение и миграцию магазина.');}})();
    }else {try{write(read(),undefined);}catch{setError('Сохранение недоступно в этом браузере');setReady(false);}}
    return()=>{live=false;window.removeEventListener('fleet-wallet',update);window.removeEventListener('storage',update);};
  },[user]);
  async function run(command:Command):Promise<Wallet|null> {
    if(!ready)return null;
    setBusy(true);setError('');
    try {
      return await navigator.locks.request(key(user),async()=>{
        const before=read(user);
        if(command.type==='action'&&before.game&&JSON.stringify(before.game)!==JSON.stringify(command.game))throw Error('Партия изменена в другой вкладке. Обновите страницу.');
        const next=transact(before,command);
        if(user){
          if(!supabase)throw Error();
          const request=command.type==='action'?{type:'consume',item:command.action.type==='card'?command.action.card:null,id:command.action.type==='card'?command.action.id:crypto.randomUUID(),game:next.game}:command;
          localStorage.setItem(key(user)+':pending',JSON.stringify(request));
          const {data,error}=await supabase.rpc('fleet_shop',{command:request});
          if(error){if(error.code==='P0001')localStorage.removeItem(key(user)+':pending');else setReady(false);throw Error('Сервер не подтвердил операцию. Проверьте баланс и подключение.');}
          const value={...data,game:command.type==='action'?data.game:read(user).game};write(value,user);localStorage.removeItem(key(user)+':pending');return value as Wallet;
        }
        write(next,user);return next;
      });
    }catch(e){setError(e instanceof Error?e.message:'Операция не выполнена.');return null;}
    finally{setBusy(false);}
  }
  return {wallet,error,ready,busy,run};
}

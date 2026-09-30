import {useEffect,useRef,useState} from 'react';
import {supabase} from '../account/client';
import type {RealtimeChannel} from '@supabase/supabase-js';

// Supabase reuses a channel with the same topic until async removal finishes.
// Waiting for that removal also prevents StrictMode from reviving a closing channel.
const removals=new Map<string,Promise<unknown>>();

// One read-only private channel per mounted room. Payloads never contain fleet rows.
export default function useConnection(id:string|undefined,refresh:()=>void,notifications=true){
  const callback=useRef(refresh);callback.current=refresh;
  const [live,setLive]=useState(false);
  useEffect(()=>{
    if(!id||!supabase)return;
    const client=supabase;
    let mounted=true,subscribed=false;
    let channel:RealtimeChannel|undefined;
    void (async()=>{
      if(!notifications)return;
      await removals.get(id);
      if(!mounted)return;
      await client.realtime.setAuth();
      if(!mounted)return;
      channel=client.channel(`duel:${id}`,{config:{private:true}})
        .on('broadcast',{event:'changed'},()=>{if(mounted)callback.current();})
        .on('broadcast',{event:'emotion'},({payload})=>{if(mounted)window.dispatchEvent(new CustomEvent('fleet:remote-emotion',{detail:{...payload,room:id}}));});
      channel.subscribe(status=>{
        if(!mounted)return;
        subscribed=status==='SUBSCRIBED';setLive(subscribed);
        if(subscribed)callback.current();
      });
    })().catch(()=>{if(mounted)setLive(false);});
    const reconnect=()=>{if(!document.hidden)callback.current();};
    const request=(e:Event)=>{if((e as CustomEvent).detail===id)callback.current();};
    // Reconcile missed events on reconnect and keep polling only as a fallback/watchdog.
    let elapsed=0;
    const timer=setInterval(()=>{elapsed++;if(!document.hidden&&(!subscribed||elapsed%10===0))callback.current();},1000);
    window.addEventListener('online',reconnect);window.addEventListener('focus',reconnect);
    document.addEventListener('visibilitychange',reconnect);
    window.addEventListener('fleet:refresh-room',request);
    return()=>{mounted=false;setLive(false);clearInterval(timer);
      if(channel){const done=client.removeChannel(channel).catch(()=>{}).finally(()=>{if(removals.get(id)===done)removals.delete(id);});removals.set(id,done);}
      window.removeEventListener('online',reconnect);window.removeEventListener('focus',reconnect);document.removeEventListener('visibilitychange',reconnect);window.removeEventListener('fleet:refresh-room',request);};
  },[id,notifications]);
  return live;
}

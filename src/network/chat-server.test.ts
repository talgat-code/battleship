import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import type {Room} from './api';
import type {ChatReply} from './chat';
const host=randomUUID(),guest=randomUUID(),outsider=randomUUID();
let db:PGlite;
async function as(user:string|null,sql:string,args:unknown[]=[]){
  await db.exec(`reset role; set role ${user?'authenticated':'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);
  return db.query(sql,args);
}
async function duel(user:string,command:object){return (await as(user,'select public.fleet_duel($1::jsonb) result',[JSON.stringify(command)])).rows[0] as {result:Room};}
async function chat(user:string|null,command:object){return ((await as(user,'select public.fleet_chat($1::jsonb) result',[JSON.stringify(command)])).rows[0] as {result:ChatReply}).result;}
async function room(){const {result:r}=await duel(host,{type:'create',id:randomUUID()});await duel(guest,{type:'join',invite:r.invite});return r.id;}
async function resetLimit(){await db.exec('reset role; update public.duel_chat_limits set last_sent=null');}
const send=(id:string,body:string,extra={})=>({type:'send',room:id,request:randomUUID(),body,...extra});
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated;`);
  for(const name of ['202609300001_accounts.sql','202609300004_duels.sql','202610010009_room_chat.sql'])await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
  for(const id of [host,guest,outsider])await db.query('insert into auth.users(id) values($1)',[id]);
},30000);
afterAll(async()=>{await db.close();});
describe('private chat on the existing classic duel schema (without migration 008)',()=>{
  it('restricts read/send to room members, blocks direct table access and forged sender IDs',async()=>{
    const id=await room();await resetLimit();
    const reply=await chat(host,send(id,'Привет, капитан!',{sender:outsider,round:999}));
    expect(reply.messages[0]).toMatchObject({sender:host,round:1,body:'Привет, капитан!'});
    expect((await chat(guest,{type:'read',room:id})).messages).toEqual(reply.messages);
    for(const command of [{type:'read',room:id},send(id,'spy')])await expect(chat(outsider,command)).rejects.toThrow('Room unavailable');
    await expect(chat(null,{type:'read',room:id})).rejects.toThrow('permission denied');
    await expect(as(host,'select * from public.duel_chat_messages')).rejects.toThrow('permission denied');
    await expect(as(host,"insert into public.duel_chat_limits(sender) values($1)",[host])).rejects.toThrow('permission denied');
    await db.exec('reset role');
    expect((await db.query("select relrowsecurity from pg_class where relname in ('duel_chat_messages','duel_chat_limits')")).rows).toEqual([{relrowsecurity:true},{relrowsecurity:true}]);
  });
  it('acknowledges lost-response retries once, throttles across rooms and leaves battle state unchanged',async()=>{
    const id=await room(),other=await room();await resetLimit();
    const before=(await duel(host,{type:'read',id})).result,command=send(id,'  Good game!  ');
    const first=await chat(host,command),retry=await chat(host,command);
    expect(first.ack).toBe(command.request);expect(retry).toEqual(first);expect(first.messages).toHaveLength(1);
    await expect(chat(host,{...command,body:'Changed'})).rejects.toThrow('Request already used');
    await expect(chat(host,send(id,'spam'))).rejects.toThrow('Chat cooldown');
    await expect(chat(host,send(other,'spam elsewhere'))).rejects.toThrow('Chat cooldown');
    await chat(guest,send(id,'Hello!'));expect((await duel(host,{type:'read',id})).result).toEqual(before);
    expect(first.messages[0].body).toBe('Good game!');
  });
  it('validates text, isolates rooms and preserves plain text/history across rounds',async()=>{
    const id=await room(),other=await room();await resetLimit();
    for(const body of ['', ' \n\t ', 'x'.repeat(301),null,{},12])await expect(chat(host,{...send(id,''),body})).rejects.toThrow('Invalid message');
    const raw='<img src=x onerror=alert(1)>\nПопутного ветра!';const first=await chat(host,send(id,raw));
    expect(first.messages[0].body).toBe(raw);expect((await chat(guest,{type:'read',room:other})).messages).toEqual([]);
    await db.exec('reset role');await db.query('update public.duel_rooms set round=2 where id=$1',[id]);
    await resetLimit();const next=await chat(host,{...send(id,'Раунд два'),after:first.messages[0].sequence});
    expect(next.messages).toHaveLength(1);expect(next.messages[0].round).toBe(2);
    expect((await chat(guest,{type:'read',room:id})).messages).toHaveLength(2);
    expect((await chat(guest,{type:'read',room:id,after:next.messages[0].sequence})).messages).toEqual([]);
  });
  it('bounds history responses and catches up by cursor without skipping messages',async()=>{
    const id=await room();await db.exec('reset role');
    for(let n=0;n<65;n++)await db.query('insert into public.duel_chat_messages(room,sender,request,round,body) values($1,$2,$3,1,$4)',[id,host,randomUUID(),String(n)]);
    const initial=await chat(guest,{type:'read',room:id});expect(initial.messages).toHaveLength(50);expect(initial.messages[0].body).toBe('15');
    const first=await chat(guest,{type:'read',room:id,after:'0'});expect(first.messages).toHaveLength(50);
    const rest=await chat(guest,{type:'read',room:id,after:first.messages.at(-1)!.sequence});expect(rest.messages).toHaveLength(15);expect(rest.messages.at(-1)!.body).toBe('64');
  });
});

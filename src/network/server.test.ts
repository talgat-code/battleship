import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { place,type Ship } from '../game';
import type { Room,Ranking } from './api';
import {sunkPerimeter} from '../sunkPerimeter';
const host=randomUUID(),guest=randomUUID(),outsider=randomUUID();
let db:PGlite;
let fleet:Ship[]=[];
[{x:0,y:0},{x:0,y:2},{x:0,y:4},{x:0,y:6},{x:3,y:6},{x:6,y:6},{x:0,y:8},{x:2,y:8},{x:4,y:8},{x:6,y:8}].forEach((c,id)=>{fleet=place(fleet,id,c,false);});
async function as(user:string|null,sql:string,args:unknown[]=[]){
  await db.exec(`reset role; set role ${user?'authenticated':'anon'}`);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user||'']);
  return db.query(sql,args);
}
async function rpc(user:string,command:Record<string,unknown>){
  const r=await as(user,'select public.fleet_duel($1::jsonb) result',[JSON.stringify(command)]);
  return (r.rows[0] as {result:Room}).result;
}
const cmd=(r:Room,type:string,extra:Record<string,unknown>={})=>({id:r.id,round:r.round,type,request:randomUUID(),...extra});
async function create(){return rpc(host,{type:'create',id:randomUUID()});}
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated;`);
  await db.exec(readFileSync('supabase/migrations/202609300001_accounts.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202609300002_shop.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202609300004_duels.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202609300006_free_emotions.sql','utf8'));
  for(const id of [host,guest,outsider])await db.query('insert into auth.users(id) values($1)',[id]);
},30000);
afterAll(async()=>{await db.close();});
describe('PostgreSQL authority for friend matches',()=>{
  it('keeps emotions free without overwriting historical purchases or card balances',async()=>{
    const shop=async(command:unknown)=>(await as(host,'select public.fleet_shop($1::jsonb) result',[JSON.stringify(command)])).rows[0];
    const before=await shop({type:'read'});
    for(const item of ['laugh','salute','oops','luck','storm','gg'])expect(await shop({type:'buy',item,id:randomUUID()})).toEqual(before);
    await expect(as(host,`select public.fleet_shop_before_free_emotions('{"type":"read"}')`)).rejects.toThrow();
    const bought=await shop({type:'buy',item:'sonar',id:randomUUID()});
    expect((bought as any).result.balance).toBe((before as any).result.balance-180);
  });
  it('sends only whitelisted reactions between participants with replay and spam protection',async()=>{
    const room=await create();await rpc(guest,{type:'join',invite:room.invite});
    const emote=async(user:string,command:unknown)=>(await as(user,'select public.fleet_emote($1::jsonb) result',[JSON.stringify(command)])).rows[0] as any;
    const message={room:room.id,round:room.round,type:'send',event:randomUUID(),emotion:'salute'};
    await emote(host,message);await emote(host,message);
    expect((await emote(guest,{...message,type:'read'})).result.emotion).toBe('salute');
    expect((await emote(host,{...message,type:'read'})).result).toBeNull();
    await expect(emote(host,{...message,event:randomUUID()})).rejects.toThrow('Emotion cooldown');
    await expect(emote(guest,{...message,emotion:'arbitrary text'})).rejects.toThrow('Invalid emotion');
    await expect(emote(outsider,{...message,type:'read'})).rejects.toThrow('Room unavailable');
    await expect(emote(outsider,message)).rejects.toThrow('Room unavailable');
    await expect(emote(guest,{...message,round:2})).rejects.toThrow('Round changed');
    await expect(as(guest,'select * from public.duel_emotions')).rejects.toThrow();
    await expect(as(null,`select public.fleet_emote('{}')`)).rejects.toThrow();
  });
  it('denies direct table access, helper RPCs, anonymous calls and outsider room reads',async()=>{
    const r=await create();
    for(const sql of ['select * from public.duel_rooms','select * from public.duel_results',`insert into public.duel_results(room,round,winner,loser) values('${r.id}',1,'${outsider}','${host}')`,`select public.duel_valid_fleet('[]')`])await expect(as(outsider,sql)).rejects.toThrow();
    await expect(as(null,`select public.fleet_duel('{}')`)).rejects.toThrow();
    await expect(rpc(outsider,{type:'read',id:r.id})).rejects.toThrow('Room unavailable');
    await expect(rpc(outsider,{type:'create',id:r.id})).rejects.toThrow('Room unavailable');
    await expect(rpc(host,{type:'win',id:r.id,winner:host})).rejects.toThrow('Unknown action');
    await expect(rpc(outsider,{type:'join',invite:r.id})).rejects.toThrow('Room unavailable');
    await rpc(guest,{type:'join',invite:r.invite});
    await expect(rpc(outsider,{type:'join',invite:r.invite})).rejects.toThrow('Room unavailable');
  });
  it('rejects malformed fleets and never discloses the opponent fleet before sinking',async()=>{
    const r=await create();await rpc(guest,{type:'join',invite:r.invite});
    for(const invalid of [[],fleet.slice(0,9),fleet.map(s=>({...s,cells:s.cells.map(()=>({x:0,y:0}))})),fleet.map(s=>s.id===0?{...s,cells:s.cells.map(c=>({...c,x:c.x+.5}))}:s)])await expect(rpc(host,cmd(r,'place',{fleet:invalid}))).rejects.toThrow('Invalid fleet');
    const ready=await rpc(host,cmd(r,'place',{fleet}));expect(ready.ready).toBe(true);expect(ready.status).toBe('setup');
    const other=await rpc(guest,{type:'read',id:r.id});expect(other.enemy.ships).toEqual([]);expect(other.opponentReady).toBe(true);
    await rpc(guest,cmd(r,'place',{fleet}));
    const hit=await rpc(host,cmd(r,'shoot',{x:0,y:0}));expect(hit.enemy.ships).toEqual([]);expect(hit.enemy.shots[0].result).toBe('hit');expect(hit.myTurn).toBe(true);
    expect(sunkPerimeter(hit.enemy.shots)).toEqual([]);
    for(const x of [1,2])await rpc(host,cmd(r,'shoot',{x,y:0}));
    const sunk=await rpc(host,cmd(r,'shoot',{x:3,y:0}));
    expect(sunk.enemy.ships).toHaveLength(1);expect(sunk.enemy.shots).toHaveLength(4);expect(sunk.myTurn).toBe(true);
    expect(sunkPerimeter(sunk.enemy.shots)).toHaveLength(6);
    await expect(rpc(host,cmd(r,'place',{fleet}))).rejects.toThrow();
  });
  it('checks turns, bounds, repeated shots and request replay; scores once and requires two rematch votes',async()=>{
    let r=await create();await rpc(guest,{type:'join',invite:r.invite});await rpc(host,cmd(r,'place',{fleet}));r=await rpc(guest,cmd(r,'place',{fleet}));
    await expect(rpc(guest,cmd(r,'shoot',{x:0,y:0}))).rejects.toThrow('Not your turn');
    for(const x of [-1,10,.5])await expect(rpc(host,cmd(r,'shoot',{x,y:0}))).rejects.toThrow();
    const miss=cmd(r,'shoot',{x:9,y:9});r=await rpc(host,miss);expect(r.myTurn).toBe(false);
    expect((await rpc(host,miss)).enemy.shots).toHaveLength(1);
    await rpc(guest,cmd(r,'shoot',{x:9,y:9}));
    await expect(rpc(host,cmd(r,'shoot',{x:9,y:9}))).rejects.toThrow('Already fired');
    let last=miss;
    for(const ship of fleet)for(const c of ship.cells){last=cmd(r,'shoot',c);r=await rpc(host,last);}
    expect(r.status).toBe('finished');expect(r.won).toBe(true);expect(r.enemy.ships).toHaveLength(10);
    expect((await rpc(host,last)).status).toBe('finished');
    const leaderboard=(await as(host,'select public.fleet_leaderboard() result')).rows[0] as {result:Ranking};
    expect(leaderboard.result.me?.wins).toBe(1);expect(leaderboard.result.me?.rating).toBe(1025);
    expect(leaderboard.result.rows.find(v=>v.id===guest)?.losses).toBe(1);
    const vote=cmd(r,'rematch');r=await rpc(host,vote);expect(r.status).toBe('finished');expect(r.rematchRequested).toBe(true);
    r=await rpc(guest,cmd(r,'rematch'));expect(r.round).toBe(2);expect(r.status).toBe('setup');expect(r.own.ships).toEqual([]);
    expect((await rpc(host,vote)).round).toBe(2);
    await expect(rpc(host,{...cmd(r,'shoot',{x:0,y:0}),round:1})).rejects.toThrow('Round changed');
    await rpc(host,cmd(r,'place',{fleet}));r=await rpc(guest,cmd(r,'place',{fleet}));expect(r.myTurn).toBe(true);
    const restored=await rpc(guest,{type:'read',id:r.id});expect(restored).toEqual(r);
  });
});

import {beforeAll,afterAll,it,expect} from 'vitest';
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {validLogin,normalizeLogin} from './login';
let db:PGlite;
beforeAll(async()=>{
  db=new PGlite();await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key,raw_user_meta_data jsonb,raw_app_meta_data jsonb);create function auth.uid() returns uuid language sql as $$select null::uuid$$;`);
  await db.exec(readFileSync('supabase/migrations/202609300001_accounts.sql','utf8'));
  await db.exec(readFileSync('supabase/migrations/202609300005_login_accounts.sql','utf8'));
},30000);
afterAll(async()=>{await db.close();});
it('repairs existing identities and binds metadata written after the Auth insert',async()=>{
  const old=randomUUID(),later=randomUUID();
  await db.query('insert into auth.users values($1,$2,null)',[old,{nickname:'restored'}]);
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1',[old,{fleet_login:'restored'}]);
  await db.exec(readFileSync('supabase/migrations/202609300007_login_identity_updates.sql','utf8'));
  expect((await db.query("select user_id from public.login_accounts where login='restored'")).rows).toEqual([{user_id:old}]);
  await db.query('insert into auth.users values($1,$2,null)',[later,{nickname:'late_metadata'}]);
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1',[later,{fleet_login:'late_metadata'}]);
  expect((await db.query("select user_id from public.login_accounts where login='late_metadata'")).rows).toEqual([{user_id:later}]);
  await db.query('update auth.users set raw_app_meta_data=$2 where id=$1',[later,{fleet_login:'late_metadata',provider:'email'}]);
  expect((await db.query('select user_id from public.login_accounts where user_id=$1',[later])).rows).toHaveLength(1);
});
it('normalizes logins and rejects emails, spaces, Unicode and invalid lengths',()=>{
  expect(normalizeLogin('  Captain_7 ')).toBe('captain_7');expect(validLogin('Captain_7')).toBe(true);
  for(const bad of ['ab','a'.repeat(25),'имя','a b','x@y.test','a-b'])expect(validLogin(bad)).toBe(false);
});
it('atomically reserves a unique login with Auth/profile and leaves legacy identities unchanged',async()=>{
  const existing=randomUUID(),first=randomUUID(),duplicate=randomUUID();
  await db.query('insert into auth.users values($1,$2,null)',[existing,{nickname:'captain',fleet_login:'captain'}]);
  expect((await db.query('select * from public.login_accounts where user_id=$1',[existing])).rows).toHaveLength(0);
  await db.query('insert into auth.users values($1,$2,$3)',[first,{nickname:'captain'},{fleet_login:'captain'}]);
  await expect(db.query('insert into auth.users values($1,$2,$3)',[duplicate,{nickname:'captain'},{fleet_login:'captain'}])).rejects.toThrow();
  expect((await db.query('select id from auth.users where id=$1',[duplicate])).rows).toHaveLength(0);
  expect((await db.query('select id from public.profiles where id=$1',[duplicate])).rows).toHaveLength(0);
  expect((await db.query('select id from public.profiles where id=$1',[existing])).rows).toHaveLength(1);
  expect((await db.query('select user_id from public.login_accounts where login=$1',['captain'])).rows).toEqual([{user_id:first}]);
});
it('blocks mapping reads/writes and limiter RPC for clients while enforcing server rate limits',async()=>{
  await db.exec('set role authenticated');
  await expect(db.query('select * from public.login_accounts')).rejects.toThrow();
  await expect(db.query('delete from public.login_accounts')).rejects.toThrow();
  await expect(db.query("select public.fleet_auth_limit('test',2,300)")).rejects.toThrow();
  await db.exec('reset role;set role service_role');
  for(const expected of [true,true,false])expect((await db.query("select public.fleet_auth_limit('test',2,300) ok")).rows).toEqual([{ok:expected}]);
  await db.exec('reset role');
});

begin;
alter table public.profiles add column language text not null default 'ru' check(language in ('ru','kk','en'));
grant update(language) on public.profiles to authenticated;
create table public.fleet_wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{"version":1,"balance":350,"items":{},"equipped":[],"hidden":false,"rewards":[],"receipts":[]}'::jsonb
);
alter table public.fleet_wallets enable row level security;
revoke all on public.fleet_wallets from public, anon, authenticated;
grant select on public.fleet_wallets to authenticated;
create policy own_wallet on public.fleet_wallets for select to authenticated using ((select auth.uid())=user_id);
-- All mutations lock one account row. Operation UUIDs make network retries idempotent.
create function public.fleet_shop(command jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  uid uuid := auth.uid(); w jsonb; kind text := command->>'type'; item text := command->>'item';
  price integer; qty integer; balance integer; receipt text := command->>'id'; match_id text;
  equipped jsonb; is_emotion boolean; result_game jsonb;
begin
  if uid is null then raise exception 'authentication required'; end if;
  insert into public.fleet_wallets(user_id) values(uid) on conflict do nothing;
  select state into w from public.fleet_wallets where user_id=uid for update;
  balance := (w->>'balance')::integer;
  if kind='read' then return w; end if;
  if kind in ('buy','consume') then
    if receipt is null or char_length(receipt)>80 then raise exception 'operation id required'; end if;
    if w->'receipts' ? receipt then return w; end if;
    price := case item when 'laugh' then 100 when 'salute' then 100 when 'oops' then 100 when 'luck' then 100 when 'storm' then 100 when 'gg' then 100 when 'sonar' then 180 when 'chance' then 240 when 'signal' then 450 when 'bomb' then 520 when 'kraken' then 800 end;
    if price is null then raise exception 'unknown item'; end if;
    is_emotion := price=100;
    qty := coalesce((w->'items'->>item)::integer,0);
    if kind='buy' then
      if (is_emotion and qty>0) or balance<price then raise exception 'already owned or insufficient tokens'; end if;
      w:=jsonb_set(w,'{balance}',to_jsonb(balance-price));qty:=qty+1;
    else
      -- Solo game is client-authoritative, never suitable for competitive multiplayer.
      result_game:=command->'game';
      if is_emotion or qty<1 or result_game->>'mode' is distinct from 'boosted' or result_game->'ability'->>'id' is distinct from receipt or result_game->'ability'->>'card' is distinct from item or result_game->>'phase' not in ('battle','finished') then raise exception 'invalid card use'; end if;
      qty:=qty-1;
      w:=jsonb_set(w,'{game}',result_game);
    end if;
    w:=jsonb_set(w,array['items',item],to_jsonb(qty));
    w:=jsonb_set(w,'{receipts}',(w->'receipts')||to_jsonb(receipt));
  elsif kind='reward' then
    result_game:=command->'game';match_id:=result_game->>'matchId';
    if match_id is null or result_game->>'phase' is distinct from 'finished' or result_game->>'winner' not in ('player','bot') then raise exception 'unfinished match'; end if;
    if w->'rewards' ? match_id then return w; end if;
    -- Match IDs are unique per account; solo outcomes are not anti-cheat verified.
    insert into public.matches(user_id,id,outcome,shots) values(uid,match_id::uuid,case when result_game->>'winner'='player' then 'win' else 'loss' end,jsonb_array_length(result_game->'bot'->'shots')) on conflict do nothing;
    w:=jsonb_set(w,'{balance}',to_jsonb(balance+case when result_game->>'winner'='player' then 80 else 35 end));
    w:=jsonb_set(w,'{rewards}',(w->'rewards')||to_jsonb(match_id));
  elsif kind='equip' then
    if item not in ('laugh','salute','oops','luck','storm','gg') or coalesce((w->'items'->>item)::integer,0)<1 then raise exception 'not owned'; end if;
    equipped:=w->'equipped';
    if equipped ? item then equipped:=equipped-item; else equipped:=equipped||to_jsonb(item); end if;
    if jsonb_array_length(equipped)>4 then raise exception 'four slots only'; end if;
    w:=jsonb_set(w,'{equipped}',equipped);
  elsif kind='hide' then
    if jsonb_typeof(command->'value') is distinct from 'boolean' then raise exception 'invalid setting'; end if;
    w:=jsonb_set(w,'{hidden}',command->'value');
  else raise exception 'unknown command'; end if;
  update public.fleet_wallets set state=w where user_id=uid;
  return w;
end;
$$;
revoke all on function public.fleet_shop(jsonb) from public,anon;
grant execute on function public.fleet_shop(jsonb) to authenticated;
commit;

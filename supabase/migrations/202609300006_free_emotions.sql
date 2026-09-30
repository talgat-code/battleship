begin;
-- Preserve balances, historical purchases and all existing card operations.
alter function public.fleet_shop(jsonb) rename to fleet_shop_before_free_emotions;
revoke all on function public.fleet_shop_before_free_emotions(jsonb) from public,anon,authenticated;
create function public.fleet_shop(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if command->>'type' in ('buy','consume') and command->>'item' in ('laugh','salute','oops','luck','storm','gg') then
    return public.fleet_shop_before_free_emotions('{"type":"read"}');
  end if;
  return public.fleet_shop_before_free_emotions(command);
end $$;
revoke all on function public.fleet_shop(jsonb) from public,anon;
grant execute on function public.fleet_shop(jsonb) to authenticated;

-- One latest reaction per participant; no public channels or arbitrary payloads.
create table public.duel_emotions (
  room uuid not null references public.duel_rooms(id) on delete cascade,
  sender uuid not null references auth.users(id) on delete cascade,
  round integer not null,
  event uuid not null,
  emotion text not null check (emotion in ('laugh','salute','oops','luck','storm','gg')),
  sent_at timestamptz not null default clock_timestamp(),
  primary key(room,sender)
);
alter table public.duel_emotions enable row level security;
revoke all on public.duel_emotions from public,anon,authenticated;
create function public.fleet_emote(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  u uuid := auth.uid(); r public.duel_rooms; previous public.duel_emotions; result jsonb;
begin
  if u is null then raise exception 'authentication required'; end if;
  select * into r from public.duel_rooms where id=(command->>'room')::uuid for update;
  if not found or (u<>r.host and u is distinct from r.guest) then raise exception 'Room unavailable'; end if;
  if (command->>'round')::integer is distinct from r.round then raise exception 'Round changed'; end if;
  if command->>'type'='read' then
    select jsonb_build_object('event',event,'emotion',emotion,'sent_at',sent_at) into result
      from public.duel_emotions where room=r.id and round=r.round and sender<>u;
    return result;
  end if;
  if command->>'type' is distinct from 'send' or command->>'emotion' is null or
    command->>'emotion' not in ('laugh','salute','oops','luck','storm','gg') or command->>'event' is null then
    raise exception 'Invalid emotion';
  end if;
  select * into previous from public.duel_emotions where room=r.id and sender=u;
  if previous.event=(command->>'event')::uuid then return '{"ok":true}'; end if;
  if previous.sent_at>clock_timestamp()-interval '3 seconds' then raise exception 'Emotion cooldown'; end if;
  insert into public.duel_emotions(room,sender,round,event,emotion) values(r.id,u,r.round,(command->>'event')::uuid,command->>'emotion')
    on conflict(room,sender) do update set round=excluded.round,event=excluded.event,emotion=excluded.emotion,sent_at=clock_timestamp();
  return '{"ok":true}';
end $$;
revoke all on function public.fleet_emote(jsonb) from public,anon;
grant execute on function public.fleet_emote(jsonb) to authenticated;
commit;

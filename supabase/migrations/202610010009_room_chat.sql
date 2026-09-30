begin;
-- Additive: requires 001 + 004. Does not require 008 or change battle RPCs.
create table public.duel_chat_messages (
  sequence bigint generated always as identity primary key,
  room uuid not null references public.duel_rooms(id) on delete cascade,
  sender uuid not null references auth.users(id),
  request uuid not null,
  round integer not null check (round > 0),
  body text not null check (char_length(btrim(body, E' \t\n\r')) between 1 and 300),
  sent_at timestamptz not null default clock_timestamp(),
  unique(room, sender, request)
);
create index duel_chat_history on public.duel_chat_messages(room, sequence desc);
create table public.duel_chat_limits (
  sender uuid primary key references auth.users(id) on delete cascade,
  last_sent timestamptz
);
alter table public.duel_chat_messages enable row level security;
alter table public.duel_chat_limits enable row level security;
revoke all on public.duel_chat_messages, public.duel_chat_limits from public, anon, authenticated;
revoke all on sequence public.duel_chat_messages_sequence_seq from public, anon, authenticated;
-- No direct table access, public channels or client-supplied identity.
create function public.fleet_chat(command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  u uuid := auth.uid(); r public.duel_rooms; op text := command->>'type';
  body text; request_id uuid; prior public.duel_chat_messages; last_sent timestamptz;
  after_id bigint; messages jsonb;
begin
  if u is null then raise exception 'Sign in required'; end if;
  if op is null or op not in ('read','send') then raise exception 'Unknown action'; end if;
  select * into r from public.duel_rooms where id=(command->>'room')::uuid;
  if not found or (u<>r.host and u is distinct from r.guest) then raise exception 'Room unavailable'; end if;
  if op='send' then
    -- A short room lock makes sequence order match commit order. Otherwise a
    -- poll could see a later committed message and skip an earlier in-flight one.
    -- Reads do not lock rooms; no battle fields/revision are changed here.
    perform 1 from public.duel_rooms where id=r.id for update;
    if jsonb_typeof(command->'body') is distinct from 'string' then raise exception 'Invalid message'; end if;
    body := btrim(replace(command->>'body', E'\r\n', E'\n'), E' \t\n\r');
    request_id := (command->>'request')::uuid;
    if request_id is null or char_length(body) not between 1 and 300 then raise exception 'Invalid message'; end if;
    -- Serialize this sender across rooms, including concurrent/retried sends.
    insert into public.duel_chat_limits(sender) values(u) on conflict do nothing;
    select l.last_sent into last_sent from public.duel_chat_limits l where sender=u for update;
    select * into prior from public.duel_chat_messages m where m.room=r.id and m.sender=u and m.request=request_id;
    if found then
      if prior.body<>body then raise exception 'Request already used'; end if;
    else
      if last_sent > clock_timestamp()-interval '2 seconds' then raise exception 'Chat cooldown'; end if;
      insert into public.duel_chat_messages(room,sender,request,round,body)
        select r.id,u,request_id,d.round,body from public.duel_rooms d where d.id=r.id;
      update public.duel_chat_limits set last_sent=clock_timestamp() where sender=u;
    end if;
  end if;
  after_id := (command->>'after')::bigint;
  if after_id is not null and after_id<0 then raise exception 'Invalid cursor'; end if;
  if after_id is null then
    select coalesce(jsonb_agg(jsonb_build_object('sequence',m.sequence::text,'request',m.request,
      'sender',m.sender,'round',m.round,'body',m.body,'sentAt',m.sent_at) order by m.sequence),'[]') into messages
      from (select * from public.duel_chat_messages where room=r.id order by sequence desc limit 50) m;
  else
    select coalesce(jsonb_agg(jsonb_build_object('sequence',m.sequence::text,'request',m.request,
      'sender',m.sender,'round',m.round,'body',m.body,'sentAt',m.sent_at) order by m.sequence),'[]') into messages
      from (select * from public.duel_chat_messages where room=r.id and sequence>after_id order by sequence limit 50) m;
  end if;
  return jsonb_build_object('messages',messages,'ack',case when op='send' then request_id else null end);
end;
$$;
revoke all on function public.fleet_chat(jsonb) from public, anon, authenticated;
grant execute on function public.fleet_chat(jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;

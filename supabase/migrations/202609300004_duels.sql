begin;
-- No client SELECT, INSERT or Realtime publication for secret room rows.
create table public.duel_rooms (
  id uuid primary key default gen_random_uuid(),
  invite uuid not null unique default gen_random_uuid(),
  host uuid not null references auth.users(id),
  guest uuid references auth.users(id),
  round integer not null default 1,
  status text not null default 'waiting' check(status in ('waiting','setup','battle','finished')),
  turn uuid,
  winner uuid,
  host_fleet jsonb not null default '[]',
  guest_fleet jsonb not null default '[]',
  host_shots jsonb not null default '[]',
  guest_shots jsonb not null default '[]',
  rematch uuid[] not null default '{}',
  receipts uuid[] not null default '{}',
  revision bigint not null default 0,
  created_at timestamptz not null default now(),
  check(guest is null or guest <> host)
);
create index duel_host on public.duel_rooms(host);
create index duel_guest on public.duel_rooms(guest);
create table public.duel_results (
  room uuid not null references public.duel_rooms(id),
  round integer not null,
  winner uuid not null references auth.users(id),
  loser uuid not null references auth.users(id),
  finished_at timestamptz not null default now(),
  primary key(room,round),
  check(winner <> loser)
);
alter table public.duel_rooms enable row level security;
alter table public.duel_results enable row level security;
revoke all on public.duel_rooms, public.duel_results from public, anon, authenticated;
-- Deliberately no table policies. Only the narrowly scoped definer RPCs below can read/write.

create function public.duel_valid_fleet(f jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare s jsonb; c jsonb; other jsonb; p jsonb; seen integer[] := '{}'; n integer; sid integer;
  x integer; y integer; x0 integer; y0 integer; vertical boolean; i integer;
  lengths integer[] := array[4,3,3,2,2,2,1,1,1,1];
begin
  if jsonb_typeof(f) <> 'array' or jsonb_array_length(f) <> 10 then return false; end if;
  for s in select value from jsonb_array_elements(f) loop
    sid := (s->>'id')::integer; n := (s->>'length')::integer;
    if sid is null or sid < 0 or sid > 9 or sid = any(seen) or n is distinct from lengths[sid+1]
      or jsonb_typeof(s->'cells') is distinct from 'array' or jsonb_array_length(s->'cells') <> n then return false; end if;
    seen := array_append(seen,sid);
    x0 := (s->'cells'->0->>'x')::integer; y0 := (s->'cells'->0->>'y')::integer;
    vertical := n > 1 and x0 = (s->'cells'->1->>'x')::integer;
    i := 0;
    for c in select value from jsonb_array_elements(s->'cells') loop
      x := (c->>'x')::integer; y := (c->>'y')::integer;
      if x is null or y is null or x < 0 or x > 9 or y < 0 or y > 9
        or c->'x' <> to_jsonb(x) or c->'y' <> to_jsonb(y)
        or x <> x0 + (case when vertical then 0 else i end)
        or y <> y0 + (case when vertical then i else 0 end) then return false; end if;
      for other in select value from jsonb_array_elements(f) where (value->>'id')::integer <> sid loop
        for p in select value from jsonb_array_elements(other->'cells') loop
          if abs(x-(p->>'x')::integer) <= 1 and abs(y-(p->>'y')::integer) <= 1 then return false; end if;
        end loop;
      end loop;
      i := i+1;
    end loop;
  end loop;
  return true;
exception when others then return false;
end;
$$;

create function public.duel_ship_sunk(ship jsonb, shots jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select not exists(select 1 from jsonb_array_elements(ship->'cells') c where not exists
    (select 1 from jsonb_array_elements(shots) s where s->'x'=c->'x' and s->'y'=c->'y' and s->>'result' <> 'miss'));
$$;

create function public.duel_snapshot(r public.duel_rooms, u uuid) returns jsonb
language plpgsql stable set search_path = '' as $$
declare own_fleet jsonb; enemy_fleet jsonb; outgoing jsonb; incoming jsonb; visible jsonb;
begin
  if u is null or (u <> r.host and u is distinct from r.guest) then raise exception 'Room unavailable'; end if;
  own_fleet := case when u=r.host then r.host_fleet else r.guest_fleet end;
  enemy_fleet := case when u=r.host then r.guest_fleet else r.host_fleet end;
  outgoing := case when u=r.host then r.host_shots else r.guest_shots end;
  incoming := case when u=r.host then r.guest_shots else r.host_shots end;
  select coalesce(jsonb_agg(s),'[]') into visible from jsonb_array_elements(enemy_fleet) s
    where r.status='finished' or public.duel_ship_sunk(s,outgoing);
  return jsonb_build_object('id',r.id,'invite',case when u=r.host and r.guest is null then r.invite else null end,
    'round',r.round,'revision',r.revision,'status',r.status,'myTurn',r.turn=u,'won',r.winner=u,
    'ready',jsonb_array_length(own_fleet)=10,'opponentReady',jsonb_array_length(enemy_fleet)=10,
    'opponent',(select nickname from public.profiles where id=case when u=r.host then r.guest else r.host end),
    'own',jsonb_build_object('ships',own_fleet,'shots',incoming),
    'enemy',jsonb_build_object('ships',visible,'shots',outgoing),'rematchRequested',u=any(r.rematch),
    'opponentRematch',cardinality(r.rematch)>0 and not u=any(r.rematch));
end;
$$;

create function public.fleet_duel(command jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); r public.duel_rooms; op text := command->>'type';
  request uuid; x integer; y integer; target jsonb; shots jsonb; ship jsonb; result text;
  fleet jsonb; victory boolean;
begin
  if u is null then raise exception 'Sign in required'; end if;
  if op is null or op not in ('list','create','join','read','place','shoot','rematch') then raise exception 'Unknown action'; end if;
  if op='list' then
    return coalesce((select jsonb_agg(jsonb_build_object('id',id,'status',status,'round',round) order by created_at desc)
      from (select * from public.duel_rooms where host=u or guest=u order by created_at desc limit 20) rooms),'[]');
  end if;
  if op='create' then
    -- The client supplies a persistent UUID only for idempotent creation, never a fleet or result.
    insert into public.duel_rooms(id,host) values ((command->>'id')::uuid,u) on conflict(id) do nothing;
  end if;
  if op='join' then
    select * into r from public.duel_rooms where invite=(command->>'invite')::uuid for update;
  else
    select * into r from public.duel_rooms where id=(command->>'id')::uuid for update;
  end if;
  if not found then raise exception 'Room unavailable'; end if;
  if op='join' and u<>r.host and r.guest is null and r.status='waiting' then
    r.guest:=u; r.status:='setup';
  end if;
  if u<>r.host and u is distinct from r.guest then raise exception 'Room unavailable'; end if;
  if op in ('place','shoot','rematch') then
    request := (command->>'request')::uuid;
    if request is null then raise exception 'Request ID required'; end if;
    if request=any(r.receipts) then return public.duel_snapshot(r,u); end if;
    if (command->>'round')::integer is distinct from r.round then raise exception 'Round changed'; end if;
  end if;
  if op='place' then
    if r.status <> 'setup' then raise exception 'Not in deployment'; end if;
    if jsonb_array_length(case when u=r.host then r.host_fleet else r.guest_fleet end)>0 then raise exception 'Fleet already locked'; end if;
    fleet:=command->'fleet';
    if public.duel_valid_fleet(fleet) is distinct from true then raise exception 'Invalid fleet'; end if;
    -- Strip any untrusted metadata before storage or later disclosure.
    select jsonb_agg(jsonb_build_object('id',(s->>'id')::integer,'length',(s->>'length')::integer,'cells',
      (select jsonb_agg(jsonb_build_object('x',(c->>'x')::integer,'y',(c->>'y')::integer)) from jsonb_array_elements(s->'cells') c)))
      into fleet from jsonb_array_elements(fleet) s;
    if u=r.host then r.host_fleet:=fleet; else r.guest_fleet:=fleet; end if;
    if jsonb_array_length(r.host_fleet)=10 and jsonb_array_length(r.guest_fleet)=10 then
      r.status:='battle'; r.turn:=case when r.round%2=1 then r.host else r.guest end;
    end if;
  elsif op='shoot' then
    if r.status<>'battle' or r.turn<>u then raise exception 'Not your turn'; end if;
    x:=(command->>'x')::integer; y:=(command->>'y')::integer;
    if x is null or y is null or x<0 or x>9 or y<0 or y>9
      or command->'x'<>to_jsonb(x) or command->'y'<>to_jsonb(y) then raise exception 'Invalid coordinates'; end if;
    target:=case when u=r.host then r.guest_fleet else r.host_fleet end;
    shots:=case when u=r.host then r.host_shots else r.guest_shots end;
    if exists(select 1 from jsonb_array_elements(shots) s where (s->>'x')::integer=x and (s->>'y')::integer=y) then raise exception 'Already fired'; end if;
    select s into ship from jsonb_array_elements(target) s where exists
      (select 1 from jsonb_array_elements(s->'cells') c where (c->>'x')::integer=x and (c->>'y')::integer=y);
    result:=case when ship is null then 'miss' else 'hit' end;
    shots:=shots||jsonb_build_array(jsonb_build_object('x',x,'y',y,'result',result));
    if ship is not null and public.duel_ship_sunk(ship,shots) then
      select jsonb_agg(case when exists(select 1 from jsonb_array_elements(ship->'cells') c where c->'x'=s->'x' and c->'y'=s->'y')
        then s||'{"result":"sunk"}'::jsonb else s end order by ord) into shots from jsonb_array_elements(shots) with ordinality as a(s,ord);
    end if;
    if u=r.host then r.host_shots:=shots; else r.guest_shots:=shots; end if;
    if ship is null then r.turn:=case when u=r.host then r.guest else r.host end; end if;
    select bool_and(public.duel_ship_sunk(s,shots)) into victory from jsonb_array_elements(target) s;
    if victory then
      r.status:='finished'; r.winner:=u;
      insert into public.duel_results(room,round,winner,loser) values(r.id,r.round,u,case when u=r.host then r.guest else r.host end)
        on conflict(room,round) do nothing;
    end if;
  elsif op='rematch' then
    if r.status<>'finished' then raise exception 'Match not finished'; end if;
    if not u=any(r.rematch) then r.rematch:=array_append(r.rematch,u); end if;
    if cardinality(r.rematch)=2 then
      r.round:=r.round+1; r.status:='setup'; r.turn:=null; r.winner:=null;
      r.host_fleet:='[]'; r.guest_fleet:='[]'; r.host_shots:='[]'; r.guest_shots:='[]'; r.rematch:='{}';
    end if;
  elsif op not in ('create','join','read') then raise exception 'Unknown action';
  end if;
  if request is not null then r.receipts:=array_append(r.receipts,request); end if;
  if op<>'read' then
    r.revision:=r.revision+1;
    update public.duel_rooms set guest=r.guest,round=r.round,status=r.status,turn=r.turn,winner=r.winner,
      host_fleet=r.host_fleet,guest_fleet=r.guest_fleet,host_shots=r.host_shots,guest_shots=r.guest_shots,
      rematch=r.rematch,receipts=r.receipts,revision=r.revision where id=r.id;
  end if;
  return public.duel_snapshot(r,u);
end;
$$;

create function public.fleet_leaderboard() returns jsonb
language sql stable security definer set search_path = '' as $$
  with totals as (
    select player, sum(wins)::integer wins,sum(losses)::integer losses,count(*)::integer games
    from (select winner player,1 wins,0 losses from public.duel_results union all
      select loser player,0 wins,1 losses from public.duel_results) r group by player
  ), ranked as (
    select p.id,p.nickname,coalesce(t.wins,0) wins,coalesce(t.losses,0) losses,coalesce(t.games,0) games,
      1000+25*coalesce(t.wins,0)-15*coalesce(t.losses,0) rating,
      rank() over(order by 1000+25*t.wins-15*t.losses desc,t.wins desc) position
    from totals t join public.profiles p on p.id=t.player
  ) select jsonb_build_object('rows',coalesce((select jsonb_agg(to_jsonb(r) order by position,id) from
    (select * from ranked order by position,id limit 100) r),'[]'),
    'me',(select to_jsonb(r) from ranked r where id=auth.uid()));
$$;
revoke all on function public.duel_valid_fleet(jsonb), public.duel_ship_sunk(jsonb,jsonb), public.duel_snapshot(public.duel_rooms,uuid), public.fleet_duel(jsonb), public.fleet_leaderboard() from public,anon,authenticated;
grant execute on function public.fleet_duel(jsonb) to authenticated;
grant execute on function public.fleet_leaderboard() to authenticated;
commit;

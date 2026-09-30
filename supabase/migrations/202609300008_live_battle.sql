begin;
-- Additive upgrade: existing rooms, inventories and scores are preserved.
alter table public.duel_rooms add column powers jsonb not null default '{}';
alter function public.duel_snapshot(public.duel_rooms,uuid) rename to duel_snapshot_classic;
create function public.duel_snapshot(r public.duel_rooms,u uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare result jsonb; p jsonb; enemy jsonb; visible jsonb;
begin
  result:=public.duel_snapshot_classic(r,u); -- membership check precedes any disclosure
  p:=coalesce(r.powers->u::text,'{}');
  enemy:=case when u=r.host then r.guest_fleet else r.host_fleet end;
  select coalesce(jsonb_agg(s),'[]') into visible from jsonb_array_elements(enemy) s
    where r.status='finished' or public.duel_ship_sunk(s,result->'enemy'->'shots')
      or coalesce(p->'revealed','[]') @> jsonb_build_array(s->'id');
  result:=jsonb_set(result,'{enemy,ships}',visible);
  return result||jsonb_build_object('bonus',coalesce((p->>'bonus')::boolean,false),'revealed',coalesce(p->'revealed','[]'),
    'ability',p->'ability','opponentAbility',r.powers->(case when u=r.host then r.guest else r.host end)::text->'ability',
    'arsenal',(select state-'game' from public.fleet_wallets where user_id=u));
end $$;
alter function public.fleet_duel(jsonb) rename to fleet_duel_classic;
revoke all on function public.fleet_duel_classic(jsonb),public.duel_snapshot_classic(public.duel_rooms,uuid) from public,anon,authenticated;

create function public.fleet_duel(command jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); r public.duel_rooms; op text:=command->>'type'; result jsonb;
  request uuid; card text:=command->>'card'; w jsonb; qty integer; p jsonb; bonus boolean;
  target jsonb; shots jsonb; ship jsonb; cells jsonb:='[]'; c jsonb; event jsonb;
  x integer; y integer; n integer; hits integer:=0; misses integer:=0; count_segments integer;
begin
  if u is null then raise exception 'Sign in required'; end if;
  if op not in ('card','shoot','rematch') then return public.fleet_duel_classic(command); end if;
  select * into r from public.duel_rooms where id=(command->>'id')::uuid for update;
  if not found or (u<>r.host and u is distinct from r.guest) then raise exception 'Room unavailable'; end if;
  request:=(command->>'request')::uuid;
  if request is null then raise exception 'Request ID required'; end if;
  if request=any(r.receipts) then return public.duel_snapshot(r,u); end if;
  if (command->>'round')::integer is distinct from r.round then raise exception 'Round changed'; end if;
  p:=coalesce(r.powers->u::text,'{}'); bonus:=coalesce((p->>'bonus')::boolean,false);
  if op='rematch' then
    result:=public.fleet_duel_classic(command);
    if (result->>'round')::integer<>r.round then update public.duel_rooms set powers='{}' where id=r.id; end if;
  elsif op='shoot' then
    result:=public.fleet_duel_classic(command);
    if bonus then
      update public.duel_rooms set powers=jsonb_set(powers,array[u::text],p||'{"bonus":false}'),
        turn=case when status='battle' then u else turn end where id=r.id;
    end if;
  else
    if r.status<>'battle' or r.turn<>u then raise exception 'Not your turn'; end if;
    if card is null or card not in ('sonar','chance','signal','bomb','kraken') then raise exception 'Unknown card'; end if;
    select state into w from public.fleet_wallets where user_id=u for update;
    qty:=coalesce((w->'items'->>card)::integer,0);
    if qty<1 then raise exception 'Card not owned'; end if;
    -- A receipt cannot be reused across matches or solo inventory operations.
    if w->'receipts' ? request::text then raise exception 'Request already used'; end if;
    target:=case when u=r.host then r.guest_fleet else r.host_fleet end;
    shots:=case when u=r.host then r.host_shots else r.guest_shots end;
    if card in ('sonar','bomb') then
      n:=case when card='sonar' then 3 else 2 end;
      x:=(command->>'x')::integer; y:=(command->>'y')::integer;
      if x is null or y is null or x<0 or y<0 or x+n>10 or y+n>10
        or command->'x'<>to_jsonb(x) or command->'y'<>to_jsonb(y) then raise exception 'Invalid area'; end if;
      select jsonb_agg(jsonb_build_object('x',a,'y',b) order by b,a) into cells
        from generate_series(x,x+n-1) a cross join generate_series(y,y+n-1) b;
    end if;
    if card='chance' then
      if bonus then raise exception 'Bonus already active'; end if;
      p:=p||'{"bonus":true}';
    elsif card='sonar' then
      select count(*) into count_segments from jsonb_array_elements(target) s cross join lateral jsonb_array_elements(s->'cells') t
        where exists(select 1 from jsonb_array_elements(cells) a where a=t)
        and not exists(select 1 from jsonb_array_elements(shots) a where a->'x'=t->'x' and a->'y'=t->'y');
    elsif card in ('signal','kraken') then
      select s into ship from jsonb_array_elements(target) s where not public.duel_ship_sunk(s,shots)
        and (card='kraken' or not coalesce(p->'revealed','[]') @> jsonb_build_array(s->'id')) order by random() limit 1;
      if ship is null then raise exception 'No target'; end if;
      cells:=ship->'cells';
      if card='signal' then p:=p||jsonb_build_object('revealed',coalesce(p->'revealed','[]')||jsonb_build_array(ship->'id')); end if;
    end if;
    if card in ('bomb','kraken') then
      for c in select value from jsonb_array_elements(cells) loop
        if exists(select 1 from jsonb_array_elements(shots) s where s->'x'=c->'x' and s->'y'=c->'y') then continue; end if;
        select s into ship from jsonb_array_elements(target) s where s->'cells' @> jsonb_build_array(c);
        if ship is null then misses:=misses+1; else hits:=hits+1; end if;
        shots:=shots||jsonb_build_array(c||jsonb_build_object('result',case when ship is null then 'miss' else 'hit' end));
      end loop;
      if hits+misses=0 then raise exception 'No target'; end if;
      select jsonb_agg(case when exists(select 1 from jsonb_array_elements(target) s where public.duel_ship_sunk(s,shots)
        and exists(select 1 from jsonb_array_elements(s->'cells') cell where cell->'x'=a->'x' and cell->'y'=a->'y'))
        then a||'{"result":"sunk"}'::jsonb else a end order by ord) into shots from jsonb_array_elements(shots) with ordinality t(a,ord);
      if u=r.host then r.host_shots:=shots; else r.guest_shots:=shots; end if;
      if hits=0 then r.turn:=case when u=r.host then r.guest else r.host end; end if;
      if not exists(select 1 from jsonb_array_elements(target) s where not public.duel_ship_sunk(s,shots)) then
        r.status:='finished'; r.winner:=u;
        insert into public.duel_results(room,round,winner,loser) values(r.id,r.round,u,case when u=r.host then r.guest else r.host end) on conflict do nothing;
      end if;
    end if;
    event:=jsonb_build_object('id',request,'card',card,'cells',cells,'count',count_segments,'hits',hits,'misses',misses,'createdAt',floor(extract(epoch from clock_timestamp())*1000));
    p:=p||jsonb_build_object('ability',event);
    w:=jsonb_set(w,array['items',card],to_jsonb(qty-1));
    w:=jsonb_set(w,'{receipts}',coalesce(w->'receipts','[]')||to_jsonb(request::text));
    update public.fleet_wallets set state=w where user_id=u;
    update public.duel_rooms set powers=jsonb_set(r.powers,array[u::text],p),host_shots=r.host_shots,guest_shots=r.guest_shots,
      turn=r.turn,status=r.status,winner=r.winner,revision=r.revision+1,receipts=array_append(r.receipts,request) where id=r.id;
  end if;
  select * into r from public.duel_rooms where id=r.id;
  return public.duel_snapshot(r,u);
end $$;
revoke all on function public.fleet_duel(jsonb),public.duel_snapshot(public.duel_rooms,uuid) from public,anon,authenticated;
grant execute on function public.fleet_duel(jsonb) to authenticated;

-- Private, read-only notifications. NEVER broadcast room rows containing hidden fleets.
create function public.duel_channel_member(topic text) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.duel_rooms where 'duel:'||id::text=topic and (host=auth.uid() or guest=auth.uid()));
$$;
revoke all on function public.duel_channel_member(text) from public,anon;
grant execute on function public.duel_channel_member(text) to authenticated;
create policy duel_notifications on realtime.messages for select to authenticated
  using (extension='broadcast' and public.duel_channel_member(realtime.topic()));
create function public.duel_notify() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='duel_rooms' then
    perform realtime.send(jsonb_build_object('revision',new.revision),'changed','duel:'||new.id::text,true);
  else
    perform realtime.send(jsonb_build_object('event',new.event,'emotion',new.emotion,'sender',new.sender,'round',new.round,'sent_at',new.sent_at),'emotion','duel:'||new.room::text,true);
  end if;
  return null;
end $$;
revoke all on function public.duel_notify() from public,anon,authenticated;
create trigger duel_state_notification after insert or update on public.duel_rooms for each row execute function public.duel_notify();
create trigger duel_emotion_notification after insert or update on public.duel_emotions for each row execute function public.duel_notify();
commit;

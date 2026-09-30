begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default 'Командир' check (char_length(btrim(nickname)) between 2 and 40),
  created_at timestamptz not null default now()
);
create table public.matches (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null,
  outcome text not null check (outcome in ('win', 'loss')),
  shots integer not null check (shots between 0 and 100),
  finished_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index matches_history on public.matches(user_id, finished_at desc);
alter table public.profiles enable row level security;
alter table public.matches enable row level security;
revoke all on public.profiles, public.matches from anon, authenticated;
grant select on public.profiles to authenticated;
grant update(nickname) on public.profiles to authenticated;
grant select, insert on public.matches to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy own_profile_update on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy own_matches_read on public.matches for select to authenticated using ((select auth.uid()) = user_id);
create policy own_matches_insert on public.matches for insert to authenticated with check ((select auth.uid()) = user_id);
create function public.create_fleet_profile() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, nickname) values (new.id,
    case when char_length(btrim(coalesce(new.raw_user_meta_data->>'nickname',''))) between 2 and 40
      then btrim(new.raw_user_meta_data->>'nickname') else 'Командир' end);
  return new;
end;
$$;
revoke all on function public.create_fleet_profile() from public, anon, authenticated;
create trigger fleet_profile_created after insert on auth.users for each row execute function public.create_fleet_profile();
insert into public.profiles(id) select id from auth.users on conflict do nothing;
commit;

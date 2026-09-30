begin;
-- A login is immutable identity metadata, not the editable nickname in profiles.
create table public.login_accounts (
  login text primary key check(login ~ '^[a-z0-9_]{3,24}$'),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.login_accounts enable row level security;
revoke all on public.login_accounts from public,anon,authenticated;
grant select on public.login_accounts to service_role;

-- Auth user, login reservation, and existing profile trigger commit in ONE transaction.
-- Clients cannot set raw_app_meta_data via public signUp/updateUser.
create function public.create_login_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare requested text := new.raw_app_meta_data->>'fleet_login';
begin
  if requested is not null then
    insert into public.login_accounts(login,user_id) values(requested,new.id);
  end if;
  return new;
end;
$$;
revoke all on function public.create_login_identity() from public,anon,authenticated;
create trigger fleet_login_created after insert on auth.users for each row execute function public.create_login_identity();
-- Existing accounts are intentionally untouched. Nicknames do not become logins.

create table public.login_rate_limits (
  bucket text primary key,
  since timestamptz not null default now(),
  attempts integer not null default 1
);
alter table public.login_rate_limits enable row level security;
revoke all on public.login_rate_limits from public,anon,authenticated;
create function public.fleet_auth_limit(bucket_key text, max_attempts integer, seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare n integer;
begin
  if length(bucket_key)>160 or max_attempts<1 or seconds<1 or seconds>3600 then raise exception 'Invalid limit'; end if;
  delete from public.login_rate_limits where since < now()-interval '2 hours';
  insert into public.login_rate_limits(bucket) values(bucket_key)
  on conflict(bucket) do update set
    attempts=case when login_rate_limits.since<now()-make_interval(secs=>seconds) then 1 else login_rate_limits.attempts+1 end,
    since=case when login_rate_limits.since<now()-make_interval(secs=>seconds) then now() else login_rate_limits.since end
  returning attempts into n;
  return n<=max_attempts;
end;
$$;
revoke all on function public.fleet_auth_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.fleet_auth_limit(text,integer,integer) to service_role;
commit;

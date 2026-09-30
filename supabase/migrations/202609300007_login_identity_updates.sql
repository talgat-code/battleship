begin;
-- Auth may write administrator app_metadata AFTER inserting auth.users.
-- Only trusted app_metadata binds a login; editable nicknames never do.
create or replace function public.create_login_identity() returns trigger
language plpgsql security definer set search_path='' as $$
declare requested text := new.raw_app_meta_data->>'fleet_login';
begin
  if requested is not null then
    insert into public.login_accounts(login,user_id) values(requested,new.id)
      on conflict(user_id) do nothing;
  end if;
  return new;
end;
$$;
drop trigger fleet_login_created on auth.users;
create trigger fleet_login_created after insert or update of raw_app_meta_data
  on auth.users for each row execute function public.create_login_identity();
-- Recover accounts created by login-auth before this fix. Unrelated email
-- accounts are untouched. A conflicting login aborts the transaction safely.
insert into public.login_accounts(login,user_id)
select raw_app_meta_data->>'fleet_login',id from auth.users
where raw_app_meta_data->>'fleet_login' is not null
on conflict(user_id) do nothing;
commit;

-- Read-only preflight for SQL Editor. Does not create, drop or modify anything.
select current_database(), current_user;
select name, to_regclass('public.' || name) as existing_table
from (values ('profiles'),('matches'),('fleet_wallets'),('duel_rooms'),('duel_results'),('login_accounts'),('login_rate_limits')) expected(name);
select table_name,column_name,data_type from information_schema.columns
where table_schema='public' and table_name in ('profiles','matches','fleet_wallets','duel_rooms','duel_results','login_accounts','login_rate_limits')
order by table_name,ordinal_position;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('profiles','matches','fleet_wallets','duel_rooms','duel_results','login_accounts','login_rate_limits');
select tablename,policyname,roles,cmd,qual,with_check from pg_policies
where schemaname='public' and tablename in ('profiles','matches','fleet_wallets','duel_rooms','duel_results','login_accounts','login_rate_limits');
select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('create_fleet_profile','fleet_shop','fleet_duel','fleet_leaderboard','create_login_identity','fleet_auth_limit');
select tgname from pg_trigger where tgrelid='auth.users'::regclass and not tgisinternal;
select to_regclass('supabase_migrations.schema_migrations') as cli_migration_history;
select to_regprocedure('public.fleet_emote(jsonb)') as emotions_rpc,
  to_regprocedure('public.duel_channel_member(text)') as private_channel_check,
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='duel_rooms' and column_name='powers') as network_cards_schema;
select policyname,roles,cmd,qual from pg_policies where schemaname='realtime' and tablename='messages';
select to_regprocedure('public.fleet_chat(jsonb)') as chat_rpc;
select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('duel_chat_messages','duel_chat_limits');
-- If the last result is non-null, inspect that existing history separately:
-- select version from supabase_migrations.schema_migrations order by version;

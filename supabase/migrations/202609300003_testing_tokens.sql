begin;
-- One-time testing balance; retain purchased items, game and history.
update public.fleet_wallets
set state=jsonb_set(jsonb_set(state,'{balance}','5555'::jsonb),'{testingGrant}','1'::jsonb)
where state->>'testingGrant' is distinct from '1';
-- Includes existing accounts that have not created a wallet yet.
alter table public.fleet_wallets alter column state set default
'{"version":1,"testingGrant":1,"balance":5555,"items":{},"equipped":[],"hidden":false,"rewards":[],"receipts":[]}'::jsonb;
commit;

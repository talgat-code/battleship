-- Run ONLY if 202609300008_live_battle.sql was committed and needs reverting.
-- Keeps all accounts, wallets, shots, scores and the added powers column intact.
begin;
drop trigger duel_state_notification on public.duel_rooms;
drop trigger duel_emotion_notification on public.duel_emotions;
drop function public.duel_notify();
drop policy duel_notifications on realtime.messages;
drop function public.duel_channel_member(text);
drop function public.fleet_duel(jsonb);
alter function public.fleet_duel_classic(jsonb) rename to fleet_duel;
drop function public.duel_snapshot(public.duel_rooms,uuid);
alter function public.duel_snapshot_classic(public.duel_rooms,uuid) rename to duel_snapshot;
grant execute on function public.fleet_duel(jsonb) to authenticated;
commit;

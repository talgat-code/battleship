import { supabase } from '../account/client';
import type { Board } from '../game';
import type { AbilityEvent } from '../abilities';
import type { Wallet } from '../shop/economy';
export type Room = {
  id:string; invite:string|null; round:number; revision:number;
  status:'waiting'|'setup'|'battle'|'finished'; myTurn:boolean|null; won:boolean|null;
  ready:boolean; opponentReady:boolean; opponent:string|null; own:Board; enemy:Board;
  rematchRequested:boolean; opponentRematch:boolean;
  bonus?:boolean; revealed?:number[]; ability?:AbilityEvent; opponentAbility?:AbilityEvent; arsenal?:Wallet;
};
export type RankRow = {id:string;nickname:string;wins:number;losses:number;games:number;rating:number;position:number};
export type Ranking = {rows:RankRow[];me:RankRow|null};
export type RoomList = {id:string;round:number;status:Room['status']}[];
export type Command = {type:string;[key:string]:unknown};
export async function duel<T=Room>(command:Command):Promise<T> {
  if(!supabase)throw new Error('Supabase не настроен. Следуйте инструкции в README.');
  const {data,error}=await supabase.rpc('fleet_duel',{command}).abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
  return data as T;
}
export async function ranking():Promise<Ranking> {
  if(!supabase)throw new Error('Supabase не настроен.');
  const {data,error}=await supabase.rpc('fleet_leaderboard').abortSignal(AbortSignal.timeout(12000));
  if(error)throw error;
  return data as Ranking;
}
export const pendingKey=(user:string)=>`fleet:duel:pending:${user}`;
export function errorText(error:unknown) {
  const message=(error as {message?:string}).message||'';
  const known:Record<string,string>={
    'Room unavailable':'Комната недоступна. Проверьте приглашение: нужны вход и свободное место.',
    'Not your turn':'Сейчас ход соперника. Состояние обновляется.',
    'Already fired':'В эту клетку уже стреляли.', 'Invalid fleet':'Недопустимая расстановка кораблей.',
    'Round changed':'Уже начался новый раунд. Обновляем поле.',
    'Fleet already locked':'Ваша расстановка уже подтверждена.', 'Not in deployment':'Расстановка уже завершена.',
    'Match not finished':'Дождитесь окончания партии.',
    'Card not owned':'Эта карта закончилась. Откройте магазин.',
    'Invalid area':'Область выходит за край поля. Карта не потрачена.',
    'No target':'Нет доступной цели для карты. Она не потрачена.',
    'Bonus already active':'Второй шанс уже активен.',
    'Request already used':'Операция уже обработана. Обновляем инвентарь.',
  };
  return known[message]||'Нет подтверждения сервера. Восстанавливаем связь; повтор запроса безопасен.';
}

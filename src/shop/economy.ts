import { catalog, type ItemId } from './catalog';
import { resolveAction, type Action } from '../abilities';
import type { Game } from '../game';
export type Wallet = {version:1;testingGrant?:1;balance:number;items:Record<string,number>;equipped:string[];hidden:boolean;rewards:string[];receipts:string[];game?:Game};
export const newWallet=():Wallet=>({version:1,testingGrant:1,balance:5555,items:{},equipped:[],hidden:false,rewards:[],receipts:[]});
export const applyTestingGrant=(wallet:Wallet):Wallet=>wallet.testingGrant===1?wallet:{...wallet,balance:5555,testingGrant:1};
export type Command = {type:'buy';item:ItemId;id:string} | {type:'reward';game:Game} | {type:'action';game:Game;action:Action} | {type:'equip';item:string} | {type:'hide';value:boolean};
export function transact(wallet:Wallet,command:Command):Wallet {
  if(command.type==='buy') {
    if(wallet.receipts.includes(command.id))return wallet;
    const item=catalog.find(i=>i.id===command.item);
    if(!item)throw Error('Неизвестный предмет.');
    if(item.kind==='emotion')return wallet; // All emotions are default entitlements; retain legacy inventory.
    if(wallet.balance<item.price)throw Error('Недостаточно жетонов. Завершите ещё одну партию.');
    return {...wallet,balance:wallet.balance-item.price,items:{...wallet.items,[item.id]:(wallet.items[item.id]||0)+1},receipts:[...wallet.receipts,command.id]};
  }
  if(command.type==='reward') {
    const g=command.game;
    if(g.phase!=='finished'||!g.matchId||!g.winner||wallet.rewards.includes(g.matchId))return wallet;
    return {...wallet,balance:wallet.balance+(g.winner==='player'?80:35),rewards:[...wallet.rewards,g.matchId]};
  }
  if(command.type==='equip') {
    if(!catalog.some(i=>i.id===command.item&&i.kind==='emotion')||!wallet.items[command.item])return wallet;
    const equipped=wallet.equipped.includes(command.item)?wallet.equipped.filter(i=>i!==command.item):[...wallet.equipped,command.item];
    if(equipped.length>4)throw Error('Можно выбрать не более четырёх эмоций.');
    return {...wallet,equipped};
  }
  if(command.type==='hide')return {...wallet,hidden:command.value};
  const {action,game}=command;
  if(action.type==='card'&&wallet.receipts.includes(action.id))return wallet;
  if(action.type==='card'&&!wallet.items[action.card])throw Error('Нет доступной карточки.');
  const next=resolveAction(game,action);
  if(next===game)throw Error('Действие недоступно. Проверьте цель и очередь хода.');
  return {...wallet,game:next,receipts:action.type==='card'?[...wallet.receipts,action.id]:wallet.receipts,items:action.type==='card'?{...wallet.items,[action.card]:wallet.items[action.card]-1}:wallet.items};
}

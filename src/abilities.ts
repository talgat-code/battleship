import { canPlace, cellsFor, fire, inside, isSunk, same, type Cell, type Game, type Ship } from './game';
export const CARDS = ['sonar','chance','signal','bomb','kraken'] as const;
export type Card = typeof CARDS[number];
export type AbilityEvent = { id: string; card: Card; cells: Cell[]; count?: number };
export type Action = { type: 'shoot'; cell: Cell } | { type: 'card'; card: Card; cell?: Cell; id: string };
export function rotatePlaced(ships: Ship[], id: number): Ship[] {
  const ship = ships.find(s => s.id === id);
  if (!ship || ship.length === 1) return ships;
  const vertical = ship.cells[0].y === ship.cells[1].y;
  const others = ships.filter(s => s.id !== id);
  // Keep the bow first, then try nearby origins. Never move another ship.
  const origins = Array.from({length:100},(_,i)=>({x:i%10,y:Math.floor(i/10)}))
    .filter(c=>Math.abs(c.x-ship.cells[0].x)+Math.abs(c.y-ship.cells[0].y)<=ship.length-1)
    .sort((a,b)=>(Math.abs(a.x-ship.cells[0].x)+Math.abs(a.y-ship.cells[0].y))-(Math.abs(b.x-ship.cells[0].x)+Math.abs(b.y-ship.cells[0].y)));
  for (const origin of origins) {
    const cells=cellsFor(origin,ship.length,vertical);
    if(canPlace(others,cells))return ships.map(s=>s.id===id?{...s,cells}:s);
  }
  return ships;
}
export function area(origin: Cell, size: number): Cell[] {
  return Array.from({length:size*size},(_,i)=>({x:origin.x+i%size,y:origin.y+Math.floor(i/size)}));
}
// Local solo authority. UI submits intent only; a future multiplayer server implements this boundary.
export function resolveAction(game: Game, action: Action, random = Math.random): Game {
  if(action.type==='shoot') {
    const next=fire(game,'player',action.cell);
    if(next===game)return game;
    return game.bonus ? {...next,bonus:false,turn:next.phase==='finished'?next.turn:'player'} : next;
  }
  if(game.phase!=='battle'||game.turn!=='player'||game.mode!=='boosted')return game;
  const {card}=action;
  if(card==='chance' && game.bonus)return game;
  const remaining=game.bot.ships.filter(s=>!isSunk(s,game.bot.shots));
  if(!remaining.length)return game;
  let cells:Cell[]=[];
  if(card==='sonar'||card==='bomb') {
    if(!action.cell)return game;
    cells=area(action.cell,card==='sonar'?3:2);
    if(!cells.every(inside))return game;
  }
  const event:AbilityEvent={id:action.id,card,cells};
  if(card==='chance')return {...game,bonus:true,ability:event};
  if(card==='sonar') {
    event.count=cells.filter(c=>game.bot.ships.some(s=>s.cells.some(p=>same(c,p)))&&!game.bot.shots.some(s=>same(s,c))).length;
    return {...game,ability:event};
  }
  if(card==='signal') {
    const hidden=remaining.filter(s=>!game.revealed?.includes(s.id));
    if(!hidden.length)return game;
    const ship=hidden[Math.min(hidden.length-1,Math.floor(random()*hidden.length))];
    return {...game,revealed:[...(game.revealed||[]),ship.id],ability:{...event,cells:ship.cells}};
  }
  if(card==='kraken')cells=remaining[Math.min(remaining.length-1,Math.floor(random()*remaining.length))].cells;
  const targets=cells.filter(c=>!game.bot.shots.some(s=>same(s,c)));
  if(!targets.length || game.bonus)return game; // Resolve a pending extra shot before an area attack.
  let next=game;
  for(const cell of targets) {
    if(next.phase==='finished')break;
    next=fire({...next,turn:'player'},'player',cell);
  }
  const hit=targets.some(c=>next.bot.shots.some(s=>same(c,s)&&s.result!=='miss'));
  return {...next,turn:hit?'player':'bot',ability:{...event,cells}};
}

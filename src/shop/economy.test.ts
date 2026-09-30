import { describe, expect, it } from 'vitest';
import { newWallet, transact } from './economy';
import { resolveAction, rotatePlaced, type Card } from '../abilities';
import { cellsFor, freshGame, isSunk, same, type Game } from '../game';
function battle():Game { return {...freshGame(),matchId:'match-1',mode:'boosted',phase:'battle',bot:{ships:[{id:0,length:4,cells:cellsFor({x:0,y:0},4,false)},{id:6,length:1,cells:[{x:8,y:8}]}],shots:[]}}; }
const action=(card:Card,cell={x:0,y:0})=>({type:'card' as const,card,cell,id:'use-1'});
describe('wallet and inventory',()=>{
  it('grants 350 once, charges exact prices, deduplicates a retried purchase and rejects insufficient funds',()=>{
    const first=transact(newWallet(),{type:'buy',item:'sonar',id:'p1'});
    expect(first.balance).toBe(170);expect(first.items.sonar).toBe(1);
    expect(transact(first,{type:'buy',item:'sonar',id:'p1'})).toBe(first);
    expect(()=>transact(first,{type:'buy',item:'sonar',id:'p2'})).toThrow();
    const emotion=transact(first,{type:'buy',item:'laugh',id:'p3'});
    expect(()=>transact(emotion,{type:'buy',item:'laugh',id:'p4'})).toThrow();
  });
  it('does not reward abandoned games and rewards each finished result once across serialization',()=>{
    const wallet=newWallet();expect(transact(wallet,{type:'reward',game:battle()})).toBe(wallet);
    const game={...battle(),phase:'finished' as const,winner:'player' as const};
    const win=transact(wallet,{type:'reward',game});expect(win.balance).toBe(430);
    expect(transact(JSON.parse(JSON.stringify(win)),{type:'reward',game}).balance).toBe(430);
    expect(transact(win,{type:'reward',game:{...game,matchId:'match-2',winner:'bot'}}).balance).toBe(465);
  });
  it('consumes only successful cards and persists their outcome in the same snapshot',()=>{
    const wallet={...newWallet(),items:{sonar:1}};
    expect(()=>transact(wallet,{type:'action',game:battle(),action:action('sonar',{x:9,y:9})})).toThrow();
    expect(wallet.items.sonar).toBe(1);
    const next=transact(wallet,{type:'action',game:battle(),action:action('sonar')});
    expect(next.items.sonar).toBe(0);expect(next.game?.ability?.count).toBe(3);
    expect(transact(next,{type:'action',game:next.game!,action:action('sonar')})).toBe(next);
    expect(()=>transact(next,{type:'action',game:next.game!,action:{...action('sonar'),id:'use-2'}})).toThrow();
  });
});
describe('card authority',()=>{
  it('sonar counts only intact segments and never adds shots or precise reveals',()=>{
    const g=resolveAction(battle(),{type:'shoot',cell:{x:0,y:0}});
    const next=resolveAction(g,action('sonar'));expect(next.ability?.count).toBe(2);expect(next.bot.shots).toEqual(g.bot.shots);expect(next.revealed).toBeUndefined();
  });
  it('second chance survives one miss only and is also spent by a hit',()=>{
    const armed=resolveAction(battle(),action('chance'));
    const miss=resolveAction(armed,{type:'shoot',cell:{x:5,y:5}});expect(miss.turn).toBe('player');expect(miss.bonus).toBe(false);
    expect(resolveAction(miss,{type:'shoot',cell:{x:5,y:6}}).turn).toBe('bot');
    expect(resolveAction(armed,{type:'shoot',cell:{x:0,y:0}}).bonus).toBe(false);
    expect(resolveAction(armed,action('chance'))).toBe(armed);
  });
  it('signal reveals a live ship without damage and avoids already known ships',()=>{
    const g=resolveAction(battle(),action('signal'),()=>0);expect(g.revealed).toEqual([0]);expect(g.bot.shots).toHaveLength(0);
    const next=resolveAction(g,action('signal'),()=>0);expect(next.revealed).toEqual([0,6]);expect(resolveAction(next,action('signal'))).toBe(next);
  });
  it('bomb processes all unshot cells despite misses and preserves hit/sunk semantics',()=>{
    const g=resolveAction(battle(),{type:'shoot',cell:{x:0,y:0}});
    const next=resolveAction(g,action('bomb'));expect(next.bot.shots).toHaveLength(4);expect(next.turn).toBe('player');
    expect(next.bot.shots.filter(s=>same(s,{x:0,y:0}))).toHaveLength(1);
    expect(resolveAction(next,action('bomb'))).toBe(next);
    expect(resolveAction(battle(),action('bomb',{x:5,y:5})).turn).toBe('bot');
  });
  it('kraken sinks every segment and can finish a match',()=>{
    const g=battle();g.bot.ships=g.bot.ships.slice(0,1);
    const next=resolveAction(g,action('kraken'));expect(next.bot.shots).toHaveLength(4);expect(isSunk(next.bot.ships[0],next.bot.shots)).toBe(true);expect(next.winner).toBe('player');expect(next.phase).toBe('finished');
  });
  it('rejects abilities in classic, setup, finished and enemy turns',()=>{
    for(const g of [{...battle(),mode:'classic' as const},{...battle(),phase:'setup' as const},{...battle(),phase:'finished' as const},{...battle(),turn:'bot' as const}])for(const card of ['sonar','chance','signal','bomb','kraken'] as Card[])expect(resolveAction(g,action(card))).toBe(g);
  });
});
describe('placed ship rotation',()=>{
  it('finds space near an edge and preserves the rest of the fleet',()=>{
    const ships=[{id:0,length:4,cells:cellsFor({x:6,y:9},4,false)},{id:6,length:1,cells:[{x:0,y:0}]}];
    const next=rotatePlaced(ships,0);expect(next).not.toBe(ships);expect(next[0].cells).toEqual(cellsFor({x:6,y:6},4,true));expect(next[1]).toBe(ships[1]);
  });
  it('leaves a blocked fleet unchanged',()=>{
    const ships=[{id:0,length:4,cells:cellsFor({x:0,y:0},4,false)},...Array.from({length:5},(_,i)=>({id:i+1,length:1,cells:[{x:i,y:2}]}))];
    expect(rotatePlaced(ships,0)).toBe(ships);
  });
});

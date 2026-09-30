import { describe, expect, it } from 'vitest';
import { chooseShot, type Difficulty } from './bot';
import { freshGame, randomFleet, fire, same, type Shot, type Game } from './game';
describe('public-information difficulty levels',()=>{
  it('rookie is random while tactician and admiral pursue hits',()=>{
    const shots:Shot[]=[{x:4,y:4,result:'hit'},{x:5,y:4,result:'hit'}];
    expect(chooseShot(shots,'rookie',()=>0)).toEqual({x:0,y:0});
    for(const level of ['tactician','admiral'] as const){const c=chooseShot(shots,level,()=>0);expect(c.y).toBe(4);expect([3,6]).toContain(c.x);}
  });
  it('admiral avoids known sunk ship borders and scores remaining placements',()=>{
    const shots:Shot[]=[{x:4,y:4,result:'sunk'},{x:5,y:4,result:'sunk'}];
    const c=chooseShot(shots,'admiral',()=>.5);
    expect(shots.some(s=>Math.abs(s.x-c.x)<=1&&Math.abs(s.y-c.y)<=1)).toBe(false);
  });
  for(const level of ['rookie','tactician','admiral'] as Difficulty[]) it(`${level}: finishes three complete matches without repeated shots`,()=>{
    for(let run=0;run<3;run++){
      let g:Game={...freshGame(),player:{ships:randomFleet(),shots:[] as Shot[]},phase:'battle'};
      for(let turn=0;turn<200 && g.phase!=='finished';turn++){
        const side=g.turn,target=side==='bot'?g.player:g.bot;
        const c=chooseShot(target.shots,side==='bot'?level:'tactician');
        expect(target.shots.some(s=>same(s,c))).toBe(false);
        g=fire(g,side,c) as typeof g;
      }
      expect(g.phase).toBe('finished');expect(g.winner).toBeTruthy();
    }
  },30000);
});

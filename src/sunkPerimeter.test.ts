import {describe,it,expect} from 'vitest';
import {sunkPerimeter} from './sunkPerimeter';
import {cellsFor,freshGame,fire,same,type Shot} from './game';
import {resolveAction} from './abilities';

describe('confirmed sunk perimeter',()=>{
  it('uses no hidden fleet and never marks around an unfinished hit',()=>{
    expect(sunkPerimeter([{x:4,y:4,result:'hit'}])).toEqual([]);
  });
  for(const length of [1,2,3,4])for(const corner of [{x:0,y:0},{x:10-length,y:9}])for(const vertical of [false,true]){
    it(`clips ${length}-cell ship at ${corner.x},${corner.y}, vertical=${vertical}`,()=>{
      const origin=vertical?{x:corner.y,y:corner.x}:corner;
      const shots:Shot[]=cellsFor(origin,length,vertical).map(c=>({...c,result:'sunk'}));
      const before=JSON.stringify(shots),perimeter=sunkPerimeter(shots);
      expect(perimeter.length).toBe(length+2);
      expect(perimeter.every(c=>c.x>=0&&c.x<10&&c.y>=0&&c.y<10)).toBe(true);
      expect(perimeter.some(c=>shots.some(s=>same(c,s)))).toBe(false);
      expect(JSON.stringify(shots)).toBe(before);
    });
  }
  it('keeps existing miss and hit markers; deduplicates overlapping halos',()=>{
    const shots:Shot[]=[{x:3,y:3,result:'sunk'},{x:5,y:3,result:'sunk'},{x:4,y:4,result:'miss'},{x:8,y:8,result:'hit'}];
    const marks=sunkPerimeter(shots);
    expect(new Set(marks.map(c=>`${c.x}:${c.y}`)).size).toBe(marks.length);
    expect(marks.some(c=>same(c,{x:4,y:4})||same(c,{x:8,y:8}))).toBe(false);
  });
  it('marks only after the final segment and ignored clicks preserve turn and bonus',()=>{
    const ship={id:3,length:2,cells:cellsFor({x:0,y:0},2,false)};
    let game={...freshGame(),phase:'battle' as const,bot:{ships:[ship,{id:6,length:1,cells:[{x:8,y:8}]}],shots:[] as Shot[]}};
    game=fire(game,'player',{x:0,y:0}) as typeof game;
    expect(sunkPerimeter(game.bot.shots)).toEqual([]);
    const sunk=fire(game,'player',{x:1,y:0});
    expect(sunk.turn).toBe('player');expect(sunk.bot.shots).toHaveLength(2);
    const armed={...sunk,bonus:true};expect(resolveAction(armed,{type:'shoot',cell:{x:1,y:1}})).toBe(armed);
    expect(sunkPerimeter(JSON.parse(JSON.stringify(sunk.bot.shots)))) .toHaveLength(4);
  });
});

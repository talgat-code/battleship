import {test,expect} from '@playwright/test';
import {freshGame,place,STORAGE_KEY,type Ship} from '../src/game';
test('confirmed sink adds hints without shots, survives reload and ignores clicks',async({page})=>{
  let ships:Ship[]=[];
  [{x:0,y:0},{x:0,y:2},{x:0,y:4},{x:0,y:6},{x:3,y:6},{x:6,y:6},{x:0,y:8},{x:2,y:8},{x:4,y:8},{x:6,y:8}].forEach((c,id)=>{ships=place(ships,id,c,false);});
  const game={...freshGame(),phase:'battle',matchId:'perimeter',player:{ships,shots:[]},bot:{ships,shots:[{x:4,y:1,result:'miss'}]}};
  await page.addInitScript(({game,key})=>{localStorage.setItem('fleet:entry','guest');if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(game));},{game,key:STORAGE_KEY});
  await page.goto('/');
  const cells=page.locator('.enemy-card .cell');
  await cells.nth(0).click();await expect(page.locator('.perimeter-cross')).toHaveCount(0);
  await cells.nth(1).click();await cells.nth(2).click();await cells.nth(3).click();
  await expect(page.locator('.perimeter-cross')).toHaveCount(5);
  await expect(cells.nth(14)).toHaveClass(/miss/);await expect(cells.nth(4)).toBeDisabled();
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),STORAGE_KEY);
  expect(before.turn).toBe('player');expect(before.bot.shots).toHaveLength(5);
  await cells.nth(4).evaluate((button:HTMLButtonElement)=>button.click());
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),STORAGE_KEY)).toEqual(before);
  await page.locator('.enemy-card').screenshot({path:'artifacts/sunk-perimeter.png'});
  await page.reload();await expect(page.locator('.perimeter-cross')).toHaveCount(5);
  await expect(page.locator('.enemy-card .cell').nth(4)).toBeDisabled();
});
test('all six static signal files decode as short audio',async({page})=>{
  await page.goto('/');
  const durations=await page.evaluate(async()=>{
    const context=new AudioContext();const result=[];
    try{for(const id of ['laugh','salute','oops','luck','storm','gg']){
      const response=await fetch(`/audio/emotions/signals/${id}.wav`);
      result.push((await context.decodeAudioData(await response.arrayBuffer())).duration);
    }}finally{await context.close();}return result;
  });
  expect(durations).toHaveLength(6);expect(durations.every(n=>n>.1&&n<.5)).toBe(true);
});

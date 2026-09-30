import {test,expect} from '@playwright/test';
import {freshGame,randomFleet,STORAGE_KEY} from '../src/game';
import {emotions} from '../src/emotions/catalog';

for(const width of [1440,390])test(`overlay reactions and static audio controls at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});
  const game={...freshGame(),matchId:'emotions-test',phase:'battle',player:{ships:randomFleet(),shots:[]},bot:{ships:randomFleet(),shots:[]}};
  await page.addInitScript(({game,key})=>{
    localStorage.setItem('fleet:entry','guest');
    if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(game));
    const calls:string[]=[];(window as any).audioCalls=calls;
    HTMLMediaElement.prototype.play=function(){calls.push(this.src);return Promise.resolve();};
    Object.defineProperty(window,'speechSynthesis',{value:{cancel:()=>calls.push('cancel'),getVoices:()=>[],speak:()=>{throw Error('Speech synthesis is forbidden');}}});
  },{game,key:STORAGE_KEY});
  await page.goto('/');
  const toggle=page.getByRole('button',{name:'Эмоции',exact:true});
  await toggle.click();await expect(page.locator('.fleet-emotions-picker button')).toHaveCount(6);
  const bounds=await page.locator('.fleet-emotions-picker img').evaluateAll(images=>images.map(i=>({loaded:(i as HTMLImageElement).naturalWidth,w:i.getBoundingClientRect().width,h:i.getBoundingClientRect().height})));
  expect(bounds.every(b=>b.loaded>0&&b.w===56&&b.h===56)).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.enemy-card').screenshot({path:`artifacts/emotions-${width}.png`});
  await page.screenshot({path:`artifacts/emotions-battle-${width}.png`,fullPage:true});
  await toggle.click();await expect(page.locator('.fleet-emotions-picker')).toHaveCount(0);
  await toggle.click();await page.locator('h1').click();await expect(page.locator('.fleet-emotions-picker')).toHaveCount(0);
  await page.clock.install();
  for(const emotion of emotions){
    await toggle.click();await page.locator('.fleet-emotions-picker').getByRole('button',{name:emotion.name,exact:true}).click();
    await expect(page.locator('.fleet-emotions-reaction')).toContainText(emotion.phrases.ru);
    await expect(page.locator('.cell-grid > .fleet-emotions-reaction')).toHaveCount(1);
    expect(await page.locator('.fleet-emotions-reaction').evaluate(e=>getComputedStyle(e).pointerEvents)).toBe('none');
    if(emotion.id==='laugh')await page.locator('.enemy-card').screenshot({path:`artifacts/emotion-overlay-${width}.png`});
    await toggle.click();await expect(page.locator('.fleet-emotions-picker button').first()).toBeDisabled();await toggle.click();
    await page.clock.fastForward(3100);await expect(page.locator('.fleet-emotions-reaction')).toHaveCount(0);
  }
  expect(await page.evaluate(()=>(window as any).audioCalls.filter((x:string)=>x.includes('/emotions/')).length)).toBe(6);
  await toggle.click();await page.locator('.fleet-emotions-toolbar input').uncheck();
  const before=await page.evaluate(()=>(window as any).audioCalls.filter((x:string)=>x.includes('/emotions/')).length);
  await page.locator('.fleet-emotions-picker button').first().click();
  expect(await page.evaluate(()=>(window as any).audioCalls.filter((x:string)=>x.includes('/emotions/')).length)).toBe(before);
  const wallet=await page.evaluate(()=>JSON.parse(localStorage.getItem('fleet:wallet:v1:guest')!));
  expect(wallet.balance).toBe(5555);expect(wallet.items).toEqual({});
  await page.reload();await toggle.click();await expect(page.locator('.fleet-emotions-toolbar input')).not.toBeChecked();
  // Opening reactions must not intercept or move the target before a field click.
  await page.locator('.enemy-card .cell').first().click();
  await expect(page.locator('.fleet-emotions-picker')).toHaveCount(0);
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).bot.shots.some((s:{x:number;y:number})=>s.x===0&&s.y===0),STORAGE_KEY)).toBe(true);
});

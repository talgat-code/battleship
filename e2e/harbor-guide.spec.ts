import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';

test('archipelago title, responsive handbook, actual decoded audio and navigation',async({page})=>{
  test.setTimeout(120000);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    (window as any).clipStarts=0;
    const original=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){(window as any).clipStarts++;return original.apply(this,args);};
  });
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('/?view=home&diagnostics=1');
  await expect(page.getByRole('img',{name:'NARXOZ INCUBATOR - ШАГ ВПЕРЕД'})).toBeVisible();
  const canvas=page.locator('.harbor-backdrop canvas');
  await expect.poll(()=>canvas.getAttribute('data-frames')).not.toBeNull();
  await page.waitForTimeout(1800);
  await page.screenshot({path:'artifacts/archipelago-desktop.png',fullPage:true});
  const before=await canvas.evaluate(e=>({...e.dataset}));await page.waitForTimeout(3000);const after=await canvas.evaluate(e=>({...e.dataset}));
  expect(after.beacon).not.toBe(before.beacon);
  const samples=await page.evaluate(async()=>{
    const ctx=new AudioContext();const rows=[];
    for(const language of ['ru','kk','en'])for(const id of ['laugh','salute','oops','luck','storm','gg']){
      const src=`/audio/emotions/${language}/${id}.mp3`,r=await fetch(src);if(!r.ok)throw Error(src);
      const decoded=await ctx.decodeAudioData(await r.arrayBuffer());
      rows.push({src,duration:decoded.duration,peak:decoded.getChannelData(0).reduce((m,v)=>Math.max(m,Math.abs(v)),0)});
    }
    for(const id of ['hit','miss','sunk']){const r=await fetch(`/audio/battle/${id}.mp3`);const d=await ctx.decodeAudioData(await r.arrayBuffer());rows.push({src:id,duration:d.duration,peak:d.getChannelData(0).reduce((m,v)=>Math.max(m,Math.abs(v)),0)});}
    await ctx.close();return rows;
  });
  expect(samples).toHaveLength(21);expect(samples.every(s=>s.duration>.2&&s.duration<5&&s.peak>.01)).toBe(true);
  await page.getByRole('button',{name:'Как играть',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Ваш первый выход в море'})).toBeVisible();
  const ambient=page.locator('audio[data-sound=ambient]');await expect.poll(()=>ambient.evaluate((a:HTMLAudioElement)=>a.currentTime)).toBeGreaterThan(0);
  await page.screenshot({path:'artifacts/guide-desktop.png',fullPage:true});
  await page.reload();await expect(page.locator('.guide-page')).toBeVisible();
  await page.getByRole('button',{name:'Начать тренировку'}).click();
  await expect(page.locator('.cell-grid').first()).toBeVisible();
  await page.getByRole('button',{name:'Как играть',exact:true}).click();await page.getByRole('button',{name:'Вернуться',exact:true}).click();
  await expect(page.locator('.cell-grid').first()).toBeVisible();
  await page.getByRole('button',{name:'Как играть',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'artifacts/guide-mobile.png',fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'На главную',exact:true}).click();await page.waitForTimeout(700);
  await page.screenshot({path:'artifacts/archipelago-mobile.png',fullPage:true});
  const mobile=await canvas.evaluate(e=>({...e.dataset}));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(700);
  const a=await canvas.getAttribute('data-frames');await page.waitForTimeout(800);expect(await canvas.getAttribute('data-frames')).toBe(a);
  await page.screenshot({path:'artifacts/archipelago-reduced.png',fullPage:true});
  writeFileSync('artifacts/archipelago-performance.json',JSON.stringify({desktop:{fpsOver3s:(Number(after.frames)-Number(before.frames))/3,drawCalls:after.drawCalls,triangles:after.triangles},mobile,decodedAudio:samples,reducedMotionStopped:true,environment:'Chrome headless / software rendering; viewport emulation, not a physical phone benchmark',errors},null,2));
  expect(errors).toEqual([]);
});

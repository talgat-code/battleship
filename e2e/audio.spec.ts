import { test, expect } from '@playwright/test';
import { freshGame, randomFleet, STORAGE_KEY, LETTERS } from '../src/game';

test('an async cannon rejected by mobile media policy uses the unlocked audio context',async({page})=>{
  const game=freshGame();game.player.ships=randomFleet();game.phase='battle';
  await page.addInitScript(({game,key})=>{
    localStorage.setItem('fleet:entry','guest');localStorage.setItem(key,JSON.stringify(game));
    (window as any).decodedDurations=[];
    const original=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){return this.dataset.sound==='cannon'?Promise.reject(new DOMException('Gesture required','NotAllowedError')):original.call(this);};
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof start>){(window as any).decodedDurations.push(this.buffer?.duration);return start.apply(this,args);};
  },{game,key:STORAGE_KEY});
  await page.goto('/');
  const duration=await page.evaluate(async()=>{const ctx=new AudioContext();const b=await ctx.decodeAudioData(await(await fetch('/audio/cannon.mp3')).arrayBuffer());await ctx.close();return b.duration;});
  const cell=game.bot.ships.find(s=>s.length===4)!.cells[0];
  await page.getByRole('button',{name:`Поле противника ${LETTERS[cell.x]}${cell.y+1}`,exact:true}).click();
  await expect.poll(()=>page.evaluate(d=>(window as any).decodedDurations.some((n:number)=>Math.abs(n-d)<.01),duration)).toBe(true);
  await page.getByRole('button',{name:'Выключить звук'}).click();
  expect(await page.evaluate(()=>localStorage.getItem('fleet:muted'))).toBe('true');
});

test('real audio starts on gesture, mutes, persists and fires only for a new shot', async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).cannonPlays = 0;
    document.addEventListener('play', e => { if ((e.target as HTMLElement).dataset.sound === 'cannon') (window as any).cannonPlays++; }, true);
  });
  await page.goto('/');
  const ambient = page.locator('audio[data-sound="ambient"]');
  const cannon = page.locator('audio[data-sound="cannon"]');
  expect(await ambient.evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
  await page.getByRole('button', { name: 'Играть без регистрации', exact: true }).click();
  await expect.poll(() => ambient.evaluate((e: HTMLAudioElement) => e.currentTime)).toBeGreaterThan(0);
  expect(await ambient.evaluate((e: HTMLAudioElement) => e.loop)).toBe(true);
  await ambient.evaluate((e:HTMLAudioElement)=>e.pause());
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await expect.poll(()=>ambient.evaluate((e:HTMLAudioElement)=>e.paused)).toBe(false);
  await page.getByRole('button', { name: 'Выключить звук' }).click();
  expect(await ambient.evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Включить звук' })).toBeVisible();
  expect(await ambient.evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
  await page.getByRole('button', { name: 'Включить звук' }).click();
  await expect.poll(() => ambient.evaluate((e: HTMLAudioElement) => e.currentTime)).toBeGreaterThan(0);
  const g = freshGame(); g.player.ships = randomFleet(); g.phase = 'battle';
  const target = g.bot.ships.find(s => s.length === 4)!.cells[0];
  await page.evaluate(({ key, game }) => {
    localStorage.setItem(key,JSON.stringify(game));
    const walletKey='fleet:wallet:v1:guest',wallet=JSON.parse(localStorage.getItem(walletKey)||'null');
    if(wallet){wallet.game=game;localStorage.setItem(walletKey,JSON.stringify(wallet));}
  }, { key: STORAGE_KEY, game: g });
  await page.reload();
  expect(await page.evaluate(() => (window as any).cannonPlays)).toBe(0);
  await page.getByRole('button', { name: `Поле противника ${LETTERS[target.x]}${target.y + 1}`, exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).cannonPlays)).toBe(1);
  await expect.poll(() => cannon.evaluate((e: HTMLAudioElement) => e.currentTime)).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: `Поле противника ${LETTERS[target.x]}${target.y + 1} попадание`, exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Выключить звук' }).click();
  expect(await cannon.evaluate((e: HTMLAudioElement) => e.paused)).toBe(true);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/audio-mobile.png', fullPage: true });
});

import { test, expect } from '@playwright/test';
import { freshGame, randomFleet, STORAGE_KEY, LETTERS } from '../src/game';

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

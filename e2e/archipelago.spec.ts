import { test, expect } from '@playwright/test';
import { freshGame, place, Game, STORAGE_KEY, LETTERS } from '../src/game';
import { projectPoint } from '../src/scene/projection';
test.beforeEach(async ({ context }) => { await context.addInitScript(() => localStorage.setItem('fleet:entry', 'guest')); });

test('archipelago: animated anchors, inspection crew and projected corner shots', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  const positions = [[0, 0], [0, 2], [0, 4], [0, 6], [3, 6], [6, 6], [0, 8], [2, 8], [4, 8], [6, 8]];
  let ships: Game['player']['ships'] = [];
  positions.forEach(([x, y], id) => { ships = place(ships, id, { x, y }, false); });
  const game: Game = { ...freshGame(), phase: 'battle', player: { ships, shots: [] }, bot: { ships, shots: [] } };
  await page.goto('/?diagnostics=1');
  await page.evaluate(({ key, game }) => {
    localStorage.setItem(key, JSON.stringify(game));
    const walletKey='fleet:wallet:v1:guest',wallet=JSON.parse(localStorage.getItem(walletKey)||'null');
    if(wallet){wallet.game=game;localStorage.setItem(walletKey,JSON.stringify(wallet));}
  }, { key: STORAGE_KEY, game });
  await page.reload();
  const ally = page.locator('.ally-card');
  const enemy = page.locator('.enemy-card');
  await ally.locator('.board').scrollIntoViewIfNeeded();
  await expect(ally.locator('canvas')).toHaveAttribute('data-motion', /roll/);
  const pose = async () => JSON.parse((await ally.locator('canvas').getAttribute('data-motion'))!);
  const before = await pose();
  await expect.poll(async () => (await pose()).y).not.toBe(before.y);
  const after = await pose();
  expect([after.x, after.z]).toEqual([before.x, before.z]);
  expect(Math.abs(after.y - .035)).toBeLessThanOrEqual(.026);
  await expect(enemy.locator('canvas')).not.toHaveAttribute('data-motion');
  await expect(ally.locator('canvas')).toHaveAttribute('data-crew', '0');
  await page.screenshot({ path: 'artifacts/archipelago-battle-desktop.png', fullPage: true });
  // Resize must update the camera even when continuous rendering is disabled.
  await page.getByRole('button', { name: 'Живое море', exact: true }).click();
  await ally.getByRole('button', { name: 'Крупные клетки' }).click();
  await expect(ally.locator('canvas')).toHaveAttribute('data-crew', '3');
  await expect(ally.locator('canvas')).toHaveAttribute('data-scene-width', '900');
  await ally.locator('.board-scroll').screenshot({ path: 'artifacts/archipelago-crew.png' });
  await enemy.getByRole('button', { name: 'Крупные клетки' }).click();
  await expect(enemy.locator('canvas')).toHaveAttribute('data-crew', '0');
  await enemy.getByRole('button', { name: 'Всё поле' }).click();
  await ally.getByRole('button', { name: 'Всё поле' }).click();
  await page.getByRole('button', { name: 'Спокойное море', exact: true }).click();
  for (const [x, y] of [[0, 0], [9, 0], [0, 9], [9, 9]]) {
    await expect.poll(() => page.evaluate(key => JSON.parse(localStorage.getItem(key)!).turn, STORAGE_KEY)).toBe('player');
    const cell = enemy.getByRole('button', { name: `Поле противника ${LETTERS[x]}${y + 1}`, exact: true });
    await cell.scrollIntoViewIfNeeded();
    const box = (await enemy.locator('.board').boundingBox())!;
    const button = (await cell.boundingBox())!;
    const projected = projectPoint(x - 4.5, 0, y - 4.5);
    const px = box.x + projected.x * box.width, py = box.y + projected.y * box.height;
    expect(Math.abs(px - button.x - button.width / 2)).toBeLessThan(1);
    expect(Math.abs(py - button.y - button.height / 2)).toBeLessThan(1);
    await page.mouse.click(px, py);
    await expect.poll(() => page.evaluate(({ key, x, y }) => JSON.parse(localStorage.getItem(key)!).bot.shots.some((s: { x: number; y: number }) => s.x === x && s.y === y), { key: STORAGE_KEY, x, y })).toBe(true);
  }
  await page.reload();
  for (const [x, y] of [[0, 0], [9, 0], [0, 9], [9, 9]]) await expect(enemy.getByRole('button', { name: new RegExp(`^Поле противника ${LETTERS[x]}${y + 1} `) })).toBeDisabled();
  expect(errors).toEqual([]);
});

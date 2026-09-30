import { test, expect, Page } from '@playwright/test';
import { freshGame, place, Game, fire, LETTERS, STORAGE_KEY } from '../src/game';
test.beforeEach(async ({ context }) => { await context.addInitScript(() => localStorage.setItem('fleet:entry', 'guest')); });

const positions = [
  { x: 0, y: 0 }, { x: 0, y: 2 }, { x: 0, y: 4 },
  { x: 0, y: 6 }, { x: 3, y: 6 }, { x: 6, y: 6 },
  { x: 0, y: 8 }, { x: 2, y: 8 }, { x: 4, y: 8 }, { x: 6, y: 8 },
];
function fixture(): Game {
  let ships: Game['player']['ships'] = [];
  positions.forEach((p, id) => { ships = place(ships, id, p, false); });
  return { ...freshGame(), phase: 'battle', player: { ships, shots: [] }, bot: { ships, shots: [] } };
}
async function install(page: Page, game: Game) {
  await page.goto('/');
  await page.evaluate(({ key, value }) => {
    localStorage.setItem(key,value);
    const walletKey='fleet:wallet:v1:guest',wallet=JSON.parse(localStorage.getItem(walletKey)||'null');
    if(wallet){wallet.game=JSON.parse(value);localStorage.setItem(walletKey,JSON.stringify(wallet));}
  }, { key: STORAGE_KEY, value: JSON.stringify(game) });
  await page.reload();
}
const cell = (page: Page, side: string, x: number, y: number) => page.getByRole('button', { name: `${side} ${LETTERS[x]}${y + 1}`, exact: true });
async function shot(page: Page, x: number, y: number) { await cell(page, 'Поле противника', x, y).click(); }
async function noOverflow(page: Page) { expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); }

test('desktop: manual deployment, rotation, reset, autoset and battle', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(`${message.text()} ${message.location().url}`); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Разверните свой флот.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/desktop-setup.png', fullPage: true });
  await cell(page, 'Ваше поле', 0, 0).click();
  await expect(page.getByText('Осталось разместить: 9')).toBeVisible();
  await cell(page, 'Ваше поле', 1, 1).click();
  await expect(page.getByRole('alert')).toContainText('Между кораблями');
  await page.getByRole('button', { name: /Повернуть/ }).click();
  await cell(page, 'Ваше поле', 6, 0).click();
  await expect(page.getByText('Осталось разместить: 8')).toBeVisible();
  await page.reload();
  await expect(page.getByText('Осталось разместить: 8')).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить расстановку' }).click();
  await expect(page.getByText('Осталось разместить: 10')).toBeVisible();
  // Full manual placement via actual cell buttons.
  for (const p of positions) await cell(page, 'Ваше поле', p.x, p.y).click();
  await expect(page.getByRole('button', { name: 'Начать операцию' })).toBeEnabled();
  await page.screenshot({ path: 'artifacts/desktop-fleet.png', fullPage: true });
  await page.getByRole('button', { name: 'Авторасстановка' }).click();
  await page.getByRole('button', { name: 'Начать операцию' }).click();
  await expect(page.getByText('Ваш ход, командир')).toBeVisible();
  await noOverflow(page);
  const board = await page.locator('.board').first().boundingBox();
  expect(board!.width).toBeGreaterThan(600);
  expect(errors).toEqual([]);
});

test('desktop: miss, bot turn, hit, sinking, victory and persisted finish', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await install(page, fixture());
  await shot(page, 9, 9);
  await expect(page.getByRole('button', { name: 'Поле противника К10 мимо' })).toBeDisabled();
  await expect(page.getByText('Ход бота · противник стреляет')).toBeVisible();
  await page.reload();
  await expect(page.locator('.ally-card .cell.miss, .ally-card .cell.hit, .ally-card .cell.sunk').first()).toBeVisible();
  await install(page, fixture());
  await shot(page, 0, 0);
  await expect(page.locator('.result-hit')).toContainText('попадание');
  await expect(page.getByRole('button', { name: 'Поле противника А1 попадание' })).toBeDisabled();
  await page.screenshot({ path: 'artifacts/desktop-hit.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Поле противника А1 попадание' })).toBeVisible();
  await shot(page, 1, 0); await shot(page, 2, 0); await shot(page, 3, 0);
  await expect(page.locator('.enemy-card .cell.sunk')).toHaveCount(4);
  await expect(page.locator('.result-sunk')).toContainText('потоплен');
  await page.screenshot({ path: 'artifacts/desktop-sunk.png', fullPage: true });
  for (const ship of fixture().bot.ships.slice(1)) for (const c of ship.cells) await shot(page, c.x, c.y);
  await expect(page.getByText('Победа, командир')).toBeVisible();
  await expect(page.locator('.victory-card')).toContainText('ПОБЕДА');
  await expect(page.locator('.enemy-card .cell.sunk')).toHaveCount(20);
  await page.screenshot({ path: 'artifacts/desktop-victory.png', fullPage: true });
  await page.reload();
  await expect(page.getByText('Победа, командир')).toBeVisible();
  await page.getByRole('button', { name: 'Новая игра', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Продолжить партию' }).click();
  await page.getByRole('button', { name: 'Новая операция' }).click();
  await expect(page.getByRole('heading', { name: 'Разверните свой флот.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobile: touch confirmation, large cells, placement and shooting', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await context.addInitScript(() => localStorage.setItem('fleet:entry', 'guest'));
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await noOverflow(page);
  await cell(page, 'Ваше поле', 0, 0).tap();
  await expect(page.getByRole('button', { name: 'Разместить · А1' })).toBeEnabled();
  await page.getByRole('button', { name: 'Разместить · А1' }).tap();
  await expect(page.getByText('Осталось разместить: 9')).toBeVisible();
  await page.getByRole('button', { name: /Повернуть/ }).tap();
  await cell(page, 'Ваше поле', 6, 0).tap();
  await page.getByRole('button', { name: 'Разместить · Ж1' }).tap();
  await page.getByRole('button', { name: 'Крупные клетки' }).tap();
  const box = await cell(page, 'Ваше поле', 0, 0).boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await noOverflow(page);
  await page.getByRole('button', { name: 'Всё поле' }).tap();
  await page.screenshot({ path: 'artifacts/mobile-setup.png', fullPage: true });
  await page.getByRole('button', { name: 'Авторасстановка' }).tap();
  await page.getByRole('button', { name: 'Начать операцию' }).tap();
  await expect(page.getByRole('tab', { name: /Противник/ })).toHaveAttribute('aria-selected', 'true');
  await install(page, fixture());
  await cell(page, 'Поле противника', 0, 8).tap();
  await page.getByRole('button', { name: 'Огонь · А9' }).tap();
  await expect(page.getByRole('button', { name: 'Поле противника А9 потоплен' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/mobile-battle.png', fullPage: true });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Поле противника А9 потоплен' })).toBeVisible();
  await page.getByRole('tab', { name: /Ваш флот/ }).tap();
  await expect(page.getByRole('heading', { name: 'Ваш флот', exact: true })).toBeVisible();
  await noOverflow(page);
  expect(errors).toEqual([]);
  await context.close();
});

test('reduced motion and defeat render correctly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const g = fixture(); g.turn = 'bot';
  let ended = g;
  for (const ship of g.player.ships) for (const c of ship.cells) ended = fire(ended, 'bot', c);
  await install(page, ended);
  await expect(page.locator('.app-shell')).toHaveClass(/motion-off/);
  await expect(page.getByRole('button', { name: 'Спокойное море' })).toBeDisabled();
  await expect(page.locator('.victory-card')).toContainText('ПОРАЖЕНИЕ');
  await page.screenshot({ path: 'artifacts/desktop-defeat.png', fullPage: true });
});

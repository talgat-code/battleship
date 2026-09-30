import { test, expect, Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import { botTarget, Shot, LETTERS, STORAGE_KEY } from '../src/game';
test.beforeEach(async ({ context }) => { await context.addInitScript(() => localStorage.setItem('fleet:entry', 'guest')); });

async function metrics(page: Page) {
  return page.locator('.board canvas').evaluateAll(elements => elements.map(e => ({ frames: Number(e.dataset.frames || 0), calls: Number(e.dataset.drawCalls || 0), triangles: Number(e.dataset.triangles || 0), geometries: Number(e.dataset.geometries || 0) })));
}
async function sample(page: Page) {
  const before = await metrics(page);
  const start = Date.now();
  await page.waitForTimeout(3000); // Measurement window, not a readiness delay.
  const seconds = (Date.now() - start) / 1000;
  const after = await metrics(page);
  return after.map((m, i) => ({ ...m, frames: m.frames - before[i].frames, renderFps: +((m.frames - before[i].frames) / seconds).toFixed(1) }));
}

test('twilight performance: desktop, motion off, mobile CPU 4x', async ({ browser, page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/?diagnostics=1');
  await page.getByRole('button', { name: 'Авторасстановка' }).click();
  await page.locator('.fields-grid').scrollIntoViewIfNeeded();
  await expect.poll(async () => (await metrics(page))[0].frames).toBeGreaterThan(10);
  const desktop = await sample(page);
  await page.screenshot({ path: 'artifacts/twilight-desktop.png', fullPage: true });
  await page.locator('.ally-card .board').screenshot({ path: 'artifacts/twilight-ocean-detail.png' });
  await page.getByRole('button', { name: 'Живое море', exact: true }).click();
  await page.locator('.fields-grid').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500); // Drain the final invalidated frame after changing mode.
  const staticScene = await sample(page);
  expect(staticScene.every(s => s.frames <= 2)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Спокойное море', exact: true })).toHaveAttribute('aria-pressed', 'true');

  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const mobile = await context.newPage();
  await context.addInitScript(() => localStorage.setItem('fleet:entry', 'guest'));
  mobile.on('pageerror', e => errors.push(e.message));
  const cdp = await context.newCDPSession(mobile);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await mobile.goto('/?diagnostics=1');
  await mobile.getByRole('button', { name: 'Авторасстановка' }).tap();
  await mobile.locator('.board').scrollIntoViewIfNeeded();
  await expect(mobile.locator('.board-container')).toHaveAttribute('data-quality', /lite|static-auto/);
  await expect.poll(async () => (await metrics(mobile))[0].frames).toBeGreaterThan(10);
  const mobileThrottled = await sample(mobile);
  const mobileQuality = await mobile.locator('.board-container').getAttribute('data-quality');
  const mobileSettled = await sample(mobile);
  await mobile.screenshot({ path: 'artifacts/twilight-mobile.png', fullPage: true });
  await mobile.getByRole('button', { name: 'Начать операцию' }).tap();
  await mobile.getByRole('button', { name: 'Поле противника А1', exact: true }).tap();
  await expect(mobile.getByRole('button', { name: 'Огонь · А1' })).toBeEnabled();
  await mobile.getByRole('button', { name: 'Огонь · А1' }).tap();
  await expect(mobile.locator('.enemy-card .last-shot')).toHaveCount(1);
  await mobile.emulateMedia({ reducedMotion: 'reduce' });
  await expect(mobile.locator('.app-shell')).toHaveClass(/motion-off/);
  await mobile.locator('.board').scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(2500); // Allow an outstanding bot turn and final frames to settle.
  const mobileReduced = await sample(mobile);
  // Rendering may be invalidated by a legitimate bot shot; animation itself is disabled.
  await expect(mobile.locator('.board-container')).toHaveAttribute('data-animated', 'false');
  await writeFile('artifacts/performance.json', JSON.stringify({ browser: browser.version(), viewport: [1920, 1080], measurementSeconds: 3, desktop, staticScene, mobileThrottled, mobileQuality, mobileSettled, mobileReduced, note: 'Headless Chrome; mobile viewport 390×844 with 4× CPU throttling, not a physical device. renderFps measures WebGL submissions, not GPU presentation.' }, null, 2));
  expect(errors).toEqual([]);
  await context.close();
});

test('full normal match using only public shot information', async ({ page }) => {
  test.setTimeout(180000);
  await page.goto('/');
  await page.getByRole('button', { name: 'Авторасстановка' }).click();
  await page.getByRole('button', { name: 'Начать операцию' }).click();
  for (let n = 0; n < 200; n++) {
    await expect.poll(async () => page.evaluate(key => {
      const g = JSON.parse(localStorage.getItem(key)!);
      return g.phase === 'finished' || g.turn === 'player';
    }, STORAGE_KEY), { timeout: 20000 }).toBe(true);
    // Only the public shot history is passed to the targeting algorithm.
    const visible = await page.evaluate(key => {
      const g = JSON.parse(localStorage.getItem(key)!);
      return { phase: g.phase, shots: g.bot.shots as Shot[] };
    }, STORAGE_KEY);
    if (visible.phase === 'finished') break;
    const c = botTarget(visible.shots);
    await page.getByRole('button', { name: `Поле противника ${LETTERS[c.x]}${c.y + 1}`, exact: true }).click();
  }
  await expect(page.locator('.victory-card')).toBeVisible();
  await page.screenshot({ path: 'artifacts/twilight-full-match.png', fullPage: true });
  await page.reload();
  await expect(page.locator('.victory-card')).toBeVisible();
});

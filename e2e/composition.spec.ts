import { test, expect } from '@playwright/test';
test('whole-page coast frames the game on desktop and mobile', async ({ page }) => {
  await page.setViewportSize({ width: 2560, height: 1440 });
  await page.goto('/');
  const guest = page.getByRole('button', { name: 'Играть без регистрации', exact: true });
  await guest.click();
  await page.getByRole('button', { name: 'Авторасстановка' }).click();
  await page.getByRole('button', { name: 'Начать операцию' }).click();
  await expect(page.locator('.world-backdrop canvas')).toBeVisible();
  await expect(page.locator('.board')).toHaveCount(2);
  await page.screenshot({ path: 'artifacts/composition-after.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.board')).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'artifacts/composition-mobile.png', fullPage: true });
});

import {test,expect} from '@playwright/test';
import {authUrl,hasSupabase} from './environment';
test('username validation, password eye and missing deployment error',async({page})=>{
  test.skip(!hasSupabase);
  await page.route(`${authUrl}/functions/v1/login-auth`,route=>route.fulfill({status:404,contentType:'application/json',body:'{"code":"NOT_FOUND"}'}));
  await page.goto('/');await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
  await expect(page.getByLabel('Логин',{exact:true})).toBeVisible();await expect(page.locator('input[type=email]')).toHaveCount(0);
  await page.getByLabel('Логин',{exact:true}).fill('bad name');expect(await page.getByLabel('Логин',{exact:true}).evaluate((e:HTMLInputElement)=>e.checkValidity())).toBe(false);
  await page.getByLabel('Логин',{exact:true}).fill('captain_test');await page.getByLabel('Пароль',{exact:true}).fill('test-password-123');
  await page.getByRole('button',{name:'Показать пароль'}).click();await expect(page.getByLabel('Пароль',{exact:true})).toHaveAttribute('type','text');
  await page.getByRole('button',{name:'Скрыть пароль'}).click();await expect(page.getByLabel('Пароль',{exact:true})).toHaveAttribute('type','password');
  await page.getByRole('button',{name:'Зарегистрироваться'}).click();await expect(page.getByText(/Сервис входа недоступен/)).toBeVisible();
  expect(await page.evaluate(()=>Object.values(localStorage).some(v=>v.includes('test-password-123')))).toBe(false);
});
test('WebGL failure keeps login and guest 2D game available',async({page})=>{
  await page.addInitScript(()=>{const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type:string,...args:unknown[]){if(type.includes('webgl'))return null;return getContext.apply(this,[type,...args] as Parameters<typeof getContext>);} as typeof getContext;});
  await page.goto('/');await page.getByRole('button',{name:'Войти',exact:true}).click();await expect(page.getByLabel('Логин или почта')).toBeVisible();
  await page.getByRole('button',{name:'Играть без регистрации',exact:true}).click();await page.getByRole('button',{name:'Авторасстановка'}).click();await page.getByRole('button',{name:'Начать операцию'}).click();await expect(page.getByText('Ваш ход, командир')).toBeVisible();
  await expect(page.getByRole('button',{name:'Поле противника А1',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Поле противника А1',exact:true}).click();
  await expect(page.locator('.enemy-card .cell.hit,.enemy-card .cell.miss,.enemy-card .cell.sunk')).toHaveCount(1);
  await page.screenshot({path:'artifacts/login-webgl-fallback.png',fullPage:true});
});

import {test,expect} from '@playwright/test';
import {authUrl,hasSupabase} from './environment';
test('24-character pasted login is not truncated and two submissions issue one request',async({page})=>{
  test.skip(!hasSupabase);let calls=0,release!:()=>void;
  const hold=new Promise<void>(resolve=>release=resolve);
  await page.route(`${authUrl}/functions/v1/login-auth`,async route=>{calls++;await hold;await route.fulfill({status:409,contentType:'application/json',body:'{"code":"login_taken"}'});});
  await page.goto('/');await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
  await page.getByLabel('Логин',{exact:true}).fill(` ${'a'.repeat(24)} `);
  await expect(page.getByLabel('Логин',{exact:true})).toHaveValue(` ${'a'.repeat(24)} `);
  await page.getByLabel('Пароль',{exact:true}).fill('test-password-123');
  await page.locator('form').evaluate(form=>{form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));});
  await expect.poll(()=>calls).toBe(1);await expect(page.getByRole('button',{name:'Подождите…'})).toBeDisabled();release();
  await expect(page.getByRole('status')).toContainText('Этот логин уже занят');expect(calls).toBe(1);
});
test('service failure and network interruption keep the form recoverable and guest available',async({page})=>{
  test.skip(!hasSupabase);let offline=false;
  await page.route(`${authUrl}/functions/v1/login-auth`,route=>offline?route.abort('internetdisconnected'):route.fulfill({status:503,contentType:'application/json',body:'{"code":"service_unavailable"}'}));
  await page.goto('/');await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
  await page.getByLabel('Логин',{exact:true}).fill('captain_test');await page.getByLabel('Пароль',{exact:true}).fill('test-password-123');
  for(let i=0;i<2;i++){
    await page.getByRole('button',{name:'Зарегистрироваться',exact:true}).click();
    await expect(page.getByRole('status')).toContainText('Сервис входа недоступен');await expect(page.getByRole('button',{name:'Зарегистрироваться',exact:true})).toBeEnabled();offline=true;
  }
  await page.getByRole('button',{name:'Играть без регистрации',exact:true}).click();await expect(page.getByRole('button',{name:'Авторасстановка',exact:true})).toBeVisible();
});
test('username trims spaces and explains invisible characters without native pattern popup',async({page})=>{
  test.skip(!hasSupabase);
  const submitted:string[]=[];
  await page.route(`${authUrl}/functions/v1/login-auth`,route=>{
    submitted.push(route.request().postDataJSON().login);
    return route.fulfill({status:409,contentType:'application/json',body:'{"code":"login_taken"}'});
  });
  await page.goto('/');await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
  await page.getByLabel('Логин',{exact:true}).fill('qwert09_t\u200b');
  await page.getByLabel('Пароль',{exact:true}).fill('test-password-123');
  await page.getByRole('button',{name:'Зарегистрироваться'}).click();
  await expect(page.getByRole('status')).toContainText('U+200B');expect(submitted).toEqual([]);
  await page.getByLabel('Логин',{exact:true}).fill(' qwert09_t ');
  await page.getByRole('button',{name:'Зарегистрироваться'}).click();
  await expect(page.getByRole('status')).toContainText('Этот логин уже занят');expect(submitted).toEqual(['qwert09_t']);
});
test('username validation, password eye and missing deployment error',async({page})=>{
  test.skip(!hasSupabase);
  await page.route(`${authUrl}/functions/v1/login-auth`,route=>route.fulfill({status:404,contentType:'application/json',body:'{"code":"NOT_FOUND"}'}));
  await page.goto('/');await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
  await expect(page.getByLabel('Логин',{exact:true})).toBeVisible();await expect(page.locator('input[type=email]')).toHaveCount(0);
  await page.getByLabel('Логин',{exact:true}).fill('bad name');expect(await page.getByLabel('Логин',{exact:true}).evaluate((e:HTMLInputElement)=>e.checkValidity())).toBe(true);
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

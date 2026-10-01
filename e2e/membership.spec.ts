import {test,expect} from '@playwright/test';
import {authUrl,hasSupabase} from './environment';

for(const width of [1440,390])test(`demo subscriptions and top-ups: clear terms, no wallet changes, modal controls at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/?view=shop');
  const balance=page.locator('.token-balance');await expect(balance).toContainText('5555');
  const before=await page.evaluate(()=>localStorage.getItem('fleet:wallet:v1:guest'));
  const buy=page.getByRole('button',{name:'Купить подписку',exact:true});await buy.click();
  const modal=page.getByRole('dialog');await expect(modal).toBeVisible();await expect(modal).toContainText('Оплата пока не подключена');
  await expect(modal.locator('.membership-plan').first()).toContainText('$8');await expect(modal.locator('.membership-plan').last()).toContainText('$20');
  await expect(modal).toContainText('30 000 жетонов каждую неделю');await expect(modal).toContainText('2 дня (48 часов)');
  await modal.getByRole('button',{name:'Выбрать тариф · Адмирал'}).click();await expect(modal.locator('.membership-selection')).toContainText('Адмирал · $20 / месяц');
  const r=await modal.boundingBox();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(width);expect(r!.height).toBeLessThanOrEqual(900);
  await modal.evaluate(n=>n.scrollTop=0);await page.screenshot({path:`artifacts/subscriptions-${width}.png`});
  await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(buy).toBeFocused();
  await page.getByRole('button',{name:'Пополнить жетоны',exact:true}).click();await expect(modal).toBeVisible();
  const packs=modal.locator('.membership-packs button');await expect(packs).toHaveCount(5);await expect(packs.first()).toContainText('$0,30');await expect(packs.nth(1)).toContainText('$0,60');
  await packs.nth(2).click();await expect(modal.locator('.membership-selection')).toContainText('$1,10');await expect(modal.locator('.membership-selection')).toContainText('разово');
  await page.screenshot({path:`artifacts/token-packs-${width}.png`});await modal.getByRole('button',{name:'Понятно',exact:true}).click();
  await expect(modal).not.toBeVisible();expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
  expect(await page.evaluate(()=>localStorage.getItem('fleet:wallet:v1:guest'))).toBe(before);await expect(balance).toContainText('5555');
  // Real card purchases still use the existing wallet after closing the preview.
  await page.locator('.art-sonar').getByRole('button',{name:'Купить',exact:true}).click();await expect(balance).toContainText('5375');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('plan copy switches to English and Kazakh and backdrop closes the modal',async({page})=>{
  await page.goto('/?view=shop');await page.locator('.language-switch').first().selectOption('en');
  await page.getByRole('button',{name:'Buy a subscription',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('30,000 tokens every week');
  expect(await page.getByRole('dialog').innerText()).not.toMatch(/[А-Яа-яЁё]/);await page.mouse.click(5,5);await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('.language-switch').first().selectOption('kk');await page.getByRole('button',{name:'Жазылым сатып алу',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Әр аптада 30 000 жетон');await page.keyboard.press('Escape');
});

const id='e8c2d075-1bae-4108-8f07-08bc6fa17481',roomId='00000000-0000-0000-0000-000000000099';
for(const width of [1440,390,320])test(`signed-in home: account actions in the header, no horizon line, working links at ${width}`,async({page})=>{
  test.skip(!hasSupabase);await page.setViewportSize({width,height:900});
  const user={id,aud:'authenticated',role:'authenticated',email:'commander@example.test',created_at:'2026-09-30T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{nickname:'Командир'}};
  const now=Math.floor(Date.now()/1000),encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');
  const session={access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600})}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_in:3600,expires_at:now+3600,user};
  await page.addInitScript(({id,roomId})=>localStorage.setItem(`fleet:room:${id}`,roomId),{id,roomId});
  await page.route(`${authUrl}/**`,async route=>{
    const url=new URL(route.request().url()),path=url.pathname;
    if(path.endsWith('/token'))return route.fulfill({json:session});if(path.endsWith('/user'))return route.fulfill({json:user});
    if(path.endsWith('/profiles'))return route.fulfill({json:url.searchParams.get('select')==='language'?{language:'ru'}:{nickname:'Командир'}});
    if(path.endsWith('/matches'))return route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'*/0'},body:route.request().method()==='HEAD'?'':'[]'});
    if(path.endsWith('/fleet_leaderboard'))return route.fulfill({json:{rows:[],me:null}});
    if(path.endsWith('/fleet_duel'))return route.fulfill({json:route.request().postDataJSON().command.type==='list'?[]:{id:roomId,round:1,revision:1,status:'waiting',opponent:null,ready:false,opponentReady:false,own:{ships:[],shots:[]},enemy:{ships:[],shots:[]}}});
    if(path.endsWith('/fleet_chat'))return route.fulfill({json:{messages:[],ack:null}});
    return route.fulfill({json:{}});
  });
  await page.goto('/?view=home');await page.getByRole('button',{name:'Войти',exact:true}).click();await page.getByLabel('Логин или почта').fill(user.email);await page.getByLabel('Пароль',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Войти в аккаунт'}).click();
  await expect(page.getByRole('heading',{name:'Профиль командира'})).toBeVisible();await page.getByRole('button',{name:'На главную',exact:true}).click();
  const nav=page.locator('header .account-navigation');await expect(nav).toBeVisible();await expect(page.locator('main .entry-navigation')).toHaveCount(0);
  const box=await nav.boundingBox(),header=await page.locator('.topbar').boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(header!.y+header!.height);expect(box!.x+box!.width).toBeLessThanOrEqual(width);if(width>760)expect(box!.x).toBeGreaterThan(width/2);
  expect(await page.locator('.incubator-title').evaluate(n=>getComputedStyle(n).borderBottomWidth)).toBe('0px');
  await expect(page.locator('.incubator-title canvas')).toBeVisible();await page.screenshot({path:`artifacts/home-navigation-${width}.png`,fullPage:true});
  await nav.getByRole('button',{name:'Вернуться в бой',exact:true}).click();await expect(page.getByRole('heading',{name:'Ожидание друга',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Мой профиль',exact:true}).click();await expect(page.getByRole('heading',{name:'Профиль командира'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

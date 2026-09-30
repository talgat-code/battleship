import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('LIVE audit: fresh UI, production login, wrong password, duplicate, email, reload, mobile and invitation',async({browser})=>{
  test.skip(process.env.LOGIN_AUDIT!=='1','Creates two real accounts; requires explicit opt-in.');test.setTimeout(180000);
  const local=await browser.newContext({viewport:{width:1440,height:1000}});
  const remote=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const a=await local.newPage(),b=await remote.newPage();
  const site='https://flot-sector.netlify.app',name=`audit_${Date.now()}`,password=`Qa_Капитан_${randomUUID()}`;
  const account=(page:Page)=>page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));if(!key)return null;const u=JSON.parse(localStorage.getItem(key)!).user;return {id:u.id,email:u.email};});
  async function submit(page:Page,login:string,pass:string,signup=false){
    await page.getByLabel(signup?'Логин':'Логин или почта',{exact:true}).fill(login);
    await page.getByLabel('Пароль',{exact:true}).fill(pass);
    const response=page.waitForResponse(r=>r.request().method()==='POST'&&(r.url().includes('/functions/v1/login-auth')||r.url().includes('/auth/v1/token')));
    await page.getByRole('button',{name:signup?'Зарегистрироваться':'Войти в аккаунт',exact:true}).click();
    const status=(await response).status();
    await page.locator('input[type=password]').evaluateAll(inputs=>inputs.forEach(i=>(i as HTMLInputElement).value=''));
    return status;
  }
  async function logout(page:Page){await page.getByRole('button',{name:'Выйти из аккаунта',exact:true}).click();await expect(page.getByRole('button',{name:'Войти',exact:true})).toBeVisible();}
  try{
    await a.goto('/');await a.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
    expect(await submit(a,` ${name.toUpperCase()} `,password,true)).toBe(200);
    await expect(a.getByText('Пользователь зарегистрирован. Профиль создан. Вы вошли в аккаунт.',{exact:true})).toBeVisible();
    const original=await account(a);expect(original?.id).toBeTruthy();
    await a.getByRole('button',{name:'Профиль',exact:true}).first().click();
    await expect(a.getByLabel('Позывной')).toBeEnabled();
    await a.getByLabel('Позывной').fill('Проверенный капитан');await a.getByRole('button',{name:'Сохранить имя'}).click();await expect(a.getByText('Имя сохранено.',{exact:true})).toBeVisible();
    await a.reload();await expect(a.getByLabel('Позывной')).toHaveValue('Проверенный капитан');expect((await account(a))?.id).toBe(original!.id);
    await logout(a);await a.reload();expect(await account(a)).toBeNull();
    await a.getByRole('button',{name:'Создать аккаунт',exact:true}).click();expect(await submit(a,name,password,true)).toBe(409);
    await expect(a.getByText('Этот логин уже занят. Выберите другой или войдите.',{exact:true})).toBeVisible();
    await a.getByRole('button',{name:'Уже есть аккаунт — войти',exact:true}).click();expect(await submit(a,name,'incorrect-password')).toBe(401);
    await expect(a.getByText('Неверный логин, почта или пароль.',{exact:true})).toBeVisible();expect(await account(a)).toBeNull();
    expect(await submit(a,` ${name.toUpperCase()} `,password)).toBe(200);
    await expect(a.getByLabel('Позывной')).toHaveValue('Проверенный капитан');expect((await account(a))?.id).toBe(original!.id);
    await b.goto(site);await b.getByRole('button',{name:'Войти',exact:true}).click();expect(await submit(b,name,password)).toBe(200);
    await expect(b.getByLabel('Позывной')).toHaveValue('Проверенный капитан');expect((await account(b))?.id).toBe(original!.id);
    await b.reload();await expect(b.getByLabel('Позывной')).toHaveValue('Проверенный капитан');expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await logout(b);await b.getByRole('button',{name:'Войти',exact:true}).click();expect(await submit(b,original!.email,password)).toBe(200);
    await expect(b.getByLabel('Позывной')).toHaveValue('Проверенный капитан');expect((await account(b))?.id).toBe(original!.id);await logout(b);
    await a.getByRole('button',{name:'Играть с другом',exact:true}).click();await a.getByRole('button',{name:'Создать комнату'}).click();
    const invite=await a.getByLabel('Ссылка для друга').inputValue();const inviteURL=new URL(invite);inviteURL.protocol='https:';inviteURL.host='flot-sector.netlify.app';inviteURL.port='';
    await b.goto(inviteURL.href);await b.getByRole('button',{name:'Создать аккаунт',exact:true}).click();expect(await submit(b,`${name}_b`,password,true)).toBe(200);
    await expect(b.getByRole('button',{name:'Присоединиться по приглашению'})).toBeVisible();expect(new URL(b.url()).searchParams.get('invite')).toBe(inviteURL.searchParams.get('invite'));
    expect((await account(b))?.id).not.toBe(original!.id);await b.getByRole('button',{name:'Присоединиться по приглашению'}).click();
    await expect(b.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible();
    const roomURL=b.url();await b.reload();await expect(b.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible();await expect(b).toHaveURL(roomURL);
    await b.screenshot({path:'artifacts/auth-audit-mobile-room.png',fullPage:true});
  }finally{
    for(const page of [a,b])await page.locator('input[type=password]').evaluateAll(inputs=>inputs.forEach(i=>(i as HTMLInputElement).value='')).catch(()=>{});
    await local.close();await remote.close();
  }
});

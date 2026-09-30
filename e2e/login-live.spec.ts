import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
// Real Edge/Auth/REST, no response interception. Creates two persistent test accounts.
test('LIVE login registration, same progress from second browser and independent second player',async({browser})=>{
  test.skip(process.env.LOGIN_E2E!=='1','Deploy 005 and login-auth first; this must use real Supabase.');test.setTimeout(120000);
  const a=await browser.newContext(),b=await browser.newContext();const first=await a.newPage(),second=await b.newPage();
  const login=`qa_${Date.now()}`,password=`Qa_${randomUUID()}`;
  const uid=(page:Page)=>page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));return key?JSON.parse(localStorage.getItem(key)!).user.id:null;});
  async function enter(page:Page,name:string,signup:boolean){await page.goto('/');await page.getByRole('button',{name:signup?'Создать аккаунт':'Войти',exact:true}).click();await page.getByLabel(signup?'Логин':'Логин или почта',{exact:true}).fill(name);await page.getByLabel('Пароль',{exact:true}).fill(password);await page.getByRole('button',{name:signup?'Зарегистрироваться':'Войти в аккаунт'}).click();}
  try{
    await enter(first,login,true);await expect(first.getByRole('button',{name:'Авторасстановка'})).toBeVisible({timeout:30000});const original=await uid(first);expect(original).toBeTruthy();
    await first.getByRole('button',{name:/Магазин ·/}).click();await first.getByRole('button',{name:'Карточки',exact:true}).click();await first.locator('.art-sonar').getByRole('button',{name:'Купить',exact:true}).click();
    await first.getByRole('button',{name:'Вернуться к игре'}).click();const balance=await first.getByRole('button',{name:/Магазин ·/}).textContent();
    await first.getByRole('button',{name:'Профиль',exact:true}).click();await first.getByRole('button',{name:'Выйти из аккаунта'}).click();
    await enter(first,login,false);await expect(first.getByRole('heading',{name:'Профиль командира'})).toBeVisible({timeout:30000});expect(await uid(first)).toBe(original);
    await enter(second,login.toUpperCase(),false);await expect(second.getByRole('heading',{name:'Профиль командира'})).toBeVisible({timeout:30000});expect(await uid(second)).toBe(original);
    await second.getByRole('button',{name:'Вернуться к игре'}).click();await expect(second.getByRole('button',{name:/Магазин ·/})).toHaveText(balance!);
    await second.getByRole('button',{name:/Магазин ·/}).click();await second.getByRole('button',{name:'Мои предметы',exact:true}).click();await expect(second.locator('.art-sonar')).toBeVisible();
    await second.getByRole('button',{name:'Вернуться к игре'}).click();await second.getByRole('button',{name:'Профиль',exact:true}).click();await second.getByRole('button',{name:'Выйти из аккаунта'}).click();
    await enter(second,`${login}_b`,true);await expect(second.getByRole('button',{name:'Авторасстановка'})).toBeVisible({timeout:30000});expect(await uid(second)).not.toBe(original);
    await first.getByRole('button',{name:'Играть с другом',exact:true}).click();await first.getByRole('button',{name:'Создать комнату'}).click();const link=first.getByLabel('Ссылка для друга');await expect(link).toBeVisible({timeout:30000});await second.goto(await link.inputValue());await second.getByRole('button',{name:'Присоединиться по приглашению'}).click();await expect(first.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible({timeout:20000});
  }finally{await a.close();await b.close();}
});
test('LIVE existing email account keeps its identity after logout',async({page})=>{
  test.skip(process.env.LOGIN_E2E!=='1'||!process.env.LEGACY_EMAIL||!process.env.LEGACY_PASSWORD,'Requires owner-provided legacy credentials in the local terminal only.');
  for(let i=0;i<2;i++){
    await page.goto('/');await page.getByRole('button',{name:'Войти',exact:true}).click();await page.getByLabel('Логин или почта').fill(process.env.LEGACY_EMAIL!);await page.getByLabel('Пароль',{exact:true}).fill(process.env.LEGACY_PASSWORD!);await page.getByRole('button',{name:'Войти в аккаунт'}).click();await expect(page.getByRole('heading',{name:'Профиль командира'})).toBeVisible({timeout:30000});await expect(page.getByLabel('Позывной')).toBeEnabled();await page.getByRole('button',{name:'Выйти из аккаунта'}).click();
  }
});

import {test,expect} from '@playwright/test';
import {authUrl,hasSupabase} from './environment';
test.beforeEach(()=>{test.skip(!hasSupabase,'Requires local Vite configuration; HTTP responses are mocked.');});
// SDK/UI contract tests with mocked HTTP responses. These do not create real accounts.
const id='e8c2d075-1bae-4108-8f07-08bc6fa17481';
const user={id,aud:'authenticated',role:'authenticated',email:'commander@example.test',created_at:'2026-09-30T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{nickname:'Командир'}};
function session(){const now=Math.floor(Date.now()/1000);const encode=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString('base64url');return {access_token:`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:id,aud:'authenticated',role:'authenticated',iat:now,exp:now+3600})}.test`,refresh_token:'test-refresh-token',token_type:'bearer',expires_in:3600,expires_at:now+3600,user};}
test('configured SDK: legacy email login, profile, restored session and logout (mock HTTP)',async({page})=>{
  let login=false,logout=false;
  await page.route(`${authUrl}/**`,async route=>{
    const req=route.request(),url=new URL(req.url());
    const json=(body:unknown,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
    if(url.pathname.endsWith('/token')){login=true;return json(session());}
    if(url.pathname.endsWith('/user'))return json(user);
    if(url.pathname.endsWith('/logout')){logout=true;return json({});}
    if(url.pathname.endsWith('/profiles'))return json(url.searchParams.get('select')==='language'?{language:'ru'}:{nickname:'Командир'});
    if(url.pathname.endsWith('/matches'))return route.fulfill({status:200,contentType:'application/json',headers:{'content-range':'*/0'},body:req.method()==='HEAD'?'':'[]'});
    if(url.pathname.endsWith('/fleet_leaderboard'))return json({rows:[],me:null});
    return json({message:'Unexpected test request'},500);
  });
  await page.goto('/');await page.getByRole('button',{name:'Войти',exact:true}).click();
  await page.getByLabel('Логин или почта').fill(user.email);await page.getByLabel('Пароль',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Войти в аккаунт'}).click();
  await expect(page.getByRole('heading',{name:'Профиль командира'})).toBeVisible();await expect(page.getByLabel('Позывной')).toHaveValue('Командир');expect(login).toBe(true);
  await page.reload();await expect(page.getByRole('heading',{name:'Профиль командира'})).toBeVisible();await expect(page.getByRole('button',{name:'Выйти из аккаунта'})).toBeEnabled();
  await page.evaluate(id=>localStorage.setItem(`fleet-results:${id}:v1`,'broken local queue'),id);await page.reload();await expect(page.getByLabel('Позывной')).toHaveValue('Командир');await expect(page.getByText(/Не все локальные результаты удалось отправить/)).toBeVisible();
  await page.getByRole('button',{name:'Выйти из аккаунта'}).click();await expect(page.getByRole('button',{name:'Войти',exact:true})).toBeVisible();expect(logout).toBe(true);
  await page.reload();await expect(page.getByRole('button',{name:'Войти',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Играть с ботом',exact:true}).click();await page.getByRole('button',{name:'Авторасстановка'}).click();await page.getByRole('button',{name:'Начать операцию'}).click();await expect(page.getByText('Ваш ход, командир')).toBeVisible();
});
test('configured SDK explains an unconfirmed email (mock HTTP)',async({page})=>{
  await page.route(`${authUrl}/auth/v1/token**`,route=>route.fulfill({status:400,headers:{'x-supabase-api-version':'2024-01-01','access-control-expose-headers':'x-supabase-api-version'},contentType:'application/json',body:JSON.stringify({code:'email_not_confirmed',msg:'Email not confirmed'})}));
  await page.goto('/');await page.getByRole('button',{name:'Войти',exact:true}).click();await page.getByLabel('Логин или почта').fill(user.email);await page.getByLabel('Пароль',{exact:true}).fill('test-password-123');await page.getByRole('button',{name:'Войти в аккаунт'}).click();
  await expect(page.getByText('Для старого аккаунта подтвердите почту по ссылке в письме.',{exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Профиль командира'})).toHaveCount(0);
});

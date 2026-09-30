import {test,expect,type Page} from '@playwright/test';
// Opt-in: real accounts + real configured Vite/Supabase, never route mocks.
const enabled=process.env.DUEL_E2E==='1';
const credentials=[
  {email:process.env.DUEL_HOST_EMAIL,password:process.env.DUEL_HOST_PASSWORD},
  {email:process.env.DUEL_GUEST_EMAIL,password:process.env.DUEL_GUEST_PASSWORD},
];
test('LIVE Supabase: two accounts, invite, fleet, reconnect, victory, ranking and rematch',async({browser})=>{
  test.skip(!enabled,'Requires configured Supabase and two dedicated test accounts; see README.');
  test.setTimeout(240000);
  if(credentials.some(c=>!c.email||!c.password)||credentials[0].email===credentials[1].email)throw Error('Supply two distinct test accounts in DUEL_HOST/GUEST_EMAIL/PASSWORD.');
  const a=await browser.newContext(),b=await browser.newContext();
  const host=await a.newPage(),guest=await b.newPage();
  async function login(page:Page,index:number){
    await page.getByRole('button',{name:'Войти',exact:true}).click();
    await page.getByLabel('Логин или почта').fill(credentials[index].email!);
    await page.getByLabel('Пароль', {exact:true}).fill(credentials[index].password!);
    await page.getByRole('button',{name:'Войти в аккаунт'}).click();
  }
  async function deploy(page:Page){
    await expect(page.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible({timeout:20000});
    for(const name of ['А1','А3','А5','А7','Г7','Ж7','А9','В9','Д9','Ж9'])await page.getByRole('button',{name:`Ваше поле ${name}`,exact:true}).click();
    await page.getByRole('button',{name:'Готов к бою'}).click();
  }
  async function shoot(page:Page,name:string,result:string){
    await expect(page.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible({timeout:20000});
    await page.getByRole('button',{name:`Поле противника ${name}`,exact:true}).click();
    await expect(page.getByRole('button',{name:`Поле противника ${name} ${result}`,exact:true})).toBeVisible({timeout:20000});
  }
  try{
    await host.goto('/');await login(host,0);
    await expect(host.getByRole('heading',{name:'Профиль командира'})).toBeVisible({timeout:20000});
    await host.getByRole('button',{name:'Играть с другом',exact:true}).click();
    await host.getByRole('button',{name:'Создать комнату'}).click();
    const input=host.getByLabel('Ссылка для друга');await expect(input).toBeVisible({timeout:20000});
    const link=await input.inputValue();await guest.goto(link);await login(guest,1);
    await guest.getByRole('button',{name:'Присоединиться по приглашению'}).click();
    await deploy(host);await deploy(guest);
    await shoot(host,'К10','мимо');await shoot(guest,'К10','мимо');
    await expect(host.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible({timeout:20000});
    // Queue one real operation while offline; reconnect must resolve it exactly once.
    await a.setOffline(true);await host.getByRole('button',{name:'Поле противника А1',exact:true}).click();
    await a.setOffline(false);
    await expect(host.getByRole('button',{name:'Поле противника А1 попадание',exact:true})).toBeVisible({timeout:30000});
    await host.reload();await expect(host.getByRole('button',{name:'Поле противника А1 попадание',exact:true})).toBeVisible({timeout:20000});
    const ships=[['Б1','В1','Г1'],['А3','Б3','В3'],['А5','Б5','В5'],['А7','Б7'],['Г7','Д7'],['Ж7','З7'],['А9'],['В9'],['Д9'],['Ж9']];
    for(const cells of ships)for(const [i,c] of cells.entries())await shoot(host,c,i===cells.length-1?'потоплен':'попадание');
    await expect(host.getByRole('heading',{name:'Победа!',exact:true})).toBeVisible({timeout:20000});
    await expect(guest.getByRole('heading',{name:'Поражение',exact:true})).toBeVisible({timeout:20000});
    await host.reload();await expect(host.getByRole('heading',{name:'Победа!',exact:true})).toBeVisible({timeout:20000});
    await host.locator('.duel-heading').getByRole('button',{name:'Таблица лидеров'}).click();
    await expect(host.getByText(/Ваша позиция:/)).toBeVisible({timeout:20000});
    const score=await host.getByText(/Ваша позиция:/).textContent();
    await host.getByRole('button',{name:'Обновить таблицу'}).click();await expect(host.getByText(score!,{exact:true})).toBeVisible();
    await host.getByRole('button',{name:'Мой профиль'}).click();await expect(host.getByRole('heading',{name:'Матчи с другом'})).toBeVisible();
    await host.getByRole('button',{name:'Играть с другом',exact:true}).click();
    await host.getByRole('button',{name:'Реванш',exact:true}).click();
    await guest.getByRole('button',{name:'Принять реванш',exact:true}).click();
    await expect(host.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible({timeout:20000});
    await guest.setViewportSize({width:390,height:844});
    expect(await guest.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await host.screenshot({path:'artifacts/duel-live-desktop.png',fullPage:true});await guest.screenshot({path:'artifacts/duel-live-mobile.png',fullPage:true});
  }finally{await a.close();await b.close();}
});

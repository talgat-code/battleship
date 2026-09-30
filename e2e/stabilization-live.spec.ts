import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import type {Room} from '../src/network/api';
import {LETTERS,place,type Ship} from '../src/game';

// Opt-in only. Two genuinely independent browser sessions, real Auth/RPC/Realtime.
// No HTTP mocks, no service key and no client-supplied battle outcomes.
test('LIVE stabilization: two captains, purchases, private updates, every card, audio, reconnect and rematch',async({browser})=>{
  test.skip(process.env.STABILIZATION_LIVE!=='1');test.setTimeout(360000);
  const site=process.env.STABILIZATION_URL||'http://127.0.0.1:5173';
  const contexts=await Promise.all([browser.newContext({viewport:{width:1440,height:1000}}),browser.newContext({viewport:{width:1440,height:1000}})]);
  const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));
  const password=`Qa_${randomUUID()}`,prefix=`qa_duel_${Date.now()}`;
  const rooms=new Map<Page,Room>(),errors:string[]=[],timings:number[]=[];
  let fleet:Ship[]=[];
  [{x:0,y:0},{x:0,y:2},{x:0,y:4},{x:0,y:6},{x:3,y:6},{x:6,y:6},{x:0,y:8},{x:2,y:8},{x:4,y:8},{x:6,y:8}].forEach((cell,id)=>{fleet=place(fleet,id,cell,false);});
  for(const page of [a,b]){
    page.on('pageerror',error=>errors.push(error.message));
    page.on('response',async response=>{if(response.url().includes('/rpc/fleet_duel')&&response.ok()){const data=await response.json().catch(()=>null);if(data?.id)rooms.set(page,data);}});
    await page.addInitScript(()=>{
      (window as any).audioEvents=[];
      document.addEventListener('play',e=>{const a=e.target as HTMLAudioElement;if(a.dataset.sound)(window as any).audioEvents.push(a.dataset.sound);},true);
    });
  }
  async function register(page:Page,suffix:string){
    await page.getByRole('button',{name:'Создать аккаунт',exact:true}).click();
    await page.getByLabel('Логин',{exact:true}).fill(prefix+suffix);await page.getByLabel('Пароль',{exact:true}).fill(password);
    const response=page.waitForResponse(r=>r.url().includes('/functions/v1/login-auth')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Зарегистрироваться',exact:true}).click();
    const status=(await response).status();await page.locator('input[type=password]').evaluateAll(ns=>ns.forEach(n=>(n as HTMLInputElement).value=''));
    expect(status).toBe(200);
  }
  const ready=(page:Page)=>expect(page.locator('.duel-connection')).toHaveAttribute('data-live','true',{timeout:25000});
  async function deploy(page:Page){
    await expect(page.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible({timeout:20000});
    for(const ship of fleet){const cell=ship.cells[0];await page.getByRole('button',{name:`Ваше поле ${LETTERS[cell.x]}${cell.y+1}`,exact:true}).click();}
    await page.getByRole('button',{name:'Готов к бою',exact:true}).click();
  }
  async function shot(page:Page,x:number,y:number){
    await expect(page.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible();
    const count=rooms.get(page)!.enemy.shots.length;
    await page.getByRole('button',{name:`Поле противника ${LETTERS[x]}${y+1}`,exact:true}).click();
    await expect.poll(()=>rooms.get(page)?.enemy.shots.length).toBe(count+1);
  }
  async function card(name:string,id:string,cell?:{x:number;y:number}){
    await a.getByRole('button',{name:`${name} ×1`,exact:true}).click();
    if(cell)await a.getByRole('button',{name:`Поле противника ${LETTERS[cell.x]}${cell.y+1}`,exact:true}).click();
    else await a.getByRole('button',{name:'Применить карту',exact:true}).click();
    await expect.poll(()=>rooms.get(a)?.arsenal?.items[id]).toBe(0);
    await expect(a.getByRole('button',{name:`${name} ×0`,exact:true})).toBeDisabled();
    await a.waitForTimeout(500); // explicit anti-double-click interval after card confirmation
  }
  try{
    await a.goto(site);await a.getByRole('button',{name:'Играть с другом',exact:true}).click();await register(a,'a');
    await a.getByRole('button',{name:'Создать комнату',exact:true}).click();
    const invite=a.getByLabel('Ссылка для друга');await expect(invite).toBeVisible();const link=await invite.inputValue();
    await b.goto(link);await register(b,'b');await b.getByRole('button',{name:'Присоединиться по приглашению',exact:true}).click();
    await Promise.all([ready(a),ready(b)]);
    const id=rooms.get(a)!.id;
    await a.getByRole('button',{name:'Магазин',exact:true}).click();
    for(const item of ['sonar','chance','signal','bomb','kraken']){
      const article=a.locator(`.shop-item.art-${item}`);await article.getByRole('button',{name:'Купить',exact:true}).click();await expect(article).toContainText('В наличии: 1');
    }
    await a.getByRole('button',{name:'Вернуться к игре',exact:true}).click();await expect(a).toHaveURL(new RegExp(`room=${id}`));
    await deploy(a);await deploy(b);await Promise.all([ready(a),ready(b)]);
    expect(rooms.get(a)!.enemy.ships).toEqual([]);expect(rooms.get(b)!.enemy.ships).toEqual([]);
    const grids=a.locator('.cell-grid');const rects=()=>grids.evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height};}));
    const before=await rects();expect(before[0].y).toBe(before[1].y);
    await a.screenshot({path:'artifacts/live-duel-closed.png',fullPage:true});
    await a.getByRole('button',{name:'Эмоции',exact:true}).click();await expect.poll(()=>a.locator('.fleet-emotions-picker img').evaluateAll(ns=>ns.every(n=>(n as HTMLImageElement).naturalWidth>0))).toBe(true);
    expect(await rects()).toEqual(before);await a.screenshot({path:'artifacts/live-duel-open.png',fullPage:true});
    for(const [index,name] of ['Ха-ха','Салют','Ой!','Удача','Впереди буря','Хорошая игра'].entries()){
      if(index)await a.getByRole('button',{name:'Эмоции',exact:true}).click();
      const choice=a.getByRole('button',{name,exact:true});await expect(choice).toBeEnabled();await choice.click();
      await expect(a.locator('.fleet-emotions-reaction img')).toHaveAttribute('alt',name);
      await expect(b.locator('.fleet-emotions-reaction img')).toHaveAttribute('alt',name,{timeout:5000});
    }
    // Cancellation and invalid border are local previews; no card is charged.
    await a.getByRole('button',{name:'Гидролокатор ×1',exact:true}).click();await a.getByRole('button',{name:'Поле противника К10',exact:true}).click();
    expect(rooms.get(a)!.arsenal!.items.sonar).toBe(1);await a.keyboard.press('Escape');
    await card('Гидролокатор','sonar',{x:7,y:7});expect(rooms.get(a)!.ability?.count).toBe(0);expect(rooms.get(a)!.myTurn).toBe(true);
    await card('Второй шанс','chance');expect(rooms.get(a)!.bonus).toBe(true);
    await a.reload();await ready(a);expect(rooms.get(a)!.bonus).toBe(true);
    await shot(a,9,9);expect(rooms.get(a)!.myTurn).toBe(true);expect(rooms.get(a)!.bonus).toBe(false);
    await card('Перехват сигнала','signal');expect(rooms.get(a)!.revealed).toHaveLength(1);expect(rooms.get(a)!.enemy.shots).toHaveLength(1);
    const started=Date.now();await card('Глубинная бомба','bomb',{x:8,y:8});await expect(b.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible();timings.push(Date.now()-started-500);
    expect(rooms.get(a)!.myTurn).toBe(false);await shot(b,9,9);
    await card('Кракен','kraken');expect(rooms.get(a)!.enemy.shots.filter(s=>s.result==='sunk').length).toBeGreaterThan(0);
    // Separate audio preferences do not mute the remaining categories.
    await a.getByLabel('Настройки звука').click();await a.getByLabel('Звуки эмоций',{exact:true}).uncheck();await a.getByLabel('Море и чайки',{exact:true}).uncheck();
    expect(await a.locator('audio[data-sound=ambient]').evaluate((e:HTMLAudioElement)=>e.paused)).toBe(true);
    await a.getByLabel('Море и чайки',{exact:true}).check();await expect.poll(()=>a.locator('audio[data-sound=ambient]').evaluate((e:HTMLAudioElement)=>e.currentTime)).toBeGreaterThan(0);
    await a.getByLabel('Настройки звука').click();
    await a.reload();await ready(a);for(const key of ['sonar','chance','signal','bomb','kraken'])expect(rooms.get(a)!.arsenal?.items[key]).toBe(0);
    // Reload, navigation and browser Back all retain the same authoritative room.
    await a.getByRole('button',{name:'На главную',exact:true}).click();await a.getByRole('button',{name:'Вернуться в бой',exact:true}).click();await ready(a);expect(rooms.get(a)!.id).toBe(id);
    await a.locator('.duel-heading').getByRole('button',{name:'Таблица лидеров'}).click();await a.goBack();await ready(a);expect(rooms.get(a)!.id).toBe(id);
    const target=fleet.flatMap(s=>s.cells).find(c=>!rooms.get(a)!.enemy.shots.some(s=>s.x===c.x&&s.y===c.y))!;
    await contexts[0].setOffline(true);await expect(a.locator('.duel-connection')).toContainText('Соединение потеряно');
    await expect(a.getByRole('button',{name:`Поле противника ${LETTERS[target.x]}${target.y+1}`,exact:true})).toBeDisabled();
    await contexts[0].setOffline(false);await ready(a);await shot(a,target.x,target.y);
    for(const cell of fleet.flatMap(s=>s.cells))if(!rooms.get(a)!.enemy.shots.some(s=>s.x===cell.x&&s.y===cell.y))await shot(a,cell.x,cell.y);
    await expect(a.getByRole('heading',{name:'Победа!',exact:true})).toBeVisible();await expect(b.getByRole('heading',{name:'Поражение',exact:true})).toBeVisible();
    expect(await a.evaluate(()=>(window as any).audioEvents.includes('cannon'))).toBe(true);
    await a.locator('.duel-heading').getByRole('button',{name:'Таблица лидеров'}).click();await expect(a.getByText(/Ваша позиция:/)).toBeVisible();await a.goBack();await ready(a);
    await a.getByRole('button',{name:'Реванш',exact:true}).click();await b.getByRole('button',{name:'Принять реванш',exact:true}).click();
    await expect(a.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible();expect(rooms.get(a)!.round).toBe(2);
    await b.setViewportSize({width:390,height:844});await b.getByRole('button',{name:'Эмоции',exact:true}).click();expect(await b.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await b.screenshot({path:'artifacts/live-duel-mobile.png',fullPage:true});expect(errors).toEqual([]);
    writeFileSync('artifacts/stabilization-live.json',JSON.stringify({site,room:id,round:2,realtime:true,turnLatencyMs:timings,errors,cards:'all five, one consumption each',audio:'real media play events and ambient progression'},null,2));
  }finally{
    for(const p of [a,b])await p.locator('input[type=password]').evaluateAll(ns=>ns.forEach(n=>(n as HTMLInputElement).value='')).catch(()=>{});
    await Promise.all(contexts.map(c=>c.close()));
  }
});

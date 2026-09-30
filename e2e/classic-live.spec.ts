import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import type {Room} from '../src/network/api';

test('LIVE current client: classic match, private chat, reconnect, rematch and same profile',async({browser})=>{
  test.skip(process.env.CLASSIC_LIVE!=='1');test.setTimeout(240000);
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  const [a,b]=await Promise.all(contexts.map(c=>c.newPage()));
  const login=`qa_sea_${Date.now()}`,password=`Qa_${randomUUID()}`;
  const rooms=new Map<Page,Room>(),errors:string[]=[],failures:{status:number;message:string;type:string;round:number}[]=[];
  for(const p of [a,b]){
    p.on('pageerror',e=>errors.push(e.message));
    p.on('response',async r=>{if(r.url().includes('/rpc/fleet_duel')&&r.ok()){const data=await r.json().catch(()=>null);if(data?.id)rooms.set(p,data);}if(r.url().includes('/rpc/fleet_emote')&&!r.ok()){const data=await r.json();const {type,round}=r.request().postDataJSON().command;failures.push({status:r.status(),message:data.message,type,round});}});
    await p.addInitScript(()=>{(window as any).cannonPlays=0;document.addEventListener('play',e=>{if((e.target as HTMLAudioElement).dataset.sound==='cannon')(window as any).cannonPlays++;},true);});
  }
  async function signup(p:Page,name:string){
    await p.getByRole('button',{name:'Создать аккаунт',exact:true}).click();await p.getByLabel('Логин',{exact:true}).fill(name);await p.getByLabel('Пароль',{exact:true}).fill(password);
    const request=p.waitForResponse(r=>r.url().includes('/functions/v1/login-auth')&&r.request().method()==='POST');await p.getByRole('button',{name:'Зарегистрироваться',exact:true}).click();
    const status=(await request).status();await p.locator('input[type=password]').evaluateAll(ns=>ns.forEach(n=>(n as HTMLInputElement).value=''));expect(status).toBe(200);
  }
  async function deploy(p:Page){for(const c of ['А1','А3','А5','А7','Г7','Ж7','А9','В9','Д9','Ж9'])await p.getByRole('button',{name:`Ваше поле ${c}`,exact:true}).click();await p.getByRole('button',{name:'Готов к бою'}).click();}
  async function shoot(p:Page,c:string){await expect(p.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible();const before=rooms.get(p)!.enemy.shots.length;await p.getByRole('button',{name:`Поле противника ${c}`,exact:true}).click();await expect.poll(()=>rooms.get(p)!.enemy.shots.length).toBe(before+1);}
  try{
    await a.goto('http://127.0.0.1:5173/?view=home');await a.getByRole('button',{name:'Играть с другом',exact:true}).click();await signup(a,login+'a');await a.getByRole('button',{name:'Создать комнату'}).click();
    const link=a.getByLabel('Ссылка для друга');await expect(link).toBeVisible();await b.goto(await link.inputValue());await signup(b,login+'b');await b.getByRole('button',{name:'Присоединиться по приглашению'}).click();
    await expect(a.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible();await deploy(a);await deploy(b);await expect(a.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible();
    await a.getByRole('button',{name:'Чат с другом'}).click();await b.getByRole('button',{name:'Чат с другом'}).click();
    const hello='Капитан, связь проверена — удачной игры!';
    await a.getByLabel('Сообщение другу',{exact:true}).fill(hello);await a.getByRole('button',{name:'Отправить',exact:true}).click();
    await expect(b.getByRole('log')).toContainText(hello);await b.getByLabel('Сообщение другу',{exact:true}).fill('Вижу сообщение, начинаем!');await b.getByRole('button',{name:'Отправить',exact:true}).click();await expect(a.getByRole('log')).toContainText('Вижу сообщение, начинаем!');
    await a.screenshot({path:'artifacts/chat-live-desktop.png',fullPage:true});
    expect(rooms.get(a)!.enemy.ships).toHaveLength(0);expect(rooms.get(b)!.enemy.ships).toHaveLength(0);
    const identity=()=>a.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.endsWith('-auth-token'));return key?JSON.parse(localStorage.getItem(key)!).user.id:null;});
    const originalUser=await identity();expect(originalUser).toBeTruthy();
    await a.screenshot({path:'artifacts/classic-current-closed.png',fullPage:true});
    await a.getByRole('button',{name:'Эмоции',exact:true}).click();await a.screenshot({path:'artifacts/classic-current-open.png',fullPage:true});
    await a.getByRole('button',{name:'Салют',exact:true}).click();await expect(b.locator('.fleet-emotions-reaction')).toBeVisible({timeout:7000});
    await expect.poll(()=>a.locator('audio[data-sound=ambient]').evaluate((e:HTMLAudioElement)=>e.currentTime)).toBeGreaterThan(0);
    await shoot(a,'К10');
    await contexts[0].setOffline(true);await shoot(b,'К10');
    const offlineMessage='Сообщение после восстановления связи';await a.getByLabel('Сообщение другу',{exact:true}).fill(offlineMessage);await a.getByRole('button',{name:'Отправить',exact:true}).click();await expect(a.getByRole('button',{name:'Повторить',exact:true})).toBeVisible();
    await contexts[0].setOffline(false);await expect(a.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible({timeout:20000});
    await a.getByRole('button',{name:'Повторить',exact:true}).click();await expect(b.getByRole('log')).toContainText(offlineMessage);await expect(b.getByRole('log').getByText(offlineMessage,{exact:true})).toHaveCount(1);
    await a.reload();await expect(a.getByRole('heading',{name:'Ваш ход',exact:true})).toBeVisible();
    await a.getByRole('button',{name:'Чат с другом'}).click();await expect(a.getByRole('log')).toContainText(hello);await expect(a.getByRole('log')).toContainText(offlineMessage);
    for(const c of ['А1','Б1','В1','Г1','А3','Б3','В3','А5','Б5','В5','А7','Б7','Г7','Д7','Ж7','З7','А9','В9','Д9','Ж9'])await shoot(a,c);
    await expect(a.getByRole('heading',{name:'Победа!',exact:true})).toBeVisible();await expect(b.getByRole('heading',{name:'Поражение',exact:true})).toBeVisible();
    const missingCannon=await a.evaluate(()=>(window as any).cannonPlays===0);expect(missingCannon).toBe(false);
    const id=rooms.get(a)!.id;await a.locator('.duel-heading').getByRole('button',{name:'Таблица лидеров'}).click();await expect(a.getByText(/Ваша позиция:/)).toBeVisible();await a.getByRole('button',{name:'Играть с другом',exact:true}).click();await a.getByRole('button',{name:'Реванш',exact:true}).click();await b.getByRole('button',{name:'Принять реванш',exact:true}).click();await expect(a.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible();
    await a.locator('.duel-heading').getByRole('button',{name:'Таблица лидеров'}).click();await a.getByRole('button',{name:'Мой профиль',exact:true}).first().click();await a.getByRole('button',{name:'Выйти из аккаунта',exact:true}).click();
    await a.getByRole('button',{name:'Войти',exact:true}).click();await a.getByLabel('Логин или почта',{exact:true}).fill(login+'a');await a.getByLabel('Пароль',{exact:true}).fill(password);await a.getByRole('button',{name:'Войти в аккаунт',exact:true}).click();await a.locator('input[type=password]').evaluateAll(ns=>ns.forEach(n=>(n as HTMLInputElement).value=''));
    await a.getByRole('button',{name:'Вернуться в бой',exact:true}).click();
    await expect(a.getByRole('heading',{name:'Расстановка',exact:true})).toBeVisible();expect(rooms.get(a)!.id).toBe(id);
    expect(await identity()).toBe(originalUser);
    await a.getByRole('button',{name:'Чат с другом'}).click();await expect(a.getByRole('log')).toContainText(hello);await expect(a.getByRole('log')).toContainText(offlineMessage);
    await a.setViewportSize({width:390,height:844});expect(await a.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await a.screenshot({path:'artifacts/classic-current-mobile.png',fullPage:true});
    writeFileSync('artifacts/classic-current-live.json',JSON.stringify({room:id,completeMatch:true,rematch:true,registration:true,reloginSameUser:true,reloginRestoredRoom:true,offlineRecovery:true,chatBothDirections:true,chatOfflineRetryOnce:true,chatReloadAndRematchHistory:true,ambientPlayback:true,missingCannon,emotionFailures:failures,errors},null,2));
    expect(failures.every(f=>f.status===400&&f.message==='Round changed'&&f.type==='read'&&f.round===1)).toBe(true);expect(errors).toEqual([]);
  }finally{for(const p of [a,b])await p.locator('input[type=password]').evaluateAll(ns=>ns.forEach(n=>(n as HTMLInputElement).value='')).catch(()=>{});await Promise.all(contexts.map(c=>c.close()));}
});

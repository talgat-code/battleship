import {test,expect} from '@playwright/test';
import {randomFleet} from '../src/game';
import type {ChatMessage} from '../src/network/chat';
import {hasSupabase} from './environment';
const user='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002',id='00000000-0000-0000-0000-000000000099';
for(const width of [1440,390])test(`room chat: compact, persistent, literal text, safe retry at ${width}`,async({page})=>{
  test.skip(!hasSupabase);await page.setViewportSize({width,height:1000});
  const messages:ChatMessage[]=[],attempts:string[]=[];let drop=false,shots=0,sequence=0;
  const room={id,round:1,revision:2,status:'battle',myTurn:true,ready:true,opponentReady:true,opponent:'Капитан',own:{ships:randomFleet(),shots:[]},enemy:{ships:[],shots:[]}};
  await page.route('**/rest/v1/rpc/fleet_duel',r=>{const cmd=r.request().postDataJSON().command;if(cmd.type==='shoot')shots++;return r.fulfill({json:cmd.type==='list'?[]:room});});
  await page.route('**/rest/v1/rpc/fleet_emote',r=>r.fulfill({json:null}));await page.route('**/rest/v1/rpc/fleet_shop',r=>r.fulfill({json:{}}));
  await page.route('**/rest/v1/rpc/fleet_chat',async r=>{
    const cmd=r.request().postDataJSON().command;
    if(cmd.type==='send'){
      attempts.push(cmd.request);
      if(!messages.some(m=>m.request===cmd.request))messages.push({sequence:String(++sequence),request:cmd.request,sender:user,body:cmd.body,round:1,sentAt:new Date().toISOString()});
      if(drop){drop=false;await r.abort('failed');return;}
    }
    await r.fulfill({json:{messages:messages.filter(m=>!cmd.after||BigInt(m.sequence)>BigInt(cmd.after)),ack:cmd.type==='send'?cmd.request:null}});
  });
  await page.goto(`/e2e/fixtures/duel.html?room=${id}`);await expect(page.locator('.cell-grid')).toHaveCount(2);
  const rects=()=>page.locator('.cell-grid').evaluateAll(ns=>ns.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,w:r.width,h:r.height};}));
  const before=await rects();await page.getByRole('button',{name:'Чат с другом'}).click();await expect(page.getByLabel('Сообщение другу',{exact:true})).toBeVisible();
  expect(await rects()).toEqual(before);
  const input=page.getByLabel('Сообщение другу',{exact:true});const literal='<img src=x onerror=alert(1)> Привет!';
  await input.fill(literal);await input.press('Enter');await expect(page.getByRole('log')).toContainText(literal);expect(await page.getByRole('log').locator('img').count()).toBe(0);
  expect(shots).toBe(0);expect(messages).toHaveLength(1);
  await page.getByRole('button',{name:'Чат с другом'}).click();messages.push({sequence:String(++sequence),request:crypto.randomUUID(),sender:other,round:1,body:'Привет с другого корабля!',sentAt:new Date().toISOString()});
  await expect(page.getByRole('button',{name:'Чат с другом'})).toContainText('1 новых');await page.getByRole('button',{name:'Чат с другом'}).click();await expect(page.getByRole('log')).toContainText('Привет с другого корабля!');
  drop=true;await input.fill('Дошло только один раз');await page.getByRole('button',{name:'Отправить',exact:true}).click();
  // Reload after a lost acknowledgement: polling discovers the committed message.
  await page.reload();await page.getByRole('button',{name:'Чат с другом'}).click();await expect(page.getByRole('log')).toContainText('Дошло только один раз');await expect(input).toHaveValue('');
  expect(messages.filter(m=>m.body==='Дошло только один раз')).toHaveLength(1);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const chatRect=await page.locator('.room-chat').evaluate(n=>{const r=n.getBoundingClientRect();return {y:r.y+scrollY};});for(const r of await rects())expect(chatRect.y).toBeGreaterThanOrEqual(r.y+r.h);
  await page.screenshot({path:`artifacts/chat-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Поле противника К10',exact:true}).click();expect(shots).toBe(1);expect(attempts).toHaveLength(2);
});

test('friend battle remains usable when browser storage refuses writes',async({page})=>{
  test.skip(!hasSupabase);
  await page.addInitScript(()=>{Storage.prototype.setItem=function(){throw new DOMException('Storage unavailable','QuotaExceededError');};Storage.prototype.removeItem=function(){throw new DOMException('Storage unavailable','SecurityError');};});
  let shots=0;
  const room={id,round:1,revision:2,status:'battle',myTurn:true,ready:true,opponentReady:true,opponent:'Капитан',own:{ships:randomFleet(),shots:[]},enemy:{ships:[],shots:[] as {x:number;y:number;result:string}[]}};
  await page.route('**/rest/v1/rpc/fleet_duel',r=>{const cmd=r.request().postDataJSON().command;if(cmd.type==='shoot'){shots++;room.enemy.shots.push({x:cmd.x,y:cmd.y,result:'miss'});room.myTurn=false;room.revision++;}return r.fulfill({json:cmd.type==='list'?[]:room});});
  await page.route('**/rest/v1/rpc/fleet_shop',r=>r.fulfill({json:{}}));
  await page.route('**/rest/v1/rpc/fleet_emote',r=>r.fulfill({json:null}));
  await page.route('**/rest/v1/rpc/fleet_chat',r=>r.fulfill({json:{messages:[],ack:null}}));
  await page.goto(`/e2e/fixtures/duel.html?room=${id}`);await page.getByRole('button',{name:'Поле противника К10',exact:true}).click();
  await expect(page.getByRole('button',{name:'Поле противника К10 мимо',exact:true})).toBeVisible();expect(shots).toBe(1);
  await page.reload();await expect(page.getByRole('button',{name:'Поле противника К10 мимо',exact:true})).toBeVisible();expect(shots).toBe(1);
});

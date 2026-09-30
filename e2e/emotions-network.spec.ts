import {test,expect} from '@playwright/test';
import {hasSupabase} from './environment';
test('confirmed remote and local IDs use the same overlay; receiver mute is respected',async({page})=>{
  test.skip(!hasSupabase,'RPC client requires configured public URL/key; responses here are controlled fixtures.');
  await page.setViewportSize({width:390,height:844});
  await page.addInitScript(()=>{
    (window as any).reactionSounds=[];
    const original=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args:Parameters<typeof original>){(window as any).reactionSounds.push('decoded');return original.apply(this,args);};
  });
  let event:unknown=null;const sent:any[]=[];
  await page.route('**/rest/v1/rpc/fleet_emote',async route=>{
    const {command}=route.request().postDataJSON();
    if(command.type==='send'){sent.push(command);await route.fulfill({json:{ok:true}});}
    else await route.fulfill({json:event});
  });
  await page.goto('/e2e/fixtures/reactions.html');
  await page.getByRole('button',{name:'Выключить звук',exact:true}).click();
  const board=page.locator('.board');const before=await board.boundingBox();
  event={event:'first',emotion:'storm',sent_at:new Date().toISOString()};
  await expect(page.locator('.fleet-emotions-reaction')).toContainText('Соперник');
  expect(await page.evaluate(()=>(window as any).reactionSounds)).toEqual([]);
  expect(await board.boundingBox()).toEqual(before);
  await page.getByRole('button',{name:'Включить звук',exact:true}).click();
  event={event:'second',emotion:'salute',sent_at:new Date().toISOString()};
  await expect(page.locator('.fleet-emotions-reaction')).toContainText('Привет, капитан!');
  await expect.poll(()=>page.evaluate(()=>(window as any).reactionSounds.length)).toBe(1);
  await page.locator('.board-container').screenshot({path:'artifacts/emotion-opponent.png'});
  await page.getByRole('button',{name:'Эмоции',exact:true}).click();
  await page.getByRole('button',{name:'Хорошая игра',exact:true}).click();
  await expect(page.locator('.fleet-emotions-reaction')).toContainText('Хорошая игра!');
  expect(sent).toHaveLength(1);expect(sent[0].emotion).toBe('gg');
  expect(Object.keys(sent[0]).sort()).toEqual(['emotion','event','room','round','type']);
  expect(await board.boundingBox()).toEqual(before);
});

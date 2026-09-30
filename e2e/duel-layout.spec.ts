import {test,expect} from '@playwright/test';
import {randomFleet} from '../src/game';
import {newWallet} from '../src/shop/economy';
import {hasSupabase} from './environment';

for(const width of [1440,390])test(`duel layout: stationary grids and non-overlapping emote menu at ${width}`,async({page})=>{
  test.skip(!hasSupabase);
  await page.setViewportSize({width,height:1000});
  const room={id:'00000000-0000-0000-0000-000000000099',round:1,revision:4,status:'battle',myTurn:true,ready:true,opponentReady:true,
    opponent:'Адмирал с очень длинным позывным в северном море',own:{ships:randomFleet(),shots:[]},enemy:{ships:[],shots:[]},arsenal:{...newWallet(),items:{sonar:1,bomb:1,kraken:1}}};
  await page.route('**/rest/v1/rpc/fleet_duel',r=>r.fulfill({json:r.request().postDataJSON().command.type==='list'?[]:room}));
  await page.route('**/rest/v1/rpc/fleet_shop',r=>r.fulfill({json:room.arsenal}));
  await page.route('**/rest/v1/rpc/fleet_emote',r=>r.fulfill({json:null}));
  await page.route('**/rest/v1/rpc/fleet_chat',r=>r.fulfill({json:{messages:[],ack:null}}));
  await page.goto(`/e2e/fixtures/duel.html?room=${room.id}`);
  const grids=page.locator('.cell-grid');await expect(grids).toHaveCount(2);
  const rects=()=>grids.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};}));
  const before=await rects();if(width>760)expect(before[0].y).toBe(before[1].y);
  await page.screenshot({path:`artifacts/duel-${width}-closed.png`,fullPage:true});
  await page.getByRole('button',{name:'Эмоции',exact:true}).click();
  await expect(page.locator('.fleet-emotions-menu')).toBeVisible();
  await expect.poll(()=>page.locator('.fleet-emotions-picker img').evaluateAll(ns=>ns.every(n=>(n as HTMLImageElement).naturalWidth>0))).toBe(true);
  expect(await rects()).toEqual(before);
  const menu=await page.locator('.fleet-emotions-menu').evaluate(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height};});
  expect(menu.x).toBeGreaterThanOrEqual(0);expect(menu.x+menu.width).toBeLessThanOrEqual(width);
  for(const r of before)expect(menu.y>=r.y+r.height||menu.x>=r.x+r.width||menu.x+menu.width<=r.x).toBe(true);
  await page.screenshot({path:`artifacts/duel-${width}-open.png`,fullPage:true});
  await page.getByRole('button',{name:'Ха-ха',exact:true}).click();await expect(page.locator('.fleet-emotions-reaction')).toBeVisible();expect(await rects()).toEqual(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Гидролокатор ×1',exact:true}).click();
  await page.getByRole('button',{name:'Поле противника К10',exact:true}).click();
  await expect(page.getByText('Область должна целиком находиться внутри поля. Карта не потрачена.',{exact:false})).toBeVisible();
  await page.keyboard.press('Escape');await expect(page.locator('.ability-confirm')).toHaveCount(0);
});

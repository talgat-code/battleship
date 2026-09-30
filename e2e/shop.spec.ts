import { test,expect, type Page } from '@playwright/test';
import { chooseShot } from '../src/bot';
import { STORAGE_KEY, freshGame, place, type Shot, type Ship } from '../src/game';
import {sunkPerimeter} from '../src/sunkPerimeter';
const walletKey='fleet:wallet:v1:guest';
async function finish(page:Page){
  await page.clock.install();
  for(let n=0;n<220;n++){
    const g=await page.evaluate(key=>{const v=JSON.parse(localStorage.getItem(key)!);return {phase:v.phase,turn:v.turn,shots:v.bot.shots as Shot[]};},STORAGE_KEY);
    if(g.phase==='finished')break;
    if(g.turn==='bot'){await page.clock.fastForward(1000);continue;}
    const c=chooseShot([...g.shots,...sunkPerimeter(g.shots).map(c=>({...c,result:'miss' as const}))],'admiral');
    await page.getByRole('button',{name:`Enemy board ${'ABCDEFGHIJ'[c.x]}${c.y+1}`,exact:true}).click();
  }
  await expect(page.locator('.victory-card')).toBeVisible();
}
test('guest language, full match, reward, purchase, boosted match and restore',async({page})=>{
  test.setTimeout(180000);
  await page.goto('/');await page.getByRole('button',{name:'Играть без регистрации',exact:true}).click();
  await page.locator('.language-switch').first().selectOption('en');
  await page.getByRole('combobox',{name:'Bot difficulty',exact:true}).selectOption('rookie');
  await page.getByRole('button',{name:'Auto deploy',exact:true}).click();await page.getByRole('button',{name:'Start operation',exact:true}).click();
  await finish(page);await expect(page.locator('.reward-notice')).toContainText('Match reward:');
  const rewarded=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).balance,walletKey);
  expect([5590,5635]).toContain(rewarded);
  await page.reload();await expect(page.locator('.victory-card')).toBeVisible();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).balance,walletKey)).toBe(rewarded);
  await page.getByRole('button',{name:/Shop ·/}).click();await page.getByRole('button',{name:'Cards',exact:true}).click();
  const sonar=page.locator('.shop-item').filter({has:page.getByRole('heading',{name:'Sonar',exact:true})});
  await sonar.getByRole('button',{name:'Buy',exact:true}).click();await expect(sonar).toContainText('Owned: 1');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).balance,walletKey)).toBe(rewarded-180);
  await page.screenshot({path:'artifacts/shop-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Back to game',exact:true}).click();await page.getByRole('button',{name:'New operation',exact:true}).click();
  await page.getByRole('button',{name:'Auto deploy',exact:true}).click();await page.getByRole('button',{name:'Start operation',exact:true}).click();
  await page.getByRole('button',{name:/Sonar ×1/}).click();await page.getByRole('button',{name:'Enemy board A1',exact:true}).click();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).bot.shots.length,STORAGE_KEY)).toBe(0);
  await expect(page.locator('.ability-outcome')).toContainText('Sonar: undamaged segments');
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).items.sonar,walletKey)).toBe(0);
  await page.reload();await expect(page.locator('.ability-outcome')).toContainText('Sonar: undamaged segments');
  await finish(page);await expect(page.locator('.reward-notice')).toContainText('Match reward:');
});
test('mobile Kazakh card shop, free emotes, insufficient tokens and no overflow',async({page})=>{
  await page.addInitScript(()=>{const k='fleet:wallet:v1:guest';if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({version:1,testingGrant:1,balance:350,items:{},equipped:[],hidden:false,rewards:[],receipts:[]}));});
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  await page.locator('.language-switch').first().selectOption('kk');await page.getByRole('button',{name:'Дүкен',exact:true}).click();
  await page.getByRole('button',{name:'Карталар',exact:true}).click();await page.locator('.art-kraken').getByRole('button',{name:'Сатып алу',exact:true}).click();
  await expect(page.getByRole('status')).toContainText('Жетон жеткіліксіз');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/shop-kazakh-mobile.png',fullPage:true});
  await page.reload();await expect(page.locator('html')).toHaveAttribute('lang','kk');
  await page.getByRole('button',{name:'Дүкен',exact:true}).click();await expect(page.locator('.token-balance')).toContainText('350');
});
test('English screens contain no leftover Russian copy',async({page})=>{
  await page.goto('/');await page.locator('.language-switch').first().selectOption('en');
  async function english(){const text=await page.locator('body').innerText();expect(text).not.toMatch(/[А-Яа-яЁё]/);}
  await english();await page.getByRole('button',{name:'Sign in',exact:true}).click();await english();
  await page.getByRole('button',{name:'Create account',exact:true}).click();await english();
  await page.getByRole('button',{name:'Play as guest',exact:true}).click();await english();
  await page.getByRole('button',{name:'Game rules',exact:true}).click();await english();
  await page.getByRole('button',{name:/Shop ·/}).click();await english();await page.getByRole('button',{name:'Cards',exact:true}).click();await english();
});
test('tap rotates an already placed carrier while preserving the rest',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();
  await page.goto('/');await page.getByRole('button',{name:'Играть без регистрации',exact:true}).tap();
  await page.getByRole('button',{name:'Ваше поле А1',exact:true}).tap();await page.getByRole('button',{name:'Разместить · А1',exact:true}).tap();
  await page.getByRole('button',{name:'Ваше поле А1',exact:true}).tap();
  const cells=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).player.ships[0].cells,STORAGE_KEY);
  expect(cells).toEqual([{x:0,y:0},{x:0,y:1},{x:0,y:2},{x:0,y:3}]);
  await context.close();
});
test('two guest tabs cannot spend the same balance twice',async({context,page})=>{
  await page.addInitScript(()=>{const k='fleet:wallet:v1:guest';if(!localStorage.getItem(k))localStorage.setItem(k,JSON.stringify({version:1,testingGrant:1,balance:350,items:{},equipped:[],hidden:false,rewards:[],receipts:[]}));});
  await page.goto('/');await page.getByRole('button',{name:'Магазин',exact:true}).click();await page.getByRole('button',{name:'Карточки',exact:true}).click();
  const second=await context.newPage();await second.goto('/');await second.getByRole('button',{name:'Магазин',exact:true}).click();await second.getByRole('button',{name:'Карточки',exact:true}).click();
  await Promise.all([page,second].map(p=>p.locator('.art-sonar').getByRole('button',{name:'Купить',exact:true}).click()));
  const wallet=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),walletKey);
  expect(wallet.balance).toBe(170);expect(wallet.items.sonar).toBe(1);
  await second.close();
});
test('boosted cards: extra shot, reveal, area attack and kraken',async({page})=>{
  let ships:Ship[]=[];
  [{x:0,y:0},{x:0,y:2},{x:0,y:4},{x:0,y:6},{x:3,y:6},{x:6,y:6},{x:0,y:8},{x:2,y:8},{x:4,y:8},{x:6,y:8}].forEach((c,id)=>{ships=place(ships,id,c,false);});
  const game={...freshGame(),matchId:'fixture-cards',mode:'boosted',phase:'battle',player:{ships,shots:[]},bot:{ships,shots:[]}};
  await page.addInitScript(({game,key,walletKey})=>{if(localStorage.getItem(key))return;localStorage.setItem('fleet:entry','guest');localStorage.setItem(key,JSON.stringify(game));localStorage.setItem(walletKey,JSON.stringify({version:1,balance:0,items:{chance:2,signal:1,bomb:1,kraken:1},equipped:[],hidden:false,rewards:[],receipts:[],game}));},{game,key:STORAGE_KEY,walletKey});
  await page.goto('/');
  async function use(name:string){await page.getByRole('button',{name:new RegExp(name+' ×')}).click();await page.getByRole('button',{name:'Применить карту',exact:true}).click();}
  await use('Второй шанс');await page.getByRole('button',{name:'Поле противника К10',exact:true}).click();
  await expect(page.getByText('Ваш ход, командир')).toBeVisible();
  await page.getByRole('button',{name:'Поле противника А1',exact:true}).click();
  await use('Перехват сигнала');await expect(page.locator('.enemy-card .revealed').first()).toBeVisible();
  await page.getByRole('button',{name:/Глубинная бомба ×1/}).click();await page.getByRole('button',{name:'Поле противника А1 попадание',exact:true}).click();
  await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).bot.shots.length,STORAGE_KEY)).toBe(5);
  await use('Кракен');await expect(page.locator('.enemy-card .sunk').first()).toBeVisible();
  await page.screenshot({path:'artifacts/boosted-battle.png',fullPage:true});
  const before=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),walletKey);await page.reload();
  expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).items,walletKey)).toEqual(before.items);
});

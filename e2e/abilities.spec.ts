import { test,expect,type Page } from '@playwright/test';
import { freshGame,place,fire,LETTERS,STORAGE_KEY,type Game,type Ship } from '../src/game';
const walletKey='fleet:wallet:v1:guest';
function fixture():Game {
  let ships:Ship[]=[];
  [{x:0,y:0},{x:0,y:2},{x:0,y:4},{x:0,y:6},{x:3,y:6},{x:6,y:6},{x:0,y:8},{x:2,y:8},{x:4,y:8},{x:6,y:8}].forEach((c,id)=>{ships=place(ships,id,c,false);});
  return {...freshGame(),matchId:crypto.randomUUID(),mode:'classic',phase:'battle',player:{ships,shots:[]},bot:{ships,shots:[]}};
}
async function install(page:Page,game:Game,items:Record<string,number>={}){
  await page.addInitScript(({game,items,walletKey,key})=>{if(localStorage.getItem(walletKey))return;localStorage.setItem('fleet:entry','guest');localStorage.setItem(key,JSON.stringify(game));localStorage.setItem(walletKey,JSON.stringify({version:1,testingGrant:1,balance:5555,items,equipped:[],hidden:false,rewards:[],receipts:[],game}));},{game,items,walletKey,key:STORAGE_KEY});
}
const state=(page:Page)=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),walletKey);
const cell=(page:Page,name:string)=>page.getByRole('button',{name:`Поле противника ${name}`,exact:true});
const select=(page:Page,name:string)=>page.getByRole('button',{name:new RegExp(`^${name} ×`)}).click();
async function apply(page:Page,name:string){await select(page,name);await page.getByRole('button',{name:'Применить карту',exact:true}).click();}

test('buy all five, use in a legacy classic battle, reload and finish',async({page})=>{
  test.setTimeout(90000);const g=fixture();g.phase='setup';g.player.ships=[];await install(page,g);
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');await page.getByRole('button',{name:/Магазин ·/}).click();await page.getByRole('button',{name:'Карточки',exact:true}).click();
  for(const id of ['sonar','chance','signal','bomb','kraken'])await page.locator(`.art-${id}`).getByRole('button',{name:'Купить',exact:true}).click();
  expect((await state(page)).balance).toBe(3365);
  await page.getByRole('button',{name:'Вернуться к игре',exact:true}).click();await page.getByRole('button',{name:'Авторасстановка'}).click();await page.getByRole('button',{name:'Начать операцию'}).click();
  await expect(page.getByRole('heading',{name:'Карты способностей'})).toBeVisible();
  await select(page,'Гидролокатор');await cell(page,'А1').hover();await expect(page.locator('.enemy-card .preview')).toHaveCount(9);await cell(page,'А1').click();
  expect((await state(page)).game.ability.count).toBe(6);expect((await state(page)).game.bot.shots).toHaveLength(0);
  await apply(page,'Второй шанс');await page.reload();expect((await state(page)).game.bonus).toBe(true);
  await cell(page,'К10').click();await expect(page.getByText('Ваш ход, командир')).toBeVisible();expect((await state(page)).game.bonus).toBe(false);
  await cell(page,'А1').click();await apply(page,'Перехват сигнала');expect(await page.locator('.revealed').count()).toBeGreaterThan(0);
  await select(page,'Глубинная бомба');await cell(page,'А1 попадание').click();expect((await state(page)).game.bot.shots).toHaveLength(5);
  await apply(page,'Кракен');await page.locator('.enemy-card .board').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/ability-kraken-desktop.png',fullPage:true});
  for(const id of ['sonar','chance','signal','bomb','kraken'])expect((await state(page)).items[id]).toBe(0);
  await page.reload();expect((await state(page)).game.phase).toBe('battle');
  for(const ship of g.bot.ships)for(const c of ship.cells){const shots=(await state(page)).game.bot.shots;if(shots.some((p:{x:number;y:number})=>p.x===c.x&&p.y===c.y))continue;await cell(page,`${LETTERS[c.x]}${c.y+1}`).click();}
  await expect(page.locator('.victory-card')).toContainText('ПОБЕДА');expect(errors).toEqual([]);
});
test('cancel, invalid edges, retry and rapid click never consume twice',async({page})=>{
  await install(page,fixture(),{sonar:2,bomb:1});await page.goto('/');
  await select(page,'Гидролокатор');await cell(page,'А1').hover();await page.keyboard.press('Escape');expect((await state(page)).items.sonar).toBe(2);await expect(page.locator('.enemy-card .preview')).toHaveCount(0);
  await select(page,'Гидролокатор');await cell(page,'К10').click();await expect(page.locator('.ability-deck [role=alert]')).toContainText('край');expect((await state(page)).items.sonar).toBe(2);
  await cell(page,'А1').dblclick();await expect(page.getByRole('button',{name:'Гидролокатор ×1',exact:true})).toBeVisible();expect((await state(page)).game.bot.shots).toHaveLength(0);
  await select(page,'Глубинная бомба');await cell(page,'К10').click();expect((await state(page)).items.bomb).toBe(1);await page.getByRole('button',{name:'Отмена · Esc',exact:true}).click();
  expect((await state(page)).game.log.filter((l:string)=>l.startsWith('Гидролокатор:'))).toHaveLength(1);
  await page.reload();expect((await state(page)).items.sonar).toBe(1);expect((await state(page)).game.bot.shots).toHaveLength(0);
});
test('mobile targeting previews on first tap and applies on second without overflow',async({browser})=>{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();await install(page,fixture(),{sonar:1,bomb:1});await page.goto('/');
  await select(page,'Гидролокатор');await cell(page,'З8').tap();await expect(page.locator('.enemy-card .preview')).toHaveCount(9);expect((await state(page)).items.sonar).toBe(1);await cell(page,'З8').tap();
  await expect(page.getByRole('button',{name:'Гидролокатор ×0',exact:true})).toBeDisabled();expect((await state(page)).game.bot.shots).toHaveLength(0);
  await select(page,'Глубинная бомба');await cell(page,'И9').tap();await expect(page.locator('.enemy-card .preview')).toHaveCount(4);await page.getByRole('button',{name:'Отмена · Esc',exact:true}).tap();
  expect((await state(page)).items.bomb).toBe(1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/ability-mobile.png',fullPage:true});await context.close();
});
test('empty inventory stays visible; kraken can win and cannot repeat after reload',async({page})=>{
  let g=fixture();for(const ship of g.bot.ships.slice(0,-1))for(const c of ship.cells)g=fire(g,'player',c);
  await install(page,g,{kraken:1});await page.goto('/');await apply(page,'Кракен');await expect(page.locator('.victory-card')).toContainText('ПОБЕДА');expect((await state(page)).items.kraken).toBe(0);
  await expect(page.locator('.empty-arsenal')).toBeVisible();const balance=(await state(page)).balance;await page.reload();expect((await state(page)).balance).toBe(balance);await expect(page.getByRole('button',{name:'Кракен ×0',exact:true})).toBeDisabled();
});

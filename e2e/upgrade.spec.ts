import { test,expect } from '@playwright/test';
import { chooseShot, type Difficulty } from '../src/bot';
import { STORAGE_KEY,LETTERS, type Shot } from '../src/game';
import {sunkPerimeter} from '../src/sunkPerimeter';

for(const level of ['rookie','tactician','admiral'] as Difficulty[])test(`complete guest match on ${level}`,async({page})=>{
  test.setTimeout(120000);
  await page.goto('/');await page.getByRole('button',{name:'Играть без регистрации',exact:true}).click();
  await page.getByRole('combobox',{name:'Сложность бота',exact:true}).selectOption(level);
  await page.getByRole('button',{name:'Авторасстановка'}).click();
  await page.getByRole('button',{name:'Начать операцию'}).click();
  await page.clock.install();
  for(let n=0;n<210;n++){
    const visible=await page.evaluate(key=>{const g=JSON.parse(localStorage.getItem(key)!);return{phase:g.phase,turn:g.turn,shots:g.bot.shots as Shot[]};},STORAGE_KEY);
    if(visible.phase==='finished')break;
    if(visible.turn==='bot'){await page.clock.fastForward(1000);continue;}
    const c=chooseShot([...visible.shots,...sunkPerimeter(visible.shots).map(c=>({...c,result:'miss' as const}))],'admiral');
    await page.getByRole('button',{name:`Поле противника ${LETTERS[c.x]}${c.y+1}`,exact:true}).click();
  }
  await expect(page.locator('.victory-card')).toBeVisible();
  await page.reload();await expect(page.locator('.victory-card')).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('fleet:difficulty'))).toBe(level);
});

test('keyboard rotation validates boundaries without losing placed ships',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Играть без регистрации',exact:true}).click();
  const corner=page.getByRole('button',{name:'Ваше поле К1',exact:true});
  await corner.hover();await expect(page.locator('.cell.invalid')).toHaveCount(1);
  await page.keyboard.press('r');await expect(page.locator('.cell.preview')).toHaveCount(4);
  await corner.click();await expect(page.getByText('Осталось разместить: 9')).toBeVisible();
  await page.getByRole('button',{name:'Ваше поле А10',exact:true}).hover();
  await page.keyboard.press('r');await expect(page.locator('.cell.preview')).toHaveCount(3);
  await page.getByRole('button',{name:'Ваше поле А10',exact:true}).click();
  await expect(page.getByText('Осталось разместить: 8')).toBeVisible();
  await page.getByRole('button',{name:'Ваше поле К10',exact:true}).hover();await page.keyboard.press('r');
  await expect(page.getByRole('alert')).toContainText('После поворота');
  await page.getByRole('button',{name:'Ваше поле К10',exact:true}).click();await expect(page.getByText('Осталось разместить: 8')).toBeVisible();
});

test('lighthouse four quarters and distant moon',async({page})=>{
  for(let i=0;i<4;i++){
    await page.goto(`/?diagnostics=1&beamAngle=${i*Math.PI/2}`);
    await expect(page.locator('.harbor-backdrop canvas')).toHaveAttribute('data-beacon',String(i*Math.PI/2));
    await page.screenshot({path:`artifacts/beacon-quarter-${i}.png`,fullPage:true});
  }
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'artifacts/moon-mobile.png',fullPage:true});
});

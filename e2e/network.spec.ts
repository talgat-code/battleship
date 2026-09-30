import { test,expect } from '@playwright/test';
import {hasSupabase} from './environment';

test('friend entry preserves invite through login; unconfigured service never simulates a match',async({page})=>{
  test.skip(hasSupabase,'This scenario checks the unconfigured-service notice.');
  await page.goto('/?invite=9d9e6427-dd82-4e23-acb0-a539c2be471a');
  await expect(page.getByRole('heading',{name:'Играть с другом'})).toBeVisible();
  await expect(page.getByText(/Сервис аккаунтов и сетевой игры не настроен/)).toBeVisible();
  await expect(page.getByRole('button',{name:'Создать комнату'})).toHaveCount(0);
  await page.getByRole('button',{name:'Войти',exact:true}).click();
  await expect(page.getByRole('button',{name:'Войти в аккаунт'})).toBeDisabled();
  await expect(page).toHaveURL(/invite=9d9e6427/);
  await page.getByRole('button',{name:'Играть с другом',exact:true}).click();
  await page.setViewportSize({width:390,height:844});
  await expect(page.getByRole('heading',{name:'Играть с другом'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:'artifacts/friend-unconfigured-mobile.png',fullPage:true});
  await page.getByRole('button',{name:'Таблица лидеров',exact:true}).click();
  await expect(page.getByText(/Сетевой сервис не настроен/)).toBeVisible();
  await expect(page.locator('tbody tr')).toHaveCount(0);
});

test('home offers both modes and bot still starts without an account',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:'Играть с ботом',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Играть с другом',exact:true})).toBeVisible();
  await page.screenshot({path:'artifacts/game-modes-desktop.png',fullPage:true});
  await page.getByRole('button',{name:'Играть с ботом',exact:true}).click();
  await expect(page.getByRole('button',{name:'Авторасстановка'})).toBeVisible();
});

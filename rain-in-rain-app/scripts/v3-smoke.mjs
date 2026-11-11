import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results/v3',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.BASE_URL||'http://localhost:5173');await page.waitForSelector('canvas');await page.waitForTimeout(1000);await page.screenshot({path:'test-results/v3/title.png'});
 await page.click('#mouse-start');await expect(page.locator('#skip-intro')).toBeVisible({timeout:30000});await expect(page.locator('#caption')).toBeHidden();
 await page.waitForFunction(()=>Number(document.getElementById('stage').dataset.filmTime)>13,{},{timeout:30000});const car1=JSON.parse(await page.locator('#stage').getAttribute('data-car'));expect(car1.visible).toBe(true);await page.waitForTimeout(400);const car2=JSON.parse(await page.locator('#stage').getAttribute('data-car'));expect(car2.x).toBeGreaterThan(car1.x);expect(car2.wheel).toBeGreaterThan(car1.wheel);await expect(page.locator('#film-credits')).toContainText('游戏制作：蒋欣笑');await expect(page.locator('#film-credits')).toContainText('音乐生成：蒋欣笑');await expect(page.locator('#film-credits')).toContainText('美术制作：蒋欣笑');await page.screenshot({path:'test-results/v3/film.png'});
 await page.click('#skip-intro');await expect(page.locator('#caption')).toBeVisible();await expect(page.locator('#film-credits')).toBeHidden();await expect(page.locator('#skip-intro')).toBeHidden();await page.waitForTimeout(1200);await page.screenshot({path:'test-results/v3/city.png'});
 await page.click('#pause');await expect(page.locator('#paused')).toBeVisible();await page.click('#pause');await expect(page.locator('#paused')).toBeHidden();
 console.log('首页、电影片头三行署名、自动车辆、跳过交接、暂停与恢复通过。');console.log('运行时异常：',errors);expect(errors).toEqual([]);
} finally {await browser.close();}

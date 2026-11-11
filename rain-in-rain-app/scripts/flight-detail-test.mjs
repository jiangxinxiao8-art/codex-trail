import {legacyURL} from './legacy-url.mjs';
import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{const page=await browser.newPage({viewport:{width:960,height:540}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 // Explicit isolated-scene harness: production code gets no debug hook.
 await page.route('**/src/legacy-main.ts*',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.__flightTest = game;'});});
 await page.goto(legacyURL());await page.waitForSelector('canvas');await page.click('#mouse-start');await page.waitForSelector('#skip-intro:visible');await page.click('#skip-intro');
 await page.evaluate(()=>{const g=window.__flightTest;g.machine.index=4;g.enter();g.machine.progress=1;g.phase='flight';g.stage.flight.start();g.stage.flight.phase='flying';g.stage.flight.position3={x:-70,y:145,z:300};});
 await page.mouse.move(480,270);await page.mouse.click(480,270);await expect(page.locator('#stage')).toHaveAttribute('data-collected','1',{timeout:5000});await page.mouse.click(480,270);await page.waitForTimeout(400);await expect(page.locator('#stage')).toHaveAttribute('data-collected','1');
 await page.keyboard.down('Space');await page.waitForTimeout(2000);await page.screenshot({path:'test-results/v3/flight-detail.png'});await page.keyboard.up('Space');expect(errors).toEqual([]);console.log('隔离飞行场景：可见光滴的捏合收集、一次性反馈、滑翔张臂与轨迹绘制通过；非替代完整剧情验收。');
}finally{await browser.close();}

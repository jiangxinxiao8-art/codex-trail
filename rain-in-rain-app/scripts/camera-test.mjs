import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:800,height:600}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__cameraCalls=0;const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.__cameraCalls++;return get(...args);};});
 await page.goto('http://localhost:5173');await page.waitForSelector('canvas');await page.click('#start');
 await expect(page.locator('#caption')).toBeVisible({timeout:60000});await expect(page.locator('#mode-label')).toContainText('摄像头模式');await page.waitForTimeout(2500);await expect(page.locator('#mode-label')).toContainText('摄像头模式');
 expect(await page.evaluate(()=>window.__cameraCalls)).toBe(1);await expect(page.locator('#notice')).toBeHidden();expect(errors).toEqual([]);
 console.log('真实 task 模型 + WASM 初始化、模拟摄像头视频采集、逐帧推理调用通过，0 未捕获异常；不代表真人手势验收。');
} finally {await browser.close();}

import {legacyURL} from './legacy-url.mjs';
import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:960,height:600}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__cameraCalls=0;const get=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);navigator.mediaDevices.getUserMedia=(...args)=>{window.__cameraCalls++;return get(...args);};});
 await page.goto(legacyURL());await page.waitForSelector('canvas');await page.click('#start');await expect(page.locator('#skip-intro')).toBeVisible({timeout:60000});await page.click('#skip-intro');
 await expect(page.locator('#mode-label')).toContainText('摄像头模式');await page.click('#camera-preview-toggle');await expect(page.locator('#camera-preview')).toBeVisible();const state=await page.locator('video').evaluate(v=>({time:v.currentTime,live:v.srcObject.getVideoTracks()[0].readyState}));expect(state.live).toBe('live');
 await page.click('#camera-preview-toggle');await expect(page.locator('#camera-preview')).toBeHidden();await page.waitForTimeout(1800);const hidden=await page.locator('video').evaluate(v=>({time:v.currentTime,live:v.srcObject.getVideoTracks()[0].readyState}));expect(hidden.live).toBe('live');expect(hidden.time).toBeGreaterThan(state.time);expect(await page.evaluate(()=>window.__cameraCalls)).toBe(1);expect(await page.locator('video').count()).toBe(1);await expect(page.locator('#mode-label')).toContainText('摄像头模式');
 await page.click('#camera-preview-toggle');await expect(page.locator('#camera-preview')).toBeVisible();await page.screenshot({path:'test-results/v3/preview.png'});
 await page.click('#settings-toggle');await page.click('#restart');expect(await page.locator('video').evaluate(v=>v.srcObject)).toBe(null);await expect(page.locator('#camera-preview')).toBeHidden();await expect(page.locator('#intro')).toBeVisible();expect(errors).toEqual([]);
 console.log('官方模型逐帧推理、预览开关、隐藏预览后同一路视频继续解码、仅一次 getUserMedia、重启释放视频流均通过；真人手势仍需本机验证。');
}finally{await browser.close();}

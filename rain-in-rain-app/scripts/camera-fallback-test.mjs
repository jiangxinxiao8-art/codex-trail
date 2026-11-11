import {legacyURL} from './legacy-url.mjs';
import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
 const page=await browser.newPage({viewport:{width:800,height:600}});
 await page.route('**/assets/models/hand_landmarker.task',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html>Vite fallback</html>'}));
 await page.addInitScript(()=>{window.__cameraCalls=0;navigator.mediaDevices.getUserMedia=async()=>{window.__cameraCalls++;throw new Error('不应在无效模型时请求摄像头');};});
 await page.goto(legacyURL());await page.waitForSelector('canvas');await page.click('#start');
 await expect(page.locator('#skip-intro')).toBeVisible({timeout:60000});await page.click('#skip-intro');await expect(page.locator('#caption')).toBeVisible();await expect(page.locator('#mode-label')).toContainText('鼠标模式');await expect(page.locator('#notice')).toContainText('模型缺失或损坏');expect(await page.evaluate(()=>window.__cameraCalls)).toBe(0);
 console.log('模型 URL 返回 HTML 时显示明确修复提示并回退鼠标，不请求摄像头、不进入 MediaPipe ZIP 解析。');
} finally {await browser.close();}

import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:960,height:600}});const errors=[];await page.addInitScript(()=>{window.__musicStarts=[];window.__timeOffset=0;const raf=window.requestAnimationFrame.bind(window);window.requestAnimationFrame=cb=>raf(t=>cb(t+window.__timeOffset));const original=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>100)window.__musicStarts.push(this.buffer.duration);return original.apply(this,args);};});page.on('pageerror',e=>errors.push(e.message));
try { await page.goto('http://localhost:5173');await page.waitForSelector('canvas');await page.screenshot({path:'test-results/opening.png'});
await page.click('#mouse-start',{force:true});await expect(page.locator('#caption')).toBeVisible({timeout:30000});await expect(page.locator('#scene-name')).toContainText('01 / 06');
console.log('实际网页启动成功，5 首 MP3 的加载阶段完成');
await page.click('#pause',{force:true});await expect(page.locator('#paused')).toBeVisible();await page.click('#pause',{force:true});await expect(page.locator('#paused')).toBeHidden();
// Simulate only passage of scene time through the browser rAF timestamp; real pointer events and audio clocks remain untouched.
async function advance(seconds){await page.evaluate(s=>window.__timeOffset+=s*1000,seconds);await page.waitForTimeout(300);}
async function move(x,y=.5){await page.mouse.move(x*960,30+y*540);await page.waitForTimeout(400);}
async function click(x,y){await move(x,y);await page.mouse.click(x*960,30+y*540);await page.waitForTimeout(400);}
for(let i=0;i<5;i++){await move(.1);await move(.9);}await advance(42);
await expect(page.locator('#scene-name')).toContainText('02 / 06');console.log('第一幕行走触发通过');
for(const [x,y]of [[.25,.40],[.43,.53],[.64,.36],[.78,.52],[.56,.27]])await click(x,y);await advance(45);
await expect(page.locator('#scene-name')).toContainText('03 / 06');console.log('第二幕五次雨滴碰触通过');
for(const x of [.15,.30,.45,.65,.85])await click(x,.8);await page.screenshot({path:'test-results/umbrellas.png'});await advance(45);
await expect(page.locator('#scene-name')).toContainText('04 / 06');await click(.7,.84);await advance(40);await expect(page.locator('#scene-name')).toContainText('05 / 06');console.log('第三幕五把雨伞、第四幕水洼转场通过');
await page.keyboard.down('Space');for(let i=0;i<40;i++){await move(.15,.4);await move(.85,.4);}await page.screenshot({path:'test-results/dance.png'});await page.keyboard.up('Space');await advance(96);
await expect(page.locator('#scene-name')).toContainText('06 / 06');await move(.5,.5);await page.waitForTimeout(2000);await page.keyboard.down('Space');await page.waitForTimeout(5000);await page.keyboard.up('Space');await advance(26);await expect(page.locator('#finish')).toBeVisible();console.log('第五幕挥手舞蹈、第六幕张掌停留、完整结束通过');
await page.click('#replay',{force:true});await expect(page.locator('#intro')).toBeVisible();await expect(page.locator('#finish')).toBeHidden();console.log('重新开始通过');
const tracks=await page.evaluate(()=>window.__musicStarts);console.log('实际长音轨播放记录：',tracks);expect(tracks.length).toBe(5);expect(tracks.map(n=>Math.round(n))).toEqual([188,160,195,185,190]);if(errors.length)throw new Error(errors.join('\n'));console.log('浏览器完整测试通过，零未捕获异常。');} finally {await browser.close();}

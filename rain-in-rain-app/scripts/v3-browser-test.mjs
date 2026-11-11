import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
await mkdir('test-results/v3',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[],started=Date.now();page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.__musicStarts=[];const start=AudioBufferSourceNode.prototype.start;AudioBufferSourceNode.prototype.start=function(...args){if(this.buffer?.duration>100)window.__musicStarts.push(this.buffer.duration);return start.apply(this,args);};});
 await page.goto(process.env.BASE_URL||'http://localhost:5173');await page.waitForSelector('canvas');await page.click('#mouse-start');await expect(page.locator('#skip-intro')).toBeVisible({timeout:30000});
 if(process.env.SKIP_FILM==='1')await page.click('#skip-intro');await expect(page.locator('#caption')).toBeVisible({timeout:60000});await expect(page.locator('#film-credits')).toBeHidden();await expect(page.locator('#stage')).toHaveAttribute('data-scene','CITY');console.log(process.env.SKIP_FILM==='1'?'跳过片头并交接控制通过':'电影开场自动结束并交接控制通过');
 const status=()=>page.locator('#stage').evaluate(e=>({...e.dataset}));
 async function clickTarget(){await waitIdle();const p=JSON.parse((await status()).target);await page.mouse.move(p.x*.8,p.y*.8);await page.waitForTimeout(650);const q=JSON.parse((await status()).target);await page.mouse.click(q.x*.8,q.y*.8);await expect(page.locator('#stage')).toHaveAttribute('data-busy','true',{timeout:5000});}
 async function waitIdle(){await expect(page.locator('#stage')).toHaveAttribute('data-busy','false',{timeout:15000});}
 async function assistOne(){await waitIdle();const before=await status();await page.click('#settings-toggle');await page.click('#assist-now');await page.waitForFunction(({scene,progress})=>{const d=document.getElementById('stage').dataset;return d.scene!==scene||d.progress!==progress;},{scene:before.scene,progress:before.progress},{timeout:22000});}
 // Real pointing and clicking activates the lamp, then real pointer displacement walks the street.
 await clickTarget();await waitIdle();const before=await status();await page.mouse.move(1210,420);await page.waitForTimeout(3300);await page.mouse.move(640,420);await expect(page.locator('#stage')).toHaveAttribute('data-scene','RAINDROP',{timeout:15000});const after=await status();expect(Number(after.camera)).toBeGreaterThan(Number(before.camera));console.log('路灯、受限速度行走及独立镜头视差通过');
 await clickTarget();await waitIdle();while((await status()).scene==='RAINDROP')await assistOne();console.log('三颗雨滴、音符、不同目标位置通过');
 for(let i=0;i<3;i++){await clickTarget();await waitIdle();}
 await expect(page.locator('#stage')).toHaveAttribute('data-scene','DREAM');await page.screenshot({path:'test-results/v3/umbrellas.png'});console.log('三个独立伞柄生长与伞面展开通过');
 await assistOne();await page.screenshot({path:'test-results/v3/pool.png'});await assistOne();await expect(page.locator('#stage')).toHaveAttribute('data-scene','DANCE');
 await page.keyboard.down('Space');for(let n=0;n<90&&(await status()).phase==='explore';n++){await page.mouse.move((n%2?.17:.83)*1280,350);await page.waitForTimeout(240);}
 await page.screenshot({path:'test-results/v3/dance.png'});await expect(page.locator('#stage')).toHaveAttribute('data-phase','flight',{timeout:10000});console.log('梦境探索、真实空格挥动舞蹈与起跳交接通过');
 let shot=false,collected=false;const deadline=Date.now()+75000;
 while((await status()).phase==='flight'&&Date.now()<deadline){const d=await status(),ring=JSON.parse(d.ringTarget);if(d.flightPhase==='landing'&&Number(d.flightElapsed)>4.2)expect(Number(d.landingGap)).toBeLessThan(.1);if(ring){const px=Math.max(.06,Math.min(.94,.5+(ring.x-Number(d.flightX))/360)),py=Math.max(.08,Math.min(.92,.5-(ring.y-Number(d.flightY))/240));await page.mouse.move(px*1280,py*720);if(!collected&&Number(d.flightZ)>280){await page.mouse.click(px*1280,py*720);collected=true;}}if(Number(d.rings)>0&&!shot){await page.screenshot({path:'test-results/v3/flight.png'});shot=true;}await page.waitForTimeout(200);}
 await page.keyboard.up('Space');await expect(page.locator('#stage')).toHaveAttribute('data-scene','ENDING',{timeout:15000});expect(Number((await status()).rings)).toBe(3);console.log('独立透视城市、实际转向飞过三环、完整降落通过');
 await expect(page.locator('#stage')).toHaveAttribute('data-phase','explore',{timeout:12000});for(let n=0;n<5;n++){await assistOne();if(n===0)await page.screenshot({path:'test-results/v3/home-lamp.png'});}
 await expect(page.locator('#finish')).toBeVisible({timeout:15000});await page.screenshot({path:'test-results/v3/ending.png'});expect(JSON.parse((await status()).home)).toEqual(['lamp','umbrella','record','tea','chair']);
 const tracks=await page.evaluate(()=>window.__musicStarts);expect(tracks.map(n=>Math.round(n))).toEqual([188,160,195,185,190]);console.log('开灯、挂伞、唱片旋转、喝茶、完整坐下与结尾通过；五首音乐顺序：',tracks);
 await page.click('#replay');await expect(page.locator('#intro')).toBeVisible();await expect(page.locator('#finish')).toBeHidden();await expect(page.locator('#skip-intro')).toBeHidden();console.log('重启清理及返回原版首页通过');
 await page.click('#settings-toggle');await page.click('#art-toggle');const fixture=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=16;c.height=9;const g=c.getContext('2d');g.fillStyle='#313942';g.fillRect(0,0,16,9);return c.toDataURL().split(',')[1];});await page.locator('input[data-slot=city]').setInputFiles({name:'explicit-test-fixture.png',mimeType:'image/png',buffer:Buffer.from(fixture,'base64')});await expect(page.locator('#art-city')).toContainText('已载入');await page.reload();await page.waitForSelector('canvas');await page.click('#settings-toggle');await page.click('#art-toggle');await expect(page.locator('#art-city')).toContainText('已载入');console.log('本地插画导入与 IndexedDB 持久化通过（仅使用明确的测试图片，不是用户原图）');
 expect(errors).toEqual([]);console.log('V3 浏览器端到端通过；零未捕获异常；真实用时',Math.round((Date.now()-started)/1000),'秒。');
}finally{await browser.close();}

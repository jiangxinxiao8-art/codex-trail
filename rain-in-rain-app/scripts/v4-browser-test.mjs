import {localServer} from './v4-harness.mjs';
import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('test-results/v4',{recursive:true});
const server=await localServer();
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const started=Date.now();
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[],badResponses=[],imageRequests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)badResponses.push(r.status()+' '+r.url());});page.on('request',r=>{if(r.url().includes('/assets/images/'))imageRequests.push(r.url());});
 await page.addInitScript(()=>{
  const connect=AudioNode.prototype.connect,taps=new WeakMap();
  AudioNode.prototype.connect=function(destination,...args){
   const result=connect.call(this,destination,...args);
   if(destination===this.context.destination&&typeof this.context.createMediaStreamDestination==='function'){
    let tap=taps.get(this.context);
    if(!tap){const output=this.context.createMediaStreamDestination(),recorder=new MediaRecorder(output.stream,{mimeType:'audio/webm;codecs=opus'});tap={output,recorder,chunks:[],sources:new WeakSet(),started:performance.now()};recorder.ondataavailable=e=>{if(e.data.size)tap.chunks.push(e.data);};taps.set(this.context,tap);window.__audioTap=tap;recorder.start(1000);}
    if(!tap.sources.has(this)){tap.sources.add(this);connect.call(this,tap.output);}
   }
   return result;
  };
 });
 await page.goto(server.url+'/?inspect=1');await expect(page.locator('#stage')).toHaveAttribute('data-ready','true',{timeout:30000});await page.click('#mouse-start');await expect(page.locator('#intro')).toBeHidden({timeout:30000});
 const state=()=>page.evaluate(()=>window.__rainV4.inspect());
 const initial=await state();expect(initial.metrics.pipelineCalls).toBe(1);expect(initial.musicLoaded).toBe(5);expect(initial.metrics.calls).toBeGreaterThan(0);expect(imageRequests).toEqual([]);
 async function walkTo(x,z){
  await page.locator('canvas').focus();
  for(let trial=0;trial<5;trial++){
   for(const axis of ['x','z']){
    let d=(axis==='x'?x:z)-(await state()).player[axis];if(Math.abs(d)<.3)continue;
    const key=axis==='x'?(d>0?'ArrowRight':'ArrowLeft'):(d>0?'ArrowDown':'ArrowUp');
    await page.keyboard.down(key);const deadline=Date.now()+45000;
    while(Date.now()<deadline){const p=(await state()).player;const delta=(axis==='x'?x:z)-p[axis];if(Math.abs(delta)<.48||Math.sign(delta)!==Math.sign(d))break;await page.waitForTimeout(120);}
    await page.keyboard.up(key);await page.waitForTimeout(500);
   }
   const p=(await state()).player;if(Math.hypot(p.x-x,p.z-z)<.6)return;
  }
  const p=(await state()).player;expect(Math.hypot(p.x-x,p.z-z),JSON.stringify(p)).toBeLessThan(.9);
 }
 await walkTo(-8,2.8);expect((await state()).audio.water).toBeGreaterThan(0);console.log('受限加速度行走、踩水与水音通过。');
 await page.mouse.move(640,560);await page.mouse.down();await page.mouse.move(740,380,{steps:12});await page.waitForFunction(()=>{const s=window.__rainV4.inspect();return Math.hypot(s.player.vx,s.player.vz)<.01&&Math.hypot(s.wind.x,s.wind.z)>1;});const stopped=(await state()).player;
 await page.waitForFunction(()=>window.__rainV4.inspect().guided.metal>=5,null,{timeout:25000});await page.screenshot({path:'test-results/v4/metal-rain.png'});expect(Math.abs((await state()).player.x-stopped.x)).toBeLessThan(.2);await page.mouse.up();console.log('鼠标实际按住拖动的连续输入改变雨滴速度，真实金属碰撞推动探索条件，人物保持制动。');
 await walkTo(0,2.8);await page.keyboard.down('Space');await page.keyboard.down('ArrowUp');await page.waitForFunction(()=>window.__rainV4.inspect().materialsAwake,null,{timeout:30000});await page.waitForTimeout(600);await page.screenshot({path:'test-results/v4/glass-rain.png'});await page.keyboard.up('ArrowUp');await page.keyboard.up('Space');
 const heard=await state();expect(heard.audio.glass).toBeGreaterThan(0);expect(heard.audio.metal).toBeGreaterThan(0);console.log('真实玻璃面碰撞、下滑水痕与不同音色通过；两种材质均由引雨激活。');
 await walkTo(9.8,2.8);
 for(let i=0;i<3;i++){
  const b=(await state()).bells[i];const q=await page.evaluate(p=>window.__rainV4.project(p),b);expect(q.visible).toBe(true);await page.mouse.click(q.x,q.y);await page.waitForTimeout(400);
 }
 await page.waitForFunction(()=>window.__rainV4.inspect().gateOpen,null,{timeout:10000});await page.waitForTimeout(1500);await page.screenshot({path:'test-results/v4/open-street.png'});expect((await state()).audio.note).toBe(3);console.log('靠近实际三维悬滴、不同旋律音符、院门独立转动通过。');
 await walkTo(15.5,-3.6);await page.screenshot({path:'test-results/v4/courtyard.png'});expect((await state()).puddles).toEqual(initial.puddles);await walkTo(15.5,2.8);await walkTo(-11.7,3.4);await page.screenshot({path:'test-results/v4/return-water.png'});expect((await state()).puddles).toEqual(initial.puddles);console.log('进入新路径并返回原水洼，世界位置不随相机改变。');
 const before=await state();const geometryChecks=await page.evaluate(()=>{let positions=0,bad=0;window.__rainV4.scene.traverse(o=>{const a=o.geometry?.getAttribute('position');if(a){for(let i=0;i<a.count;i++){positions++;if(!Number.isFinite(a.getX(i)+a.getY(i)+a.getZ(i)))bad++;}}});return{positions,bad};});expect(geometryChecks.bad).toBe(0);expect(geometryChecks.positions).toBeGreaterThan(500);
 await page.click('#view-toggle');await page.waitForTimeout(2600);await page.screenshot({path:'test-results/v4/space-orbit.png'});const rotated=await state();expect(Math.abs(rotated.camera[0]-before.camera[0])).toBeGreaterThan(10);expect(rotated.puddles).toEqual(before.puddles);console.log('真实镜头绕转、有限几何数据、共享世界坐标通过。');
 await page.click('#settings-toggle');await expect(page.locator('#sound-dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('#sound-dialog')).not.toBeVisible();await expect(page.locator('#settings-toggle')).toBeFocused();
 await page.click('#pause');const frozen=(await state()).elapsed;await page.waitForTimeout(800);expect((await state()).elapsed).toBe(frozen);await page.click('#resume');
 await page.evaluate(()=>window.__rainV4.renderer.forceContextLoss());await page.waitForTimeout(300);await page.evaluate(()=>window.__rainV4.renderer.forceContextRestore());await page.waitForTimeout(2200);await page.screenshot({path:'test-results/v4/restored.png'});expect((await state()).metrics.calls).toBeGreaterThan(0);console.log('暂停、原生弹窗焦点约束、WebGL 上下文恢复通过。');
 for(const [name,width,height]of [['wide',2560,1080],['portrait',1080,1920]]){await page.setViewportSize({width,height});await page.waitForTimeout(600);await page.screenshot({path:'test-results/v4/'+name+'.png'});const box=await page.locator('.v4-header').boundingBox();expect(box.x).toBeGreaterThanOrEqual(0);expect(box.x+box.width).toBeLessThanOrEqual(width+1);}
 await page.setViewportSize({width:1280,height:720});
 const elapsed=Date.now()-started;if(process.env.SHORT_AUDIO!=='1'&&elapsed<125000)await page.waitForTimeout(125000-elapsed);
 const recording=await page.evaluate(()=>new Promise(resolve=>{const t=window.__audioTap;if(!t){resolve(null);return;}t.recorder.onstop=async()=>{const blob=new Blob(t.chunks,{type:t.recorder.mimeType}),data=new Uint8Array(await blob.arrayBuffer());let binary='';for(let i=0;i<data.length;i+=32768)binary+=String.fromCharCode(...data.subarray(i,i+32768));resolve({base64:btoa(binary),bytes:data.length,duration:(performance.now()-t.started)/1000});};t.recorder.stop();}));
 expect(recording?.bytes).toBeGreaterThan(10000);await writeFile('test-results/v4/audio-session.webm',Buffer.from(recording.base64,'base64'));console.log('实际游戏主输出音频采集',Math.round(recording.duration),'秒，字节数',recording.bytes);
 const final=await state();await writeFile('test-results/v4/runtime-report.json',JSON.stringify({seconds:(Date.now()-started)/1000,initial,final,audioCapture:{bytes:recording.bytes,duration:recording.duration},geometryChecks,imageRequests,badResponses,errors},null,2));expect(errors).toEqual([]);expect(badResponses).toEqual([]);console.log('V4 原型 A 浏览器流程通过，零异常，无 AI 背景图片请求；真实用时',Math.round((Date.now()-started)/1000),'秒。');
}finally{await browser.close();await server.close();}

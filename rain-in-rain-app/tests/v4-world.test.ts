import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WorldModel,RainModel,SURFACES,PUDDLES,sweep,waterAt} from '../src/prototype/WorldModel.ts';
import {Character} from '../src/prototype/Character.ts';
test('V4 雨滴扫掠选择最近材质，低帧率不能穿过铁皮与玻璃',()=>{
 const metal=sweep({x:-8,y:8,z:1},{x:-8,y:-2,z:1});assert.equal(metal?.material,'metal');assert.equal(metal?.y,2.8);
 const glass=sweep({x:0,y:3,z:1},{x:0,y:1,z:-3});assert.equal(glass?.material,'glass');assert.equal(glass?.z,-1.6);
 const water=sweep({x:-12,y:2,z:3.4},{x:-12,y:-1,z:3.4});assert.equal(water?.material,'water');
});
test('V4 指向目标受速度和加速度限制，丢手和引雨会平稳制动',()=>{
 const w=new WorldModel();w.target={x:15,z:3};let previous=0;
 for(let i=0;i<120;i++){w.update(1/60,true,false,0,0);const speed=Math.hypot(w.player.vx,w.player.vz);assert.ok(speed<=w.maxSpeed+.001);assert.ok(speed-previous<=w.maxAcceleration/60+.001);previous=speed;}
 const before={x:w.player.x,z:w.player.z};for(let i=0;i<60;i++)w.update(1/60,false,false,0,0);assert.ok(Math.hypot(w.player.vx,w.player.vz)<.001);assert.ok(Math.hypot(w.player.x-before.x,w.player.z-before.z)<.5);
 for(let i=0;i<60;i++)w.update(1/60,true,true,1,-1);assert.ok(Math.hypot(w.player.vx,w.player.vz)<.001);assert.ok(w.wind.x>5&&w.wind.z< -5);
});
test('V4 固定世界水洼可离开并返回，真实脚步和触碰产生水面事件',()=>{
 const w=new WorldModel(),events:string[]=[];w.onImpact=e=>events.push(e.material+':'+e.source);w.target={x:-10.8,z:3.4};for(let i=0;i<150;i++)w.update(1/60,true,false,0,0);
 assert.ok(events.includes('water:foot'));const water=PUDDLES[0];assert.equal(waterAt(water.x,water.z)?.id,water.id);assert.ok(w.touchWater({x:water.x,y:0,z:water.z}));w.player.x=20;assert.equal(w.touchWater({x:water.x,y:0,z:water.z}),false);assert.equal(waterAt(water.x,water.z)?.id,water.id);
});
test('V4 实际引雨能碰撞两种材质，天然落雨和重复点击不替代探索条件',()=>{
 const w=new WorldModel(),rain=new RainModel(w,1000,702);w.player.x=-8;w.player.z=2.8;w.target={x:-8,z:2.8};
 for(let i=0;i<360;i++){w.update(1/60,true,true,.5,-.3);rain.update(1/60);}assert.ok(w.guidedHits.metal>=5,JSON.stringify(w.guidedHits));
 w.player.x=0;w.target={x:0,z:2.8};for(let i=0;i<480;i++){w.update(1/60,true,true,0,-1);rain.update(1/60);}assert.ok(w.guidedHits.glass>=5,JSON.stringify(w.guidedHits));assert.ok(w.materialsAwake);assert.equal(w.gateOpen,false);
 w.player.x=9.8;for(const i of [0,1,2])assert.equal(w.touchBell(i),true);assert.equal(w.gateOpen,true);const count=w.notes.size;w.touchBell(0);assert.equal(w.notes.size,count);
 const natural=new WorldModel(),r=new RainModel(natural);for(let i=0;i<600;i++){natural.update(1/60,false,false,0,0);r.update(1/60);}assert.equal(natural.materialsAwake,false);
});
test('V4 空间角色支撑脚固定，脚底位于地面而非随骨骼悬浮',()=>{
 const w=new WorldModel(),rig=new Character();w.target={x:8,z:2.8};let previous=rig.footWorld.map(p=>p.clone()),stable=0;
 for(let i=0;i<240;i++){w.update(1/60,true,false,0,0);rig.update(w,1/60);for(let j=0;j<2;j++){const foot=rig.footWorld[j];assert.ok(foot.y>=.05&&foot.y<.16);if(foot.distanceTo(previous[j])<.001)stable++;previous[j].copy(foot);}}
 assert.ok(stable>60,'支撑期必须有固定脚接触点');
});

test('V4 镜头跟随在 30 与 144 FPS 下保持近似相同滞后',async()=>{
 const {StreetCamera}=await import('../src/prototype/WorldView.ts');
 const measure=(fps:number)=>{const w=new WorldModel(),c=new StreetCamera();for(let i=0;i<fps*2;i++){w.player.x=-13+(i+1)/fps*3;w.player.vx=3;c.update(w,1/fps);}return w.player.x+3.1-c.focus.x;};
 const a=measure(30),b=measure(144);assert.ok(a>.45&&a<.8);assert.ok(b>.45&&b<.8);assert.ok(Math.abs(a-b)<.05);
});

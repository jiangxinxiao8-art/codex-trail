import {test} from 'node:test';
import assert from 'node:assert/strict';
import {WorldModel} from '../src/prototype/WorldModel.ts';
import {DwellTouch,pickDrop,WalkingGuide} from '../src/prototype/Access.ts';
import {SoundBudget} from '../src/prototype/SoundBudget.ts';
const hit=(w:WorldModel,material:'metal'|'glass')=>w.impact({x:0,y:2,z:0,material,guided:true,source:'rain',strength:1});
test('轻松模式只需两次真实碰撞，切换难度保留探索成果',()=>{
 const w=new WorldModel();hit(w,'metal');assert.equal(w.materialReady('metal'),false);hit(w,'metal');assert.equal(w.materialReady('metal'),true);w.setEasyMode(false);assert.equal(w.requiredHits,5);assert.equal(w.materialReady('metal'),true);
 for(let i=0;i<4;i++)hit(w,'glass');assert.equal(w.materialsAwake,false);hit(w,'glass');assert.equal(w.materialsAwake,true);w.player.x=9.8;for(let i=0;i<3;i++)w.touchBell(i);assert.equal(w.completion,'natural');assert.equal(w.gateOpen,true);
});
test('一键过关幂等，打开门而不瞬移，原有进度不会丢失',()=>{
 const w=new WorldModel(),before={...w.player};assert.equal(w.completeWithAssistance(),true);assert.equal(w.completeWithAssistance(),false);assert.deepEqual(w.player,before);assert.equal(w.completion,'assisted');w.setEasyMode(false);assert.equal(w.gateOpen,true);assert.equal(w.notes.size,3);
});
test('雨滴选择支持偏离中心并优先未触碰，仍限制距离及可见性',()=>{
 const base={index:0,x:200,y:100,visible:true,distance:4,collected:true};const candidates=[base,{...base,index:1,x:245,collected:false},{...base,index:2,x:210,collected:false,distance:9},{...base,index:3,x:205,collected:false,visible:false}];
 assert.equal(pickDrop(candidates,200,100,80,6.5),1);assert.equal(pickDrop(candidates,200,100,24,6.5),0);assert.equal(pickDrop(candidates,400,100,80,6.5),-1);
});
test('停留触碰丢失目标即清零，每次停留只触发一次',()=>{
 const d=new DwellTouch();assert.equal(d.update(0,.5,true),-1);d.update(-1,.1,true);assert.equal(d.progress,0);assert.equal(d.update(0,.5,true),-1);assert.equal(d.update(0,.45,true),0);assert.equal(d.update(0,2,true),-1);assert.equal(d.update(1,.3,true),-1);assert.equal(d.update(1,.61,true),1);d.update(1,1,false);assert.equal(d.progress,0);
});
test('带路使用正常加速移动，跨院门先沿街走，停止后不再牵引',()=>{
 const w=new WorldModel(),g=new WalkingGuide(w);g.begin();assert.equal(g.destination,'metal');assert.equal(w.player.x,-13);
 for(let i=0;i<600&&g.active;i++){const moving=g.update();w.update(1/60,moving,false,0,0);}assert.equal(g.active,false);assert.ok(Math.abs(w.player.x+8)<.3);w.completeWithAssistance();g.begin();assert.equal(g.destination,'courtyard');g.update();assert.equal(w.target.z,2.8);
 for(let i=0;i<1800&&g.active;i++){const moving=g.update();w.update(1/60,moving,false,0,0);}assert.equal(g.active,false);assert.ok(w.player.z< -3.3);g.begin();g.stop();assert.equal(g.update(),false);
});
test('密集普通雨声耗尽预算仍保留玻璃通道，玻璃自身保持节制',()=>{
 const b=new SoundBudget();for(let i=0;i<5;i++)assert.equal(b.allow('water',i*.15,false),true);assert.equal(b.allow('metal',.7,false),false);assert.equal(b.allow('glass',.7,true),true);assert.equal(b.allow('glass',.8,true),false);assert.equal(b.allow('glass',1,true),true);assert.equal(b.allow('metal',2,false),true);
});

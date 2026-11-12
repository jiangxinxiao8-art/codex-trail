import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Journey,INSTRUMENTS,POND,ROOM} from '../src/prototype/Journey.ts';
import {WorldModel,RainModel} from '../src/prototype/WorldModel.ts';
const idle={present:false,guide:false,wx:0,wz:0};
function run(j:Journey,seconds:number,input=idle,rain?:RainModel){for(let i=0;i<seconds*60;i++){const w=j.world;if(j.flying)w.elapsed+=1/60;else w.update(1/60,j.walking||input.present,input.guide,input.wx,input.wz);j.update(1/60,input);rain?.update(1/60);}}
test('七章按实际机制可达结局；种伞必须接住真实的雨，而非等待计时',()=>{
 const w=new WorldModel(),j=new Journey(w),rain=new RainModel(w,1000,702);w.onImpact=h=>j.rain(h);j.start(2);for(const t of INSTRUMENTS)assert.ok(j.interact(t.id));assert.ok(j.ready);j.next();run(j,11,idle,rain);assert.equal(j.chapter,3);
 assert.ok(j.interact('seed-0'));assert.ok(j.interact('seed-1'));run(j,5);assert.equal(j.pool,0,'无雨碰撞不能形成水洼');run(j,30,idle,rain);assert.ok(j.umbrellaHits>0);assert.equal(j.pool,1);j.next();run(j,12,idle,rain);assert.ok(j.interact('pond'));run(j,9,idle,rain);assert.equal(j.chapter,5);assert.equal(j.dream,1);
 j.interact('conduct');run(j,7,idle,rain);assert.ok(j.ready);assert.ok(j.danceVoices.size>=2);j.next();run(j,2);assert.ok(w.player.y>1,'真实起跳');run(j,55);assert.equal(j.chapter,7);assert.ok(j.landed);assert.equal(w.player.y,0);run(j,3);
 w.player.x=46;w.player.z=-102;assert.ok(j.interact('lamp'));assert.ok(j.interact('window'));assert.equal(j.roomVisited.size,2);assert.ok(j.targets.some(t=>t.id==='chair'));j.interact('chair');run(j,12);assert.equal(j.chapter,8);assert.ok(j.won);assert.equal(j.save().chapter,7);
});
test('每节都能单独跳过并进入后续内容，不会把整部作品标成完成',()=>{
 const w=new WorldModel(),j=new Journey(w);j.start();for(let chapter=0;chapter<7;chapter++){assert.equal(j.chapter,chapter);j.skip();assert.equal(j.chapter,chapter+1);assert.equal(j.won,false);}j.skip();run(j,20);assert.equal(j.chapter,8);assert.equal(j.won,true);
});
test('不强制五项家务；两件任意物品后才可以坐下，物体状态独立',()=>{
 const w=new WorldModel(),j=new Journey(w);j.start(7);w.player.z=-102;assert.equal(j.interact('chair'),false);j.interact('cup');assert.equal(j.cup,true);assert.equal(j.lamp,false);j.interact('record');assert.equal(j.record,true);assert.equal(j.roomVisited.size,2);assert.ok(j.targets.some(t=>t.id==='chair'));j.interact('chair');run(j,12);assert.ok(j.won);j.freeListen();assert.equal(j.chapter,7);assert.equal(j.seated,false);assert.equal(j.cup,true);
});
test('飞行左右分支不同，手势丢失时手动模式稳定悬停，输入不瞬移',()=>{
 const make=()=>{const j=new Journey(new WorldModel());j.start(6);run(j,3);return j;};const left=make(),right=make();right.flightRoute='right';run(left,14);run(right,14);assert.ok(right.world.player.x-left.world.player.x>8);assert.equal(left.flightPart,2);left.autopilot=false;const z=left.world.player.z;run(left,8);assert.ok(Math.abs(left.world.player.z-z)<4,'减速后悬停');const stable=left.world.player.z;run(left,3);assert.ok(Math.abs(left.world.player.z-stable)<.02);
});
test('检查点恢复具备之前需要的能力，屋顶到房间的世界坐标连续',()=>{
 for(let chapter=2;chapter<=7;chapter++){const j=new Journey(new WorldModel());j.start(chapter);assert.ok(j.world.gateOpen);if(chapter>=4){assert.equal(j.pool,1);assert.equal(j.world.umbrellas.length,2);}if(chapter>=5)assert.equal(j.dream,1);if(chapter===7)assert.ok(j.world.player.z< -94);}
});

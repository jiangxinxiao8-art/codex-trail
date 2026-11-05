import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StateMachine, scenes } from '../src/app/StateMachine.ts';
import { GestureRecognizer, type Point } from '../src/camera/GestureRecognizer.ts';
test('剧情必须同时满足交互次数和最低时间；六幕完成并可重置',()=>{const m=new StateMachine();for(let i=0;i<6;i++){assert.equal(m.index,i);assert.equal(m.update(scenes[i].min+10),false);m.event(scenes[i].goal);assert.equal(m.update(0),true);}assert.equal(m.finished,true);m.reset();assert.equal(m.finished,false);assert.equal(m.index,0);assert.equal(m.progress,0);assert.equal(m.update(0),false);});
test('提前完成交互不会跳过展示时间',()=>{const m=new StateMachine();m.event(100);assert.equal(m.progress,2);assert.equal(m.update(39),false);assert.equal(m.update(1),true);assert.equal(m.progress,0);});
function hand(ratio:number):Point[]{const p=Array.from({length:21},()=>({x:.5,y:.5}));p[0]={x:.5,y:.9};p[9]={x:.5,y:.5};p[8]={x:.5,y:.2};p[4]={x:.5+ratio*.4,y:.2};return p;}
test('捏合边缘触发、迟滞、260ms 冷却与丢手重置',()=>{const g=new GestureRecognizer();assert.equal(g.read(hand(.2),0).pinch,true);assert.equal(g.read(hand(.2),400).pinch,false);assert.equal(g.read(hand(.38),450).pinch,false);g.read(hand(.6),500);assert.equal(g.read(hand(.2),550).pinch,true);g.read(hand(.6),600);assert.equal(g.read(hand(.2),650).pinch,false);assert.equal(g.read(hand(.2),1000).pinch,false);g.read([],1200);assert.equal(g.read(hand(.2),1500).pinch,true);});
test('张掌要求五指伸展；手掌大小归一化与镜像坐标',()=>{const p=hand(.8);p[4]={x:.1,y:.3};p[3]={x:.35,y:.5};p[17]={x:.7,y:.6};for(const n of [8,12,16,20]){p[n]={x:.3+(n-8)*.025,y:.2};p[n-2]={x:p[n].x,y:.55};}const g=new GestureRecognizer();assert.equal(g.read(p,0).open,true);assert.equal(g.read(p,10).x,.7);p[20].y=.8;assert.equal(g.read(p,20).open,false);});

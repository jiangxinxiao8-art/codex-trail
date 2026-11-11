import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MainCharacter } from '../src/visual/MainCharacter.ts';
test('步态支撑脚保持世界位置和地面接触点，摆动脚离地',()=>{const c=new MainCharacter();let previous:{x:number;planted:boolean}|null=null,samples=0,lifted=false;for(let i=0;i<200;i++){c.x+=80*.016;c.animate(.016,80,'walk');const foot=c.feet.left,worldX=c.x+foot.x;if(previous?.planted&&foot.planted){assert.ok(Math.abs(worldX-previous.x)<.02);assert.ok(Math.abs(foot.y)<.01);samples++;}if(!foot.planted&&foot.y<-1)lifted=true;previous={x:worldX,planted:foot.planted};}assert.ok(samples>20);assert.ok(lifted);c.destroy({children:true});});

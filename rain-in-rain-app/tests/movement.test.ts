import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GestureInputController } from '../src/camera/GestureInputController.ts';
import { emptyInput } from '../src/camera/GestureRecognizer.ts';
import { CameraController } from '../src/world/CameraController.ts';
test('掌心死区抑制微抖，指尖变化不直接移动人物',()=>{const m=new GestureInputController();for(let n=0;n<200;n++)m.update({...emptyInput(),present:true,x:n%2?.9:.1,palmX:.5+(n%2?.02:-.02)},.016);assert.equal(m.x,800);assert.equal(m.velocity,0);});
test('瞬间输入受到速度、加速度限制，丢手后平滑刹车',()=>{const m=new GestureInputController();const input={...emptyInput(),present:true,x:1,palmX:1};let previous=m.x,previousVelocity=0;for(let n=0;n<100;n++){m.update(input,.016);assert.ok(m.x-previous<=m.maxSpeed*.016+.001);assert.ok(m.velocity-previousVelocity<=m.maxAcceleration*.016+.001);previous=m.x;previousVelocity=m.velocity;}const max=m.velocity;for(let n=0;n<100;n++)m.update(emptyInput(),.016);assert.ok(m.velocity<max*.01);assert.ok(m.x<previous+100);});
test('镜头平滑跟随且屏幕/世界坐标互逆',()=>{const c=new CameraController();c.update(1800,.016);assert.ok(c.x>0&&c.x<1000);c.zoom=1.2;c.y=30;const screen=c.worldToScreen(1300,700),world=c.screenToWorld(screen.x,screen.y);assert.ok(Math.abs(world.x-1300)<1e-8);assert.ok(Math.abs(world.y-700)<1e-8);});

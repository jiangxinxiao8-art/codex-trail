import { clamp, damp } from '../world/math';
import type { Input } from './GestureRecognizer';
class AdaptiveFilter {
 value=.5; private previous=.5; private velocity=0;
 reset(value=.5){this.value=this.previous=value;this.velocity=0;}
 step(value:number,dt:number){const raw=(value-this.previous)/Math.max(dt,.001);this.previous=value;this.velocity=damp(this.velocity,raw,7,dt);return this.value=damp(this.value,value,7+Math.min(16,Math.abs(this.velocity)*3),dt);}
}
/** The palm controls velocity; the fingertip only points at objects. */
export class GestureInputController {
 private palmX=new AdaptiveFilter();private palmY=new AdaptiveFilter();private fingerX=new AdaptiveFilter();private fingerY=new AdaptiveFilter();
 x=800;velocity=0;palm={x:.5,y:.5};pointer={x:.5,y:.5};pointerSpeed=0;
 readonly maxSpeed=150;readonly maxAcceleration=290;readonly deadzone=.04;readonly sensitivity=.4;
 reset(x=800){this.x=x;this.velocity=0;for(const f of [this.palmX,this.palmY,this.fingerX,this.fingerY])f.reset();this.palm={x:.5,y:.5};this.pointer={x:.5,y:.5};this.pointerSpeed=0;}
 axis(value:number){const delta=value-.5;if(Math.abs(delta)<=this.deadzone)return 0;return Math.sign(delta)*(Math.abs(delta)-this.deadzone)/(.5-this.deadzone);}
 update(input:Input,dt:number,enabled=true,bounds:[number,number]=[160,2940]){
  if(input.present){this.palm.x=this.palmX.step(input.palmX??input.x,dt);this.palm.y=this.palmY.step(input.palmY??input.y,dt);const previous=this.pointer.x;this.pointer.x=this.fingerX.step(input.x,dt);this.pointer.y=this.fingerY.step(input.y,dt);this.pointerSpeed=(this.pointer.x-previous)/Math.max(dt,.001);}else this.pointerSpeed=0;
  const desired=enabled&&input.present?this.axis(this.palm.x)*this.maxSpeed*this.sensitivity*2.5:0;
  this.velocity+=clamp(desired-this.velocity,-this.maxAcceleration*dt,this.maxAcceleration*dt);
  if(Math.abs(desired)<1)this.velocity=damp(this.velocity,0,5,dt);
  this.x=clamp(this.x+this.velocity*dt,...bounds);if(this.x===bounds[0]||this.x===bounds[1])this.velocity=0;
 }
}

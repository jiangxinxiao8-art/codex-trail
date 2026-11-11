import { Container, Graphics, Sprite } from 'pixi.js';
import { MainCharacter } from '../visual/MainCharacter';
import { BLUE, GOLD, INK, MAUVE, clamp, damp, seeded } from '../world/math';
export type Vec3={x:number;y:number;z:number};
/** Perspective projection of independent world-space boxes, rings and rain (2.5D, no flat-image zoom). */
export class FlightScene extends Container {
 private artwork:Sprite|null=null;private sky=new Graphics();private city=new Graphics();private flightEffects=new Graphics();private actor=new MainCharacter();
 private buildings:{x:number;z:number;w:number;h:number;depth:number;color:number}[]=[];private rain:{x:number;y:number;z:number}[]=[];
 rings=[{x:-100,y:130,z:500},{x:120,y:190,z:1150},{x:0,y:130,z:1850}];
 position3={x:0,y:120,z:0};camera3={x:0,y:210,z:-320};velocity={x:0,y:0};phase:'takeoff'|'flying'|'landing'|'done'='takeoff';elapsed=0;passed=0;collected=0;assisting=false;private lastZ=0;private trail:Vec3[]=[];private collectedIds=new Set<number>();readonly droplets=[{x:-70,y:145,z:340},{x:60,y:175,z:880},{x:10,y:130,z:1580}];
 constructor(){super();this.addChild(this.sky,this.city,this.actor,this.flightEffects);this.actor.back=true;this.visible=false;const r=seeded(50);for(let i=0;i<65;i++)this.buildings.push({x:(i%2?1:-1)*(420+r()*1050),z:250+r()*3600,w:60+r()*130,h:90+r()*550,depth:60+r()*170,color:i%3===0?0x6f7f8e:0x364856});for(let i=0;i<140;i++)this.rain.push({x:(r()-.5)*2600,y:r()*1400-200,z:r()*2400});}
 setArtwork(sprite:Sprite){this.artwork?.destroy();this.artwork=sprite;this.addChildAt(sprite,0);this.sky.alpha=.38;this.city.alpha=.32;}
 reset(){this.visible=false;this.position3={x:0,y:120,z:0};this.camera3={x:0,y:210,z:-320};this.velocity={x:0,y:0};this.phase='takeoff';this.elapsed=0;this.passed=0;this.collected=0;this.assisting=false;this.lastZ=0;this.trail=[];this.collectedIds.clear();}
 start(){this.reset();this.visible=true;}
 project(p:Vec3){const z=p.z-this.camera3.z;if(z<20)return null;const perspective=690/z;return{x:800+(p.x-this.camera3.x)*perspective,y:420-(p.y-this.camera3.y)*perspective,scale:perspective};}
 get actorScreen(){return{x:this.actor.x,y:this.actor.y};}
 assist(){this.assisting=true;}
 update(dt:number,palm:{x:number;y:number},open:boolean,pinch:boolean,onRing:()=>void,onDrop:()=>void){if(!this.visible)return;this.elapsed+=dt;const previousZ=this.position3.z;
 if(this.phase==='takeoff'){this.position3.y=damp(this.position3.y,190,1.2,dt);if(this.elapsed>5){this.phase='flying';this.elapsed=0;}}
 if(this.phase==='flying'){
  const target=this.rings[this.passed];const left=clamp((palm.x-.5)*2,-1,1),up=clamp((.5-palm.y)*2,-1,1);
  if(this.assisting&&target){this.position3.x=damp(this.position3.x,target.x,2,dt);this.position3.y=damp(this.position3.y,target.y,2,dt);}else{this.velocity.x=damp(this.velocity.x,open?left*180:0,3,dt);this.velocity.y=damp(this.velocity.y,open?up*95:0,3,dt);this.position3.x=clamp(this.position3.x+this.velocity.x*dt,-300,300);this.position3.y=clamp(this.position3.y+this.velocity.y*dt,70,320);}
  this.position3.z+=(open||this.assisting?67+this.passed*5:0)*dt;
  if(target&&previousZ<=target.z+65&&this.position3.z>=target.z-35&&Math.abs(this.position3.x-target.x)<175&&Math.abs(this.position3.y-target.y)<125){this.passed++;this.assisting=false;onRing();if(this.passed===3){this.phase='landing';this.elapsed=0;}}
  else if(target&&this.position3.z>target.z+70){this.position3.z=target.z-200;this.velocity.x=0;}
  if(pinch){const index=this.droplets.findIndex((p,i)=>!this.collectedIds.has(i)&&Math.abs(p.z-this.position3.z)<230&&Math.hypot(p.x-this.position3.x,p.y-this.position3.y)<170);if(index>=0){this.collectedIds.add(index);this.collected++;onDrop();}}
  if(open||this.assisting){this.trail.push({x:this.position3.x,y:this.position3.y-25,z:this.position3.z});if(this.trail.length>55)this.trail.shift();}
 }
 if(this.phase==='landing'){this.position3.z+=Math.max(0,60-this.elapsed*10)*dt;this.position3.y=damp(this.position3.y,20,1,dt);if(this.elapsed>6){this.phase='done';this.elapsed=0;}}
 this.camera3.x=damp(this.camera3.x,this.position3.x,2,dt);this.camera3.y=damp(this.camera3.y,this.position3.y+85,2,dt);this.camera3.z=this.position3.z-320;
 this.rotation=damp(this.rotation,-this.velocity.x*.00022,2,dt);this.pivot.set(800,450);this.position.set(800,450);this.draw(dt);
 }
 private draw(dt:number){const g=this.city;g.clear();this.sky.clear().rect(0,0,1600,900).fill(0x283c50);for(let i=0;i<8;i++)this.sky.ellipse(200+i*200,200+Math.sin(i)*70,280,110).fill({color:i%2?MAUVE:BLUE,alpha:.025});g.moveTo(0,780).lineTo(800,400).lineTo(1600,780).fill({color:0xbcc4cc,alpha:.06});
 const sorted=this.buildings.map(b=>({...b,z:b.z+Math.max(0,Math.ceil((this.position3.z-100-b.z)/3600))*3600})).sort((a,b)=>b.z-a.z);for(const b of sorted){let z=b.z;while(z<this.position3.z-100)z+=3600;const vertices=[{x:b.x,y:0,z},{x:b.x+b.w,y:0,z},{x:b.x+b.w,y:b.h,z},{x:b.x,y:b.h,z},{x:b.x,y:0,z:z+b.depth},{x:b.x+b.w,y:0,z:z+b.depth},{x:b.x+b.w,y:b.h,z:z+b.depth},{x:b.x,y:b.h,z:z+b.depth}];const p=vertices.map(v=>this.project(v));if(p.some(v=>!v))continue;const points=p as {x:number;y:number;scale:number}[];const alpha=clamp(1-(z-this.position3.z)/4400,.08,.8);
 for(const face of [[0,1,2,3],[1,5,6,2],[3,2,6,7]]){g.poly(face.flatMap(i=>[points[i].x,points[i].y])).fill({color:b.color,alpha}).stroke({color:INK,width:.6,alpha:alpha*.6});}
 for(let row=1;row<5;row++){const w=this.project({x:b.x+b.w*.45,y:row*b.h/5,z:z-1});if(w)g.rect(w.x,w.y,Math.max(1,4*w.scale),Math.max(1,9*w.scale)).fill({color:GOLD,alpha:Math.min(.95,alpha*(.48+this.passed*.14))});}}
 for(let i=0;i<8;i++){const z=this.position3.z+300+i*330;const a=this.project({x:-420,y:0,z}),b=this.project({x:420,y:0,z});if(a&&b)g.moveTo(a.x,a.y).quadraticCurveTo(800,a.y-30*a.scale,b.x,b.y).stroke({color:GOLD,width:.7,alpha:.2});}
 this.flightEffects.clear();for(let i=0;i<this.droplets.length;i++){if(this.collectedIds.has(i))continue;const p=this.project(this.droplets[i]);if(!p)continue;const size=Math.min(17,3+5*p.scale);this.flightEffects.circle(p.x,p.y,size*2.5).fill({color:GOLD,alpha:.035}).circle(p.x,p.y,size).fill({color:INK,alpha:.75});}
 for(let i=1;i<this.trail.length;i++){const a=this.project(this.trail[i-1]),b=this.project(this.trail[i]);if(a&&b)this.flightEffects.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:GOLD,width:1.2,alpha:i/this.trail.length*.34});}
 for(let i=this.passed;i<3;i++){const r=this.rings[i],p=this.project(r);if(!p)continue;const radius=150*p.scale;for(let k=2;k>=0;k--)this.flightEffects.ellipse(p.x,p.y,radius+k*4,radius*.85+k*4).stroke({color:GOLD,width:k===0?2:1,alpha:i===this.passed?.65-k*.15:.18});}
 const dz=this.position3.z-this.lastZ;this.lastZ=this.position3.z;for(const r of this.rain){r.z-=dz*.5+dt*110;r.y-=dt*100;if(r.z<this.position3.z+30)r.z=this.position3.z+2200;if(r.y<0)r.y=1100;const a=this.project(r),b=this.project({...r,z:r.z+35,y:r.y+24});if(a&&b)this.flightEffects.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color:INK,width:.7,alpha:.25});}
 for(let i=0;i<3;i++){this.flightEffects.moveTo(150,600+i*20).bezierCurveTo(550,350+i*40,1000,550,1450,260+i*30).stroke({color:i%2?MAUVE:GOLD,width:1,alpha:.16});}
 this.actor.position.set(800+this.velocity.x*.2,this.phase==='takeoff'?710-Math.min(1,this.elapsed/5)*80:this.phase==='landing'?630+Math.min(1,this.elapsed/6)*70:630);this.actor.size=1.15;this.actor.back=true;this.actor.animate(dt,this.velocity.x,this.phase==='takeoff'&&this.elapsed<.9?'crouch':this.phase==='landing'&&this.elapsed>5.7?'land':'glide');
 }
}

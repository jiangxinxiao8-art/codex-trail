import { Container, Graphics } from 'pixi.js';
import { damp, GOLD } from '../world/math';
export type Pose='idle'|'walk'|'look'|'bow'|'crouch'|'jump'|'glide'|'land'|'switch'|'hang'|'tea'|'sit'|'dance';
/** A single articulated raincoat character, drawn from the supplied hat / bob / collar reference. */
export class MainCharacter extends Container {
 head=new Container();body=new Graphics();armL=new Container();armR=new Container();legL=new Container();legR=new Container();private coatHem=new Graphics();private hair=new Graphics();private backHair=new Graphics().ellipse(0,3,14,16).fill(0x37332d);private faceGraphic:Graphics;private hat=new Graphics();private shoulder=new Container();private footPhase=0;private leftBone:Graphics;private rightBone:Graphics;private leftShoe:Graphics;private rightShoe:Graphics;readonly feet={left:{x:0,y:0,planted:false},right:{x:0,y:0,planted:false}};private facing=1;private stride=0;private time=0;private pose:Pose='idle';private poseTime=0;private previousSize=1;size=1;back=false;holdingUmbrella=false;
 constructor(){super();const ink=0xbeb9a9,cloth=0xc5bba3;
 this.leftBone=new Graphics();this.rightBone=new Graphics();this.leftShoe=new Graphics().roundRect(-5,-3,14,6,3).fill(0x242728).stroke({color:ink,width:1});this.rightShoe=new Graphics().roundRect(-5,-3,14,6,3).fill(0x242728).stroke({color:ink,width:1});this.legL.addChild(this.leftBone,this.leftShoe);this.legR.addChild(this.rightBone,this.rightShoe);
 this.legL.position.set(-7,-28);this.legR.position.set(7,-28);
 this.body.moveTo(-13,-77).quadraticCurveTo(-19,-56,-23,-29).quadraticCurveTo(0,-20,23,-29).lineTo(13,-77).closePath().fill({color:cloth,alpha:.9}).stroke({color:ink,width:1.4});
 this.body.moveTo(-11,-76).lineTo(-3,-66).lineTo(0,-73).lineTo(5,-66).lineTo(12,-76).stroke({color:0x6e685b,width:1});this.body.moveTo(0,-68).lineTo(1,-28).stroke({color:0x6e685b,width:.7,alpha:.6});this.body.circle(1,-65,2).fill(GOLD).stroke({color:0x6e685b,width:.6});
 const texture=new Graphics();for(let i=0;i<12;i++)texture.moveTo(-18+i*3,-38).lineTo(-9+i*1.7,-66).stroke({color:0x6e685b,width:.45,alpha:.16});
 for(const [arm,dir]of [[this.armL,-1],[this.armR,1]]as const){arm.addChild(new Graphics().moveTo(0,0).lineTo(dir*5,26).lineTo(dir*15,24).lineTo(dir*8,0).closePath().fill(cloth).stroke({color:ink,width:1}),new Graphics().ellipse(dir*9,28,4,5).fill(0xbfb49e).stroke({color:0x716a5b,width:.7}));}
 this.armL.position.set(-12,-73);this.armR.position.set(12,-73);
 this.head.position.set(0,-91);this.hair.moveTo(-16,1).bezierCurveTo(-24,13,-15,19,-12,14).quadraticCurveTo(-7,23,-2,15).quadraticCurveTo(5,22,9,14).quadraticCurveTo(21,19,17,2).fill(0x37332d).stroke({color:ink,width:.7});
 const face=new Graphics().ellipse(0,2,12,15).fill(0xd4c9b2).stroke({color:0x726a5b,width:.7});
 this.hat.moveTo(-23,0).quadraticCurveTo(-16,-27,3,-21).quadraticCurveTo(20,-21,22,-4).quadraticCurveTo(36,0,25,6).quadraticCurveTo(4,1,-23,7).quadraticCurveTo(-32,9,-23,0).fill(0xbfb28c).stroke({color:ink,width:1.2});this.hat.moveTo(-17,-6).quadraticCurveTo(2,-12,20,-4).stroke({color:0x716a5b,width:1});
 this.faceGraphic=face;this.head.addChild(this.hair,this.backHair,face,this.hat);this.coatHem.moveTo(-22,-32).quadraticCurveTo(0,-25,22,-32).stroke({color:GOLD,width:2,alpha:.7});this.shoulder.addChild(this.body,texture,this.coatHem,this.armL,this.armR,this.head);this.addChild(this.legL,this.legR,this.shoulder);
 }
 get direction(){return this.facing;}
 face(direction:number){if(direction)this.facing=Math.sign(direction);}
 setPose(pose:Pose){if(this.pose!==pose){this.pose=pose;this.poseTime=0;}}
 animate(dt:number,speed:number,pose:Pose=this.pose){const previous=[this.armL.rotation,this.armR.rotation,this.legL.rotation,this.legR.rotation,this.shoulder.y];this.faceGraphic.visible=!this.back;this.backHair.visible=this.back;this.setPose(pose);this.time+=dt;this.poseTime+=dt;this.stride+=Math.abs(speed)*dt/(9*this.size);this.footPhase=(this.stride/(Math.PI*2))%1;const walk=Math.min(1,Math.abs(speed)/65),step=Math.sin(this.stride),breath=Math.sin(this.time*1.8);if(Math.abs(speed)>5)this.facing=Math.sign(speed);const dancing=pose==='dance';
 this.legL.rotation=step*.40*walk;this.legR.rotation=-this.legL.rotation;this.armL.rotation=-step*.24*walk;this.armR.rotation=step*.24*walk;this.shoulder.y=breath*.7-Math.abs(step)*walk*1.8;this.coatHem.scale.x=1+Math.sin(this.stride+.3)*walk*.03;this.head.rotation=damp(this.head.rotation,pose==='bow'?.16:pose==='look'?-.14:0,4,dt);this.head.y=-91+breath*.35;this.head.x=this.back?0:this.facing*1;
 this.shoulder.rotation=damp(this.shoulder.rotation,0,6,dt);if(this.previousSize!==this.size){this.scale.set((this.back?1:this.facing)*this.size,this.size);this.previousSize=this.size;}this.scale.x=damp(this.scale.x,(this.back?1:this.facing)*this.size,8,dt);this.scale.y=this.size;this.hat.rotation=Math.sin(this.time*1.6)*.008;
 if(dancing){const a=Math.sin(this.time*5.8);this.armL.rotation=.9+a*.4;this.armR.rotation=-.9+a*.4;this.legL.rotation=a*.4;this.legR.rotation=-a*.4;this.shoulder.rotation=a*.10;this.shoulder.y=-Math.abs(a)*3;}
 if(['crouch','land'].includes(pose)){const amount=pose==='land'?Math.max(0,1-this.poseTime/1.1):Math.min(1,this.poseTime*1.7);this.shoulder.y+=14*amount;this.legL.rotation=-.65*amount;this.legR.rotation=.65*amount;this.armL.rotation=-.25*amount;this.armR.rotation=.25*amount;}
 if(pose==='glide'||pose==='jump'){this.armL.rotation=1.2+breath*.07;this.armR.rotation=-1.2-breath*.07;this.legL.rotation=.25;this.legR.rotation=-.15;this.shoulder.rotation=speed/1200;this.coatHem.scale.x=1.05+breath*.025;}
 if(pose==='switch'||pose==='hang'){this.armR.rotation=-1.5*Math.sin(Math.min(1,this.poseTime/1.5)*Math.PI*.8);this.head.rotation=-.13;}
 if(pose==='tea'){this.armR.rotation=-1.6;this.armL.rotation=.5;this.head.rotation=.15*Math.sin(Math.min(1,this.poseTime/3)*Math.PI);}
 if(pose==='sit'){const f=Math.min(1,this.poseTime/1.8);this.shoulder.y=17*f;this.legL.rotation=-1.2*f;this.legR.rotation=-.9*f;this.armR.rotation=.2;this.armL.rotation=-.2;this.head.rotation=-.08;}
 const walking=Math.abs(speed)>5&&!['glide','jump','dance','crouch','land','sit'].includes(pose);if(walking||pose==='crouch'||pose==='land'){this.legL.rotation=this.legR.rotation=0;}
 this.drawLeg(this.leftBone,this.leftShoe,this.legL,this.footPhase,walking,this.feet.left);
 this.drawLeg(this.rightBone,this.rightShoe,this.legR,(this.footPhase+.5)%1,walking,this.feet.right);
 const parts=[this.armL,this.armR,this.legL,this.legR];parts.forEach((part,i)=>part.rotation=damp(previous[i],part.rotation,10,dt));this.shoulder.y=damp(previous[4],this.shoulder.y,10,dt);
 }
 private drawLeg(bone:Graphics,shoe:Graphics,leg:Container,phase:number,walking:boolean,foot:{x:number;y:number;planted:boolean}){
  const bodyDrop=Math.max(0,Math.min(17,this.shoulder.y)),halfStep=Math.PI*9/2;
  let x=0,lift=0;const planted=phase<.5;if(walking){if(planted)x=halfStep*(1-phase*4);else{const f=(phase-.5)*2;x=halfStep*(-1+2*f);lift=Math.sin(f*Math.PI)*9;}}
  const y=25-bodyDrop-lift,d=Math.max(.1,Math.hypot(x,y)),height=Math.sqrt(Math.max(0,17*17-d*d/4)),kneeX=x/2+y/d*height,kneeY=y/2-x/d*height;
  leg.y=-28+bodyDrop;bone.clear().moveTo(0,0).lineTo(kneeX,kneeY).lineTo(x,y).stroke({color:0xbeb9a9,width:1.8});shoe.position.set(x,y);foot.x=leg.x+x;foot.y=leg.y+y+3;foot.planted=walking&&planted;
 }

}

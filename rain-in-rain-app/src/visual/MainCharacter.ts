import { Container, Graphics } from 'pixi.js';
export class MainCharacter extends Container {
 head=new Graphics().circle(0,-68,10).fill(0xf3eee2);
 body=new Graphics().moveTo(-8,-55).lineTo(8,-55).lineTo(17,-20).quadraticCurveTo(0,-13,-17,-20).closePath().fill(0x141c20).stroke({color:0xe6e3d4,width:1.8});
 armL=new Graphics().moveTo(0,0).lineTo(-11,23).stroke({color:0xe6e3d4,width:2});
 armR=new Graphics().moveTo(0,0).lineTo(12,21).stroke({color:0xe6e3d4,width:2});
 legL=new Graphics().moveTo(0,0).lineTo(-7,19).lineTo(-13,19).stroke({color:0xe6e3d4,width:2});
 legR=new Graphics().moveTo(0,0).lineTo(8,19).lineTo(14,19).stroke({color:0xe6e3d4,width:2});
 constructor(){super();this.armL.position.set(-8,-53);this.armR.position.set(8,-53);this.legL.position.set(-5,-18);this.legR.position.set(5,-18);this.addChild(this.legL,this.legR,this.body,this.armL,this.armR,this.head);}
 animate(time:number,speed:number,dancing:boolean,ending:boolean){const step=Math.sin(time*(dancing?8:6));const moving=Math.min(1,Math.abs(speed)/110);this.legL.rotation=step*(dancing?.5:.35*moving);this.legR.rotation=-this.legL.rotation;this.armL.rotation=dancing?-.8+step*.6:-step*.28*moving;this.armR.rotation=dancing?.8+step*.6:step*.28*moving;this.body.y=Math.sin(time*2)*1.2;this.head.y=this.body.y+(ending?-2:0);this.rotation=dancing?step*.09:0;this.scale.x=dancing?Math.cos(time*.75)*.2+.8:(speed<-10?-1:1);}
}

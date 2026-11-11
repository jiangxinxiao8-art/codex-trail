import { Container, Graphics } from 'pixi.js';
import { GOLD, INK, clamp, seeded } from '../world/math';
export type HomeAction='lamp'|'umbrella'|'record'|'tea'|'chair';
export const HOME_TARGETS=[
 {id:'lamp' as const,x:1105,y:520,label:'打开台灯'},
 {id:'umbrella' as const,x:285,y:455,label:'挂起雨伞'},
 {id:'record' as const,x:1370,y:566,label:'播放唱片'},
 {id:'tea' as const,x:970,y:588,label:'拿起茶杯'},
 {id:'chair' as const,x:620,y:660,label:'在窗边坐下'},
];
export class HomeScene extends Container {
 private wall=new Graphics();private rain=new Graphics();private rainMask=new Graphics();private props=new Graphics();private lampGlow=new Graphics();private door=new Container();private record=new Container();private needle=new Graphics();private cup=new Container();private umbrella=new Container();private targets=new Graphics();
 completed=new Set<HomeAction>();busy:{id:HomeAction;elapsed:number}|null=null;enterTime=0;private time=0;
 constructor(){super();this.addChild(this.wall,this.rain,this.props,this.lampGlow,this.door,this.record,this.needle,this.cup,this.umbrella,this.targets);this.drawRoom();this.visible=false;}
 private drawRoom(){const g=this.wall;g.rect(0,0,1600,900).fill(0x514130);g.rect(0,0,1600,730).fill(0x7b6246);g.rect(0,730,1600,170).fill(0x54402e);const r=seeded(10);for(let i=0;i<150;i++){const x=r()*1600,y=r()*900;g.circle(x,y,r()*60+15).fill({color:0xb69d76,alpha:.012});}for(let y=750;y<900;y+=27)g.moveTo(0,y).lineTo(1600,y+3).stroke({color:0xb89d74,width:.7,alpha:.3});for(let x=0;x<1600;x+=180)g.moveTo(x,730).lineTo(x-200,900).stroke({color:0xc5b089,width:.5,alpha:.15});
 // Window and garden are separate from the live rain mask and interior props.
 g.roundRect(500,130,580,420,80).fill(0x192936).stroke({color:0xb59e78,width:8});for(let i=0;i<14;i++){const x=510+i*42,h=60+r()*110;g.rect(x,550-h,40,h).fill(0x26333d).stroke({color:0x9aadaf,width:.7,alpha:.35});g.rect(x+12,570-h,5,15).fill({color:GOLD,alpha:.6});}
 g.moveTo(790,130).lineTo(790,550).moveTo(500,350).lineTo(1080,350).stroke({color:0xc2ae8c,width:6});g.rect(483,546,615,17).fill(0x3b3026).stroke({color:0xbeaa83,width:2});
 for(const x of [475,1080]){g.moveTo(x,125).quadraticCurveTo(x+(x<600?100:-100),300,x,550).lineTo(x+(x<600?-35:35),550).lineTo(x+(x<600?-15:15),125).fill({color:0xc0ae8d,alpha:.7}).stroke({color:0xe3d8bb,width:1,alpha:.4});}
 this.rainMask.roundRect(505,136,570,405,70).fill(0xffffff);this.addChild(this.rainMask);this.rain.mask=this.rainMask;
 const p=this.props;p.rect(1130,610,380,24).fill(0x453024).stroke({color:INK,width:1});p.rect(1135,634,16,160).fill(0x493326);p.rect(1480,634,16,160).fill(0x493326);p.roundRect(1220,640,245,65,5).fill(0x624832).stroke({color:0xad9471,width:1});p.circle(1345,670,4).fill(GOLD);p.moveTo(930,604).lineTo(1520,604).stroke({color:0xd4bc92,width:4});
 p.moveTo(550,750).lineTo(565,610).quadraticCurveTo(620,565,675,610).lineTo(690,750).stroke({color:0xc0a57a,width:8});p.roundRect(560,675,125,18,5).fill(0x8e7657).stroke({color:0xc8b18b,width:1});p.moveTo(568,688).lineTo(555,805).moveTo(678,688).lineTo(696,805).stroke({color:0x352a23,width:10});
 for(let i=0;i<3;i++){const x=i?1230:340,y=i?165+i*95:205;p.roundRect(x,y,240,13,3).fill(0x403124).stroke({color:0xa8906b,width:1});for(let j=0;j<7;j++)p.roundRect(x+12+j*24,y-50-(j%2)*14,18,50+(j%2)*14,2).fill([0x82745d,0x6c6352,0x9f8d70][j%3]).stroke({color:0xc0ab86,width:.7,alpha:.6});}
 p.roundRect(235,310,100,13,4).fill(0x4d3525).stroke({color:0xbba077,width:1});for(let i=0;i<3;i++)p.moveTo(250+i*30,320).quadraticCurveTo(244+i*30,343,261+i*30,335).stroke({color:GOLD,width:2});
 // A truly dark lamp at reset, not an already-lit raster lamp.
 p.moveTo(1105,596).lineTo(1105,510).stroke({color:0xbca77d,width:5});p.ellipse(1105,597,30,6).fill(0x4c3b29).stroke({color:GOLD,width:1});p.moveTo(1058,518).quadraticCurveTo(1105,425,1152,518).closePath().fill(0x5d5143).stroke({color:0xc7b28c,width:1.5});p.moveTo(1080,480).lineTo(1075,515).moveTo(1130,480).lineTo(1135,515).stroke({color:GOLD,width:.6,alpha:.4});
 p.roundRect(1305,558,150,45,5).fill(0x352d27).stroke({color:0xb09a75,width:2});
 this.door.position.set(60,245);this.door.addChild(new Graphics().roundRect(0,0,180,490,70).fill(0x392e25).stroke({color:0xb49b75,width:4}).roundRect(25,70,130,210,50).fill(0x263139).stroke({color:0xa9916d,width:2}).circle(155,340,6).fill(GOLD));
 this.record.position.set(1370,566);const disk=new Graphics().ellipse(0,0,48,15).fill(0x181d1c).stroke({color:0x9e9377,width:.8});for(let i=0;i<5;i++)disk.ellipse(0,0,17+i*6,5+i*2).stroke({color:0x9a9d8d,width:.5,alpha:.35});this.record.addChild(disk,new Graphics().ellipse(0,0,10,4).fill(GOLD),new Graphics().circle(29,0,2).fill(INK));
 this.needle.position.set(1430,553);this.needle.moveTo(0,0).lineTo(-20,5).lineTo(-36,14).stroke({color:0xc7bba1,width:2});
 this.cup.addChild(new Graphics().moveTo(-12,-18).lineTo(-8,0).quadraticCurveTo(0,6,8,0).lineTo(12,-18).closePath().fill(0xc1ad86).stroke({color:0xe1d2b2,width:1}).ellipse(0,-18,12,4).fill(0x65513d).stroke({color:0xe1d2b2,width:1}).ellipse(15,-9,6,8).stroke({color:0xe1d2b2,width:2}));
 this.umbrella.addChild(new Graphics().moveTo(0,0).lineTo(0,92).quadraticCurveTo(12,105,15,88).stroke({color:GOLD,width:2}).moveTo(-12,15).lineTo(0,91).lineTo(12,15).closePath().fill({color:0xa79b7e,alpha:.8}).stroke({color:INK,width:1}));
 }
 reset(){this.completed.clear();this.busy=null;this.enterTime=0;this.time=0;this.visible=false;}
 start(){this.reset();this.visible=true;}
 begin(id:HomeAction){if(this.busy||this.completed.has(id)||(id==='chair'&&this.completed.size<4)||this.enterTime<3.5)return false;this.busy={id,elapsed:0};return true;}
 update(dt:number,actorX:number,direction=1):HomeAction|null{this.time+=dt;this.enterTime+=dt;let done:HomeAction|null=null;if(this.busy){this.busy.elapsed+=dt;if(this.busy.elapsed>=3.6){done=this.busy.id;this.completed.add(done);this.busy=null;}}
 this.door.scale.x=1-Math.sin(Math.min(1,this.enterTime/2)*Math.PI/2)*.86;
 const action=this.busy,progress=action?clamp(action.elapsed/3.6,0,1):0;
 const light=this.completed.has('lamp')?1:action?.id==='lamp'?clamp((progress-.2)*2,0,1):0;this.lampGlow.clear();for(let i=0;i<12;i++)this.lampGlow.ellipse(1105,500,32+i*20,50+i*18).fill({color:0xe5bb6c,alpha:light*.008});this.lampGlow.moveTo(1058,518).quadraticCurveTo(1105,425,1152,518).closePath().fill({color:GOLD,alpha:light*.5});this.lampGlow.ellipse(1105,519,43,5).fill({color:GOLD,alpha:light*.8});
 if(this.completed.has('record')||action?.id==='record'&&progress>.4){this.record.rotation=Math.sin(this.time*1.3)*.015;this.record.children[2].position.set(Math.cos(this.time*1.8)*15,Math.sin(this.time*1.8)*5);this.needle.rotation=.15;}else this.needle.rotation=-.12;
 this.umbrella.visible=true;if(!this.completed.has('umbrella')&&action?.id!=='umbrella'){this.umbrella.position.set(actorX+26*direction,660);this.umbrella.rotation=.08*direction;}
 if(this.completed.has('umbrella')){this.umbrella.position.set(285,337);this.umbrella.rotation=Math.sin(this.time*2)*.04*Math.exp(-Math.max(0,this.time-5)*.02);}else if(action?.id==='umbrella'){const f=Math.min(1,progress*1.5);this.umbrella.position.set(actorX+(285-actorX)*f,670+(337-670)*f);this.umbrella.rotation=(1-f)*-.3;}
 this.cup.position.set(970,590);if(action?.id==='tea'){const lift=Math.sin(progress*Math.PI);this.cup.position.set(970+(actorX+34*direction-970)*lift,590+(687-590)*lift);this.cup.rotation=-lift*.15;}else this.cup.rotation=0;
 this.rain.clear();const r=seeded(25);for(let i=0;i<65;i++){const x=505+r()*570,y=136+(r()*405+this.time*(80+r()*90))%405;this.rain.moveTo(x,y).lineTo(x-3,y+20).stroke({color:INK,width:.6,alpha:.32});}
 this.targets.clear();for(const target of HOME_TARGETS){if(this.completed.has(target.id)||(target.id==='chair'&&this.completed.size<4))continue;const near=Math.abs(actorX-target.x)<175;this.targets.circle(target.x,target.y,20+Math.sin(this.time*2)*2).stroke({color:GOLD,width:.8,alpha:near?.7:.18});if(near)this.targets.circle(target.x,target.y,2).fill(GOLD);}
 if(action?.id==='tea'||this.completed.has('tea'))for(let i=0;i<3;i++)this.targets.moveTo(this.cup.x-8+i*7,this.cup.y-30).quadraticCurveTo(this.cup.x+Math.sin(this.time+i)*5,this.cup.y-42,this.cup.x+i*4,this.cup.y-55).stroke({color:INK,width:.8,alpha:.2});return done;
 }
}

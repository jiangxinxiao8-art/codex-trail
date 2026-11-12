import {BELLS, WorldModel, clamp, smooth, type Impact, type Vec3} from './WorldModel';
export type Target=Vec3 & {id:string;label:string;hint:string};
export const CHAPTERS=['城市尚未醒来','城市的噪音','让雨唱一首歌','种下雨伞','水里的另一个世界','让城市起舞','飞过这座城市','一盏灯，一场雨','雨中曲'];
export const INSTRUMENTS:Target[]=[{id:'tin',x:13.5,y:1.5,z:-3.4,label:'檐下的风铃',hint:'轻触，听一声金属的回响'},{id:'glass',x:15.5,y:2.1,z:-5.2,label:'巷口的玻璃',hint:'让玻璃接上这一段旋律'},{id:'water',x:17.5,y:.1,z:-3.4,label:'低声唱歌的水',hint:'轻触水面，听低音散开'}];
export const PLANTING:Target[]=[{id:'seed-0',x:21.5,y:.08,z:3.2,label:'在这里种一把伞',hint:'轻触浅水中的种子'},{id:'seed-1',x:25.5,y:.08,z:3.2,label:'把雨水送得更远',hint:'再种一把伞，接住流下的雨'},{id:'seed-2',x:27.5,y:.08,z:5.3,label:'另一片安静的伞影',hint:'这里也可以种伞'}];
export const POND:Target={id:'pond',x:30.5,y:.04,z:3.2,label:'水里的另一个世界',hint:'靠近，轻轻拨动水面'};
export const ROOM:Target[]=[{id:'window',x:46,y:2.2,z:-105.7,label:'窗外的雨',hint:'轻触窗户，听近一些'},{id:'lamp',x:49,y:1.8,z:-102.8,label:'一盏小灯',hint:'轻触灯罩，点亮房间'},{id:'record',x:50.5,y:1.15,z:-102.8,label:'熟悉的旋律',hint:'让唱片转起来'},{id:'cup',x:48,y:1.25,z:-102.8,label:'一杯热茶',hint:'捧起来，暖一暖手'},{id:'chair',x:43.8,y:.6,z:-103.5,label:'坐下来，听一会儿雨',hint:'在窗边坐下'}];
export const FLIGHT_NOTES:Vec3[]=[{x:32,y:8,z:-14},{x:29,y:10,z:-40},{x:43,y:10,z:-43},{x:39,y:9,z:-66}];
export const FLIGHT_BUILDINGS=Array.from({length:24},(_,i)=>({x:18+(i%4)*13,y:3+(i%3)*1.1,z:-18-Math.floor(i/4)*14,w:5.4,d:6}));
export type JourneyInput={present:boolean;guide:boolean;wx:number;wz:number};
export class Journey {
 chapter=0;chapterTime=0;highest=1;won=false;started=false;
 voices=new Set<string>();planted=new Set<number>();pool=0;umbrellaHits=0;surface=0;dive=-1;dream=0;
 danceVoices=new Set<string>();danceEnergy=0;conducting=false;stirring=0;
 flightTime=0;flightSpeed=0;flightVelocity={x:0,y:0,z:0};flightRoute:'left'|'right'='left';autopilot=true;flightNotes=new Set<number>();landed=false;
 roomVisited=new Set<string>();lamp=false;record=false;cup=false;seated=false;sitTime=0;windowRipple=-10;
 path:{x:number;z:number}[]=[];walking=false;private pending:string|null=null;private lastDanceSound=-10;
 onChange:()=>void=()=>{};onSound:(kind:string,point:Vec3)=>void=()=>{};
 constructor(readonly world:WorldModel){}
 get ready(){return this.chapter===1?this.world.completed:this.chapter===2?this.voices.size===3:this.chapter===3?this.pool>=1:this.chapter===5?this.danceEnergy>=4&&this.danceVoices.size>=(this.world.easyMode?2:3):false;}
 get flying(){return this.chapter===6;}
 get flightPart(){return this.world.player.z> -27?1:this.world.player.z> -65?2:3;}
 get busy(){return this.chapter===0||this.dive>=0||this.flying||this.seated||this.chapter===8;}
 get targets():Target[]{
  if(this.chapter===2)return INSTRUMENTS;
  if(this.chapter===3)return PLANTING.filter((_,i)=>!this.planted.has(i));
  if(this.chapter===4)return[POND];
  if(this.chapter===5)return[{...POND,id:'conduct',y:.1,label:'把风交给这座城',hint:'张掌引风，或轻触这里开始演奏'}];
  if(this.chapter===7)return ROOM.filter(t=>t.id!=='chair'||this.roomVisited.size>=2);
  return[];
 }
 get nearest(){const p=this.world.player,used=(t:Target)=>this.chapter===2?this.voices.has(t.id):this.chapter===7?this.roomVisited.has(t.id):false;return [...this.targets].sort((a,b)=>Number(used(a))-Number(used(b))||Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z))[0];}
 inReach(t:Vec3){return Math.hypot(t.x-this.world.player.x,t.z-this.world.player.z)<(this.world.easyMode?6.5:3.8);}
 start(chapter=0){this.started=true;this.enter(clamp(Math.floor(chapter),0,7));if(chapter>=1)this.placeCheckpoint(chapter);}
 private changed(){this.onChange();}
 private enter(chapter:number){this.chapter=chapter;this.chapterTime=0;this.highest=Math.max(this.highest,Math.min(7,chapter));this.walking=false;this.path=[];this.pending=null;if(chapter!==6){this.world.animation.flight=0;this.world.animation.bank=0;}this.world.freeExplore=chapter>=2;this.world.weatherMode=chapter===7||chapter===8?'room':chapter===6?'flight':'street';this.changed();}
 private placeCheckpoint(ch:number){
  const w=this.world;if(ch>=2)w.completeWithAssistance();if(ch>=3)INSTRUMENTS.forEach(t=>this.voices.add(t.id));if(ch>=4){this.planted.add(0);this.planted.add(1);this.pool=1;}if(ch>=5)this.dream=1;
  const positions=[{x:-13,z:2.8},{x:-13,z:2.8},{x:15.5,z:-3.4},{x:20,z:3.2},{x:29,z:3.2},{x:30.5,z:3.2},{x:30.5,z:3.2},{x:46,z:-96.5}];const p=positions[ch];Object.assign(w.player,{...p,y:0,vx:0,vz:0});w.target={...p};this.syncWorld();
 }
 next(){if(!this.ready)return false;const from=this.chapter;this.enter(from+1);if(from===1)this.route([{x:15.5,z:2.8},{x:15.5,z:-3.4}]);if(from===2)this.route([{x:15.5,z:2.8},{x:20.8,z:3.2}]);if(from===3)this.guideTo(POND);if(from===5){this.flightTime=0;this.flightSpeed=0;this.world.player.y=0;}return true;}
 skip(){
  if(this.chapter===0){this.enter(1);return;}
  if(this.chapter===1){this.world.completeWithAssistance();this.next();}
  else if(this.chapter===2){INSTRUMENTS.forEach(t=>this.voices.add(t.id));this.next();}
  else if(this.chapter===3){this.planted.add(0);this.planted.add(1);this.pool=1;this.next();}
  else if(this.chapter===4){this.dive=-1;this.surface=3;this.dream=1;this.world.player.y=0;this.enter(5);}
  else if(this.chapter===5){this.danceEnergy=4;this.danceVoices.add('water');this.danceVoices.add('wind');this.danceVoices.add('chime');this.next();}
  else if(this.chapter===6){Object.assign(this.world.player,{x:46,y:0,z:-96.5,vx:0,vz:0});this.world.target={x:46,z:-99};this.landed=true;this.enter(7);}
  else if(this.chapter===7){this.roomVisited.add('window');this.roomVisited.add('lamp');this.lamp=true;this.guideTo(ROOM[4],'chair');}
  if(this.chapter>=2&&this.chapter<=7&&!this.seated&&!this.pending){this.walking=false;this.path=[];this.pending=null;this.placeCheckpoint(this.chapter);}
  this.changed();this.syncWorld();
 }
 route(points:{x:number;z:number}[],pending:string|null=null){this.path=points;this.walking=true;this.pending=pending;}
 stop(){this.walking=false;this.path=[];this.pending=null;this.world.target={x:this.world.player.x,z:this.world.player.z};this.changed();}
 guideTo(t:Vec3,pending:string|null=null){const p=this.world.player,points=[];if(p.z< -1.1&&p.z> -8&&t.z> -1.1)points.push({x:15.5,z:2.8});if(t.z< -1.1&&t.z> -8&&p.z> -1.1)points.push({x:15.5,z:2.8});points.push({x:t.x,z:t.z});this.route(points,pending);this.changed();}
 guide(){if(this.walking){this.stop();return;}if(this.ready){this.next();return;}const t=this.nearest;if(t)this.guideTo(t);}
 action(){if(this.ready){this.next();return;}const t=this.nearest;if(t){if(this.inReach(t))this.interact(t.id);else this.guideTo(t,t.id);}}
 interact(id:string){
  const t=this.targets.find(t=>t.id===id);if(!t||!this.inReach(t)||this.busy)return false;
  if(this.chapter===2){this.voices.add(id);const material=id==='tin'?'metal':id==='glass'?'glass':'water';this.world.impact({...t,material,guided:false,source:'touch',strength:1});this.onSound(id,t);}
  if(this.chapter===3){const i=PLANTING.findIndex(t=>t.id===id);this.planted.add(i);this.onSound('seed',t);}
  if(this.chapter===4){this.stirring=3.5;this.onSound('water',t);}
  if(this.chapter===5){this.conducting=!this.conducting;this.onSound('chime',t);}
  if(this.chapter===7){if(id==='chair'){if(this.roomVisited.size<2)return false;if(Math.hypot(this.world.player.x-t.x,this.world.player.z-t.z)>.45){this.guideTo(t,'chair');return true;}this.seated=true;this.roomVisited.add('chair');this.sitTime=0;this.world.player.yaw=Math.PI;this.world.player.vx=this.world.player.vz=0;}else{this.roomVisited.add(id);if(id==='lamp')this.lamp=!this.lamp;if(id==='record')this.record=!this.record;if(id==='cup')this.cup=true;if(id==='window')this.windowRipple=this.world.elapsed;}this.onSound(id,t);}
  this.syncWorld();this.changed();return true;
 }
 rain(hit:Impact){
  if(this.chapter===2&&hit.guided){const t=INSTRUMENTS.find(t=>(hit.material===(t.id==='tin'?'metal':t.id==='glass'?'glass':'water'))&&Math.hypot(t.x-hit.x,t.z-hit.z)<2);if(t&&!this.voices.has(t.id)){this.voices.add(t.id);this.changed();}}
  if(hit.material==='umbrella'&&this.planted.size>=2&&this.pool<1){this.umbrellaHits++;this.pool=Math.min(1,this.pool+(this.world.easyMode?.13:.055));this.syncWorld();this.changed();}
 }
 collectFlight(){if(this.chapter!==6)return false;const p=this.world.player;const i=FLIGHT_NOTES.findIndex((b,i)=>!this.flightNotes.has(i)&&Math.hypot(b.x-p.x,b.y-p.y,b.z-p.z)<(this.world.easyMode?7:4));if(i<0)return false;this.flightNotes.add(i);this.onSound('chime',FLIGHT_NOTES[i]);this.changed();return true;}
 freeListen(){this.seated=false;this.sitTime=0;this.world.animation.sit=0;this.enter(7);}
 update(dt:number,input:JourneyInput){
  if(!this.started)return;this.chapterTime+=dt;const wasReady=this.ready;const w=this.world,p=w.player;
  if(this.chapter===0){w.target={x:-11,z:2.8};if(this.chapterTime>6.5)this.enter(1);}
  if(this.walking){const t=this.path[0];if(t){w.target=t;if(Math.hypot(t.x-p.x,t.z-p.z)<.18&&Math.hypot(p.vx,p.vz)<.25){this.path.shift();if(!this.path.length){this.walking=false;const action=this.pending;this.pending=null;if(action)this.interact(action);this.changed();}}}}
  if(this.chapter===1&&this.ready&&p.z< -2)this.enter(2);
  if(this.chapter===2&&this.ready&&p.x>19)this.enter(3);
  if(this.chapter===3&&this.ready&&Math.hypot(p.x-POND.x,p.z-POND.z)<2.5)this.enter(4);
  if(this.chapter===4){const near=Math.hypot(p.x-POND.x,p.z-POND.z)<7;this.stirring=Math.max(0,this.stirring-dt);if(near&&(input.guide||this.stirring>0)&&this.dive<0){this.surface+=dt;w.animation.crouch=smooth(w.animation.crouch,1,4,dt);if(this.surface>=2.5){this.dive=0;this.stop();this.onSound('dream',POND);}}if(this.dive>=0){this.dive+=dt;this.dream=clamp((this.dive-2.6)/2,0,1);p.y=-Math.sin(clamp((this.dive-1.7)/3,0,1)*Math.PI)*.6;if(this.dive>=6){this.dive=-1;p.y=0;this.enter(5);}}}
  if(this.chapter===5){let wx=w.wind.x,wz=w.wind.z;const live=input.guide||this.conducting;if(this.conducting){wx=Math.sin(w.elapsed*1.3)*4;wz=Math.cos(w.elapsed*.8)*4;w.wind.x=wx;w.wind.z=wz;w.guiding=true;}if(live&&Math.hypot(wx,wz)>1){this.danceEnergy+=dt;if(wx< -1.5)this.danceVoices.add('wind');if(wx>1.5)this.danceVoices.add('chime');if(wz< -1.5)this.danceVoices.add('water');if(w.elapsed-this.lastDanceSound>.8){this.lastDanceSound=w.elapsed;this.onSound('chime',p);w.touchWater({x:POND.x,y:0,z:POND.z});}}w.animation.dance=smooth(w.animation.dance,live?1:0,3,dt);}
  if(this.chapter===6)this.updateFlight(dt,input);
  if(this.chapter===7&&this.seated){this.sitTime+=dt;w.animation.sit=clamp(this.sitTime/2.4,0,1);if(this.sitTime>4.5){this.won=true;this.enter(8);}}
  if(this.chapter!==4)w.animation.crouch=smooth(w.animation.crouch,0,4,dt);
  if(this.chapter!==5)w.animation.dance=smooth(w.animation.dance,0,4,dt);
  w.animation.cup=smooth(w.animation.cup,this.cup?1:0,3,dt);this.syncWorld();if(this.ready!==wasReady)this.changed();
 }
 private updateFlight(dt:number,input:JourneyInput){
  const w=this.world,p=w.player;w.guiding=input.present&&input.guide;this.flightTime+=dt;this.conducting=false;
  if(this.flightTime<2.6){const t=clamp((this.flightTime-.6)/2,0,1);w.animation.crouch=Math.sin(clamp(this.flightTime/.9,0,1)*Math.PI)*.8;p.y=8*(t*t*(3-2*t));w.animation.flight=t;p.yaw=Math.PI;return;}
  const last=this.flightPart===3,remaining=Math.max(0,p.z+94),gliding=this.autopilot||input.present;const speed=gliding?(last?Math.max(1.7,Math.min(5,remaining*.3)):4.6):0;
  this.flightSpeed=smooth(this.flightSpeed,speed,1.4,dt);const desiredX=last?46:this.flightPart===2?(this.flightRoute==='left'?29:43):32;
  const lateral=input.present?(input.guide?input.wx:0)*3:0,lift=input.present&&input.guide?-input.wz*3:0;
  const desiredY=last?clamp(remaining/24,0,1)*9: this.flightPart===2?10:8;
  this.flightVelocity.x=smooth(this.flightVelocity.x,clamp((desiredX+lateral-p.x)*1.2,-3,3),2,dt);this.flightVelocity.y=smooth(this.flightVelocity.y,clamp((desiredY+(remaining<10?0:lift)-p.y)*1.4,-2,2),2,dt);
  if(gliding){p.x+=this.flightVelocity.x*dt;p.y=Math.max(0,p.y+this.flightVelocity.y*dt);p.z-=this.flightSpeed*dt;}p.vx=this.flightVelocity.x;p.vz=-this.flightSpeed;p.yaw=Math.PI+this.flightVelocity.x*.09;w.animation.flight=last?clamp(remaining/16,0,1):1;w.animation.bank=-this.flightVelocity.x*.08;
  if(!last)p.y=clamp(p.y,7,16);if(p.z<= -94){p.z=-94;p.y=smooth(p.y,0,6,dt);if(p.y>.06)return;p.x=46;p.y=0;p.vx=p.vz=0;w.animation.flight=0;w.animation.land=1;this.landed=true;this.enter(7);this.route([{x:46,z:-98.5}]);this.onSound('land',p);}
 }
 private syncWorld(){const w=this.world;w.umbrellas=[...this.planted].map(i=>({...PLANTING[i],r:1.5,y:2.45}));w.extraPuddles=[{id:'dream-water',x:POND.x,z:POND.z,rx:Math.max(.001,2.4*this.pool),rz:Math.max(.001,1.5*this.pool)},...(this.chapter>=2?[{id:'instrument-water',x:17.5,z:-3.4,rx:1,rz:.7}]:[])];w.extraSurfaces=this.chapter>=2?[{id:'alley-tin',material:'metal',axis:'y',at:2.45,a:[12.2,14.8],b:[-4.2,-2.6]},{id:'alley-glass',material:'glass',axis:'z',at:-5.2,a:[14.6,16.4],b:[.9,3.1]},...(this.chapter>=4?FLIGHT_BUILDINGS.map((t,i)=>({id:'sky-roof-'+i,material:'roof' as const,axis:'y' as const,at:t.y+.16,a:[t.x-t.w/2,t.x+t.w/2] as [number,number],b:[t.z-t.d/2,t.z+t.d/2] as [number,number]})):[])]:[];w.animation.land=Math.max(0,w.animation.land-.02);}
 save(){return{version:1,chapter:Math.min(7,Math.max(1,this.chapter)),highest:this.highest,won:this.won};}
 get progress(){if(this.chapter===0)return'序章';if(this.chapter===1)return`雨棚${this.world.materialReady('metal')?' ✓':''}　玻璃${this.world.materialReady('glass')?' ✓':''}　雨滴 ${this.world.notes.size}/3`;if(this.chapter===2)return`找到 ${this.voices.size}/3 种音色`;if(this.chapter===3)return this.planted.size<2?'种下相连的两把雨伞':this.ready?'雨水汇成了一面小镜子':`雨水正在汇集 ${Math.round(this.pool*100)}%`;if(this.chapter===4)return this.dive>=0?'循着倒影，慢慢向前':'轻轻拨动水面，让倒影清晰起来';if(this.chapter===5)return this.ready?'风已经托住了你':'张掌引风，听见雨伞、风铃与水面的回应';if(this.chapter===6)return['','屋顶之间','音乐风道','飞向那盏灯'][this.flightPart];if(this.chapter===7)return this.seated?'坐下来，听一会儿雨':this.roomVisited.size>=2?'窗边留着一把椅子':`随意看看房间 ${this.roomVisited.size}/2`;return'雨没有停。但这一次，我不再害怕它。';}
}

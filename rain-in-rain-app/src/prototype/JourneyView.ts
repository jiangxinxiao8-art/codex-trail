import * as T from 'three';
import {Journey,PLANTING,POND,ROOM,INSTRUMENTS,FLIGHT_BUILDINGS,FLIGHT_NOTES,type Target} from './Journey';
import {InkBatch,outlined,paper} from './Ink';
import {WorldView} from './WorldView';
import {clamp,smooth} from './WorldModel';
import {pickDrop} from './Access';

/** Authored geometry stays in the street's coordinate system, including the room. */
export class JourneyView {
 readonly garden=new T.Group();readonly skyline=new T.Group();readonly room=new T.Group();
 private umbrellas:T.Group[]=[];private seeds:T.Mesh[]=[];private growth=[0,0,0];private instrumentGroups:T.Group[]=[];
 private flow=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xa6b7bb,transparent:true,opacity:.55}));
 private flowData=new Float32Array(3*18*6);
 private wind=new T.Line(new T.BufferGeometry(),new T.LineBasicMaterial({color:0xadc2c3,transparent:true,opacity:.45}));private windData=new Float32Array(40*3);
 private skyNotes:T.Mesh[]=[];private windways=new T.Group();
 private lampLight=new T.SpotLight(0xffd59a,0,15,1.15,.7,1.2);private lampBulb:T.Mesh;
 private recordDisc:T.Mesh;private cup=new T.Group();private steam:T.LineSegments;private roomAmbient:T.HemisphereLight;
 private guideMarker:T.LineLoop;private roomWindow:T.Mesh;private seedPulse=0;private lanterns:T.Mesh[]=[];private chime=new T.Group();
 constructor(readonly view:WorldView,readonly story:Journey){
  const scene=view.scene;scene.add(this.garden,this.skyline,this.room);this.garden.name='umbrella-garden';this.skyline.name='city-flight-route';this.room.name='rain-room';
  this.makeAlley();this.makeGarden();this.makeFlight();
  for(const x of [21,29,36]){const bulb=new T.Mesh(new T.SphereGeometry(.14,10,6),new T.MeshBasicMaterial({color:0x8e9384}));bulb.position.set(x,4.2,.3);this.lanterns.push(bulb);this.garden.add(bulb);}
  for(let i=0;i<3;i++){const bell=outlined(new T.CylinderGeometry(.035,.08,.35+i*.07,8),0x797d73,.6);bell.position.set((i-1)*.22,-i*.08,0);this.chime.add(bell);}this.chime.position.set(33,2.6,.4);this.garden.add(this.chime);
  this.flow.geometry.setAttribute('position',new T.BufferAttribute(this.flowData,3).setUsage(T.DynamicDrawUsage));this.flow.frustumCulled=false;scene.add(this.flow);
  this.wind.geometry.setAttribute('position',new T.BufferAttribute(this.windData,3).setUsage(T.DynamicDrawUsage));this.wind.frustumCulled=false;scene.add(this.wind);
  const roomBatch=new InkBatch();roomBatch.box(46,-.13,-100,12,.22,12);roomBatch.box(40,2.5,-100,.15,5,12);roomBatch.box(42.1,2.5,-106,4.2,5,.15);roomBatch.box(49.9,2.5,-106,4.2,5,.15);roomBatch.box(46,.7,-106,3.6,1.4,.15);roomBatch.box(46,4.8,-106,3.6,.4,.15);
  // Board seams, a window frame, a door arch, shelves, and a writing table.
  for(let x=40.5;x<52;x+=.6)roomBatch.line(x,.004,-106,x,.004,-94);
  for(const x of [44.16,47.84])roomBatch.box(x,3,-105.85,.09,3.25,.1);for(const y of [1.4,4.6])roomBatch.box(46,y,-105.85,3.8,.09,.1);for(const x of [44.2,46,47.8])roomBatch.line(x,1.45,-105.72,x,4.5,-105.72);roomBatch.line(44.2,3,-105.72,47.8,3,-105.72);
  roomBatch.box(49.2,1.02,-102.8,4.5,.16,1.65);for(const x of [47.2,51.2])for(const z of [-103.4,-102.2])roomBatch.box(x,.48,z,.1,1,.1);
  roomBatch.box(41.1,2.5,-104,2,.13,.6);for(let i=0;i<6;i++)roomBatch.box(40.4+i*.2,2.8,-104,.12,.5+(i%2)*.1,.35);
  roomBatch.stroke([new T.Vector3(45.2,.02,-94.5),new T.Vector3(45.2,2.3,-94.5),new T.Vector3(45.6,2.8,-94.5),new T.Vector3(46.4,2.8,-94.5),new T.Vector3(46.8,2.3,-94.5),new T.Vector3(46.8,.02,-94.5)]);
  const roomStatic=roomBatch.build();roomStatic.name='room-walls-and-furniture';roomStatic.traverse(o=>{if(o instanceof T.Mesh){o.material=new T.MeshStandardMaterial({color:0x665449,roughness:.94});o.castShadow=o.receiveShadow=true;}if(o instanceof T.LineSegments)o.material=new T.LineBasicMaterial({color:0x9e9788,transparent:true,opacity:.37});});this.room.add(roomStatic);
  this.roomWindow=new T.Mesh(new T.PlaneGeometry(3.45,2.9),new T.MeshBasicMaterial({color:0x18262b,transparent:true,opacity:.17,depthWrite:false}));this.roomWindow.position.set(46,3,-105.76);this.room.add(this.roomWindow);
  const chair=new InkBatch();chair.box(0,.57,0,.78,.12,.78);for(const x of [-.3,.3])for(const z of [-.3,.3])chair.box(x,.28,z,.07,.56,.07);chair.box(0,1.12,-.35,.76,1,.08);for(const x of [-.5,.5]){chair.box(x,.9,0,.08,.1,.8);chair.box(x,.73,.25,.05,.4,.05);}const chairMesh=this.lit(chair.build(),0x685747);chairMesh.position.set(ROOM[4].x,0,ROOM[4].z);chairMesh.name='window-chair';this.room.add(chairMesh);
  const lamp=new T.Group();lamp.position.set(49,1.12,-102.8);const lampBatch=new InkBatch();lampBatch.add(new T.CylinderGeometry(.27,.33,.07,16),new T.Vector3(0,.04,0));lampBatch.add(new T.CylinderGeometry(.035,.035,.75,10),new T.Vector3(0,.4,0));lampBatch.add(new T.CylinderGeometry(.2,.48,.45,16,1,true),new T.Vector3(0,.93,0));lamp.add(this.lit(lampBatch.build(),0x8f805e));this.room.add(lamp);
  this.lampBulb=new T.Mesh(new T.SphereGeometry(.12,12,8),new T.MeshBasicMaterial({color:0x504534}));this.lampBulb.position.set(49,1.95,-102.8);this.room.add(this.lampBulb);
  this.lampLight.position.set(49,2.04,-102.8);this.lampLight.target.position.set(45,.2,-103);this.lampLight.castShadow=true;this.lampLight.shadow.mapSize.set(512,512);this.lampLight.shadow.camera.near=.15;this.lampLight.shadow.camera.far=15;this.lampLight.shadow.bias=-.0005;this.lampLight.shadow.normalBias=.02;this.room.add(this.lampLight,this.lampLight.target);
  const record=new InkBatch();record.box(50.5,1.19,-102.8,.95,.18,.7);this.room.add(this.lit(record.build(),0x463d35));this.recordDisc=new T.Mesh(new T.CylinderGeometry(.3,.3,.018,28),new T.MeshStandardMaterial({color:0x141619,roughness:.45}));this.recordDisc.position.set(50.5,1.3,-102.8);this.recordDisc.castShadow=true;const label=new T.Mesh(new T.CircleGeometry(.085,16),new T.MeshBasicMaterial({color:0xa69c7b}));label.rotation.x=-Math.PI/2;label.position.y=.012;this.recordDisc.add(label);const mark=new T.Mesh(new T.BoxGeometry(.13,.005,.025),new T.MeshBasicMaterial({color:0xb9b4a2}));mark.position.set(.19,.012,0);this.recordDisc.add(mark);this.room.add(this.recordDisc);
  const cup:T.Mesh=outlined(new T.LatheGeometry([new T.Vector2(.1,0),new T.Vector2(.15,.04),new T.Vector2(.17,.25),new T.Vector2(.14,.25),new T.Vector2(.12,.04)],16),0x9a8e72,.5);cup.material=new T.MeshStandardMaterial({color:0xbcb293,roughness:.9});cup.castShadow=true;this.cup.add(cup);const handle=outlined(new T.TorusGeometry(.08,.02,6,16),0xa59b82,.4);handle.position.set(.18,.14,0);this.cup.add(handle);this.cup.position.set(48,1.12,-102.8);this.room.add(this.cup);
  const steamData=new Float32Array(36*6),steamGeometry=new T.BufferGeometry();steamGeometry.setAttribute('position',new T.BufferAttribute(steamData,3));this.steam=new T.LineSegments(steamGeometry,new T.LineBasicMaterial({color:0xe8d9b3,transparent:true,opacity:.3,depthWrite:false}));this.steam.frustumCulled=false;this.cup.add(this.steam);
  this.roomAmbient=new T.HemisphereLight(0x657c8b,0x342318,.16);this.room.add(this.roomAmbient);const welcome=new T.Mesh(new T.PlaneGeometry(.7,1),new T.MeshBasicMaterial({color:0xbea373}));welcome.position.set(46,2.1,-94.55);welcome.name='welcome-lantern';this.room.add(welcome);const porch=new T.PointLight(0xffd59a,2.8,4,1.4);porch.position.set(46,2,-95);this.room.add(porch);
  this.guideMarker=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:48},(_,i)=>new T.Vector3(Math.cos(i*Math.PI/24)*.45,.025,Math.sin(i*Math.PI/24)*.45))),new T.LineBasicMaterial({color:0xd9d9c3,transparent:true,opacity:.7}));scene.add(this.guideMarker);
 }
 private lit(root:T.Group,color:number){root.traverse(o=>{if(o instanceof T.Mesh){o.material=new T.MeshStandardMaterial({color,roughness:.9});o.castShadow=o.receiveShadow=true;}if(o instanceof T.Line)o.material=new T.LineBasicMaterial({color:0xc1b9a6,transparent:true,opacity:.45});});return root;}
 private makeAlley(){
  const b=new InkBatch();b.box(13.5,2.45,-3.4,2.6,.07,1.6);for(const x of [12.7,13.5,14.3]){b.line(x,2.45,-3.35,x,1.5,-3.35);b.add(new T.CylinderGeometry(.055,.09,.32,8),new T.Vector3(x,1.4,-3.35));}b.box(15.5,2,-5.25,1.8,2.2,.08);b.stroke([new T.Vector3(14.6,.9,-5.17),new T.Vector3(14.6,3.1,-5.17),new T.Vector3(16.4,3.1,-5.17),new T.Vector3(16.4,.9,-5.17)]);this.garden.add(b.build());
  INSTRUMENTS.forEach(t=>{const g=new T.Group();const ring=new T.Mesh(new T.TorusGeometry(.22,.018,6,24),new T.MeshBasicMaterial({color:0xb8c0b0}));ring.rotation.x=-Math.PI/2;g.position.set(t.x,.03,t.z);g.add(ring);this.instrumentGroups.push(g);this.garden.add(g);});
 }
 private makeGarden(){
  const b=new InkBatch();b.box(27,-.12,3,17,.2,9);for(let i=0;i<3;i++){const z=1.1+i*1.25;b.line(20,.015,z,31,.015,z);}b.stroke([new T.Vector3(21.5,.03,3.2),new T.Vector3(23,.03,4.4),new T.Vector3(25.5,.03,3.2),new T.Vector3(28,.03,4.4),new T.Vector3(30.5,.03,3.2)]);
  for(const x of [21,29,36]){b.add(new T.CylinderGeometry(.04,.06,4.4,8),new T.Vector3(x,2.2,.3));b.add(new T.ConeGeometry(.35,.28,12),new T.Vector3(x,4.4,.3));}
  b.box(35,2.5,-4.5,5,5,5);b.box(25,3.2,-7,5,6.4,4);for(const x of [24,25,26,34,35,36]){b.stroke([new T.Vector3(x,2,-1.95),new T.Vector3(x,3,-1.95),new T.Vector3(x+.45,3,-1.95),new T.Vector3(x+.45,2,-1.95)]);}this.garden.add(b.build());
  PLANTING.forEach((t,i)=>{const group=new T.Group();group.position.set(t.x,0,t.z);const canopy=outlined(new T.LatheGeometry([new T.Vector2(0,.6),new T.Vector2(.45,.55),new T.Vector2(1,.3),new T.Vector2(1.5,0)],24),0x353b3a,.65);canopy.position.y=2;group.add(canopy);const frame=new InkBatch();frame.add(new T.CylinderGeometry(.025,.035,2.2,8),new T.Vector3(0,1.1,0));for(let k=0;k<8;k++){const a=k*Math.PI/4;frame.stroke([new T.Vector3(0,2.6,0),new T.Vector3(Math.cos(a)*.8,2.42,Math.sin(a)*.8),new T.Vector3(Math.cos(a)*1.5,2,Math.sin(a)*1.5)]);}group.add(frame.build());group.scale.setScalar(.001);this.umbrellas.push(group);this.garden.add(group);const seed=outlined(new T.SphereGeometry(.13,12,8),0x9b9e8d);seed.position.set(t.x,.12,t.z);this.seeds.push(seed);this.garden.add(seed);});
 }
 private makeFlight(){
  const b=new InkBatch();b.box(35,-.2,-48,180,.2,240);
  for(const [i,t]of FLIGHT_BUILDINGS.entries()){b.box(t.x,t.y/2,t.z,t.w,t.y,t.d);b.box(t.x,t.y+.08,t.z,t.w+.25,.16,t.d+.25);for(const side of [-1,1])for(const y of [1.2,2.7]){const x=t.x+side*1.3,z=t.z+t.d/2+.02;b.stroke([new T.Vector3(x,y,z),new T.Vector3(x,y+.65,z),new T.Vector3(x+.45,y+.65,z),new T.Vector3(x+.45,y,z)]);}if(i%3===0)b.stroke([new T.Vector3(t.x-1,t.y+.15,t.z),new T.Vector3(t.x,t.y+1.4,t.z),new T.Vector3(t.x+1,t.y+.15,t.z)]);}
  for(const z of [-32,-61]){b.box(37,3.3,z,23,.25,2);for(const x of [26,48])b.box(x,1.5,z,.7,3,2);const arch=Array.from({length:25},(_,i)=>new T.Vector3(26+i*22/24,Math.sin(i*Math.PI/24)*2.5,z+1.01));b.stroke(arch);}
  this.skyline.add(b.build());
  for(const route of [29,43]){for(const offset of [-.3,.3]){const points=Array.from({length:90},(_,i)=>{const t=i/89;return new T.Vector3(32+(route-32)*Math.sin(t*Math.PI)+Math.sin(t*10)*offset,8+Math.sin(t*Math.PI)*2+offset,3.2-t*85);});const line=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:route===29?0x95aabc:0xaca0b5,transparent:true,opacity:.32}));this.windways.add(line);}}this.skyline.add(this.windways);
  FLIGHT_NOTES.forEach((p,i)=>{const mesh=outlined(new T.OctahedronGeometry(.23),0xc0b996,.6);mesh.position.set(p.x,p.y,p.z);mesh.name='flight-note-'+i;this.skyNotes.push(mesh);this.skyline.add(mesh);});
 }
 pick(x:number,y:number){const w=this.story.world,p=w.player;return pickDrop(this.story.targets.map((t,index)=>({...this.view.screen(t),index,collected:false,distance:Math.hypot(t.x-p.x,t.z-p.z)})),x*innerWidth,y*innerHeight,w.easyMode?85:30,w.easyMode?6.5:3.8,false);}
 targetAt(x:number,y:number){const i=this.pick(x,y);return i<0?null:this.story.targets[i];}
 update(dt:number){
  const j=this.story,w=j.world,p=w.player,time=w.elapsed;
  this.view.character.render.visible=!(j.chapter===4&&j.dive>1.1&&j.dive<5.8);this.garden.visible=j.chapter>=2&&j.chapter<=6;this.skyline.visible=j.chapter>=4;this.room.visible=j.chapter>=6;
  paper.uniforms.dream.value=j.dream;this.view.scene.background=(this.view.scene.background as T.Color).lerp(new T.Color(j.chapter>=7?0x0b0d0e:j.dream>.5?0x111b23:0x0b0c0d),1-Math.exp(-dt));
  this.view.scene.children.filter(o=>o instanceof T.HemisphereLight).forEach(o=>(o as T.HemisphereLight).intensity=j.chapter>=7?.1:.85);
  this.umbrellas.forEach((u,i)=>{this.growth[i]=smooth(this.growth[i],j.planted.has(i)?1:.001,3,dt);u.scale.setScalar(Math.max(.001,this.growth[i]));u.rotation.z=Math.sin(time*1.3+i)*Math.min(.045,Math.abs(w.wind.x)*.012);this.seeds[i].visible=!j.planted.has(i);this.seeds[i].position.y=.12+Math.sin(time*2+i)*.035;});
  this.chime.rotation.z=Math.sin(time*2)*Math.min(.35,Math.abs(w.wind.x)*.08);this.lanterns.forEach((m,i)=>{const power=j.chapter===5&&w.guiding?.7+Math.sin(time*2.8+i)*.15:.35;(m.material as T.MeshBasicMaterial).color.setRGB(power,power*(j.dream>.5?.9:1),power*(j.dream>.5?.66:1));});
  this.instrumentGroups.forEach((g,i)=>g.scale.setScalar(j.voices.has(INSTRUMENTS[i].id)?1.4:1+Math.sin(time*2)*.08));
  let n=0;for(let i=0;i<3;i++)for(let k=0;k<18;k++){const active=j.planted.has(i)&&j.pool>0,t=(time*.32+k/18)%1,a=PLANTING[i];for(const d of [0,.025]){const tt=Math.min(1,t+d);this.flowData[n++]=a.x+(POND.x-a.x)*tt;this.flowData[n++]=active?.024:-100;this.flowData[n++]=a.z+(POND.z-a.z)*tt+Math.sin(tt*Math.PI*2)*.35;}}this.flow.geometry.attributes.position.needsUpdate=true;this.flow.visible=j.chapter===3||j.chapter===4;
  for(let i=0;i<40;i++){const t=i/39;this.windData[i*3]=p.x+w.wind.x*t*1.1;this.windData[i*3+1]=.3+Math.sin(t*Math.PI)*1.4;this.windData[i*3+2]=p.z+w.wind.z*t*.8;}this.wind.geometry.attributes.position.needsUpdate=true;this.wind.visible=j.chapter===5&&w.guiding;
  this.skyNotes.forEach((m,i)=>{m.visible=!j.flightNotes.has(i);m.rotation.y=time*.8;});this.windways.visible=j.chapter===6;
  this.lampLight.intensity=smooth(this.lampLight.intensity,j.lamp?32:0,4,dt);(this.lampBulb.material as T.MeshBasicMaterial).color.set(j.lamp?0xffd493:0x504534);this.recordDisc.rotation.y+=j.record?dt*2.8:0;
  if(j.cup){const hand=this.view.character.handWorld();this.cup.position.lerp(hand,1-Math.exp(-dt*5));}else this.cup.position.set(48,1.12,-102.8);
  const steam=this.steam.geometry.attributes.position as T.BufferAttribute;for(let i=0;i<36;i++){const t=((i%12)/12+time*.25)%1,channel=Math.floor(i/12);for(let end=0;end<2;end++){const y=.3+t*.65+end*.028;steam.setXYZ(i*2+end,Math.sin(t*7+time+channel)*.035+channel*.035-.035,y,Math.cos(t*6+channel)*.035);}}steam.needsUpdate=true;
  (this.roomWindow.material as T.MeshBasicMaterial).color.setRGB(.025+j.dream*.01,.04,.055);this.roomWindow.scale.x=1+Math.max(0,1-(time-j.windowRipple)/1.5)*Math.sin((time-j.windowRipple)*17)*.012;
  const target=j.nearest;this.guideMarker.visible=!!target&&!j.busy;if(target){this.guideMarker.position.set(target.x,.04,target.z);this.guideMarker.scale.setScalar(1+Math.sin(time*2)*.1);}
  this.updateCamera();
 }
 private updateCamera(){const j=this.story,w=j.world,p=w.player;let shot:typeof this.view.rig.shot=null;
  if(j.chapter===0){const t=clamp(j.chapterTime/6.5,0,1);shot={position:{x:-18+t*15,y:12-t*4,z:32-t*6},target:{x:p.x+2,y:1.7,z:0},fov:34};}
  if(j.chapter===4&&(j.stirring>0||j.dive>=0)){const t=j.dive;const keys=[[0,34,3,9,30.5,.2,3.2],[1.5,30.8,1,5.3,30.5,.02,3.2],[3.3,30.5,-.3,3.7,30.5,-.05,1],[4.5,31.2,.3,4.7,30.5,.2,2],[6,36,6,15,30.5,1,2]];if(t<0)shot={position:{x:p.x+1.2,y:2.5,z:p.z+4},target:{x:POND.x,y:0,z:POND.z},fov:43};else{let i=keys.findIndex((k,index)=>index<keys.length-1&&t<keys[index+1][0]);if(i<0)i=keys.length-2;const a=keys[i],b=keys[i+1],v=clamp((t-a[0])/(b[0]-a[0]),0,1),u=v*v*(3-2*v);const mix=(k:number)=>a[k]+(b[k]-a[k])*u;shot={position:{x:mix(1),y:mix(2),z:mix(3)},target:{x:mix(4),y:mix(5),z:mix(6)},fov:46};}}
  if(j.chapter===6)shot={position:{x:p.x+1.1,y:p.y+3.1,z:p.z+8},target:{x:p.x,y:p.y+.8,z:p.z-8},fov:52};
  if(j.chapter===7||j.chapter===8){const sitting=j.seated;shot={position:{x:sitting?49.2:55,y:sitting?3.3:7.7,z:sitting?-98:-88.5},target:{x:sitting?44.3:46,y:1.2,z:sitting?-104:-101},fov:43};if(j.chapter===8){const pull=clamp(j.chapterTime/10,0,1);shot.position={x:49.2+pull*4,y:3.3+pull*2,z:-98+pull*5};}}
  this.view.rig.shot=shot;
 }
 inspect(){return{lampIntensity:this.lampLight.intensity,recordRotation:this.recordDisc.rotation.y,cupPosition:this.cup.position.toArray(),umbrellas:this.umbrellas.map(u=>({position:u.position.toArray(),scale:u.scale.x})),shadowMap:this.view.renderer.shadowMap.enabled,roomVisible:this.room.visible};}
}

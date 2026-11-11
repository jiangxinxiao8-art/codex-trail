import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { InkBatch, outlined, paper } from './Ink';
import { Character } from './Character';
import { pickDrop } from './Access';
import { BELLS, BUILDINGS, PUDDLES, SURFACES, WorldModel, RainModel, smooth, waterAt, type Impact, type Vec3 } from './WorldModel';

export class StreetCamera {
  readonly camera = new T.PerspectiveCamera(34, 16 / 9, .15, 130);
  readonly focus = new T.Vector3(-10, 1.9, 0);
  observing = false;
  reducedMotion = typeof matchMedia!=='undefined'&&matchMedia('(prefers-reduced-motion: reduce)').matches;
  private yaw = .22;
  constructor(){this.camera.position.set(-4,9,24);this.camera.lookAt(this.focus);}
  update(world:WorldModel,dt:number){
    const p=world.player,lead=T.MathUtils.clamp(p.vx*.4,-1.1,1.1);
    this.focus.x=smooth(this.focus.x,T.MathUtils.clamp(p.x+2+lead,-18,20),this.reducedMotion?12:4.5,dt);
    this.focus.z=smooth(this.focus.z,p.z*.25-1.4,4.5,dt);
    this.yaw=smooth(this.yaw,this.observing?-.78:.22,this.reducedMotion?16:2,dt);
    this.camera.position.set(this.focus.x+Math.sin(this.yaw)*25,7.8,this.focus.z+Math.cos(this.yaw)*25);
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
  }
  resize(w:number,h:number){this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
}

type Effect = Impact & {age:number;active:boolean};
export class WorldView {
  readonly renderer:T.WebGLRenderer;
  readonly scene=new T.Scene();
  readonly rig=new StreetCamera();
  readonly character=new Character();
  readonly rain:RainModel;
  readonly pipelineCalls:number;
  private rainPositions:Float32Array;
  private rainGeometry=new T.BufferGeometry();
  private rainLines:T.LineSegments;
  private effects:Effect[]=Array.from({length:72},()=>({x:0,y:0,z:0,material:'stone',guided:false,source:'rain',strength:0,age:0,active:false}));
  private effectGeometry=new T.BufferGeometry();
  private effectPositions=new Float32Array(72*32*2*3);
  private effectColors=new Float32Array(72*32*2*3);
  private effectIndex=0;
  private reflector:Reflector;
  private width=1280;private height=720;
  private reflectionTime=-1;
  private reflectionFrames=0;
  private noteMeshes:T.Mesh[]=[];
  private noteTimes=[-10,-10,-10];
  private noteHalos:T.LineLoop[]=[];private focusedNote=-1;private glassPulseTime=-10;private glassFrame!:T.LineLoop;
  private windows:T.Mesh[]=[];
  private gate=new T.Group();private gateRight=new T.Group();
  private car=new T.Group();
  private wheels:T.Mesh[]=[];
  private lastCarX=-23;
  private raycaster=new T.Raycaster();
  private floor=new T.Plane(new T.Vector3(0,1,0),0);
  private windHint:T.LineLoop;
  constructor(readonly host:HTMLElement,readonly world:WorldModel){
    this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));this.renderer.setSize(host.clientWidth,host.clientHeight);
    this.renderer.setClearColor(0x0b0c0d);host.append(this.renderer.domElement);
    this.renderer.domElement.setAttribute('aria-label','可探索的三维手绘雨夜街道');this.renderer.domElement.tabIndex=0;
    // First prove the installed r187 unlit pipeline before constructing any custom shaders.
    const checkScene=new T.Scene(),checkCamera=new T.PerspectiveCamera(45,1,.1,10),checkGeometry=new T.BoxGeometry(1,1,1),checkMaterial=new T.MeshNormalMaterial();checkCamera.position.z=3;
    checkScene.add(new T.Mesh(checkGeometry,checkMaterial));this.renderer.render(checkScene,checkCamera);this.pipelineCalls=this.renderer.info.render.calls;checkGeometry.dispose();checkMaterial.dispose();
    if(this.pipelineCalls<1)throw new Error('三维渲染器未能绘制校验物体');
    this.scene.background=new T.Color(0x0b0c0d);this.scene.fog=new T.FogExp2(0x0b0c0d,.019);
    this.makeCity();this.glassFrame=new T.LineLoop(new T.BufferGeometry().setFromPoints([new T.Vector3(-2,.9,-1.55),new T.Vector3(2,.9,-1.55),new T.Vector3(2,3.6,-1.55),new T.Vector3(-2,3.6,-1.55)]),new T.LineBasicMaterial({color:0xe3e4d8,transparent:true,opacity:0,depthWrite:false}));this.scene.add(this.glassFrame);this.makeCar();this.scene.add(this.character.render);
    this.rain=new RainModel(world);this.rainPositions=new Float32Array(this.rain.drops.length*6);
    this.rainGeometry.setAttribute('position',new T.BufferAttribute(this.rainPositions,3).setUsage(T.DynamicDrawUsage));
    this.rainLines=new T.LineSegments(this.rainGeometry,new T.LineBasicMaterial({color:0x90918b,transparent:true,opacity:.31,depthWrite:false}));this.rainLines.frustumCulled=false;this.scene.add(this.rainLines);
    this.effectGeometry.setAttribute('position',new T.BufferAttribute(this.effectPositions,3).setUsage(T.DynamicDrawUsage));this.effectGeometry.setAttribute('color',new T.BufferAttribute(this.effectColors,3).setUsage(T.DynamicDrawUsage));
    const effects=new T.LineSegments(this.effectGeometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.8,depthWrite:false}));effects.frustumCulled=false;this.scene.add(effects);
    this.reflector=this.makeWater();this.scene.add(this.reflector);
    const windPoints=Array.from({length:64},(_,i)=>new T.Vector3(Math.cos(i*Math.PI/32)*4.5,.03,Math.sin(i*Math.PI/32)*4.5));
    this.windHint=new T.LineLoop(new T.BufferGeometry().setFromPoints(windPoints),new T.LineBasicMaterial({color:0x737773,transparent:true,opacity:.15,depthWrite:false}));this.windHint.visible=false;this.scene.add(this.windHint);
    this.resize();
  }
  private makeCity(){
    const batch=new InkBatch();
    batch.box(0,-.1,0,100,.2,40);
    // Authored sightlines: awning -> glass -> suspended notes -> opening courtyard.

    for(const [i,[x,h,z,w,d]]of BUILDINGS.entries()){
      batch.box(x,h/2,z,w,h,d);const front=z+d/2+.025;
      batch.box(x,h+.08,z,w+.25,.16,d+.25);
      const roof=[new T.Vector3(x-w/2-.12,h+.15,front),new T.Vector3(x,h+.5,front),new T.Vector3(x+w/2+.12,h+.15,front)];batch.stroke(roof);
      if(i===3)continue;
      for(const dx of [-w*.23,w*.23])for(const yy of [h*.42,h*.73]){
        const xx=x+dx,ww=.59,hh=.9;
        batch.stroke([new T.Vector3(xx-ww/2,yy,front),new T.Vector3(xx-ww/2,yy+hh,front),new T.Vector3(xx+ww/2,yy+hh+.01,front),new T.Vector3(xx+ww/2,yy,front),new T.Vector3(xx-ww/2,yy,front)]);
        batch.line(xx,yy,front,xx,yy+hh,front);batch.line(xx-ww/2,yy+hh*.48,front,xx+ww/2,yy+hh*.48,front);
      }
      // A door is a real wall-side contour, with an arched lintel.
      const doorX=x-w*.12,arch=[];arch.push(new T.Vector3(doorX-.5,.03,front),new T.Vector3(doorX-.5,1.5,front));
      for(let j=0;j<=12;j++)arch.push(new T.Vector3(doorX-Math.cos(j*Math.PI/12)*.5,1.5+Math.sin(j*Math.PI/12)*.5,front));
      arch.push(new T.Vector3(doorX+.5,.03,front));batch.stroke(arch);
      if(i%2===0)batch.stroke([new T.Vector3(x+w*.42,h-.2,front+.04),new T.Vector3(x+w*.42,.25,front+.04),new T.Vector3(x+w*.4,.1,front+.2)]);
    }
    for(let i=0;i<9;i++){const x=-38+i*9,h=3.5+(i%3)*1.1;batch.box(x,h/2,-20-(i%2)*5,6,h,5);}
    // Tin canopy: render dimensions and swept collider share the same rectangle.
    const tin=SURFACES.find(s=>s.id==='tin-awning')!;batch.box(-8,tin.at-.045,-.85,4.2,.09,4.5);
    for(let x=-10;x<-5.9;x+=.3)batch.line(x,tin.at+.012,-3.1,x,tin.at+.012,1.4);
    for(const x of [-9.9,-6.1])batch.line(x,tin.at,1.4,x,.05,1.4);
    // The glass pane is a vertical world surface, rather than a clickable picture.
    batch.box(0,2.25,-1.66,4,2.7,.08);
    batch.line(-2,.9,-1.58,2,.9,-1.58);batch.line(-2,3.6,-1.58,2,3.6,-1.58);
    for(const x of [-2,0,2])batch.line(x,.9,-1.58,x,3.6,-1.58);
    batch.line(-2,2.3,-1.58,2,2.3,-1.58);
    for(let j=0;j<3;j++)batch.line(.3+j*.32,1.2,-1.575,1.2+j*.32,2.1,-1.575);
    const road=new InkBatch();for(let i=0;i<42;i++){const x=-32+(i*7.31)%68,z=.7+(i*2.17)%6;road.line(x,-.014,z,x+.35+(i%3)*.18,-.014,z+.008);}
    for(const z of [-.45,7.7])road.line(-39,.015,z,40,.015,z);const roadLines=road.build();(roadLines.children[0] as T.LineSegments).material=new T.LineBasicMaterial({color:0x5b6058,transparent:true,opacity:.3});this.scene.add(roadLines);
    // Cables stay sparse and attached to real facades.
    for(const [x,xx]of [[-17,-8],[-8,0],[6.5,22]]){
      const points=Array.from({length:20},(_,i)=>{const t=i/19;return new T.Vector3(x+(xx-x)*t,5.3-Math.sin(t*Math.PI)*.65,-1.1);});batch.stroke(points);
    }
    this.makeLamp(batch,-4.8,.8);this.makeLamp(batch,10.2,1.35);
    for(const x of [-22,24]){batch.add(new T.CylinderGeometry(.07,.09,.9,8),new T.Vector3(x,.45,6.8));batch.add(new T.SphereGeometry(.1,8,6),new T.Vector3(x,.93,6.8));}
    const buildings=batch.build();buildings.name='street-buildings';this.scene.add(buildings);
    // Separate dim windows respond to the discovered music without a screen-wide glow.
    for(const x of [-.75,.75,15.1]){
      const window=new T.Mesh(new T.PlaneGeometry(.4,.65),new T.MeshBasicMaterial({color:0x101111}));window.position.set(x,x>10?2.8:4.5,x>10?-8.73:-1.57);this.windows.push(window);this.scene.add(window);
    }
    const gateBatch=new InkBatch();gateBatch.box(1.5,1.05,0,3,.045,.055);
    for(const x of [0,.6,1.2,1.8,2.4,3])gateBatch.line(x,0,0,x,2.1,0);
    gateBatch.line(0,2.1,0,3,2.1,0);gateBatch.line(0,0,0,3,0,0);
    const gatePanel=gateBatch.build();this.gate.add(gatePanel);this.gate.position.set(12.5,.03,-1.5);this.gateRight.add(gatePanel.clone(true));this.gateRight.position.set(18.5,.03,-1.5);this.gateRight.rotation.y=Math.PI;this.scene.add(this.gate,this.gateRight);
    BELLS.forEach((p,i)=>{const shape=new T.LatheGeometry([new T.Vector2(0,-.2),new T.Vector2(.1,-.09),new T.Vector2(.105,.01),new T.Vector2(0,.2)],12);const bell=outlined(shape,0x414641,.8);bell.position.set(p.x,p.y,p.z);bell.name='suspended-drop-'+i;this.noteMeshes.push(bell);const halo=new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:40},(_,j)=>new T.Vector3(Math.cos(j*Math.PI/20)*.48,Math.sin(j*Math.PI/20)*.48,0))),new T.LineBasicMaterial({color:0xd6dccb,transparent:true,opacity:.3,depthWrite:false}));halo.position.copy(bell.position);this.noteHalos.push(halo);this.scene.add(bell,halo);});
  }
  private makeLamp(batch:InkBatch,x:number,z:number){
    batch.add(new T.CylinderGeometry(.035,.06,4.8,8),new T.Vector3(x,2.4,z));
    const curve=new T.CatmullRomCurve3([new T.Vector3(x,4.8,z),new T.Vector3(x,5.25,z),new T.Vector3(x-.5,5.45,z),new T.Vector3(x-.85,5.1,z)]);
    batch.add(new T.TubeGeometry(curve,16,.032,6,false));
    batch.add(new T.LatheGeometry([new T.Vector2(.35,0),new T.Vector2(.28,.12),new T.Vector2(.1,.31),new T.Vector2(.04,.32)],16),new T.Vector3(x-.85,4.75,z));
    const bulb=new T.Mesh(new T.CircleGeometry(.3,20),new T.MeshBasicMaterial({color:0xcdcec5,side:T.DoubleSide}));bulb.rotation.x=-Math.PI/2;bulb.position.set(x-.85,4.745,z);this.scene.add(bulb);
    const light=new T.Mesh(new T.ConeGeometry(2.2,4.7,32,1,true),new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 vUv;void main(){float a=pow(vUv.y,1.8)*.018;gl_FragColor=vec4(vec3(.8),a);}'}));light.position.set(x-.85,2.38,z);this.scene.add(light);
  }
  private makeWater(){
    const water=new Reflector(new T.PlaneGeometry(80,32),{textureWidth:512,textureHeight:256,multisample:0,clipBias:.004,shader:{
      name:'handwritten-world-water',uniforms:{color:{value:new T.Color(0xaaa9a2)},tDiffuse:{value:null},textureMatrix:{value:new T.Matrix4()},time:{value:0},puddles:{value:PUDDLES.map(p=>new T.Vector4(p.x,p.z,p.rx,p.rz))},rings:{value:Array.from({length:16},()=>new T.Vector4(0,0,-100,0))}},
      vertexShader:`uniform mat4 textureMatrix;varying vec4 vReflection;varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vReflection=textureMatrix*vec4(position,1.);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform vec4 puddles[3];uniform vec4 rings[16];varying vec4 vReflection;varying vec3 vWorld;
      void main(){float edge=10.;for(int i=0;i<3;i++){vec2 q=(vWorld.xz-puddles[i].xy)/puddles[i].zw;float d=length(q);d+=sin(q.x*12.+q.y*8.)*.018;edge=min(edge,d);}if(edge>1.)discard;
      float wave=0.;for(int i=0;i<16;i++){float age=time-rings[i].z;float r=length(vWorld.xz-rings[i].xy);float band=abs(r-age*1.45);float line=1.-smoothstep(.018,.055,band);wave+=line*max(0.,1.-age/1.3)*rings[i].w;}
      vec4 uv=vReflection;uv.xy+=vec2(sin(vWorld.z*16.+time*2.),cos(vWorld.x*12.-time*2.))*.0007*uv.w;
      vec3 reflected=texture2DProj(tDiffuse,uv).rgb;float border=smoothstep(.94,.985,edge)*(1.-smoothstep(.985,1.,edge));
      gl_FragColor=vec4(reflected*.27+vec3(.004+wave*.033+border*.028),1.);
      #include <colorspace_fragment>
      }`
    }});
    water.name='world-puddles';water.rotation.x=-Math.PI/2;water.position.y=.012;
    const before=water.onBeforeRender.bind(water);
    water.onBeforeRender=(renderer,scene,camera,geometry,material,group)=>{
      // One shared reflection target at 10 Hz. Physics and rain keep their own rates.
      if(this.world.elapsed-this.reflectionTime>.1||this.reflectionFrames===0){this.reflectionTime=this.world.elapsed;this.reflectionFrames++;const visible=this.rainLines.visible;this.rainLines.visible=false;before(renderer,scene,camera,geometry,material,group);this.rainLines.visible=visible;}
    };
    return water;
  }
  private makeCar(){
    const batch=new InkBatch();batch.box(0,.48,0,2.25,.55,.95);batch.box(-.1,.95,0,1.2,.5,.86);this.car.add(batch.build());
    for(const x of [-.7,.7])for(const z of [-.49,.49]){const wheel=outlined(new T.CylinderGeometry(.24,.24,.12,14),0x121515);wheel.rotation.x=Math.PI/2;wheel.position.set(x,.25,z);this.car.add(wheel);this.wheels.push(wheel);}
    this.car.position.set(-23,0,4.3);this.scene.add(this.car);
  }
  impact(hit:Impact){
    // Bounded visual pool; acoustic events are separately rate limited.
    if(hit.source==='rain'&&Math.random()>(hit.material==='water'?.23:.1))return;
    const e=this.effects[this.effectIndex++%this.effects.length];Object.assign(e,hit,{active:true,age:0});
    if(hit.material==='water'){const rings=(this.reflector.material as T.ShaderMaterial).uniforms.rings.value as T.Vector4[];rings[this.effectIndex%rings.length].set(hit.x,hit.z,this.world.elapsed,hit.source==='foot'?.8:.35);}
  }
  playNote(index:number){this.noteTimes[index]=this.world.elapsed;}
  focusNote(index:number){this.focusedNote=index;}
  glassFeedback(){this.glassPulseTime=this.world.elapsed;}
  update(dt:number){
    const w=this.world;this.rig.update(w,dt);this.character.update(w,dt);
    let n=0;for(const d of this.rain.drops){this.rainPositions[n++]=d.x;this.rainPositions[n++]=d.y;this.rainPositions[n++]=d.z;this.rainPositions[n++]=d.x-d.vx*.035;this.rainPositions[n++]=d.y-d.vy*.035;this.rainPositions[n++]=d.z-d.vz*.035;}
    this.rainGeometry.attributes.position.needsUpdate=true;
    n=0;const line=(x:number,y:number,z:number,xx:number,yy:number,zz:number,brightness:number)=>{for(const v of [x,y,z,xx,yy,zz])this.effectPositions[n++]=v;for(let i=n-6;i<n;i++)this.effectColors[i]=brightness;};
    for(const e of this.effects){if(!e.active)continue;e.age+=dt;if(e.age>(e.material==='water'?1.3:e.material==='glass'?.9:.35)){e.active=false;continue;}const a=e.age,b=(1-a/1.5)*.38;
      if(e.material==='glass'){line(e.x,e.y-a*.6,e.z+.03,e.x+.008,e.y-a*.6-.17,e.z+.03,b);continue;}
      const radius=.04+a*(e.source==='foot'?.9:.6);
      if(e.material==='water')for(let j=0;j<24;j++){const t=j*Math.PI/12,tt=(j+1)*Math.PI/12;line(e.x+Math.cos(t)*radius,e.y+.025,e.z+Math.sin(t)*radius,e.x+Math.cos(tt)*radius,e.y+.025,e.z+Math.sin(tt)*radius,b*.6);}
      if(e.material!=='water'&&a<.35)for(let j=0;j<3;j++){const x=e.x+Math.sin(j*2.1)*a*.6,z=e.z+Math.cos(j*2.1)*a*.6,y=e.y+a*.6-a*a*2;line(x,y,z,x,y+.05,z,b);}
    }
    this.effectGeometry.setDrawRange(0,n/3);this.effectGeometry.attributes.position.needsUpdate=true;this.effectGeometry.attributes.color.needsUpdate=true;
    const awake=w.materialsAwake?1:0;paper.uniforms.awake.value=smooth(paper.uniforms.awake.value,awake,1.5,dt);
    this.windows.forEach((window,i)=>{const value=(w.gateOpen?.11:awake*.065)+(i===2?.005:0);(window.material as T.MeshBasicMaterial).color.setRGB(value,value,value*.97);});
    this.gate.rotation.y=smooth(this.gate.rotation.y,w.gateOpen?-Math.PI*.53:0,1.7,dt);this.gateRight.rotation.y=smooth(this.gateRight.rotation.y,w.gateOpen?Math.PI*1.53:Math.PI,1.7,dt);
    this.noteMeshes.forEach((mesh,i)=>{const power=Math.exp(-(w.elapsed-this.noteTimes[i])*3.4),scale=2.2*(1+power*.38);mesh.scale.setScalar(scale);(mesh.material as T.MeshBasicMaterial).color.setScalar(w.materialsAwake?(w.notes.has(i)?.16:.3)+power*.4:.045);mesh.position.y=BELLS[i].y+Math.sin(w.elapsed*1.3+i)*.028;const halo=this.noteHalos[i];halo.position.copy(mesh.position);halo.quaternion.copy(this.rig.camera.quaternion);halo.visible=w.materialsAwake&&Math.hypot(w.player.x-mesh.position.x,w.player.z-mesh.position.z)<9;(halo.material as T.LineBasicMaterial).opacity=this.focusedNote===i?.9:w.notes.has(i)?.16:.4;halo.scale.setScalar(1+power*.35);});
    (this.glassFrame.material as T.LineBasicMaterial).opacity=Math.max(0,1-(w.elapsed-this.glassPulseTime)/.55)*.82;
    this.windHint.visible=w.guiding;this.windHint.position.set(w.player.x,0,w.player.z);
    const x=-28+(w.elapsed*2)%59;this.car.position.x=x;for(const wheel of this.wheels)wheel.rotation.y=-x/.24;
    if(Math.abs(x-this.lastCarX)>.38){if(waterAt(x,4.3))w.impact({x,y:.025,z:4.3,material:'water',source:'foot',guided:false,strength:.5});this.lastCarX=x;}
    (this.reflector.material as T.ShaderMaterial).uniforms.time.value=w.elapsed;
    this.renderer.render(this.scene,this.rig.camera);
  }
  screen(point:Vec3){const v=new T.Vector3(point.x,point.y,point.z).project(this.rig.camera);return{x:(v.x*.5+.5)*this.width,y:(-v.y*.5+.5)*this.height,visible:v.z<1&&Math.abs(v.x)<.96&&Math.abs(v.y)<.91};}
  ground(x:number,y:number){this.raycaster.setFromCamera(new T.Vector2(x*2-1,1-y*2),this.rig.camera);const p=new T.Vector3();return this.raycaster.ray.intersectPlane(this.floor,p)?p:null;}
  bellAt(x:number,y:number){
    const p=this.world.player;
    return pickDrop(this.noteMeshes.map((mesh,index)=>{const screen=this.screen(mesh.position);return{index,...screen,distance:Math.hypot(mesh.position.x-p.x,mesh.position.z-p.z),collected:this.world.notes.has(index)};}),x*this.width,y*this.height,this.world.easyMode?Math.max(64,Math.min(108,Math.min(this.width,this.height)*.11)):24,this.world.touchRange,this.world.easyMode&&!this.world.completed);
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;this.width=w;this.height=h;this.renderer.setSize(w,h);this.rig.resize(w,h);}
  dispose(){this.renderer.setAnimationLoop(null);this.reflector.dispose();const geometries=new Set<T.BufferGeometry>(),materials=new Set<T.Material>();this.scene.traverse(o=>{const mesh=o as T.Mesh;if(mesh.geometry)geometries.add(mesh.geometry);if(mesh.material)for(const mat of Array.isArray(mesh.material)?mesh.material:[mesh.material])materials.add(mat);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());this.renderer.dispose();this.renderer.domElement.remove();}
  get metrics(){return{calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures,reflectionFrames:this.reflectionFrames,pipelineCalls:this.pipelineCalls};}
}

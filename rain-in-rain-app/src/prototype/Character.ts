import * as T from 'three';
import { outlined } from './Ink';
import type { WorldModel } from './WorldModel';

/** One spatial rig: +Y up, +Z forward. Shoes are planted in world space. */
export class Character {
  readonly root = new T.Group();
  readonly render = new T.Group();
  private batches!: T.BatchedMesh;
  private instances:{mesh:T.Mesh;id:number}[]=[];
  private ink!:T.LineSegments;
  private inkPositions!:Float32Array;
  private strokes:{line:T.Line;positions:T.BufferAttribute|T.InterleavedBufferAttribute;loop:boolean}[]=[];
  private vertex=new T.Vector3();
  private torso = new T.Group();
  private head = new T.Group();
  private arms: T.Group[] = [];
  private legs: { upper: T.Mesh; lower: T.Mesh; shoe: T.Mesh; anchor: T.Vector3; planted: boolean }[] = [];
  private up = new T.Vector3(0, 1, 0);
  private a = new T.Vector3(); private b = new T.Vector3(); private dir = new T.Vector3();
  readonly footWorld = [new T.Vector3(), new T.Vector3()];
  constructor() {
    this.root.name = 'raincoat-character'; this.root.add(this.torso);
    const coat = new T.LatheGeometry([new T.Vector2(.32,.62),new T.Vector2(.34,.68),new T.Vector2(.27,.95),new T.Vector2(.21,1.23),new T.Vector2(.16,1.28)],12);
    this.torso.add(outlined(coat,0x62645c));
    const hem = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:32},(_,i)=>new T.Vector3(Math.cos(i*Math.PI/16)*.335,.675,Math.sin(i*Math.PI/16)*.335))),new T.LineBasicMaterial({color:0x9d9e95}));this.torso.add(hem);
    for(const s of [-1,1]) {
      const shape=new T.Shape();shape.moveTo(s*.02,1.23);shape.lineTo(s*.18,1.28);shape.quadraticCurveTo(s*.2,1.12,s*.09,1.12);shape.closePath();
      const collar=outlined(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:false}),0x73736b);collar.position.z=.18;this.torso.add(collar);
    }
    for(const y of [1.12,.99,.85]) {const button=new T.Mesh(new T.SphereGeometry(.018,6,4),new T.MeshBasicMaterial({color:0xb4b4ab}));button.position.set(.015,y,.27);this.torso.add(button);}
    this.head.position.set(0,1.43,0);this.torso.add(this.head);
    const hair=outlined(new T.SphereGeometry(.205,12,8),0x171819);hair.scale.set(1,1.02,.9);this.head.add(hair);
    const face=outlined(new T.SphereGeometry(.145,12,8),0x8c8d83,.38);face.position.set(0,0,.095);face.scale.set(1,1.05,.75);this.head.add(face);
    const hat=outlined(new T.SphereGeometry(.285,16,8,0,Math.PI*2,0,Math.PI*.53),0x797b70);hat.position.y=.11;hat.scale.y=.7;this.head.add(hat);
    const brim=outlined(new T.LatheGeometry([new T.Vector2(.24,.09),new T.Vector2(.34,.035),new T.Vector2(.36,.015)],20),0x75776b);brim.position.y=.1;this.head.add(brim);
    for(const side of [-1,1]) {
      const arm=new T.Group();arm.position.set(side*.23,1.17,0);this.torso.add(arm);this.arms.push(arm);
      const sleeve=outlined(new T.CylinderGeometry(.085,.11,.35,8),0x333532);sleeve.position.set(side*.025,-.15,0);sleeve.rotation.z=side*.13;arm.add(sleeve);
      const hand=outlined(new T.SphereGeometry(.067,8,6),0x8b8c80,.4);hand.position.set(side*.05,-.36,0);arm.add(hand);
      const upper=outlined(new T.CylinderGeometry(.05,.045,1,6),0x242624,.4),lower=outlined(new T.CylinderGeometry(.04,.035,1,6),0x494b46,.4);
      const shoe=outlined(new T.BoxGeometry(.15,.095,.26),0x151818);this.root.add(upper,lower,shoe);
      this.legs.push({upper,lower,shoe,anchor:new T.Vector3(),planted:false});
    }
    // Keep the full spatial rig, render its independently transformed pieces in two draws.
    const pieces:T.Mesh[]=[];let vertices=0,lineVertices=0;
    this.root.traverse(object=>{if(object instanceof T.Mesh){pieces.push(object);vertices+=object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count;}if(object instanceof T.Line){const positions=object.geometry.getAttribute('position');const loop=object instanceof T.LineLoop;this.strokes.push({line:object,positions,loop});lineVertices+=loop?positions.count*2:positions.count;}});
    this.batches=new T.BatchedMesh(pieces.length,vertices,0,new T.MeshLambertMaterial({color:0xffffff}));this.batches.castShadow=true;this.batches.receiveShadow=true;this.batches.frustumCulled=false;this.batches.perObjectFrustumCulled=false;this.batches.sortObjects=false;
    for(const mesh of pieces){const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.clearGroups();const geometryId=this.batches.addGeometry(geometry),id=this.batches.addInstance(geometryId);this.batches.setColorAt(id,(mesh.material as T.MeshBasicMaterial).color);this.instances.push({mesh,id});geometry.dispose();}
    this.inkPositions=new Float32Array(lineVertices*3);const inkGeometry=new T.BufferGeometry();inkGeometry.setAttribute('position',new T.BufferAttribute(this.inkPositions,3).setUsage(T.DynamicDrawUsage));this.ink=new T.LineSegments(inkGeometry,new T.LineBasicMaterial({color:0xb9b9b3,transparent:true,opacity:.62}));this.ink.frustumCulled=false;
    this.root.visible=false;this.render.add(this.root,this.batches,this.ink);
  }
  handWorld(){return this.arms[0].localToWorld(new T.Vector3(-.05,-.36,0));}
  private bone(mesh:T.Mesh,start:T.Vector3,end:T.Vector3){this.dir.copy(end).sub(start);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.scale.y=this.dir.length();mesh.quaternion.setFromUnitVectors(this.up,this.dir.normalize());}
  update(world:WorldModel,dt:number){
    const p=world.player,speed=Math.hypot(p.vx,p.vz),walk=speed>.03,phase=p.distance/1.2;
    const pose=world.animation;this.root.position.set(p.x,p.y,p.z);this.root.rotation.z=pose.bank;this.root.rotation.y=p.yaw;
    const step=Math.sin(phase*Math.PI*2);this.torso.position.y=Math.abs(step)*.012*Math.min(1,speed)-pose.crouch*.24-pose.sit*.19-Math.sin(pose.land*Math.PI)*.12;this.torso.rotation.x=(world.guiding?-.035:-Math.min(.04,speed*.015))-pose.flight*.2+pose.crouch*.17;this.torso.rotation.z=Math.sin(world.elapsed*2.8)*pose.dance*.07;
    this.head.rotation.x=world.guiding?-.1:Math.sin(world.elapsed*1.4)*.012;
    this.arms.forEach((arm,i)=>{const desired=pose.cup&&i===0?-1.4:pose.flight?-.2:world.guiding?-.48:Math.sin(phase*Math.PI*2+i*Math.PI)*.34*Math.min(1,speed);arm.rotation.x+=(desired-arm.rotation.x)*(1-Math.exp(-9*dt));arm.rotation.z=(i?1:-1)*(pose.flight?1.2:world.guiding?.4:.03)+Math.sin(world.elapsed*2.8+i)*pose.dance*.12;});
    this.legs.forEach((leg,i)=>{
      const side=i?1:-1,f=(phase+i*.5)%1,stance=walk&&f<.5;
      let z=0,y=.055;
      if(walk){if(stance){if(!leg.planted){leg.anchor.set(p.x+Math.sin(p.yaw)*.29+Math.cos(p.yaw)*side*.13,0,p.z+Math.cos(p.yaw)*.29-Math.sin(p.yaw)*side*.13);}const dx=leg.anchor.x-p.x,dz=leg.anchor.z-p.z;z=dx*Math.sin(p.yaw)+dz*Math.cos(p.yaw);}else{const t=(f-.5)/.5;z=-.31+.6*t;y+=Math.sin(t*Math.PI)*.09;}}
      leg.planted=stance;z=T.MathUtils.clamp(z,-.32,.32);
      y+=pose.flight*.36;z-=pose.flight*.27;z+=pose.sit*.44;const hip=new T.Vector3(side*.13,.66-pose.sit*.17-pose.crouch*.12,0),foot=new T.Vector3(side*.13,y,z),dy=foot.y-hip.y,d=Math.min(.699,Math.hypot(z,dy)),bend=Math.sqrt(Math.max(0,.35*.35-d*d/4));
      const knee=new T.Vector3(side*.13,(hip.y+foot.y)/2+z/Math.max(d,.001)*bend,z/2-dy/Math.max(d,.001)*bend);
      this.bone(leg.upper,hip,knee);this.bone(leg.lower,knee,foot);leg.shoe.position.copy(foot);leg.shoe.position.z+=.04;
      this.footWorld[i].copy(foot).applyAxisAngle(this.up,p.yaw).add(this.root.position);
    });
    this.root.updateMatrixWorld(true);for(const instance of this.instances)this.batches.setMatrixAt(instance.id,instance.mesh.matrixWorld);
    let index=0;const put=(stroke:typeof this.strokes[number],i:number)=>{this.vertex.fromBufferAttribute(stroke.positions,i).applyMatrix4(stroke.line.matrixWorld);this.inkPositions[index++]=this.vertex.x;this.inkPositions[index++]=this.vertex.y;this.inkPositions[index++]=this.vertex.z;};
    for(const stroke of this.strokes){if(stroke.loop){for(let j=0;j<stroke.positions.count;j++){put(stroke,j);put(stroke,(j+1)%stroke.positions.count);}}else for(let j=0;j<stroke.positions.count;j++)put(stroke,j);}
    this.ink.geometry.attributes.position.needsUpdate=true;
  }
}

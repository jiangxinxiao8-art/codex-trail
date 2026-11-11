import { WorldModel } from './WorldModel';

export type PickCandidate = { index:number; x:number; y:number; visible:boolean; distance:number; collected:boolean };
/** Screen tolerance scales with the viewport; the world-distance check still applies. */
export function pickDrop(candidates:PickCandidate[], x:number, y:number, radius:number, range:number, preferNew=true) {
  const nearby=candidates.filter(c=>c.visible&&c.distance<=range&&Math.hypot(c.x-x,c.y-y)<=radius);
  const fresh=nearby.filter(c=>!c.collected),pool=preferNew&&fresh.length?fresh:nearby;
  pool.sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y));
  return pool[0]?.index??-1;
}
export class DwellTouch {
  target=-1; elapsed=0; private fired=false;
  get progress(){return Math.min(1,this.elapsed/.9);}
  reset(){this.target=-1;this.elapsed=0;this.fired=false;}
  update(target:number,dt:number,enabled:boolean){
    if(!enabled||target<0){this.reset();return -1;}
    if(target!==this.target){this.target=target;this.elapsed=0;this.fired=false;}
    this.elapsed+=dt;
    if(this.elapsed>=.9&&!this.fired){this.fired=true;return target;}
    return -1;
  }
}
export class WalkingGuide {
  private path:{x:number;z:number}[]=[];
  active=false;
  destination: 'metal'|'glass'|'notes'|'courtyard'='metal';
  constructor(private world:WorldModel){}
  begin(){
    const w=this.world;
    this.destination=w.completed?'courtyard':!w.materialReady('metal')?'metal':!w.materialReady('glass')?'glass':'notes';
    this.path=this.destination==='courtyard'?(w.player.z< -1.1?[{x:15.5,z:-3.6}]:[{x:15.5,z:2.8},{x:15.5,z:-3.6}]):[{x:this.destination==='metal'?-8:this.destination==='glass'?0:9.8,z:2.8}];
    this.active=true;
  }
  stop(){this.active=false;this.path=[];this.world.target={x:this.world.player.x,z:this.world.player.z};}
  update(){
    if(!this.active)return false;
    const p=this.world.player,target=this.path[0];
    if(Math.hypot(p.x-target.x,p.z-target.z)<.2&&Math.hypot(p.vx,p.vz)<.22){this.path.shift();if(!this.path.length){this.stop();return false;}}
    this.world.target=this.path[0];return true;
  }
}

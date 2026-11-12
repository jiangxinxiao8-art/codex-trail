export type Vec3 = { x: number; y: number; z: number };
export type Material = 'stone' | 'metal' | 'glass' | 'water' | 'roof' | 'umbrella';
export type Surface = { id: string; material: Material; axis: 'y' | 'z'; at: number; a: [number, number]; b: [number, number] };
export type Puddle = { id: string; x: number; z: number; rx: number; rz: number };
export type Impact = Vec3 & { material: Material; guided: boolean; source: 'rain' | 'foot' | 'touch'; strength: number };
// Shared by the renderer and collision proxies: x, height, z, width, depth.
export const BUILDINGS = [[-28,7,-9,7,4],[-17,6.2,-5.4,6,4.4],[-8,5.4,-5,5.2,4],[0,6.1,-4,5.2,4.8],[6.5,7.8,-5.6,6,4.8],[22,6.6,-5.4,6.2,5],[15.5,4.9,-10.5,6,3.5],[31,5,-9,7,6]];
export const PUDDLES: Puddle[] = [
  { id: 'entry-water', x: -12, z: 3.4, rx: 2.05, rz: 1.1 },
  { id: 'listening-water', x: 3, z: 3, rx: 2.25, rz: 1.3 },
  { id: 'courtyard-water', x: 16, z: -3.6, rx: 1.9, rz: 1.2 },
];
export const SURFACES: Surface[] = [
  { id: 'tin-awning', material: 'metal', axis: 'y', at: 2.8, a: [-10.1, -5.9], b: [-3.1, 1.4] },
  { id: 'shop-window', material: 'glass', axis: 'z', at: -1.6, a: [-2, 2], b: [.9, 3.6] },
  ...BUILDINGS.map(([x,h,z,w,d],i):Surface=>({id:'roof-'+i,material:'roof',axis:'y',at:h+.16,a:[x-w/2,x+w/2],b:[z-d/2,z+d/2]})),
];
export const BELLS: Vec3[] = [{ x: 8.4, y: 2.3, z: 1.3 }, { x: 9.8, y: 2.7, z: 1.3 }, { x: 11.2, y: 2.1, z: 1.3 }];
export const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
export const smooth = (a: number, b: number, rate: number, dt: number) => a + (b - a) * (1 - Math.exp(-rate * dt));
export function waterAt(x: number, z: number, puddles=PUDDLES): Puddle | undefined {
  return puddles.find(p => ((x - p.x) / p.rx) ** 2 + ((z - p.z) / p.rz) ** 2 < 1);
}
/** Segment sweeps choose the first surface hit, even if one update crosses several. */
export function sweep(from: Vec3, to: Vec3, surfaces = SURFACES, puddles=PUDDLES): (Vec3 & { material: Material; id: string; t: number }) | null {
  let best: ReturnType<typeof sweep> = null;
  for (const s of surfaces) {
    const d = to[s.axis] - from[s.axis];
    if (Math.abs(d) < 1e-8) continue;
    const t = (s.at - from[s.axis]) / d;
    if (t < 0 || t > 1 || best && t >= best.t) continue;
    const x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t, z = from.z + (to.z - from.z) * t;
    const second = s.axis === 'y' ? z : y;
    if (x >= s.a[0] && x <= s.a[1] && second >= s.b[0] && second <= s.b[1]) best = { x, y, z, material: s.material, id: s.id, t };
  }
  if (from.y > 0 && to.y <= 0) {
    const t = from.y / (from.y - to.y), x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
    if (!best || t < best.t) best = { x, y: .015, z, material: waterAt(x, z,puddles) ? 'water' : 'stone', id: waterAt(x, z, puddles)?.id ?? 'street', t };
  }
  return best;
}

export class WorldModel {
  readonly player = { x: -13, y: 0, z: 2.8, vx: 0, vz: 0, yaw: Math.PI / 2, distance: 0 };
  readonly wind = { x: 0, z: 0 };
  target = { x: -13, z: 2.8 };
  freeExplore=false;
  weatherMode:'street'|'flight'|'room'='street';
  umbrellas:({r:number}&Vec3)[]=[];extraPuddles:Puddle[]=[];extraSurfaces:Surface[]=[];
  animation={crouch:0,dance:0,flight:0,bank:0,sit:0,cup:0,land:0};
  get puddles(){return [...PUDDLES,...this.extraPuddles];}
  maxSpeed = 1.4;
  maxAcceleration = 3.4;
  guiding = false;
  elapsed = 0;
  steps = 0;
  private lastStepDistance = 0;
  readonly guidedHits = { metal: 0, glass: 0 };
  readonly contacts = { stone: 0, metal: 0, glass: 0, water: 0, roof: 0, umbrella:0 };
  readonly notes = new Set<number>();
  easyMode = true;
  completion: 'none' | 'natural' | 'assisted' = 'none';
  private discovered = new Set<'metal' | 'glass'>();
  onImpact: (impact: Impact) => void = () => {};
  onChange: () => void = () => {};
  get requiredHits() { return this.easyMode ? 2 : 5; }
  get touchRange() { return this.easyMode ? 6.5 : 3.5; }
  materialReady(material: 'metal' | 'glass') { return this.discovered.has(material) || this.guidedHits[material] >= this.requiredHits; }
  get materialsAwake() { return this.materialReady('metal') && this.materialReady('glass'); }
  get gateOpen() { return this.materialsAwake && this.notes.size === 3; }
  get completed() { return this.completion !== 'none'; }
  setEasyMode(value: boolean) {
    for (const material of ['metal','glass'] as const) if (this.materialReady(material)) this.discovered.add(material);
    this.easyMode=value;
    for (const material of ['metal','glass'] as const) if (this.materialReady(material)) this.discovered.add(material);
    this.onChange();
  }
  completeWithAssistance() {
    if (this.completed) return false;
    for (const material of ['metal','glass'] as const) { this.discovered.add(material); this.guidedHits[material]=Math.max(this.guidedHits[material],this.requiredHits); }
    for (let i=0;i<BELLS.length;i++) this.notes.add(i);
    this.completion='assisted';this.onChange();return true;
  }
  update(dt: number, present: boolean, guide: boolean, windX: number, windZ: number) {
    this.elapsed += dt;
    this.guiding = guide && present;
    this.wind.x = smooth(this.wind.x, this.guiding ? clamp(windX, -1, 1) * 5.5 : 0, 5, dt);
    this.wind.z = smooth(this.wind.z, this.guiding ? clamp(windZ, -1, 1) * 5.5 : 0, 5, dt);
    const p = this.player, dx = this.target.x - p.x, dz = this.target.z - p.z, dist = Math.hypot(dx, dz);
    const speed = present && !this.guiding && dist > .08 ? Math.min(this.maxSpeed, dist * 3) : 0;
    const desiredX = dist > .001 ? dx / dist * speed : 0, desiredZ = dist > .001 ? dz / dist * speed : 0;
    const ax = desiredX - p.vx, az = desiredZ - p.vz, delta = Math.hypot(ax, az), k = delta ? Math.min(1, this.maxAcceleration * dt / delta) : 0;
    p.vx += ax * k; p.vz += az * k;
    const oldX = p.x, oldZ = p.z;
    p.x = clamp(p.x + p.vx * dt, this.weatherMode==='room'?40.8:this.freeExplore?-25:oldZ < -1.1 ? 12.8 : -25, this.weatherMode==='room'?51.2:this.freeExplore?38:oldZ < -1.1 ? 18.2 : 24);
    const inCourtyard = this.gateOpen && p.x > 12.7 && p.x < 18.3;
    p.z = clamp(p.z + p.vz * dt, this.weatherMode==='room'?-105.2:this.freeExplore?-6:inCourtyard ? -6 : -1.1, this.weatherMode==='room'?-94.2:6.8);
    if (p.x === -25 || p.x === 24) p.vx = 0;
    if (p.z === -1.1 || p.z === -6 || p.z === 6.8) p.vz = 0;
    if(this.weatherMode==='street'&&this.freeExplore&&BUILDINGS.some(([x,,z,bw,bd])=>Math.abs(p.x-x)<bw/2+.25&&Math.abs(p.z-z)<bd/2+.25)){p.x=oldX;p.z=oldZ;p.vx=p.vz=0;}
    const moved = Math.hypot(p.x - oldX, p.z - oldZ); p.distance += moved;
    if (Math.hypot(p.vx, p.vz) > .05) {
      const goal = Math.atan2(p.vx, p.vz), deltaYaw = Math.atan2(Math.sin(goal - p.yaw), Math.cos(goal - p.yaw));
      p.yaw += deltaYaw * (1 - Math.exp(-9 * dt));
    }
    if (p.distance - this.lastStepDistance > .6) {
      this.lastStepDistance = p.distance; this.steps++;
      const side=this.steps%2?1:-1,x=p.x+Math.sin(p.yaw)*.29+Math.cos(p.yaw)*side*.13,z=p.z+Math.cos(p.yaw)*.29-Math.sin(p.yaw)*side*.13;
      this.impact({ x, y: .02, z, material: waterAt(x, z,this.puddles) ? 'water' : 'stone', guided: false, source: 'foot', strength: .7 });
    }
  }
  impact(hit: Impact) {
    this.contacts[hit.material]++;
    if (hit.guided && (hit.material === 'metal' || hit.material === 'glass')) {
      const before = this.materialReady(hit.material);
      this.guidedHits[hit.material]++;
      if (!before && this.materialReady(hit.material)) { this.discovered.add(hit.material); this.onChange(); }
    }
    this.onImpact(hit);
  }
  touchWater(point: Vec3) {
    if (!waterAt(point.x, point.z,this.puddles) || Math.hypot(point.x - this.player.x, point.z - this.player.z) > 3.2) return false;
    this.impact({ ...point, y: .02, material: 'water', guided: false, source: 'touch', strength: 1 }); return true;
  }
  touchBell(index: number) {
    const b = BELLS[index];
    if (!this.materialsAwake || !b || Math.hypot(b.x - this.player.x, b.z - this.player.z) > this.touchRange) return false;
    this.notes.add(index);
    if (this.gateOpen && !this.completed) this.completion='natural';
    this.onChange(); return true;
  }
}

export type Drop = Vec3 & { vx: number; vy: number; vz: number; affected: boolean };
export class RainModel {
  readonly drops: Drop[] = [];
  private seed: number;
  constructor(readonly world: WorldModel, count = 1000, seed = 702) {
    this.seed = seed;
    for (let i = 0; i < count; i++) { const d: Drop = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, affected: false }; this.reset(d); d.y = this.random() * 15 + .2; this.drops.push(d); }
  }
  private random() { this.seed = Math.imul(1664525, this.seed) + 1013904223 | 0; return (this.seed >>> 0) / 4294967296; }
  private reset(d: Drop) { d.x = this.world.player.x + (this.random() - .5) * 36; d.y = Math.max(0,this.world.player.y)+11 + this.random() * 6; d.z = this.world.weatherMode==='room'?-106-this.random()*6:this.world.player.z-6.8+this.random()*13; d.vx = -.15; d.vy = -8 - this.random() * 4; d.vz = -.18; d.affected = false; }
  update(dt: number) {
    const w = this.world,surfaces=[...SURFACES,...w.extraSurfaces],puddles=w.puddles;
    for (const d of this.drops) {
      const local = Math.hypot(d.x - w.player.x, d.z - w.player.z) < 8;
      d.vx = smooth(d.vx, -.15 + (local ? w.wind.x : 0), 3.5, dt);
      d.vz = smooth(d.vz, -.18 + (local ? w.wind.z : 0), 3.5, dt);
      if (local && w.guiding && Math.hypot(w.wind.x, w.wind.z) > 1) d.affected = true;
      const next = { x: d.x + d.vx * dt, y: d.y + d.vy * dt, z: d.z + d.vz * dt }, hit = sweep(d,next,surfaces,puddles);
      let actual=hit;
      if(d.y>next.y)for(const u of w.umbrellas){const t=(u.y-d.y)/(next.y-d.y);if(t>=0&&t<=1&&(!actual||t<actual.t)){const x=d.x+(next.x-d.x)*t,z=d.z+(next.z-d.z)*t;if(Math.hypot(x-u.x,z-u.z)<u.r)actual={x,y:u.y,z,t,material:'umbrella',id:'umbrella'};}}
      if (actual) { w.impact({ x: actual.x, y: actual.y, z: actual.z, material: actual.material, guided: d.affected && w.guiding && local, source: 'rain', strength: .3 + Math.abs(d.vy) / 25 }); this.reset(d); }
      else { d.x = next.x; d.y = next.y; d.z = next.z; if (Math.abs(d.x - w.player.x) > 25 || Math.abs(d.z-w.player.z) > 22 || d.y < -1) this.reset(d); }
    }
  }
}

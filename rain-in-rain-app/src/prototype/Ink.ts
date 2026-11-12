import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const INK = 0xb9b9b3;
export const lineMaterial = new T.LineBasicMaterial({ color: INK, transparent: true, opacity: .67 });
const grainData=new Uint8Array(64*64);let grainSeed=92;for(let i=0;i<grainData.length;i++){grainSeed=Math.imul(grainSeed,1664525)+1013904223|0;grainData[i]=grainSeed>>>24;}
const grainTexture=new T.DataTexture(grainData,64,64,T.RedFormat);grainTexture.wrapS=grainTexture.wrapT=T.RepeatWrapping;grainTexture.minFilter=grainTexture.magFilter=T.LinearFilter;grainTexture.generateMipmaps=false;grainTexture.needsUpdate=true;
export const paper = new T.ShaderMaterial({
  uniforms: { awake: { value: 0 },dream:{value:0}, grainTex:{value:grainTexture} },
  vertexShader: `varying vec3 vWorld;varying float vTone;uniform float awake;
  void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;vec3 n=normalize(mat3(modelMatrix)*normal);
    float light=max(0.,dot(n,normalize(vec3(-.4,.8,1.))));
    float lamp=exp(-length(p.xyz-vec3(-5.65,4.75,.8))*.65)+exp(-length(p.xyz-vec3(9.35,4.75,1.35))*.65);
    float tone=.0035+light*.005+lamp*(.003+awake*.009);
    vTone=mix(tone,.003,1.-exp(-length(cameraPosition-p.xyz)*.014));
    gl_Position=projectionMatrix*viewMatrix*p;}`,
  fragmentShader: `varying vec3 vWorld;varying float vTone;uniform sampler2D grainTex;uniform float dream;
  void main(){float grain=texture2D(grainTex,(vWorld.xy+vWorld.z*.17)*.7).r;
    float d=abs(fract((vWorld.x+vWorld.y)*7.)-.5);float hatch=1.-smoothstep(.025,.025+max(.001,fwidth(vWorld.x+vWorld.y)),d);
    vec3 tint=mix(vec3(1.),vec3(.78,.91,1.15),dream);gl_FragColor=vec4((vec3(vTone+grain*.001+hatch*.0008)+dream*.004)*tint,1.);
    #include <colorspace_fragment>
  }`,
});

/** Repeated scenery is batched; data and collision stay in world units. */
export class InkBatch {
  private faces: T.BufferGeometry[] = [];
  private lines: number[] = [];
  add(geometry: T.BufferGeometry, position = new T.Vector3(), rotation = new T.Euler(), scale = new T.Vector3(1, 1, 1)) {
    const matrix = new T.Matrix4().compose(position, new T.Quaternion().setFromEuler(rotation), scale);
    const g = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    g.applyMatrix4(matrix); this.faces.push(g);
    const edges = new T.EdgesGeometry(geometry, 28); edges.applyMatrix4(matrix);
    const a = edges.getAttribute('position');
    for (let i = 0; i < a.count; i++) this.lines.push(a.getX(i), a.getY(i), a.getZ(i));
    edges.dispose(); geometry.dispose();
  }
  box(x: number, y: number, z: number, w: number, h: number, d: number) { this.add(new T.BoxGeometry(w, h, d), new T.Vector3(x, y, z)); }
  stroke(points: T.Vector3[]) {
    for (let i = 1; i < points.length; i++) this.lines.push(...points[i - 1].toArray(), ...points[i].toArray());
  }
  line(x: number, y: number, z: number, xx: number, yy: number, zz: number) { this.lines.push(x, y, z, xx, yy, zz); }
  build() {
    const root = new T.Group();
    if (this.faces.length) { const merged = mergeGeometries(this.faces); if (!merged) throw new Error('街道几何体合并失败'); root.add(new T.Mesh(merged, paper)); this.faces.forEach(g => g.dispose()); }
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.Float32BufferAttribute(this.lines, 3));
    root.add(new T.LineSegments(geometry, lineMaterial)); return root;
  }
}
export function outlined(geometry: T.BufferGeometry, color = 0x242525, opacity = .8) {
  const mesh = new T.Mesh(geometry, new T.MeshBasicMaterial({ color }));
  mesh.add(new T.LineSegments(new T.EdgesGeometry(geometry, 30), new T.LineBasicMaterial({ color: INK, transparent: true, opacity })));
  return mesh;
}

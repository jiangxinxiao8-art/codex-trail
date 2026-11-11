import { Assets, Sprite, Texture } from 'pixi.js';
export const illustrationSlots = [
 ['city','黑白街道','黑白街道.png'],['far','黑白远景','黑白远景城市.png'],['umbrellas','伞芽街道','雨夜街巷与伞花倒影.png'],['pool','梦幻光池','雨夜街巷的梦幻光池.png'],['dream','梦境拱桥','雨夜拱桥下的雾光长街.png'],['vista','雾岭梦城','雨中旋律_雾岭梦城.png'],['flight','月光飞城','雨幕中的月光之城.png'],['home','温暖书房','雨夜归家的温暖书房.png'],['character','人物设定','主角人物设定.png'],['actions','人物动作','主角动作参考.png'],
] as const;
export type IllustrationSlot=typeof illustrationSlots[number][0];
/** Originals are never invented. Static art is scenery; all interactive props are separate. */
export class IllustrationLibrary {
 private textures=new Map<string,Texture>();private db?:IDBDatabase;private previewUrls=new Map<string,string>();
 async init(){try{this.db=await new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('rain-illustrations-v3',1);request.onupgradeneeded=()=>request.result.createObjectStore('images');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});for(const [key]of illustrationSlots){const blob=await new Promise<Blob|undefined>((resolve,reject)=>{const r=this.db!.transaction('images').objectStore('images').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});if(blob)await this.loadBlob(key,blob);}}catch{/* Persistent storage can be disabled; importing still works for this session. */}
 try{const response=await fetch('/assets/images/manifest.json');if(response.ok&&response.headers.get('content-type')?.includes('json')){const manifest=await response.json();for(const [key,path]of Object.entries(manifest)){if(typeof path==='string'&&!this.textures.has(key)){const url='/assets/images/'+encodeURIComponent(path);this.textures.set(key,await Assets.load<Texture>(url));this.previewUrls.set(key,url);}}}}catch(e){console.warn('插画清单未就绪，使用独立绘制场景。',e);}}
 private async loadBlob(key:string,blob:Blob){const url=URL.createObjectURL(blob);try{const image=new Image();image.src=url;await image.decode();const texture=Texture.from(image);const previous=this.textures.get(key);this.textures.set(key,texture);previous?.destroy(true);const oldUrl=this.previewUrls.get(key);if(oldUrl?.startsWith('blob:'))URL.revokeObjectURL(oldUrl);this.previewUrls.set(key,url);}catch(e){URL.revokeObjectURL(url);throw e;}}
 async import(key:IllustrationSlot,file:File){if(!file.type.startsWith('image/'))throw new Error('请选择 PNG、JPEG 或 WebP 原图');await this.loadBlob(key,file);if(this.db)await new Promise<void>((resolve,reject)=>{const tx=this.db!.transaction('images','readwrite');tx.objectStore('images').put(file,key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});}
 sprite(key:string){const texture=this.textures.get(key);if(!texture)return null;const sprite=new Sprite(texture);const scale=Math.max(1600/texture.width,900/texture.height);sprite.scale.set(scale);sprite.position.set((1600-sprite.width)/2,(900-sprite.height)/2);return sprite;}
 preview(key:string){return this.previewUrls.get(key);}
 has(key:string){return this.textures.has(key);}
}

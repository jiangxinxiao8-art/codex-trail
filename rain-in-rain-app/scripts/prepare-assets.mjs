import { mkdir, readdir, copyFile, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const root=new URL('../',import.meta.url);
for(const dir of ['models','wasm','audio','images'])await mkdir(new URL(`public/assets/${dir}/`,root),{recursive:true});
const wasm=new URL('node_modules/@mediapipe/tasks-vision/wasm/',root);
for(const file of await readdir(wasm))if(/\.(wasm|js)$/.test(file))await copyFile(new URL(file,wasm),new URL(`public/assets/wasm/${file}`,root));
const temp=await mkdtemp(join(tmpdir(),'rain-model-'));
try {
 const url='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
 execFileSync('curl',['--fail','--location','--max-time','120','--dump-header',join(temp,'headers'),url,'--output',join(temp,'model')],{stdio:'inherit'});
 const headers=await readFile(join(temp,'headers'),'utf8'),data=await readFile(join(temp,'model'));
 const expected=headers.match(/x-goog-hash:[^\r\n]*md5=([A-Za-z0-9+/=]+)/i)?.[1];
 if(!expected || createHash('md5').update(data).digest('base64')!==expected)throw new Error('官方对象 MD5 校验失败或响应缺少校验信息');
 if(data.length<1000000 || data[0]!==80 || data[1]!==75)throw new Error('下载内容不是有效的 MediaPipe task 模型包');
 await writeFile(new URL('public/assets/models/hand_landmarker.task',root),data);
 await writeFile(new URL('public/assets/models/provenance.json',root),JSON.stringify({url,md5:expected,sha256:createHash('sha256').update(data).digest('hex'),bytes:data.length},null,2));
 console.log('官方模型下载并通过服务端 MD5 完整性校验；WASM 已复制。');
} finally {await rm(temp,{recursive:true,force:true});}

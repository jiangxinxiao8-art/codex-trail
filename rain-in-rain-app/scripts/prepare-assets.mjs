import { mkdir, readdir, copyFile, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MODEL_URL, verifyModel } from './model-integrity.mjs';
const root = new URL('../', import.meta.url);
for (const dir of ['models','wasm','audio','images']) await mkdir(new URL(`public/assets/${dir}/`,root),{recursive:true});
const wasm = new URL('node_modules/@mediapipe/tasks-vision/wasm/', root);
for (const file of await readdir(wasm)) if (/\.(wasm|js)$/.test(file)) await copyFile(new URL(file,wasm),new URL(`public/assets/wasm/${file}`,root));
const destination = new URL('public/assets/models/hand_landmarker.task',root);
let valid = false;
try { verifyModel(await readFile(destination)); valid = true; } catch { /* Download a verified replacement without altering the existing file first. */ }
if (valid) {
  console.log('本地官方手部模型 SHA256 校验通过，无需联网下载；WASM 已准备。');
} else {
  const temp = await mkdtemp(join(tmpdir(),'rain-model-'));
  try {
    execFileSync('curl',['--fail','--location','--max-time','120','--dump-header',join(temp,'headers'),MODEL_URL,'--output',join(temp,'model')],{stdio:'inherit'});
    const headers=await readFile(join(temp,'headers'),'utf8'),data=await readFile(join(temp,'model'));
    const expected=headers.match(/x-goog-hash:[^\r\n]*md5=([A-Za-z0-9+/=]+)/i)?.[1];
    if (!expected || createHash('md5').update(data).digest('base64')!==expected) throw new Error('官方对象 MD5 校验失败或响应缺少校验信息');
    const verified=verifyModel(data);
    await writeFile(destination,data);
    await writeFile(new URL('public/assets/models/provenance.json',root),JSON.stringify({url:MODEL_URL,md5:expected,...verified},null,2));
    console.log('官方手部模型 MD5 与固定 SHA256 校验通过；WASM 已准备。');
  } finally { await rm(temp,{recursive:true,force:true}); }
}

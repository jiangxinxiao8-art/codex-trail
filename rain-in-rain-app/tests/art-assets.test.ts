import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root=new URL('../public/assets/images/',import.meta.url);
test('收到的十一张原图逐字节保留，清单指向真实 PNG',()=>{
 const inventory=JSON.parse(readFileSync(new URL('original-inventory.json',root),'utf8'));
 assert.equal(inventory.length,11);
 for(const item of inventory){const bytes=readFileSync(new URL(item.file,root));assert.equal(bytes.length,item.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256);}
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
 for(const role of ['city','far','foreground','umbrellas','pool','dream','vista','flight','home','homeClean','micro']){const bytes=readFileSync(new URL(manifest[role],root));assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
 const foreground=readFileSync(new URL(manifest.foreground,root));assert.equal(foreground[25],6,'前景图必须有 RGBA 透明通道');assert.notEqual(manifest.home,manifest.homeClean,'原屋图与去除固定物件的衍生图分开保存');
});

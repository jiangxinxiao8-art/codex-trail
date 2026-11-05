import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { verifyModel } from '../scripts/model-integrity.mjs';
const data = readFileSync(new URL('../public/assets/models/hand_landmarker.task',import.meta.url));
test('官方带两个前置字节的 task 模型包通过校验',()=>{assert.equal(data.subarray(0,4).toString('hex'),'0000504b');assert.equal(verifyModel(data).bytes,7819105);});
test('拒绝 HTML 回退页、截断模型与被篡改的模型',()=>{assert.throws(()=>verifyModel(Buffer.from('<!doctype html>')));assert.throws(()=>verifyModel(data.subarray(0,100)));const corrupt=Buffer.from(data);corrupt[100]^=1;assert.throws(()=>verifyModel(corrupt));});

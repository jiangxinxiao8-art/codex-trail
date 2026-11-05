import { createHash } from 'node:crypto';
// Verified against the official version-1 object, its HTTPS MD5 header, and ZIP CRCs.
export const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';
export const MODEL_SHA256 = 'fbc2a30080c3c557093b5ddfc334698132eb341044ccee322ccf8bcf3607cde1';
export function verifyModel(data) {
  const sha256 = createHash('sha256').update(data).digest('hex');
  if (sha256 !== MODEL_SHA256) throw new Error('手部模型完整性校验失败，文件缺失、损坏或版本不匹配。');
  // This official task archive has two alignment bytes before PK, so data[0] is not P.
  return { sha256, bytes: data.length };
}

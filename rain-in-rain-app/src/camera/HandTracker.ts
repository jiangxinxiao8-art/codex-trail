import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GestureRecognizer, type Input } from './GestureRecognizer';
export class HandTracker {
  video = document.createElement('video'); private stream?: MediaStream; private detector?: HandLandmarker;
  private gesture = new GestureRecognizer(); private last = 0; private frame = -1; private generation = 0;
  async start() {
    const generation = ++this.generation;
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('摄像头需要 localhost 或 HTTPS 安全环境。');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
    if (generation !== this.generation) { stream.getTracks().forEach(t=>t.stop()); throw new Error('摄像头启动已取消'); }
    this.stream = stream; this.video.srcObject = stream; this.video.muted = true; this.video.playsInline = true;
    await this.video.play();
    try {
      const files = await FilesetResolver.forVisionTasks('/assets/wasm');
      const detector = await HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: '/assets/models/hand_landmarker.task', delegate: 'CPU' }, runningMode: 'VIDEO', numHands: 1, minHandDetectionConfidence: .55, minTrackingConfidence: .55 });
      if (generation !== this.generation) { detector.close(); throw new Error('摄像头启动已取消'); }
      this.detector = detector;
    } catch(e) { this.stop(); throw e; }
  }
  sample(now: number): Input | null {
    if (!this.detector || now-this.last < 65 || this.video.readyState < 2 || this.video.currentTime === this.frame) return null;
    this.last = now; this.frame = this.video.currentTime;
    return this.gesture.read(this.detector.detectForVideo(this.video,now).landmarks[0] ?? [],now);
  }
  stop() { this.generation++; this.detector?.close(); this.detector = undefined; this.stream?.getTracks().forEach(t=>t.stop()); this.stream = undefined; this.video.pause(); this.video.srcObject = null; this.gesture.reset(); this.frame = -1; }
}

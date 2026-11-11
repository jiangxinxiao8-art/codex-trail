import type { HandTracker } from '../camera/HandTracker';
export class CameraPreview {
 private panel:HTMLElement;private button:HTMLButtonElement;private status:HTMLElement;private wanted=false;
 constructor(private tracker:HandTracker){this.panel=document.getElementById('camera-preview')!;this.button=document.getElementById('camera-preview-toggle') as HTMLButtonElement;this.status=document.getElementById('preview-status')!;const v=tracker.video;v.className='preview-video';v.setAttribute('aria-label','本地摄像头镜像预览');this.panel.prepend(v);this.button.onclick=()=>this.toggle();}
 toggle(){this.wanted=!this.wanted;this.panel.hidden=!this.wanted;this.button.setAttribute('aria-pressed',String(this.wanted));if(!this.tracker.active)this.status.textContent='当前为鼠标模式 · 摄像头未连接';}
 update(handPresent:boolean){if(!this.wanted)return;this.status.textContent=this.tracker.active?(handPresent?'正在识别 · 画面仅本地处理':'未检测到手部 · 画面仅本地处理'):'摄像头未连接 · 可使用鼠标';}
 reset(){this.wanted=false;this.panel.hidden=true;this.button.setAttribute('aria-pressed','false');}
}

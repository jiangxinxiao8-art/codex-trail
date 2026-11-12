import './style.css';
import * as T from 'three';
import { HandTracker } from '../camera/HandTracker';
import { CameraPreview } from '../ui/CameraPreview';
import { AudioManager } from '../audio/AudioManager';
import { emptyInput, type Input } from '../camera/GestureRecognizer';
import { MaterialAudio } from './MaterialAudio';
import { BELLS, PUDDLES, SURFACES, WorldModel, clamp, smooth } from './WorldModel';
import { WorldView } from './WorldView';
import { DwellTouch, WalkingGuide } from './Access';
import {Journey,CHAPTERS,ROOM,POND,type Target} from './Journey';
import {JourneyView} from './JourneyView';

const el = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
document.querySelector('#app')!.innerHTML = `
<main id="rain-v4"><a class="v4-skip" href="#game-controls">跳至操作说明</a>
<div id="stage" role="region" aria-label="雨中城市"></div><div class="v4-shade" aria-hidden="true"></div>
<header class="v4-header"><p class="v4-brand">雨中曲</p><nav class="v4-actions" aria-label="体验设置"><button id="pause" aria-pressed="false">暂停</button><button id="view-toggle" aria-pressed="false">换个视角</button><button id="camera-preview-toggle" aria-label="摄像头预览" aria-pressed="false">摄像头小窗</button><button id="settings-toggle">声音与操作</button></nav></header>
<section id="intro" aria-labelledby="v4-title"><h1 id="v4-title" class="v4-title">雨中曲</h1><p class="v4-subtitle" lang="en">Sing in the Rain</p><p class="v4-invitation">伸出手，让一座城市慢慢有了声音。</p><div class="v4-start-row"><button id="start" class="v4-primary" disabled>开始旅程</button><button id="mouse-start" class="v4-text-button" disabled>用鼠标走进雨里</button><button id="continue-start" class="v4-text-button" hidden>继续旅程</button></div><div class="v4-credits"><span>游戏制作：蒋欣笑</span><span>音乐生成：蒋欣笑</span><span>美术制作：蒋欣笑</span></div><p class="v4-intro-note">戴上耳机，慢慢走。摄像头画面仅在本地处理。</p></section>
<section id="v4-caption" aria-live="polite" hidden><p id="chapter-name"></p><h2 id="v4-line">原来，雨也在等一个回应。</h2><p id="v4-goal">走近雨棚与玻璃，让雨落在不同的地方。</p></section>
<div id="chapter-fade" aria-hidden="true"></div><div id="aim-cursor" aria-hidden="true" hidden></div>
<div id="target-label" class="v4-world-label" hidden></div><span id="target-dot" aria-hidden="true" hidden></span><span id="target-leader" aria-hidden="true" hidden></span>
<aside id="help-panel" hidden aria-label="过关辅助"><p id="step-progress" aria-live="polite"></p><div class="help-actions"><button id="guide-next">带我去下一步</button><button id="auto-pass">跳过本节</button><button id="touch-next" hidden>轻触下一滴</button><button id="continue-story" hidden>继续前行</button></div><div id="flight-controls" hidden><button id="route-left">沿河飞行</button><button id="route-right">掠过钟楼</button><button id="autopilot" aria-pressed="true">自动滑翔：开</button></div></aside>
<div id="drop-focus" aria-hidden="true" hidden><svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="27"/><circle id="dwell-ring" cx="32" cy="32" r="27" stroke-dasharray="169.65" stroke-dashoffset="169.65"/></svg><span id="dwell-label">已对准，轻轻捏合</span></div>
<footer id="v4-footer"><p class="v4-status" id="mode-label">雨夜街道 · 正在准备…</p><p class="v4-controls" id="game-controls" tabindex="-1">指向行走　按住拖动引雨　点击触碰<br><kbd>方向键</kbd> 行走　<kbd>空格＋方向键</kbd> 引雨　<kbd>Enter</kbd> 触碰</p></footer>
<aside id="camera-preview" hidden><p id="preview-status">摄像头未连接</p><button id="preview-close">收起小窗</button></aside>
<div id="notice" role="status" aria-live="polite" hidden></div><section id="paused" aria-label="已暂停" hidden><span>雨，等你回来。</span><button id="resume" class="v4-primary">继续听雨</button><button id="return-title" class="v4-text-button">返回标题</button></section>
<dialog id="sound-dialog" class="v4-dialog" aria-labelledby="sound-title"><button id="settings-close" aria-label="关闭声音与操作设置">×</button><h2 id="sound-title">听雨的方式</h2>
<label>总音量<input id="master" name="master" type="range" min="0" max="1" step=".01" value=".9"></label><label>背景音乐<input id="background" name="music" type="range" min="0" max="1" step=".01" value=".6"></label><label>环境雨声<input id="environment" name="ambience" type="range" min="0" max="1" step=".01" value=".5"></label><label>物体与脚步<input id="interaction" name="effects" type="range" min="0" max="1" step=".01" value="1"></label>
<label>轻松模式（更容易触碰）<input id="easy-mode" name="easy-mode" type="checkbox" checked></label><label>停留片刻自动触碰雨滴<input id="dwell-touch" name="dwell-touch" type="checkbox" checked></label>
<div class="v4-dialog-actions"><button id="test-glass" class="v4-text-button">试听玻璃声</button><button id="test-drop" class="v4-text-button">试听雨滴声</button></div>
<label>减少镜头运动<input id="reduce-motion" name="reduce-motion" type="checkbox"></label><label>画面精度<select id="quality" name="quality"><option value="auto">自动</option><option value="1.25">标准</option><option value="1">轻量</option><option value=".75">更轻量</option></select></label>
<div class="v4-dialog-actions"><button id="switch-camera" class="v4-text-button">连接摄像头</button><button id="switch-mode" class="v4-text-button">使用鼠标</button></div><p>摄像头：食指指向行走，捏合触碰。张掌后人物会停下，掌心移动引导雨与风。鼠标按住并拖动具有相同效果。</p><p>先走到物品附近，再轻轻把雨引向它。玻璃需要向街道里侧引雨。小窗可独立关闭。</p><button id="settings-title" class="v4-text-button">返回标题</button></dialog>
<dialog id="finish-dialog" class="v4-dialog" aria-labelledby="finish-title"><h2 id="finish-title">雨中曲</h2><p id="finish-copy">雨没有停。<br>但这一次，我不再害怕它。</p><div class="ending-credits"><p>游戏制作：蒋欣笑</p><p>音乐生成：蒋欣笑</p><p>美术制作：蒋欣笑</p></div><button id="finish-explore" class="v4-primary">再听一会儿雨</button><button id="finish-replay" class="v4-text-button">重新开始</button></dialog>
</main>`;

class PrototypeGame {
  readonly world = new WorldModel();
  readonly view = new WorldView(el('stage'), this.world);
  readonly journey = new Journey(this.world);
  readonly journeyView = new JourneyView(this.view,this.journey);
  readonly tracker = new HandTracker();
  readonly preview = new CameraPreview(this.tracker);
  readonly audio = new AudioManager();
  readonly materialAudio = new MaterialAudio(this.audio.interaction,kind=>{this.audio.duckMusic(kind==='note'?.32:.6,kind==='note'?.85:.45);if(kind==='glass')this.view.glassFeedback();});
  private guide=new WalkingGuide(this.world);private dwell=new DwellTouch();private dwellEnabled=true;private focusedDrop=-1;private finishShown=false;private lastTouch=-100;private pendingTouch=false;
  private saved=this.readSave();private transitioning=false;private musicChapter=-1;private indoor=false;
  private phase: 'title' | 'play' | 'paused' = 'title';
  private previousPhase: 'title' | 'play' = 'title';
  private mode: 'mouse' | 'camera' = 'mouse';
  private starting = false;
  private loaded = false;
  private input: Input = emptyInput();
  private pointer = { x: .5, y: .65, present: false, down: false, dragging: false, startX: 0, startY: 0 };
  private filter = { x: .5, y: .65, palmX: .5, palmY: .5 };
  private keys = new Set<string>();
  private lastHand = 0;
  private timer = new T.Timer();
  private accumulator = 0;
  private lastUI = -1;
  private lastControlsMode = '';
  private noticeTimer = 0;
  private frames = 0;
  private frameTotal = 0;
  private modalWasPaused = false;
  private quality='auto';private perfSince=0;private perfFrames=0;
  private windOrigin: {x:number;y:number}|null = null;
  constructor(){
    this.world.onImpact = hit => { this.journey.rain(hit);this.view.impact(hit); if (this.phase === 'play') this.materialAudio.hit(hit, this.world); };
    this.world.onChange = () => this.updateStory();
    this.journey.onChange=()=>{this.updateStory();if(this.journey.started&&this.journey.chapter>0)try{localStorage.setItem('rain-journey-save',JSON.stringify({...this.journey.save(),mode:this.mode}));}catch{}};
    this.journey.onSound=(kind,p)=>{if(kind==='window')this.materialAudio.hit({...p,material:'glass',guided:true,source:'touch',strength:1},this.world);else if(kind==='record'){this.audio.recordOn();this.materialAudio.note(0);}else if(kind==='land')this.materialAudio.hit({...p,material:'stone',guided:false,source:'foot',strength:1},this.world);else this.materialAudio.note(kind==='seed'?0:kind==='dream'?2:1);};
    el('continue-start').hidden=!this.saved;
    this.bind();this.timer.connect(document);
    this.view.renderer.setAnimationLoop(()=>this.frame());
    el<HTMLButtonElement>('start').disabled=false;el<HTMLButtonElement>('mouse-start').disabled=false;
    el('mode-label').textContent='雨夜街道 · 戴上耳机，走近听一听';
    el<HTMLInputElement>('reduce-motion').checked=this.view.rig.reducedMotion;
    this.audio.volume(.9*.9);this.audio.background.gain.value=.6*.6;this.audio.environment.gain.value=.5*.5;this.audio.interaction.gain.value=1;
    el('stage').dataset.ready='true';
    if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__rainV4:{renderer:this.view.renderer,scene:this.view.scene,camera:this.view.rig.camera,inspect:()=>this.inspect(),project:(p:{x:number;y:number;z:number})=>this.view.screen(p)}});
  }
  private readSave(){try{const s=JSON.parse(localStorage.getItem('rain-journey-save')??'null');return s?.version===1&&Number.isInteger(s.chapter)&&s.chapter>=1&&s.chapter<=7&&Number.isInteger(s.highest)&&s.highest>=s.chapter&&s.highest<=7?s:null;}catch{return null;}}
  private notice(message:string,persistent=false){clearTimeout(this.noticeTimer);el('notice').textContent=message;el('notice').hidden=false;if(!persistent)this.noticeTimer=window.setTimeout(()=>el('notice').hidden=true,6500);}
  private async start(mode:'mouse'|'camera',resume=false){
    if(this.starting||this.phase!=='title')return;this.starting=true;
    el<HTMLButtonElement>('start').disabled=el<HTMLButtonElement>('mouse-start').disabled=true;
    try{
      this.notice('正在准备雨声与音乐…',true);await this.audio.start();
      if(!this.loaded){const errors=await this.audio.music.load();this.loaded=true;if(errors.length)this.notice(errors.join('；'),true);else el('notice').hidden=true;}
      if(mode==='camera')await this.connectCamera();else this.mode='mouse';
      this.perfSince=performance.now();this.perfFrames=0;this.phase='play';el('intro').hidden=true;el('v4-caption').hidden=false;this.audio.music.switch(0);
      el('help-panel').hidden=false;this.pointer.present=false;this.view.renderer.domElement.focus({preventScroll:true});this.journey.highest=this.saved?.highest??1;this.journey.start(resume?(this.saved?.chapter??1):0);this.updateStory();
    }catch(e){this.notice('启动失败：'+String(e)+'。可以重新点击开始体验。',true);}
    finally{this.starting=false;el<HTMLButtonElement>('start').disabled=el<HTMLButtonElement>('mouse-start').disabled=false;}
  }
  private async connectCamera(){
    try{this.notice('请允许摄像头，正在准备手部识别…',true);await this.tracker.start();this.mode='camera';this.input=emptyInput();this.lastHand=performance.now();this.windOrigin=null;el('notice').hidden=true;}
    catch(e){this.mode='mouse';this.notice('已提供鼠标操作。摄像头未连接：'+(e instanceof Error?e.message:String(e)),true);}
  }
  private modalOpen(){return !!document.querySelector('dialog[open]');}
  private setPause(pause:boolean,keepAudio=false){
    if(pause&&this.phase!=='paused'){this.previousPhase=this.phase;this.phase='paused';this.pointer.down=this.pointer.dragging=false;this.keys.clear();this.world.guiding=false;this.dwell.reset();el('drop-focus').hidden=true;}
    else if(!pause&&this.phase==='paused')this.phase=this.previousPhase;
    el('paused').hidden=this.phase!=='paused'||this.modalOpen();
    el('pause').textContent=this.phase==='paused'?'继续':'暂停';el('pause').setAttribute('aria-pressed',String(this.phase==='paused'));
    el('stage').inert=this.phase==='paused';document.querySelector<HTMLElement>('.v4-header')!.inert=this.phase==='paused';el('intro').inert=this.phase==='paused';el('help-panel').inert=this.phase==='paused';
    if(pause&&!this.modalOpen())el('resume').focus();
    if(!pause&&!this.modalOpen()&&this.phase==='play')this.view.renderer.domElement.focus({preventScroll:true});
    if(this.loaded&&!keepAudio)void this.audio.pause(this.phase==='paused');
  }
  private bind(){
    el('continue-start').onclick=()=>void this.start(this.saved?.mode==='camera'?'camera':'mouse',true);el('start').onclick=()=>{this.saved=null;try{localStorage.removeItem('rain-journey-save');}catch{}void this.start('camera');};el('mouse-start').onclick=()=>{this.saved=null;try{localStorage.removeItem('rain-journey-save');}catch{}void this.start('mouse');};el('return-title').onclick=el('settings-title').onclick=()=>location.reload();
    el('pause').onclick=()=>this.setPause(this.phase!=='paused');el('resume').onclick=()=>this.setPause(false);
    el('view-toggle').onclick=()=>{this.view.rig.observing=!this.view.rig.observing;el('view-toggle').setAttribute('aria-pressed',String(this.view.rig.observing));};
    el('preview-close').onclick=()=>this.preview.toggle();
    el('guide-next').onclick=()=>{if(this.journey.chapter!==1||this.journey.ready)this.journey.guide();else if(this.guide.active)this.guide.stop();else this.guide.begin();this.updateStory();};
    el('auto-pass').onclick=()=>{if(this.transitioning)return;this.transitioning=true;el<HTMLButtonElement>('auto-pass').disabled=true;el('chapter-fade').classList.add('active');this.guide.stop();this.dwell.reset();this.pointer.present=false;window.setTimeout(()=>{this.journey.skip();this.updateStory();},230);window.setTimeout(()=>{el('chapter-fade').classList.remove('active');this.transitioning=false;this.updateStory();},650);};
    el('continue-story').onclick=()=>{this.guide.stop();this.journey.next();this.dwell.reset();this.pointer.present=false;this.updateStory();};
    el('touch-next').onclick=()=>{if(this.journey.chapter===6)this.journey.collectFlight();else if(this.journey.chapter>=2)this.journey.action();else if(this.nearestDropDistance()<=this.world.touchRange)this.touchNearest();else{this.guide.begin();this.pendingTouch=true;}this.updateStory();};
    el('route-left').onclick=()=>{this.journey.flightRoute='left';this.updateStory();};el('route-right').onclick=()=>{this.journey.flightRoute='right';this.updateStory();};el('autopilot').onclick=()=>{this.journey.autopilot=!this.journey.autopilot;this.updateStory();};
    const finish=el<HTMLDialogElement>('finish-dialog');el('finish-explore').onclick=()=>finish.close();el('finish-replay').onclick=()=>{try{localStorage.removeItem('rain-journey-save');}catch{}location.reload();};finish.addEventListener('close',()=>{this.journey.freeListen();this.finishShown=false;this.setPause(false);this.pointer.present=false;this.updateStory();});
    el<HTMLInputElement>('easy-mode').onchange=e=>{this.world.setEasyMode((e.target as HTMLInputElement).checked);this.dwell.reset();};
    el<HTMLInputElement>('dwell-touch').onchange=e=>{this.dwellEnabled=(e.target as HTMLInputElement).checked;this.dwell.reset();};
    el('test-glass').onclick=async()=>{await this.audio.start();this.materialAudio.hit({x:this.world.player.x,y:2,z:this.world.player.z,material:'glass',source:'touch',guided:true,strength:1},this.world);};
    el('test-drop').onclick=async()=>{await this.audio.start();this.materialAudio.note(1);};

    const dialog=el<HTMLDialogElement>('sound-dialog');
    el('settings-toggle').onclick=()=>{this.modalWasPaused=this.phase==='paused';dialog.showModal();this.setPause(true);el('paused').hidden=true;el('settings-close').focus();};
    el('settings-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{if(!this.modalWasPaused)this.setPause(false);else el('paused').hidden=false;el('settings-toggle').focus();});
    el('switch-camera').onclick=async()=>{dialog.close();await this.audio.start();await this.connectCamera();};
    el('switch-mode').onclick=()=>{this.tracker.stop();this.mode='mouse';this.input=emptyInput();this.preview.reset();this.windOrigin=null;dialog.close();};
    el<HTMLInputElement>('master').oninput=e=>this.audio.volume((e.target as HTMLInputElement).valueAsNumber**2);
    for(const key of ['background','environment','interaction']as const)el<HTMLInputElement>(key).oninput=e=>this.audio[key].gain.rampTo((e.target as HTMLInputElement).valueAsNumber**2,.1);
    el<HTMLInputElement>('reduce-motion').onchange=e=>this.view.rig.reducedMotion=(e.target as HTMLInputElement).checked;
    el<HTMLSelectElement>('quality').onchange=e=>{this.quality=(e.target as HTMLSelectElement).value;this.perfSince=performance.now();this.perfFrames=0;this.view.renderer.setPixelRatio(Math.min(devicePixelRatio,this.quality==='auto'?1.25:Number(this.quality)));this.view.resize();};
    const canvas=this.view.renderer.domElement;
    const point=(e:PointerEvent)=>{const bounds=canvas.getBoundingClientRect();this.pointer.x=clamp((e.clientX-bounds.left)/bounds.width,0,1);this.pointer.y=clamp((e.clientY-bounds.top)/bounds.height,0,1);this.pointer.present=true;};
    canvas.addEventListener('pointermove',e=>{if(this.mode!=='mouse')return;point(e);if(this.pointer.down&&Math.hypot(e.clientX-this.pointer.startX,e.clientY-this.pointer.startY)>7)this.pointer.dragging=true;});
    canvas.addEventListener('pointerdown',e=>{if(this.mode!=='mouse'||this.phase!=='play')return;canvas.focus({preventScroll:true});point(e);canvas.setPointerCapture(e.pointerId);this.pointer.down=true;this.pointer.dragging=false;this.pointer.startX=e.clientX;this.pointer.startY=e.clientY;this.world.target={x:this.world.player.x,z:this.world.player.z};this.windOrigin={x:this.pointer.x,y:this.pointer.y};});
    canvas.addEventListener('pointerup',e=>{if(this.mode!=='mouse')return;point(e);if(this.phase==='play'&&this.pointer.down&&!this.pointer.dragging)this.touch();this.pointer.down=this.pointer.dragging=false;this.windOrigin=null;});
    canvas.addEventListener('pointercancel',()=>{this.pointer.down=this.pointer.dragging=false;this.pointer.present=false;this.windOrigin=null;});
    canvas.addEventListener('pointerleave',()=>{if(!this.pointer.down)this.pointer.present=false;});
    window.addEventListener('keydown',e=>{if(dialog.open||this.phase!=='play'||(e.target instanceof HTMLElement&&e.target.matches('input,select,button,a')))return;if(e.code==='Enter'){e.preventDefault();this.touchNearest();return;}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','Space'].includes(e.code)){e.preventDefault();this.keys.add(e.code);}});
    window.addEventListener('keyup',e=>{if(this.keys.delete(e.code)&&!this.keys.size)this.pointer.present=false;});
    window.addEventListener('blur',()=>{this.keys.clear();this.pointer.down=this.pointer.dragging=false;this.pointer.present=false;this.windOrigin=null;});
    document.addEventListener('visibilitychange',()=>{if(document.hidden&&this.phase==='play')this.setPause(true);});
    window.addEventListener('resize',()=>this.view.resize());window.addEventListener('pagehide',()=>this.tracker.stop());
  }
  private activateDrop(index:number){
    if(this.world.elapsed-this.lastTouch<.25)return false;
    if(!this.world.touchBell(index))return false;
    this.lastTouch=this.world.elapsed;this.dwell.reset();this.view.playNote(index);this.materialAudio.note(index);return true;
  }
  private touch(){
    const x=this.mode==='camera'?this.filter.x:this.pointer.x,y=this.mode==='camera'?this.filter.y:this.pointer.y;
    if(this.journey.chapter>=2){if(this.journey.flying){this.journey.collectFlight();return;}const t=this.journeyView.targetAt(x,y)??(this.world.easyMode?this.journey.nearest:null);if(t&&this.journey.inReach(t))this.journey.interact(t.id);return;}
    const bell=this.view.bellAt(x,y);
    if(bell>=0&&this.activateDrop(bell))return;
    if(this.world.easyMode&&this.world.materialsAwake&&this.nearestDropDistance()<=this.world.touchRange){this.touchNearest();return;}
    const ground=this.view.ground(x,y);if(ground)this.world.touchWater(ground);
  }
  private nearestDropDistance(){const p=this.world.player;return Math.min(...BELLS.map(b=>Math.hypot(b.x-p.x,b.z-p.z)));}
  private touchNearest(){if(this.journey.chapter>=2){this.journey.chapter===6?this.journey.collectFlight():this.journey.action();return;}const w=this.world,p=w.player;const ordered=BELLS.map((b,i)=>({i,d:Math.hypot(b.x-p.x,b.z-p.z)})).sort((a,b)=>a.d-b.d);const next=ordered.find(b=>!w.notes.has(b.i)&&b.d<=w.touchRange)??ordered[0];if(w.materialsAwake&&next?.d<=w.touchRange)this.activateDrop(next.i);else w.touchWater({x:p.x,y:0,z:p.z});}
  private updateDropFocus(dt:number,present:boolean,guiding:boolean){
    const x=this.mode==='camera'?this.filter.x:this.pointer.x,y=this.mode==='camera'?this.filter.y:this.pointer.y;
    let point:{x:number;y:number;z:number}|null=null,index=-1;
    const available=this.phase==='play'&&present&&!guiding&&!this.keys.size&&!this.guide.active&&!this.journey.walking&&!this.journey.busy;
    if(this.journey.chapter===1){index=available&&this.world.materialsAwake?this.view.bellAt(x,y):-1;this.view.focusNote(index);if(index>=0)point=BELLS[index];}
    else{index=available?this.journeyView.pick(x,y):-1;if(index>=0)point=this.journey.targets[index];this.view.focusNote(-1);}
    this.focusedDrop=index;const repeated=this.journey.chapter===7&&this.journey.roomVisited.has(this.journey.targets[index]?.id);const activated=this.dwell.update(index,dt,this.world.easyMode&&this.dwellEnabled&&available&&!this.journey.ready&&!repeated);
    if(activated>=0){if(this.journey.chapter===1)this.activateDrop(activated);else if(point){this.journey.interact(this.journey.targets[activated]?.id);this.dwell.reset();}}
    const marker=el('drop-focus');marker.hidden=!point||this.phase!=='play';
    if(point&&!marker.hidden){const q=this.view.screen(point);marker.style.left=q.x+'px';marker.style.top=q.y+'px';el('dwell-ring').setAttribute('stroke-dashoffset',String(169.65*(1-this.dwell.progress)));el('dwell-label').textContent=this.world.easyMode&&this.dwellEnabled?'停留片刻，或轻轻捏合':'轻轻捏合，或点击';}
  }
  private sample(now:number,dt:number){
    let present=false,guide=false,wx=0,wz=0;
    if(this.mode==='camera'){
      try{const input=this.tracker.sample(now);if(input){this.input=input;this.lastHand=now;}}
      catch(e){this.tracker.stop();this.mode='mouse';this.input=emptyInput();this.preview.reset();this.notice('识别暂时中断，已切换鼠标。'+String(e));}
      if(now-this.lastHand>300)this.input=emptyInput();
      present=this.input.present;
      if(present){for(const k of ['x','y']as const)this.filter[k]=smooth(this.filter[k],this.input[k],10,dt);this.filter.palmX=smooth(this.filter.palmX,this.input.palmX??this.input.x,9,dt);this.filter.palmY=smooth(this.filter.palmY,this.input.palmY??this.input.y,9,dt);}
      guide=present&&this.input.open;
      if(guide){this.windOrigin??={x:this.filter.palmX,y:this.filter.palmY};wx=(this.filter.palmX-this.windOrigin.x)*5;wz=(this.filter.palmY-this.windOrigin.y)*5;}
      else this.windOrigin=null;
      const aim=present&&!guide&&!(this.world.easyMode&&this.focusedDrop>=0)?this.view.ground(this.filter.x,this.filter.y):null;
      if(aim)this.world.target={x:aim.x,z:aim.z};
      if(this.input.pinch&&this.phase==='play'){this.touch();this.input.pinch=false;}
    }else{
      present=this.pointer.present;guide=this.pointer.down&&this.pointer.dragging;
      if(guide&&this.windOrigin){wx=(this.pointer.x-this.windOrigin.x)*5;wz=(this.pointer.y-this.windOrigin.y)*5;}
      if(present&&!this.pointer.down&&!(this.world.easyMode&&this.focusedDrop>=0)){const aim=this.view.ground(this.pointer.x,this.pointer.y);if(aim)this.world.target={x:aim.x,z:aim.z};}
    }
    if(this.keys.size){
      const axisX=Number(this.keys.has('ArrowRight')||this.keys.has('KeyD'))-Number(this.keys.has('ArrowLeft')||this.keys.has('KeyA'));
      const axisZ=Number(this.keys.has('ArrowDown')||this.keys.has('KeyS'))-Number(this.keys.has('ArrowUp')||this.keys.has('KeyW'));
      present=true;guide=this.keys.has('Space')||this.journey.flying;
      if(guide){wx=axisX;wz=axisZ;}else this.world.target={x:this.world.player.x+axisX*3,z:this.world.player.z+axisZ*3};
    }
    this.preview.update(this.mode==='camera'&&present);
    return{present,guide,wx:Math.abs(wx)<.04?0:clamp(wx,-1,1),wz:Math.abs(wz)<.04?0:clamp(wz,-1,1)};
  }
  private frame(){
    this.timer.update();const rawDt=this.timer.getDelta(),dt=clamp(rawDt,0,.25);if(rawDt>0&&this.phase==='play'){this.frames++;this.frameTotal+=rawDt;this.perfFrames++;if(this.quality==='auto'&&performance.now()-this.perfSince>3000){const fps=this.perfFrames/((performance.now()-this.perfSince)/1000),ratio=this.view.renderer.getPixelRatio();if(fps<23&&ratio>.65)this.view.renderer.setPixelRatio(Math.max(.65,ratio*.8));this.perfSince=performance.now();this.perfFrames=0;}}
    if(this.phase!=='paused'){
      let input=this.sample(performance.now(),dt);const rawInput={...input},j=this.journey;
      const oldGuide=j.chapter===1&&this.guide.update();if(this.pendingTouch&&!this.guide.active&&j.chapter===1){this.pendingTouch=false;this.touchNearest();}
      if(oldGuide||j.walking)input={present:true,guide:false,wx:0,wz:0};
      if(j.chapter===0&&j.started)input={present:true,guide:false,wx:0,wz:0};
      if(j.busy&&j.chapter!==0)input={present:false,guide:false,wx:0,wz:0};
      this.updateDropFocus(dt,input.present,input.guide);if(this.world.easyMode&&this.focusedDrop>=0&&!input.guide&&!oldGuide&&!j.walking)this.world.target={x:this.world.player.x,z:this.world.player.z};
      const play=this.phase==='play';this.accumulator+=dt;let steps=0;
      while(this.accumulator>=1/60&&steps++<15){if(j.flying)this.world.elapsed+=1/60;else this.world.update(1/60,play&&input.present,play&&input.guide,input.wx,input.wz);if(play)j.update(1/60,j.flying?rawInput:input);this.view.rain.update(1/60);this.accumulator-=1/60;}
      this.journeyView.update(dt);this.view.update(dt);
      const indoor=j.chapter>=7&&Math.hypot(this.world.player.x-46,this.world.player.z+105.7)>3.2;if(indoor!==this.indoor){this.indoor=indoor;this.audio.indoor(indoor);}
      const cursor=el('aim-cursor');cursor.hidden=this.phase!=='play'||this.mode!=='camera'||!this.input.present;if(!cursor.hidden){cursor.style.transform=`translate(${this.filter.x*innerWidth}px,${this.filter.y*innerHeight}px)`;cursor.dataset.guide=String(this.world.guiding);}
    }
    if(performance.now()-this.lastUI>120){this.lastUI=performance.now();this.updateUI();}
  }
  private updateStory(){
    const w=this.world,j=this.journey,ch=j.chapter;
    if(ch!==1&&this.guide.active)this.guide.stop();
    el('chapter-name').textContent=ch>0&&ch<8?`第${['','一','二','三','四','五','六','七'][ch]}章 · ${CHAPTERS[ch]}`:ch===0?'序章':'';
    const lines=['城市，尚未醒来。','原来，雨也在等一个回应。','把不同的声音，轻轻放在一起。','一把伞，接住一条新的路。','水里，藏着另一座城市。','现在，让城市跟着你的手呼吸。','风把这座城市，交到了你的手里。','回来了。灯还在等你。','雨没有停。'];
    el('v4-line').textContent=lines[ch];
    const goals=['沿着街道，走进这场雨。','先听雨棚与玻璃，再触碰灯下三滴雨。','在小巷里，试试风铃、玻璃与水面的声音。','种下两把伞，看看被接住的雨水会流向哪里。','靠近新形成的水洼，张掌或轻触，拨开水里的倒影。','张掌左右、向上引风。也可以轻触脚下的光点，让城市自行演奏。','顺着风道飞行；左右选择路线，上下轻轻改变高度。','随意看看房间里的物品。等你想休息时，窗边有一把椅子。','但这一次，我不再害怕它。'];
    el('v4-goal').textContent=j.ready?ch===5?'风已经托住了你。准备好，就随风起飞。':'前方的路已经打开。继续前行，或留下再听一会儿。':goals[ch];
    el('step-progress').textContent=j.progress;el('guide-next').hidden=j.busy||j.ready;el('guide-next').textContent=this.guide.active||j.walking?'停止带路':j.ready?'继续前行':'带我过去';
    el<HTMLButtonElement>('auto-pass').disabled=ch===8||j.seated||this.transitioning;el('auto-pass').textContent=ch===0?'跳过开场':'跳过本节';
    el('continue-story').hidden=!j.ready;el('continue-story').textContent=ch===5?'随风起飞':'继续前行';
    const touch=el('touch-next');touch.hidden=ch===0||ch===8||j.seated||(j.busy&&ch!==6)||(ch===1&&!w.materialsAwake)||j.ready;
    touch.textContent=ch===1?'轻触下一滴':ch===6?'触碰光滴':ch===3?(j.planted.size>=2?'再种一把伞':'种下一把伞'):ch===4?'拨动水面':ch===5?(j.conducting?'停止演奏':'让城市演奏'):j.nearest?.label??'轻轻触碰';
    el('flight-controls').hidden=ch!==6;el('autopilot').textContent='自动滑翔：'+(j.autopilot?'开':'关');el('autopilot').setAttribute('aria-pressed',String(j.autopilot));el('route-left').setAttribute('aria-pressed',String(j.flightRoute==='left'));el('route-right').setAttribute('aria-pressed',String(j.flightRoute==='right'));
    if(this.loaded&&j.started&&this.musicChapter!==ch){this.musicChapter=ch;this.audio.music.switch([0,0,1,1,2,3,3,4,4][ch]);}
  }
  private updateUI(){
    const w=this.world,p=w.player,j=this.journey;Object.assign(el('stage').dataset,{phase:this.phase,mode:this.mode,chapter:String(j.chapter),actor:JSON.stringify({x:p.x,y:p.y,z:p.z,vx:p.vx,vz:p.vz}),guiding:String(w.guiding),wind:JSON.stringify(w.wind),contacts:JSON.stringify(w.contacts),guided:JSON.stringify(w.guidedHits),notes:String(w.notes.size),gate:String(w.gateOpen),completed:String(j.won),easy:String(w.easyMode),guide:String(this.guide.active||j.walking)});
    if(j.started){el('step-progress').textContent=j.progress;if(j.ready&&el('continue-story').hidden)this.updateStory();}
    if(j.chapter===8&&j.chapterTime>3&&!this.finishShown&&this.phase==='play'){this.finishShown=true;el<HTMLDialogElement>('finish-dialog').showModal();this.setPause(true,true);el('finish-explore').focus();}
    el('mode-label').textContent=this.phase==='title'?'戴上耳机，走近听一听':this.mode==='camera'?(!this.tracker.active?'摄像头已断开 · 可在设置重新连接':this.input.present?'摄像头模式 · 正在识别':'摄像头模式 · 请伸出一只手'):(j.flying?'鼠标模式 · 正在滑翔':w.guiding?'鼠标模式 · 正在引雨':'鼠标模式 · 慢慢走，听一听');
    const controlsMode=this.mode+':'+j.chapter;if(this.lastControlsMode!==controlsMode){this.lastControlsMode=controlsMode;el('game-controls').innerHTML=j.flying?'张掌 / 按住拖动：转向与升降<br>方向键：转向与升降　点击 / Enter：触碰光滴':this.mode==='camera'?'食指指向行走　捏合触碰　张掌引雨<br>指向物品附近，可停留触碰':'指向行走　按住拖动引雨　点击触碰<br><kbd>方向键</kbd> 行走　<kbd>空格＋方向键</kbd> 引雨　<kbd>Enter</kbd> 触碰';}
    const label=el('target-label');if(this.phase!=='play'||j.busy){label.hidden=true;el('target-dot').hidden=el('target-leader').hidden=true;return;}
    let target:Target|undefined=j.ready?(j.chapter===3?{...POND,hint:'沿着水光，走近看一看'}:undefined):j.chapter>=2?j.nearest:undefined;
    if(j.chapter===1){if(w.materialsAwake&&p.x>4)target={...BELLS[1],id:'notes',label:'雨里藏着的旋律',hint:'指向附近，或点“轻触下一滴”'};else if(!w.materialReady('metal'))target={x:-8,y:3.15,z:1.4,id:'tin',label:'铁皮上的雨',hint:'按住向上拖动，或张掌引雨'};else if(!w.materialReady('glass'))target={x:0,y:3.8,z:-1.55,id:'glass',label:'玻璃也会回应',hint:'张掌向上，或按住向上拖动'};}
    if(target){const q=this.view.screen(target),actor=this.view.screen({x:p.x,y:1,z:p.z});label.hidden=!q.visible;let x=q.x;if(Math.abs(x-actor.x)<145&&Math.abs(q.y-actor.y)<130)x+=actor.x<innerWidth*.58?175:-175;x=clamp(x,Math.min(125,innerWidth*.32),innerWidth-Math.min(125,innerWidth*.32));label.style.left=x+'px';label.style.top=clamp(q.y,300,innerHeight-210)+'px';label.replaceChildren(document.createTextNode(target.label),Object.assign(document.createElement('small'),{textContent:target.hint}));const dot=el('target-dot'),leader=el('target-leader');dot.hidden=label.hidden;dot.style.transform=`translate(${q.x}px,${q.y}px)`;leader.hidden=true;}else{label.hidden=true;el('target-dot').hidden=el('target-leader').hidden=true;}
  }
  inspect(){return{chapter:this.journey.chapter,chapterName:CHAPTERS[this.journey.chapter],ready:this.journey.ready,story:{voices:[...this.journey.voices],planted:[...this.journey.planted],pool:this.journey.pool,umbrellaHits:this.journey.umbrellaHits,surface:this.journey.surface,dive:this.journey.dive,dream:this.journey.dream,danceEnergy:this.journey.danceEnergy,danceVoices:[...this.journey.danceVoices],flightPart:this.journey.flightPart,flightSpeed:this.journey.flightSpeed,flightTime:this.journey.flightTime,route:this.journey.flightRoute,autopilot:this.journey.autopilot,landed:this.journey.landed,roomVisited:[...this.journey.roomVisited],lamp:this.journey.lamp,record:this.journey.record,cup:this.journey.cup,seated:this.journey.seated,won:this.journey.won,walking:this.journey.walking},storyView:this.journeyView.inspect(),musicIndex:this.audio.music.activeIndex,targets:this.journey.targets,phase:this.phase,mode:this.mode,player:{...this.world.player},wind:{...this.world.wind},contacts:{...this.world.contacts},guided:{...this.world.guidedHits},notes:[...this.world.notes],gateOpen:this.world.gateOpen,completed:this.world.completed,completion:this.world.completion,easyMode:this.world.easyMode,focusedDrop:this.focusedDrop,dwellProgress:this.dwell.progress,guide:{active:this.guide.active,destination:this.guide.destination},musicDucking:this.audio.musicDucking,materialsAwake:this.world.materialsAwake,elapsed:this.world.elapsed,puddles:PUDDLES,surfaces:SURFACES,bells:BELLS,feet:this.view.character.footWorld.map(p=>p.toArray()),audio:{...this.materialAudio.played},musicLoaded:this.audio.music.loaded,frames:this.frames,averageFPS:this.frames/Math.max(.1,this.frameTotal),metrics:{...this.view.metrics,pixelRatio:this.view.renderer.getPixelRatio()},camera:this.view.rig.camera.position.toArray()};}
}

try{new PrototypeGame();}catch(e){el('notice').hidden=false;el('notice').textContent='画面未能启动：'+String(e)+'。请使用支持硬件加速的 Chrome 或 Edge，在 localhost 打开。';console.error(e);}

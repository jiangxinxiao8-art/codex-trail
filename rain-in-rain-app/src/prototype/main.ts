import './style.css';
import * as T from 'three';
import { HandTracker } from '../camera/HandTracker';
import { CameraPreview } from '../ui/CameraPreview';
import { AudioManager } from '../audio/AudioManager';
import { emptyInput, type Input } from '../camera/GestureRecognizer';
import { MaterialAudio } from './MaterialAudio';
import { BELLS, PUDDLES, SURFACES, WorldModel, clamp, smooth } from './WorldModel';
import { WorldView } from './WorldView';

const el = <E extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as E;
document.querySelector('#app')!.innerHTML = `
<main id="rain-v4"><a class="v4-skip" href="#game-controls">跳至操作说明</a>
<div id="stage" role="region" aria-label="雨中城市"></div><div class="v4-shade" aria-hidden="true"></div>
<header class="v4-header"><p class="v4-brand">雨中曲</p><nav class="v4-actions" aria-label="体验设置"><button id="pause" aria-pressed="false">暂停</button><button id="view-toggle" aria-pressed="false">换个视角</button><button id="camera-preview-toggle" aria-label="摄像头预览" aria-pressed="false">摄像头小窗</button><button id="settings-toggle">声音与操作</button></nav></header>
<section id="intro" aria-labelledby="v4-title"><h1 id="v4-title" class="v4-title">雨中曲</h1><p class="v4-subtitle" lang="en">Sing in the Rain</p><p class="v4-invitation">伸出手，让一座城市慢慢有了声音。</p><div class="v4-start-row"><button id="start" class="v4-primary" disabled>开始体验</button><button id="mouse-start" class="v4-text-button" disabled>用鼠标走进雨里</button></div><div class="v4-credits"><span>游戏制作：蒋欣笑</span><span>音乐生成：蒋欣笑</span><span>美术制作：蒋欣笑</span></div><p class="v4-intro-note">先在这一段雨夜街道中自由探索。建议佩戴耳机；摄像头画面仅在本地处理。</p></section>
<section id="v4-caption" aria-live="polite" hidden><h2 id="v4-line">原来，雨也在等一个回应。</h2><p id="v4-goal">走近雨棚与玻璃，让雨落在不同的地方。</p></section>
<div id="aim-cursor" aria-hidden="true" hidden></div>
<div id="target-label" class="v4-world-label" hidden></div><span id="target-dot" aria-hidden="true" hidden></span><span id="target-leader" aria-hidden="true" hidden></span>
<footer id="v4-footer"><p class="v4-status" id="mode-label">雨夜街道 · 正在准备…</p><p class="v4-controls" id="game-controls" tabindex="-1">指向行走　按住拖动引雨　点击触碰<br><kbd>方向键</kbd> 行走　<kbd>空格＋方向键</kbd> 引雨　<kbd>Enter</kbd> 触碰</p></footer>
<aside id="camera-preview" hidden><p id="preview-status">摄像头未连接</p><button id="preview-close">收起小窗</button></aside>
<div id="notice" role="status" aria-live="polite" hidden></div><section id="paused" aria-label="已暂停" hidden><span>雨，等你回来。</span><button id="resume" class="v4-primary">继续听雨</button></section>
<dialog id="sound-dialog" class="v4-dialog" aria-labelledby="sound-title"><button id="settings-close" aria-label="关闭声音与操作设置">×</button><h2 id="sound-title">听雨的方式</h2>
<label>总音量<input id="master" name="master" type="range" min="0" max="1" step=".01" value=".9"></label><label>背景音乐<input id="background" name="music" type="range" min="0" max="1" step=".01" value=".74"></label><label>环境雨声<input id="environment" name="ambience" type="range" min="0" max="1" step=".01" value=".5"></label><label>物体与脚步<input id="interaction" name="effects" type="range" min="0" max="1" step=".01" value=".8"></label>
<label>减少镜头运动<input id="reduce-motion" name="reduce-motion" type="checkbox"></label><label>画面精度<select id="quality" name="quality"><option value="auto">自动</option><option value="1.25">标准</option><option value="1">轻量</option><option value=".75">更轻量</option></select></label>
<div class="v4-dialog-actions"><button id="switch-camera" class="v4-text-button">连接摄像头</button><button id="switch-mode" class="v4-text-button">使用鼠标</button></div><p>摄像头：食指指向行走，捏合触碰。张掌后人物会停下，掌心移动引导雨与风。鼠标按住并拖动具有相同效果。</p><p>先走到物品附近，再轻轻把雨引向它。玻璃需要向街道里侧引雨。小窗可独立关闭。</p><a href="?version=3">打开保留的 V3 完整作品</a></dialog>
</main>`;

class PrototypeGame {
  readonly world = new WorldModel();
  readonly view = new WorldView(el('stage'), this.world);
  readonly tracker = new HandTracker();
  readonly preview = new CameraPreview(this.tracker);
  readonly audio = new AudioManager();
  readonly materialAudio = new MaterialAudio(this.audio.interaction);
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
    this.world.onImpact = hit => { this.view.impact(hit); if (this.phase === 'play') this.materialAudio.hit(hit, this.world); };
    this.world.onChange = () => this.updateStory();
    this.bind();this.timer.connect(document);
    this.view.renderer.setAnimationLoop(()=>this.frame());
    el<HTMLButtonElement>('start').disabled=false;el<HTMLButtonElement>('mouse-start').disabled=false;
    el('mode-label').textContent='雨夜街道 · 戴上耳机，走近听一听';
    el<HTMLInputElement>('reduce-motion').checked=this.view.rig.reducedMotion;
    this.audio.volume(.9*.9);this.audio.background.gain.value=.74*.74;this.audio.environment.gain.value=.5*.5;this.audio.interaction.gain.value=.8*.8;
    el('stage').dataset.ready='true';
    if(new URLSearchParams(location.search).has('inspect'))Object.assign(window,{__rainV4:{renderer:this.view.renderer,scene:this.view.scene,camera:this.view.rig.camera,inspect:()=>this.inspect(),project:(p:{x:number;y:number;z:number})=>this.view.screen(p)}});
  }
  private notice(message:string,persistent=false){clearTimeout(this.noticeTimer);el('notice').textContent=message;el('notice').hidden=false;if(!persistent)this.noticeTimer=window.setTimeout(()=>el('notice').hidden=true,6500);}
  private async start(mode:'mouse'|'camera'){
    if(this.starting||this.phase!=='title')return;this.starting=true;
    el<HTMLButtonElement>('start').disabled=el<HTMLButtonElement>('mouse-start').disabled=true;
    try{
      this.notice('正在准备雨声与音乐…',true);await this.audio.start();
      if(!this.loaded){const errors=await this.audio.music.load();this.loaded=true;if(errors.length)this.notice(errors.join('；'),true);else el('notice').hidden=true;}
      if(mode==='camera')await this.connectCamera();else this.mode='mouse';
      this.perfSince=performance.now();this.perfFrames=0;this.phase='play';el('intro').hidden=true;el('v4-caption').hidden=false;this.audio.music.switch(0);
      this.pointer.present=false;this.view.renderer.domElement.focus({preventScroll:true});this.updateStory();
    }catch(e){this.notice('启动失败：'+String(e)+'。可以重新点击开始体验。',true);}
    finally{this.starting=false;el<HTMLButtonElement>('start').disabled=el<HTMLButtonElement>('mouse-start').disabled=false;}
  }
  private async connectCamera(){
    try{this.notice('请允许摄像头，正在准备手部识别…',true);await this.tracker.start();this.mode='camera';this.input=emptyInput();this.lastHand=performance.now();this.windOrigin=null;el('notice').hidden=true;}
    catch(e){this.mode='mouse';this.notice('已提供鼠标操作。摄像头未连接：'+(e instanceof Error?e.message:String(e)),true);}
  }
  private setPause(pause:boolean){
    if(pause&&this.phase!=='paused'){this.previousPhase=this.phase;this.phase='paused';this.pointer.down=this.pointer.dragging=false;this.keys.clear();this.world.guiding=false;}
    else if(!pause&&this.phase==='paused')this.phase=this.previousPhase;
    el('paused').hidden=this.phase!=='paused'||el<HTMLDialogElement>('sound-dialog').open;
    el('pause').textContent=this.phase==='paused'?'继续':'暂停';el('pause').setAttribute('aria-pressed',String(this.phase==='paused'));
    el('stage').inert=this.phase==='paused';document.querySelector<HTMLElement>('.v4-header')!.inert=this.phase==='paused';el('intro').inert=this.phase==='paused';
    if(pause&&!el<HTMLDialogElement>('sound-dialog').open)el('resume').focus();
    if(!pause&&!el<HTMLDialogElement>('sound-dialog').open&&this.phase==='play')this.view.renderer.domElement.focus({preventScroll:true});
    if(this.loaded)void this.audio.pause(this.phase==='paused');
  }
  private bind(){
    el('start').onclick=()=>void this.start('camera');el('mouse-start').onclick=()=>void this.start('mouse');
    el('pause').onclick=()=>this.setPause(this.phase!=='paused');el('paused').onkeydown=e=>{if(e.key==='Tab'){e.preventDefault();el('resume').focus();}};el('resume').onclick=()=>this.setPause(false);
    el('view-toggle').onclick=()=>{this.view.rig.observing=!this.view.rig.observing;el('view-toggle').setAttribute('aria-pressed',String(this.view.rig.observing));};
    el('preview-close').onclick=()=>this.preview.toggle();
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
  private touch(){
    const x=this.mode==='camera'?this.filter.x:this.pointer.x,y=this.mode==='camera'?this.filter.y:this.pointer.y;
    const bell=this.view.bellAt(x,y);
    if(bell>=0&&this.world.touchBell(bell)){this.view.playNote(bell);this.materialAudio.note(bell);return;}
    const ground=this.view.ground(x,y);if(ground&&this.world.touchWater(ground))return;
  }
  private touchNearest(){const w=this.world,p=w.player;const ordered=BELLS.map((b,i)=>({i,d:Math.hypot(b.x-p.x,b.z-p.z)})).sort((a,b)=>a.d-b.d);const next=ordered.find(b=>!w.notes.has(b.i)&&b.d<=3.5)??ordered[0];if(w.materialsAwake&&next?.d<=3.5&&w.touchBell(next.i)){this.view.playNote(next.i);this.materialAudio.note(next.i);}else w.touchWater({x:p.x,y:0,z:p.z});}
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
      const aim=present&&!guide?this.view.ground(this.filter.x,this.filter.y):null;
      if(aim)this.world.target={x:aim.x,z:aim.z};
      if(this.input.pinch&&this.phase==='play'){this.touch();this.input.pinch=false;}
    }else{
      present=this.pointer.present;guide=this.pointer.down&&this.pointer.dragging;
      if(guide&&this.windOrigin){wx=(this.pointer.x-this.windOrigin.x)*5;wz=(this.pointer.y-this.windOrigin.y)*5;}
      if(present&&!this.pointer.down){const aim=this.view.ground(this.pointer.x,this.pointer.y);if(aim)this.world.target={x:aim.x,z:aim.z};}
    }
    if(this.keys.size){
      const axisX=Number(this.keys.has('ArrowRight')||this.keys.has('KeyD'))-Number(this.keys.has('ArrowLeft')||this.keys.has('KeyA'));
      const axisZ=Number(this.keys.has('ArrowDown')||this.keys.has('KeyS'))-Number(this.keys.has('ArrowUp')||this.keys.has('KeyW'));
      present=true;guide=this.keys.has('Space');
      if(guide){wx=axisX;wz=axisZ;}else this.world.target={x:this.world.player.x+axisX*3,z:this.world.player.z+axisZ*3};
    }
    this.preview.update(this.mode==='camera'&&present);
    return{present,guide,wx:Math.abs(wx)<.04?0:clamp(wx,-1,1),wz:Math.abs(wz)<.04?0:clamp(wz,-1,1)};
  }
  private frame(){
    this.timer.update();const rawDt=this.timer.getDelta(),dt=clamp(rawDt,0,.25);if(rawDt>0&&this.phase==='play'){this.frames++;this.frameTotal+=rawDt;this.perfFrames++;if(this.quality==='auto'&&performance.now()-this.perfSince>3000){const fps=this.perfFrames/((performance.now()-this.perfSince)/1000),ratio=this.view.renderer.getPixelRatio();if(fps<23&&ratio>.65)this.view.renderer.setPixelRatio(Math.max(.65,ratio*.8));this.perfSince=performance.now();this.perfFrames=0;}}
    if(this.phase!=='paused'){
      const input=this.sample(performance.now(),dt),play=this.phase==='play';this.accumulator+=dt;let steps=0;
      while(this.accumulator>=1/60&&steps++<15){this.world.update(1/60,play&&input.present,play&&input.guide,input.wx,input.wz);this.view.rain.update(1/60);this.accumulator-=1/60;}
      this.view.update(dt);
      const cursor=el('aim-cursor');cursor.hidden=this.phase!=='play'||this.mode!=='camera'||!this.input.present;if(!cursor.hidden){cursor.style.transform=`translate(${this.filter.x*innerWidth}px,${this.filter.y*innerHeight}px)`;cursor.dataset.guide=String(this.world.guiding);}
    }
    if(performance.now()-this.lastUI>120){this.lastUI=performance.now();this.updateUI();}
  }
  private updateStory(){
    const w=this.world;
    if(w.gateOpen){el('v4-line').textContent='你听，城市也在轻轻唱歌。';el('v4-goal').textContent='小门已经打开。走进去，或回头再听一会儿雨。';}
    else if(w.materialsAwake){el('v4-line').textContent='两种声音，唤醒了一小段旋律。';el('v4-goal').textContent='沿街走到右侧灯下，轻触三颗悬着的雨滴。';}
    else{const metal=w.guidedHits.metal>=5,glass=w.guidedHits.glass>=5;el('v4-line').textContent=metal||glass?'原来，雨落在每个地方都不一样。':'原来，雨也在等一个回应。';el('v4-goal').textContent=metal?'还差玻璃的声音。向街道里侧引雨。':glass?'再去听听铁皮雨棚。让雨换一个落点。':'走近雨棚与玻璃，让雨落在不同的地方。';}
  }
  private updateUI(){
    const w=this.world,p=w.player;
    Object.assign(el('stage').dataset,{phase:this.phase,mode:this.mode,actor:JSON.stringify({x:p.x,z:p.z,vx:p.vx,vz:p.vz}),guiding:String(w.guiding),wind:JSON.stringify(w.wind),contacts:JSON.stringify(w.contacts),guided:JSON.stringify(w.guidedHits),notes:String(w.notes.size),gate:String(w.gateOpen)});
    el('mode-label').textContent=this.phase==='title'?'雨夜街道 · 戴上耳机，走近听一听':this.mode==='camera'?(!this.tracker.active?'摄像头已断开 · 可在设置重新连接':this.input.present?'摄像头模式 · 正在识别':'摄像头模式 · 请伸出一只手'):(w.guiding?'鼠标模式 · 正在引导雨与风':'鼠标模式 · 慢慢走，听一听');
    if(this.lastControlsMode!==this.mode){this.lastControlsMode=this.mode;el('game-controls').innerHTML=this.mode==='camera'?'食指指向行走　捏合触碰　张掌引雨<br>掌心向上、左右移动，改变雨落下的方向':'指向行走　按住拖动引雨　点击触碰<br><kbd>方向键</kbd> 行走　<kbd>空格＋方向键</kbd> 引雨　<kbd>Enter</kbd> 触碰';}
    const label=el('target-label');if(this.phase!=='play'){label.hidden=true;el('target-dot').hidden=el('target-leader').hidden=true;return;}
    let target:{x:number;y:number;z:number;text:string;hint:string}|null=null;
    if(w.gateOpen&&p.x>9)target={x:15.5,y:2.8,z:-1.5,text:'门后还有一场雨',hint:'走近，再向里走走'};
    else if(w.materialsAwake&&p.x>4)target={...BELLS[1],text:'雨里藏着的旋律',hint:'走近，轻轻触碰悬滴'};
    else if(!w.materialsAwake&&Math.abs(p.x+8)<5.7&&w.guidedHits.metal<5)target={x:-8,y:3.15,z:1.4,text:'铁皮上的雨',hint:'按住并拖动，或张掌引雨'};
    else if(!w.materialsAwake&&Math.abs(p.x)<5.8&&w.guidedHits.glass<5)target={x:0,y:3.8,z:-1.55,text:'玻璃也会回应',hint:'张掌向上，或按住向上拖动'};
    else{const water=PUDDLES.find(q=>Math.hypot(q.x-p.x,q.z-p.z)<2.8);if(water)target={x:water.x,y:.3,z:water.z,text:'一小片水光',hint:'走过去，或轻触水面'};}
    if(target){const projected=this.view.screen(target),actor=this.view.screen({x:p.x,y:1,z:p.z});label.hidden=!projected.visible;let x=projected.x;if(Math.abs(x-actor.x)<145&&Math.abs(projected.y-actor.y)<160)x+=actor.x<innerWidth*.58?190:-190;x=clamp(x,140,innerWidth-140);label.style.left=x+'px';label.style.top=projected.y+'px';label.replaceChildren(document.createTextNode(target.text),Object.assign(document.createElement('small'),{textContent:target.hint}));const dot=el('target-dot'),leader=el('target-leader');dot.hidden=label.hidden;dot.style.transform=`translate(${projected.x}px,${projected.y}px)`;leader.hidden=label.hidden||Math.abs(x-projected.x)<1;leader.style.left=Math.min(x,projected.x)+'px';leader.style.top=projected.y+'px';leader.style.width=Math.abs(x-projected.x)+'px';}else{label.hidden=true;el('target-dot').hidden=el('target-leader').hidden=true;}
  }
  inspect(){return{phase:this.phase,mode:this.mode,player:{...this.world.player},wind:{...this.world.wind},contacts:{...this.world.contacts},guided:{...this.world.guidedHits},notes:[...this.world.notes],gateOpen:this.world.gateOpen,materialsAwake:this.world.materialsAwake,elapsed:this.world.elapsed,puddles:PUDDLES,surfaces:SURFACES,bells:BELLS,feet:this.view.character.footWorld.map(p=>p.toArray()),audio:{...this.materialAudio.played},musicLoaded:this.audio.music.loaded,frames:this.frames,averageFPS:this.frames/Math.max(.1,this.frameTotal),metrics:{...this.view.metrics,pixelRatio:this.view.renderer.getPixelRatio()},camera:this.view.rig.camera.position.toArray()};}
}

try{new PrototypeGame();}catch(e){el('notice').hidden=false;el('notice').textContent='画面未能启动：'+String(e)+'。请使用支持硬件加速的 Chrome 或 Edge，在 localhost 打开。';console.error(e);}

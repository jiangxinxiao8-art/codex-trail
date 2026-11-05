import { emptyInput, type Input } from './GestureRecognizer';
export class MouseFallback {
  input = emptyInput(); private last = -Infinity;
  constructor(surface: HTMLElement) {
    surface.addEventListener('pointermove', e => { const r=surface.getBoundingClientRect(); this.input.x=(e.clientX-r.left)/r.width;this.input.y=(e.clientY-r.top)/r.height;this.input.present=true; });
    surface.addEventListener('pointerdown', e=> { if (e.button!==0) return; const r=surface.getBoundingClientRect(); this.input.x=(e.clientX-r.left)/r.width;this.input.y=(e.clientY-r.top)/r.height; if (performance.now()-this.last>260) { this.input.pinch=true;this.last=performance.now(); } this.input.present=true; });
    window.addEventListener('keydown',e=> { if (e.code==='Space' && !(e.target instanceof HTMLInputElement)) {e.preventDefault();this.input.open=true;} });
    window.addEventListener('keyup',e=>{if(e.code==='Space')this.input.open=false;});
    window.addEventListener('blur',()=>{this.input.open=false;this.input.pinch=false;});
  }
  sample(): Input {const i={...this.input};this.input.pinch=false;return i;}
}

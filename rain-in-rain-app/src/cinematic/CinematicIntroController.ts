export const CREDITS=['游戏制作：蒋欣笑','音乐生成：蒋欣笑','美术制作：蒋欣笑'];
/** Time drives only this authored film. Gameplay is exclusively event-driven. */
export class CinematicIntroController {
 elapsed=0;active=false;private lines:HTMLElement[]=[];private container:HTMLElement;private skip:HTMLElement;
 constructor(private onComplete:()=>void){this.container=document.getElementById('film-credits')!;this.skip=document.getElementById('skip-intro')!;this.container.innerHTML=CREDITS.map(t=>`<p class="credit"><span>${t}</span></p>`).join('');this.lines=Array.from(this.container.querySelectorAll('.credit'));this.skip.onclick=()=>this.finish();}
 start(){this.elapsed=0;this.active=true;this.container.hidden=false;this.skip.hidden=false;this.paint();}
 update(dt:number){if(!this.active)return;this.elapsed+=dt;this.paint();if(this.elapsed>=26)this.finish();}
 private paint(){const t=this.elapsed;this.lines.forEach((line,i)=>{const p=Math.max(0,Math.min(1,(t-5-i*2.8)/2.2));line.style.setProperty('--written',`${p*120}%`);line.style.opacity=String(Math.min(1,(t-4-i*2.8))*Math.max(0,Math.min(1,(23-t)/3)));});}
 finish(){if(!this.active)return;this.cancel();this.onComplete();}
 cancel(){this.active=false;this.container.hidden=true;this.skip.hidden=true;this.elapsed=0;for(const line of this.lines){line.style.setProperty('--written','0%');line.style.opacity='0';}}
}

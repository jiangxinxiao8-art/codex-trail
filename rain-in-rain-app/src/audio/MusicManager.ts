import * as Tone from 'tone';
import { musicUrls } from '../assets';
export class MusicManager {
 private tracks:{player:Tone.Player;gain:Tone.Gain}[]=[]; private current=-1; private timers:number[]=[];
 constructor(private output:Tone.Gain){}
 async load(urls=musicUrls):Promise<string[]> {
  this.disposeTracks();const errors:string[]=[];
  this.tracks=urls.map(()=>{const gain=new Tone.Gain(0).connect(this.output);return {gain,player:new Tone.Player().connect(gain)};});
  await Promise.all(this.tracks.map(async(t,i)=>{try{await t.player.load(urls[i]);}catch{errors.push(`第 ${i+1} 首音乐加载失败`);}}));return errors;
 }
 switch(index:number){if(index===this.current)return;const now=Tone.now();for(const [i,t]of this.tracks.entries())if(i!==index&&t.player.state==='started'){t.gain.gain.cancelScheduledValues(now);t.gain.gain.rampTo(0,2.5);this.timers.push(Tone.getContext().setTimeout(()=>{if(this.current!==i&&t.player.state==='started')t.player.stop();},2.7));}
  this.current=index;const next=this.tracks[index];if(!next?.player.loaded)return;next.gain.gain.cancelScheduledValues(now);next.gain.gain.value=0;next.player.start();next.gain.gain.rampTo(.72,2.5);
 }
 fadeOut(){const track=this.tracks[this.current];if(track)track.gain.gain.rampTo(0,8);}
 reset(){this.timers.forEach(id=>Tone.getContext().clearTimeout(id));this.timers=[];this.current=-1;for(const t of this.tracks){t.player.stop();t.gain.gain.cancelScheduledValues(0);t.gain.gain.value=0;}}
 private disposeTracks(){this.reset();for(const t of this.tracks){t.player.dispose();t.gain.dispose();}this.tracks=[];}
 get loaded(){return this.tracks.filter(t=>t.player.loaded).length;}
}

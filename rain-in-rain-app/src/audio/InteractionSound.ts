import * as Tone from 'tone';
const notes=['D5','E5','F#5','A5','B5','D6'];
export class InteractionSound {
 private reverb=new Tone.Reverb({decay:3.5,wet:.28});
 private delay=new Tone.FeedbackDelay({delayTime:.22,feedback:.16,wet:.13});
 private bell=new Tone.PolySynth(Tone.FMSynth,{volume:-14,harmonicity:2,modulationIndex:1.3,oscillator:{type:'sine'},envelope:{attack:.012,decay:.6,sustain:.05,release:1.6},modulation:{type:'sine'},modulationEnvelope:{attack:.01,decay:.4,sustain:0,release:.5}});
 private last=-Infinity;private timers:number[]=[];
 private later(callback:()=>void,delay:number){this.timers.push(Tone.getContext().setTimeout(callback,delay));}
 constructor(output:Tone.Gain){this.bell.connect(this.delay);this.delay.connect(this.reverb);this.reverb.connect(output);}
 drop(n:number){this.bell.triggerAttackRelease(notes[n%notes.length],.2);}
 umbrella(n:number){const t=Tone.now();this.bell.triggerAttackRelease('D4',.12,t);this.later(()=>this.bell.triggerAttackRelease(['F#4','A4','B4'][n%3],.4),.13);}
 puddle(){this.bell.triggerAttackRelease(['D4','F#4','A4','E5'],.8);}
 dance(x:number,now:number){if(now-this.last<220)return;this.last=now;this.drop(Math.min(5,Math.floor(x*6)));}
 motif(){['D5','F5','A5','F5'].forEach((n,i)=>this.later(()=>this.bell.triggerAttackRelease(n,.3),i*.55));}
 reset(){this.timers.forEach(id=>Tone.getContext().clearTimeout(id));this.timers=[];this.bell.releaseAll();this.last=-Infinity;}
}

import * as Tone from 'tone';
import { MusicManager } from './MusicManager';
import { InteractionSound } from './InteractionSound';
export class AudioManager {
 private limiter=new Tone.Limiter(-3).toDestination();private master=new Tone.Gain(.7).connect(this.limiter);
 readonly environment=new Tone.Gain(.24).connect(this.master);readonly background=new Tone.Gain(.65).connect(this.master);readonly interaction=new Tone.Gain(.65).connect(this.master);
 readonly music=new MusicManager(this.background);readonly sounds=new InteractionSound(this.interaction);
 private rainLevel=new Tone.Gain(1).connect(this.environment);
 private filter=new Tone.Filter({frequency:2400,type:'lowpass',rolloff:-24}).connect(this.rainLevel);
 private vehicle=new Tone.NoiseSynth({noise:{type:'brown'},envelope:{attack:1.6,decay:1,sustain:.15,release:2},volume:-32}).connect(this.environment);
 private vinylGain=new Tone.Gain(0).connect(this.environment);
 private vinyl=new Tone.Noise({type:'pink',volume:-42}).connect(this.vinylGain);
 private rain=new Tone.Noise({type:'pink',volume:-24}).connect(this.filter);
 private started=false;
 async start(){await Tone.start();if(!this.started){this.rain.start();this.vinyl.start();this.started=true;}}
 async pause(value:boolean){const context=Tone.getContext().rawContext as unknown as AudioContext;if(value)await context.suspend();else await context.resume();}
 volume(value:number){this.master.gain.rampTo(value,.1);}
 carPass(){this.vehicle.triggerAttackRelease(3);}
 indoor(value:boolean){this.filter.frequency.rampTo(value?800:2400,3);this.rainLevel.gain.rampTo(value?.4:1,3);}
 recordOn(){this.vinylGain.gain.rampTo(.6,2);}
 reset(){this.music.reset();this.sounds.reset();this.vehicle.triggerRelease();this.vinylGain.gain.rampTo(0,.1);this.indoor(false);}
}

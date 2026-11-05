import * as Tone from 'tone';
import { MusicManager } from './MusicManager';
import { InteractionSound } from './InteractionSound';
export class AudioManager {
 private limiter=new Tone.Limiter(-3).toDestination();private master=new Tone.Gain(.7).connect(this.limiter);
 readonly environment=new Tone.Gain(.24).connect(this.master);readonly background=new Tone.Gain(.65).connect(this.master);readonly interaction=new Tone.Gain(.65).connect(this.master);
 readonly music=new MusicManager(this.background);readonly sounds=new InteractionSound(this.interaction);
 private filter=new Tone.Filter({frequency:2400,type:'lowpass',rolloff:-24}).connect(this.environment);
 private rain=new Tone.Noise({type:'pink',volume:-24}).connect(this.filter);
 private started=false;
 async start(){await Tone.start();if(!this.started){this.rain.start();this.started=true;}}
 async pause(value:boolean){const context=Tone.getContext().rawContext as unknown as AudioContext;if(value)await context.suspend();else await context.resume();}
 volume(value:number){this.master.gain.rampTo(value,.1);}
 reset(){this.music.reset();this.sounds.reset();}
}

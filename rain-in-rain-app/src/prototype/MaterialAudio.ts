import * as Tone from 'tone';
import { clamp, type Impact, type WorldModel } from './WorldModel';
import { SoundBudget } from './SoundBudget';

/** Foreground notes have a dedicated voice and never compete with random rain. */
export class MaterialAudio {
  private pan = new Tone.Panner(0);
  private metal = new Tone.FMSynth({ harmonicity: 2.01, modulationIndex: 1.8, envelope: { attack: .002, decay: .17, sustain: 0, release: .2 }, modulationEnvelope: { attack: .001, decay: .1, sustain: 0, release: .12 }, volume: -14 }).connect(this.pan);
  private glass = new Tone.FMSynth({harmonicity:3.01,modulationIndex:.65,envelope:{attack:.002,decay:.22,sustain:0,release:.3},modulationEnvelope:{attack:.001,decay:.1,sustain:0,release:.12},volume:-10}).connect(this.pan);
  private bells = new Tone.PolySynth(Tone.Synth,{oscillator:{type:'triangle'},envelope:{attack:.003,decay:.18,sustain:.08,release:.55},volume:-8}).connect(this.pan);
  private water = new Tone.MembraneSynth({ pitchDecay: .025, octaves: 1.1, envelope: { attack: .003, decay: .16, sustain: 0, release: .15 }, volume: -23 }).connect(this.pan);
  private stone = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: .001, decay: .035, sustain: 0, release: .025 }, volume: -30 }).connect(this.pan);
  private budget=new SoundBudget();private lastNote=-100;
  readonly played = { metal: 0, glass: 0, water: 0, stone: 0, note: 0 };
  constructor(output: Tone.Gain,private focus:(kind:'glass'|'note')=>void=()=>{}) { this.pan.connect(output);this.bells.maxPolyphony=8; }
  hit(hit: Impact, world: WorldModel) {
    if (hit.material === 'roof') return;
    const distance = Math.hypot(hit.x - world.player.x, hit.z - world.player.z);
    if (distance > 8 || hit.material === 'stone' && hit.source === 'rain') return;
    const material=hit.material==='umbrella'?'water':hit.material;
    const now=Tone.now();if(!this.budget.allow(material,now,hit.source==='rain'))return;
    this.pan.pan.rampTo(clamp((hit.x - world.player.x) / 7, -.8, .8), .035);
    const velocity=hit.material==='glass'?clamp((hit.guided?.9:.65)/(1+distance*distance*.025),.28,.9):clamp((hit.guided?.7:.4)/(1+distance*distance*.065),.08,.8);
    this.played[material]++;
    if(material==='metal')this.metal.triggerAttackRelease(this.played.metal%2?'D4':'A4',.08,now,velocity);
    if(material==='glass'){this.glass.triggerAttackRelease(this.played.glass%2?'E5':'B5',.12,now,velocity);this.focus('glass');}
    if(material==='water')this.water.triggerAttackRelease(hit.source==='foot'?'D3':'A3',.07,now,velocity);
    if(material==='stone')this.stone.triggerAttackRelease(.025,now,.32);
  }
  note(index:number){const now=Tone.now();if(now-this.lastNote<.16)return false;this.lastNote=now;this.played.note++;this.bells.triggerAttackRelease(['D5','E5','A5'][index],.36,now,.85);this.focus('note');return true;}
  celebrate(){this.played.note+=3;this.bells.triggerAttackRelease(['D5','F#5','A5'],.65,Tone.now(),.45);this.focus('note');}
  dispose(){this.metal.dispose();this.glass.dispose();this.bells.dispose();this.water.dispose();this.stone.dispose();this.pan.dispose();}
}

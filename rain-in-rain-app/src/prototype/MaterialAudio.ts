import * as Tone from 'tone';
import { clamp, type Impact, type WorldModel } from './WorldModel';

/** Existing interaction bus -> panned material voices -> existing master limiter. */
export class MaterialAudio {
  private pan = new Tone.Panner(0);
  private metal = new Tone.FMSynth({ harmonicity: 2.01, modulationIndex: 1.8, envelope: { attack: .002, decay: .17, sustain: 0, release: .2 }, modulationEnvelope: { attack: .001, decay: .1, sustain: 0, release: .12 }, volume: -14 }).connect(this.pan);
  private glass = new Tone.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .004, decay: .28, sustain: 0, release: .4 }, volume: -15 }).connect(this.pan);
  private water = new Tone.MembraneSynth({ pitchDecay: .025, octaves: 1.1, envelope: { attack: .003, decay: .16, sustain: 0, release: .15 }, volume: -23 }).connect(this.pan);
  private stone = new Tone.NoiseSynth({ noise: { type: 'brown' }, envelope: { attack: .001, decay: .035, sustain: 0, release: .025 }, volume: -30 }).connect(this.pan);
  private last = new Map<string, number>();
  private recent: number[] = [];
  readonly played = { metal: 0, glass: 0, water: 0, stone: 0, note: 0 };
  constructor(output: Tone.Gain) { this.pan.connect(output); }
  hit(hit: Impact, world: WorldModel) {
    if (hit.material === 'roof') return;
    const distance = Math.hypot(hit.x - world.player.x, hit.z - world.player.z);
    if (distance > 8 || hit.material === 'stone' && hit.source === 'rain') return;
    const now = Tone.now(), last = this.last.get(hit.material) ?? -100;
    this.recent = this.recent.filter(t => now - t < 1);
    if (now - last < (hit.source === 'rain' ? .23 : .12) || this.recent.length >= 7) return;
    this.last.set(hit.material, now); this.recent.push(now);
    this.pan.pan.rampTo(clamp((hit.x - world.player.x) / 7, -.8, .8), .035);
    const velocity = clamp((hit.guided ? .7 : .4) / (1 + distance * distance * .065), .08, .8);
    const material = hit.material;
    this.played[material]++;
    if (material === 'metal') this.metal.triggerAttackRelease(this.played.metal % 2 ? 'D4' : 'A4', .08, now, velocity);
    if (material === 'glass') this.glass.triggerAttackRelease(this.played.glass % 2 ? 'E5' : 'B4', .12, now, velocity);
    if (material === 'water') this.water.triggerAttackRelease(hit.source === 'foot' ? 'D3' : 'A3', .07, now, velocity);
    if (material === 'stone') this.stone.triggerAttackRelease(.025, now, .32);
  }
  note(index: number) { const now = Math.max(Tone.now(), (this.last.get('glass') ?? -100) + .003); if (now - (this.last.get('note') ?? -100) < .19) return; this.last.set('note', now); this.last.set('glass', now); this.played.note++; this.glass.triggerAttackRelease(['D5', 'E5', 'A5'][index], .3, now, .7); }
  dispose() { this.metal.dispose(); this.glass.dispose(); this.water.dispose(); this.stone.dispose(); this.pan.dispose(); }
}

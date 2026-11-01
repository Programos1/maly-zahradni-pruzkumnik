/**
 * Fully synthesized audio (WebAudio): no binary assets needed.
 * Layers: ambience (wind, birdsong, water), generative music, SFX, and a continuous slime squelch.
 */
export type Sfx =
  | 'pickup' | 'deposit' | 'eat' | 'hurt' | 'warn' | 'ui' | 'levelup' | 'complete'
  | 'splash' | 'snip' | 'spray' | 'hide' | 'unhide' | 'upgrade' | 'error' | 'dive' | 'croak' | 'full' | 'recycle';

const PENTA = [0, 2, 4, 7, 9];

class AudioEngine {
  private ctx?: AudioContext;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private musicBus!: GainNode;
  private ambBus!: GainNode;
  private noise!: AudioBuffer;
  private slimeGain?: GainNode;
  private ambNodes: AudioNode[] = [];
  private timers: number[] = [];
  private musicTimer?: number;
  private musicStep = 0;
  private nextNoteTime = 0;
  musicOn = true;
  sfxOn = true;

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock(): void {
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      const comp = this.ctx.createDynamicsCompressor();
      this.master.connect(comp).connect(this.ctx.destination);
      this.sfxBus = this.bus(this.sfxOn ? 0.7 : 0);
      this.musicBus = this.bus(this.musicOn ? 0.22 : 0);
      this.ambBus = this.bus(this.musicOn ? 0.5 : 0);
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  private bus(v: number): GainNode {
    const g = this.ctx!.createGain();
    g.gain.value = v;
    g.connect(this.master);
    return g;
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!this.ctx) return;
    this.musicBus.gain.setTargetAtTime(on ? 0.22 : 0, this.ctx.currentTime, 0.2);
    this.ambBus.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.2);
  }

  setSfx(on: boolean): void {
    this.sfxOn = on;
    if (this.ctx) this.sfxBus.gain.setTargetAtTime(on ? 0.7 : 0, this.ctx.currentTime, 0.05);
  }

  // ---- primitives -----------------------------------------------------------
  private tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; slide?: number; delay?: number; attack?: number; out?: AudioNode } = {}): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + (opts.delay ?? 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opts.type ?? 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    const a = opts.attack ?? 0.008;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(opts.out ?? this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private burst(dur: number, freq: number, opts: { q?: number; gain?: number; type?: BiquadFilterType; delay?: number; slide?: number; out?: AudioNode } = {}): void {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime + (opts.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (opts.slide) f.frequency.exponentialRampToValueAtTime(opts.slide, t + dur);
    f.Q.value = opts.q ?? 1;
    const g = c.createGain();
    g.gain.setValueAtTime(opts.gain ?? 0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(opts.out ?? this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  play(s: Sfx): void {
    if (!this.ctx || !this.sfxOn) return;
    switch (s) {
      case 'pickup':
        this.tone(520, 0.12, { type: 'triangle', gain: 0.25, slide: 1040 });
        this.tone(1300, 0.15, { type: 'sine', gain: 0.12, delay: 0.06 });
        break;
      case 'deposit':
        [0, 4, 7, 12].forEach((n, i) => this.tone(523 * 2 ** (n / 12), 0.35, { type: 'triangle', gain: 0.18, delay: i * 0.07 }));
        break;
      case 'recycle':
        [7, 4, 0, 12].forEach((n, i) => this.tone(392 * 2 ** (n / 12), 0.25, { type: 'square', gain: 0.06, delay: i * 0.06 }));
        this.burst(0.2, 3000, { gain: 0.08, delay: 0.1 });
        break;
      case 'eat':
        for (let i = 0; i < 3; i++) this.burst(0.07, 900 + i * 200, { q: 3, gain: 0.35, delay: i * 0.11 });
        this.tone(300, 0.2, { type: 'sine', gain: 0.1, slide: 500, delay: 0.32 });
        break;
      case 'hurt':
        this.tone(320, 0.3, { type: 'sawtooth', gain: 0.16, slide: 120 });
        this.burst(0.2, 400, { gain: 0.35, type: 'lowpass' });
        break;
      case 'warn':
        this.tone(880, 0.12, { type: 'square', gain: 0.08 });
        this.tone(660, 0.16, { type: 'square', gain: 0.08, delay: 0.14 });
        break;
      case 'dive':
        this.tone(1400, 0.6, { type: 'sine', gain: 0.12, slide: 500 });
        this.burst(0.6, 2000, { gain: 0.08, slide: 600 });
        break;
      case 'croak':
        this.tone(140, 0.18, { type: 'sawtooth', gain: 0.12, slide: 90 });
        this.tone(150, 0.18, { type: 'sawtooth', gain: 0.1, slide: 100, delay: 0.2 });
        break;
      case 'ui':
        this.tone(740, 0.07, { type: 'triangle', gain: 0.15 });
        break;
      case 'error':
        this.tone(220, 0.15, { type: 'square', gain: 0.07 });
        this.tone(180, 0.2, { type: 'square', gain: 0.07, delay: 0.12 });
        break;
      case 'full':
        this.tone(400, 0.12, { type: 'triangle', gain: 0.12 });
        this.tone(330, 0.16, { type: 'triangle', gain: 0.12, delay: 0.1 });
        break;
      case 'levelup':
        [0, 4, 7, 11, 14].forEach((n, i) => this.tone(440 * 2 ** (n / 12), 0.5, { type: 'triangle', gain: 0.16, delay: i * 0.09 }));
        break;
      case 'upgrade':
        [0, 7, 12].forEach((n, i) => this.tone(587 * 2 ** (n / 12), 0.4, { type: 'sine', gain: 0.2, delay: i * 0.08 }));
        break;
      case 'complete':
        [0, 4, 7, 12, 7, 12, 16].forEach((n, i) => this.tone(392 * 2 ** (n / 12), 0.5, { type: 'triangle', gain: 0.16, delay: i * 0.12 }));
        break;
      case 'splash':
        this.burst(0.35, 1200, { gain: 0.3, slide: 400 });
        this.tone(600, 0.1, { gain: 0.1, slide: 1200, delay: 0.05 });
        break;
      case 'snip':
        this.burst(0.06, 5000, { q: 4, gain: 0.4 });
        this.tone(2400, 0.05, { type: 'square', gain: 0.05 });
        break;
      case 'spray':
        this.burst(0.8, 2500, { q: 0.6, gain: 0.25 });
        break;
      case 'hide':
        this.tone(500, 0.18, { type: 'sine', gain: 0.18, slide: 200 });
        break;
      case 'unhide':
        this.tone(220, 0.18, { type: 'sine', gain: 0.15, slide: 480 });
        break;
    }
  }

  /** Continuous quiet squelch tied to movement speed (0..1). */
  slime(amount: number): void {
    const c = this.ctx;
    if (!c) return;
    if (!this.slimeGain) {
      const src = c.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const lfo = c.createOscillator();
      const lfoG = c.createGain();
      lfo.frequency.value = 3.2;
      lfoG.gain.value = 160;
      lfo.connect(lfoG).connect(f.frequency);
      this.slimeGain = c.createGain();
      this.slimeGain.gain.value = 0;
      src.connect(f).connect(this.slimeGain).connect(this.sfxBus);
      src.start();
      lfo.start();
    }
    this.slimeGain.gain.setTargetAtTime(amount * 0.12, c.currentTime, 0.1);
  }

  // ---- ambience --------------------------------------------------------------
  startAmbience(opts: { water: boolean; birds: boolean; night?: boolean }): void {
    const c = this.ctx;
    if (!c) return;
    this.stopAmbience();
    // wind through grass: looping filtered noise with slow swells
    const src = c.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700;
    f.Q.value = 0.5;
    const g = c.createGain();
    g.gain.value = 0.05;
    const lfo = c.createOscillator();
    const lfoG = c.createGain();
    lfo.frequency.value = 0.08;
    lfoG.gain.value = 0.04;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(f).connect(g).connect(this.ambBus);
    src.start();
    lfo.start();
    this.ambNodes.push(src, lfo);

    if (opts.water) {
      const ws = c.createBufferSource();
      ws.buffer = this.noise;
      ws.loop = true;
      const wf = c.createBiquadFilter();
      wf.type = 'lowpass';
      wf.frequency.value = 500;
      const wg = c.createGain();
      wg.gain.value = 0.06;
      ws.connect(wf).connect(wg).connect(this.ambBus);
      ws.start();
      this.ambNodes.push(ws);
      this.every(900, 2500, () => this.tone(300 + Math.random() * 500, 0.12, { gain: 0.05, slide: 900 + Math.random() * 600, out: this.ambBus }));
    }
    if (opts.birds) {
      this.every(2500, 7000, () => this.birdSong());
    }
    if (opts.night) {
      this.every(400, 900, () => this.tone(4200 + Math.random() * 300, 0.04, { type: 'square', gain: 0.012, out: this.ambBus }));
    }
  }

  private birdSong(): void {
    const base = 2200 + Math.random() * 1600;
    const n = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < n; i++) {
      const f = base * (1 + (Math.random() - 0.5) * 0.3);
      this.tone(f, 0.09, { gain: 0.035, slide: f * (Math.random() < 0.5 ? 1.4 : 0.7), delay: i * 0.11, out: this.ambBus });
    }
  }

  private every(min: number, max: number, fn: () => void): void {
    const tick = () => {
      fn();
      this.timers.push(window.setTimeout(tick, min + Math.random() * (max - min)));
    };
    this.timers.push(window.setTimeout(tick, min + Math.random() * (max - min)));
  }

  stopAmbience(): void {
    for (const n of this.ambNodes) {
      try {
        (n as AudioScheduledSourceNode).stop();
      } catch {
        /* already stopped */
      }
    }
    this.ambNodes = [];
    this.timers.forEach((t) => clearTimeout(t));
    this.timers = [];
  }

  // ---- music ---------------------------------------------------------------
  /** Gentle generative music: soft pad chords + sparse pentatonic melody. */
  startMusic(root = 57): void {
    const c = this.ctx;
    if (!c || this.musicTimer) return;
    this.musicStep = 0;
    this.nextNoteTime = c.currentTime + 0.2;
    const beat = 0.5;
    const chords = [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [2, 5, 9]];
    const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
    this.musicTimer = window.setInterval(() => {
      while (this.nextNoteTime < c.currentTime + 0.3) {
        const step = this.musicStep;
        const t = this.nextNoteTime - c.currentTime;
        if (step % 8 === 0) {
          const ch = chords[(step / 8) % chords.length | 0];
          for (const n of ch) this.tone(mtof(root - 12 + n), beat * 8, { type: 'sine', gain: 0.05, attack: 1.2, delay: t, out: this.musicBus });
        }
        if (Math.random() < 0.42) {
          const deg = PENTA[Math.floor(Math.random() * PENTA.length)] + (Math.random() < 0.3 ? 12 : 0);
          this.tone(mtof(root + deg), beat * 2.2, { type: 'triangle', gain: 0.07, attack: 0.02, delay: t, out: this.musicBus });
        }
        this.nextNoteTime += beat;
        this.musicStep++;
      }
    }, 100);
  }

  stopMusic(): void {
    if (this.musicTimer) clearInterval(this.musicTimer);
    this.musicTimer = undefined;
  }
}

export const Audio = new AudioEngine();

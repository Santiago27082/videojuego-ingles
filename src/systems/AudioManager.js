/**
 * Sonido sintetizado con Web Audio (provisional: no hay archivos de audio en el proyecto).
 * Para usar sonidos reales, coloca archivos en /public/audio y sustituye los métodos de aquí.
 */
export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.volume = 0.6;
    this.last = {};
    this.noiseBuf = null;
  }

  init() {
    if (this.ctx) { this.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.startAmbience();
    } catch (e) {
      console.warn('Audio no disponible:', e);
      this.ctx = null;
    }
  }

  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  _ok(name, minMs) {
    const t = performance.now();
    if (t - (this.last[name] || 0) < minMs) return false;
    this.last[name] = t;
    return true;
  }

  _noise({ dur = 0.15, type = 'bandpass', f0 = 1000, f1 = null, q = 1, gain = 0.4, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.05);
  }

  _tone({ type = 'sine', f0 = 200, f1 = null, dur = 0.2, gain = 0.3, delay = 0 }) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  swing(heavy = false) {
    if (!this._ok('swing', 90)) return;
    this._noise({ dur: heavy ? 0.32 : 0.2, f0: heavy ? 500 : 900, f1: heavy ? 2200 : 3500, q: 1.2, gain: heavy ? 0.35 : 0.25 });
  }
  hit(heavy = false) {
    if (!this._ok('hit', 60)) return;
    this._noise({ dur: 0.14, type: 'lowpass', f0: 2500, f1: 300, gain: 0.55 });
    this._tone({ type: 'sine', f0: heavy ? 140 : 190, f1: 45, dur: 0.18, gain: 0.5 });
    this._noise({ dur: 0.08, type: 'highpass', f0: 3500, gain: 0.18 });
  }
  block() {
    if (!this._ok('block', 80)) return;
    this._tone({ type: 'square', f0: 820, f1: 790, dur: 0.12, gain: 0.08 });
    this._tone({ type: 'square', f0: 1320, f1: 1280, dur: 0.1, gain: 0.06 });
    this._noise({ dur: 0.1, type: 'highpass', f0: 2500, gain: 0.3 });
  }
  parry() {
    if (!this._ok('parry', 120)) return;
    this.block();
    this._tone({ type: 'triangle', f0: 1760, f1: 2400, dur: 0.25, gain: 0.12, delay: 0.02 });
  }
  hurt() {
    if (!this._ok('hurt', 150)) return;
    this._tone({ type: 'sawtooth', f0: 220, f1: 90, dur: 0.25, gain: 0.18 });
    this._noise({ dur: 0.12, type: 'lowpass', f0: 900, gain: 0.3 });
  }
  roll() {
    if (!this._ok('roll', 200)) return;
    this._noise({ dur: 0.35, type: 'lowpass', f0: 700, f1: 200, gain: 0.25 });
  }
  step() {
    if (!this._ok('step', 140)) return;
    this._noise({ dur: 0.07, type: 'lowpass', f0: 500 + Math.random() * 200, gain: 0.12 });
  }
  levelUp() {
    [523, 659, 784, 1046].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.35, gain: 0.14, delay: i * 0.1 }));
  }
  death() {
    this._tone({ type: 'sawtooth', f0: 180, f1: 40, dur: 1.2, gain: 0.25 });
  }
  victory() {
    [392, 494, 587, 784].forEach((f, i) => this._tone({ type: 'triangle', f0: f, dur: 0.6, gain: 0.15, delay: i * 0.18 }));
  }

  /** Viento ambiental continuo + zumbido grave. */
  startAmbience() {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ctx.createGain();
    g.gain.value = 0.05;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lg = this.ctx.createGain();
    lg.gain.value = 0.03;
    lfo.connect(lg); lg.connect(g.gain);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(); lfo.start();
  }
}

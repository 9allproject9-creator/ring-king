// 효과음: 파일 없이 Web Audio로 직접 합성한다. 첫 클릭(사용자 동작) 이후에만 소리를 낸다.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.sfxVol = 0.8;
    this.musicVol = 0.5;
    this.started = false;
    this.crowdGain = null;
    this.music = null;
  }

  // 사용자 동작(클릭·키) 안에서 호출
  unlock() {
    if (this.started) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
    } catch (e) {
      return;
    }
    this.started = true;
    const c = this.ctx;
    this.master = c.createGain();
    this.master.gain.value = 0.9;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(c.destination);
    this.sfxBus = c.createGain();
    this.sfxBus.gain.value = this.sfxVol;
    this.sfxBus.connect(this.master);
    this.musicBus = c.createGain();
    this.musicBus.gain.value = this.musicVol;
    this.musicBus.connect(this.master);
    // 노이즈 버퍼
    const len = c.sampleRate;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.setupCrowd();
    if (this.onUnlock) this.onUnlock();
  }

  setVolumes(sfx, music) {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (!this.ctx) return;
    this.sfxBus.gain.setTargetAtTime(sfx, this.ctx.currentTime, 0.05);
    this.musicBus.gain.setTargetAtTime(music, this.ctx.currentTime, 0.05);
  }

  get now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  tone({ type = 'sine', f0 = 440, f1 = f0, dur = 0.2, gain = 0.3, attack = 0.005, delay = 0, bus, detune = 0 }) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus || this.sfxBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noiseHit({ dur = 0.2, type = 'lowpass', f0 = 1200, f1 = f0, q = 1, gain = 0.3, attack = 0.003, delay = 0, bus }) {
    const c = this.ctx;
    const t = c.currentTime + delay;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = type;
    fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl).connect(g).connect(bus || this.sfxBus);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.05);
  }

  setupCrowd() {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    s.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    this.crowdGain = c.createGain();
    this.crowdGain.gain.value = 0;
    this.crowdFilter = bp;
    s.connect(bp).connect(lp).connect(this.crowdGain).connect(this.sfxBus);
    s.start();
    this.crowdBase = 0;
  }

  // 관중 소리 크기: 흥분 0~1, 지루하면 웅성웅성(낮은 소리)
  crowdLevel(excite, boring) {
    if (!this.ctx || !this.crowdGain) return;
    const target = this.crowdOn ? (boring ? 0.05 : 0.04 + excite * 0.16) : 0;
    this.crowdGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
    this.crowdFilter.frequency.setTargetAtTime(boring ? 350 : 600 + excite * 600, this.ctx.currentTime, 0.4);
  }

  setCrowd(on) {
    this.crowdOn = on;
    if (!on && this.crowdGain && this.ctx) this.crowdGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.2);
  }

  sfx(name, p = {}) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    switch (name) {
      case 'whoosh': {
        // 펀치마다 다른 바람 소리: 잽은 짧고 날카롭게, 스트레이트는 묵직하게, 어퍼는 아래에서 위로 솟구치게
        if (p.punch === 'jab') {
          this.noiseHit({ dur: 0.075, type: 'bandpass', f0: 1800, f1: 4200, q: 1.6, gain: 0.16 });
        } else if (p.punch === 'straight') {
          this.noiseHit({ dur: 0.15, type: 'bandpass', f0: 800, f1: 3000, q: 1.1, gain: 0.19 });
          this.tone({ type: 'sine', f0: 120, f1: 70, dur: 0.1, gain: 0.06 });
        } else if (p.punch === 'upper') {
          this.noiseHit({ dur: 0.24, type: 'bandpass', f0: 350, f1: 2600, q: 1.3, gain: 0.22 });
          this.tone({ type: 'sine', f0: 70, f1: 160, dur: 0.2, gain: 0.08 });
        } else {
          const big = p.punch === 'special' || p.punch === 'opp';
          this.noiseHit({ dur: big ? 0.2 : 0.13, type: 'bandpass', f0: big ? 600 : 1400, f1: big ? 2400 : 3600, q: 1.2, gain: big ? 0.22 : 0.15 });
        }
        break;
      }
      case 'swish':
        this.noiseHit({ dur: 0.16, type: 'bandpass', f0: 2500, f1: 700, q: 1.5, gain: 0.12 });
        break;
      case 'hit': {
        const m = { jab: 0.7, straight: 1, upper: 1.3, special: 1.8 }[p.punch] || 1;
        const counter = p.kind === 'counter' || p.kind === 'interrupt';
        this.tone({ type: 'sine', f0: 170 * (counter ? 1.1 : 1), f1: 45, dur: 0.18 * m, gain: 0.55 * Math.min(1.3, m) });
        this.noiseHit({ dur: 0.07 + 0.04 * m, type: 'lowpass', f0: 3000, f1: 400, gain: 0.45 });
        this.tone({ type: 'triangle', f0: 90, f1: 40, dur: 0.12 * m, gain: 0.3 });
        // 펀치별 추가 층: 잽은 찰싹, 스트레이트는 퍽, 어퍼는 쿵
        if (p.punch === 'jab') this.noiseHit({ dur: 0.04, type: 'highpass', f0: 4000, f1: 2500, gain: 0.22 });
        if (p.punch === 'straight') this.tone({ type: 'sine', f0: 110, f1: 50, dur: 0.16, gain: 0.25, delay: 0.01 });
        if (p.punch === 'upper') { this.tone({ type: 'sine', f0: 75, f1: 32, dur: 0.32, gain: 0.4 }); this.noiseHit({ dur: 0.18, type: 'lowpass', f0: 900, f1: 120, gain: 0.3, delay: 0.015 }); }
        if (counter) {
          this.tone({ type: 'square', f0: 880, f1: 880, dur: 0.08, gain: 0.08, delay: 0.02 });
          this.tone({ type: 'square', f0: 1320, f1: 1320, dur: 0.12, gain: 0.08, delay: 0.09 });
        }
        if (p.kind === 'special') {
          this.noiseHit({ dur: 0.6, type: 'lowpass', f0: 1500, f1: 60, gain: 0.5, delay: 0.02 });
          this.tone({ type: 'sawtooth', f0: 110, f1: 30, dur: 0.6, gain: 0.25 });
        }
        break;
      }
      case 'block':
        this.tone({ type: 'square', f0: p.heavy ? 160 : 240, f1: p.heavy ? 90 : 140, dur: 0.07, gain: 0.12 });
        this.noiseHit({ dur: 0.06, type: 'bandpass', f0: 1800, q: 2, gain: 0.25 });
        break;
      case 'miss':
        this.noiseHit({ dur: 0.18, type: 'bandpass', f0: 900, f1: 300, q: 1, gain: 0.1 });
        break;
      case 'hurt':
        this.tone({ type: 'sine', f0: 140, f1: 40, dur: 0.25, gain: 0.6 });
        this.noiseHit({ dur: 0.12, type: 'lowpass', f0: 2000, f1: 300, gain: 0.5 });
        break;
      case 'guardBreak':
        this.noiseHit({ dur: 0.35, type: 'highpass', f0: 3000, f1: 800, gain: 0.3 });
        this.tone({ type: 'square', f0: 400, f1: 80, dur: 0.3, gain: 0.12 });
        break;
      case 'dodge':
        this.noiseHit({ dur: 0.22, type: 'bandpass', f0: 3200, f1: 600, q: 2, gain: 0.18 });
        this.tone({ type: 'sine', f0: 660, f1: 990, dur: 0.12, gain: 0.08, delay: 0.05 });
        break;
      case 'star':
        [988, 1319, 1760].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.18, gain: 0.14, delay: i * 0.06 }));
        break;
      case 'charge':
        this.tone({ type: 'sawtooth', f0: 200, f1: 1200, dur: 0.3, gain: 0.12 });
        this.tone({ type: 'sine', f0: 400, f1: 2400, dur: 0.3, gain: 0.1 });
        break;
      case 'down':
        this.tone({ type: 'sine', f0: 90, f1: 30, dur: 0.8, gain: 0.7 });
        this.noiseHit({ dur: 0.5, type: 'lowpass', f0: 800, f1: 60, gain: 0.5 });
        break;
      case 'count':
        this.tone({ type: 'square', f0: p.n >= 8 ? 1046 : 880, dur: 0.16, gain: 0.12 });
        break;
      case 'bell': {
        const times = p.start ? 1 : p.end ? 3 : 2;
        for (let i = 0; i < times; i++) {
          const d = i * 0.28;
          [1, 2.76, 5.4, 8.9].forEach((k, j) => this.tone({ type: 'sine', f0: 620 * k, dur: 1.4 - j * 0.25, gain: 0.18 / (j + 1), delay: d }));
        }
        break;
      }
      case 'phase':
        this.tone({ type: 'sawtooth', f0: 80, f1: 160, dur: 0.9, gain: 0.25 });
        this.noiseHit({ dur: 0.9, type: 'lowpass', f0: 300, f1: 2000, gain: 0.3 });
        break;
      case 'tick':
        this.tone({ type: 'square', f0: 1200, dur: 0.03, gain: 0.05 });
        break;
      case 'winded':
        this.noiseHit({ dur: 0.5, type: 'bandpass', f0: 900, f1: 500, q: 3, gain: 0.12 });
        break;
      case 'tell':
        // 숨 들이쉬는 소리 (진짜 공격에만)
        this.noiseHit({ dur: Math.min(0.5, (p.ms || 600) / 1000 * 0.6), type: 'bandpass', f0: 500, f1: 1800, q: 2.5, gain: 0.07, attack: 0.1 });
        break;
      case 'crowd':
        this.noiseHit({ dur: 1.4 * (p.cheer || 0.5) + 0.4, type: 'bandpass', f0: 900, f1: 600, q: 0.5, gain: 0.25 * (p.cheer || 0.5), attack: 0.15 });
        break;
      case 'coin':
        this.tone({ type: 'square', f0: 988, dur: 0.07, gain: 0.08 });
        this.tone({ type: 'square', f0: 1319, dur: 0.18, gain: 0.08, delay: 0.07 });
        break;
      case 'ui':
        this.tone({ type: 'triangle', f0: 660, dur: 0.06, gain: 0.1 });
        break;
      case 'select':
        this.tone({ type: 'triangle', f0: 523, dur: 0.07, gain: 0.12 });
        this.tone({ type: 'triangle', f0: 784, dur: 0.12, gain: 0.12, delay: 0.06 });
        break;
      case 'buy':
        [523, 659, 784, 1046].forEach((f, i) => this.tone({ type: 'square', f0: f, dur: 0.1, gain: 0.07, delay: i * 0.06 }));
        break;
      case 'error':
        this.tone({ type: 'square', f0: 200, f1: 150, dur: 0.18, gain: 0.08 });
        break;
      case 'achieve':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone({ type: 'triangle', f0: f, dur: 0.25, gain: 0.12, delay: i * 0.08 }));
        break;
      case 'mitt':
        this.tone({ type: 'sine', f0: 220 * (p.good ? 1.3 : 1), f1: 70, dur: 0.12, gain: 0.45 });
        this.noiseHit({ dur: 0.05, type: 'highpass', f0: 2500, gain: 0.3 });
        break;
      case 'jump':
        this.tone({ type: 'sine', f0: p.good ? 700 : 300, f1: p.good ? 900 : 200, dur: 0.08, gain: 0.1 });
        this.noiseHit({ dur: 0.05, type: 'highpass', f0: 4000, gain: 0.12 });
        break;
      case 'type':
        this.tone({ type: 'square', f0: 300 + Math.random() * 200, dur: 0.025, gain: 0.03 });
        break;
      default:
        break;
    }
  }
}

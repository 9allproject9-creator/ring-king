// 배경 음악: Web Audio로 만든 간단한 순서기(시퀀서). 음원 파일 없음.
// 곡마다 빠르기·음계·화음 진행·북 패턴·멜로디 모양이 달라서 서로 다르게 들린다.

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];

// 드럼 패턴 (16칸): k=킥, s=스네어, h=하이햇
const DRUMS = {
  light: { k: 'x.......x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  rock: { k: 'x.....x.x.......', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
  drive: { k: 'x...x...x...x...', s: '....x.......x..x', h: '.x.x.x.x.x.x.x.x' },
  funk: { k: 'x..x..x...x..x..', s: '....x..x....x...', h: 'x.xxx.xxx.xxx.xx' },
  march: { k: 'x...x...x...x...', s: '..x...x...x..xxx', h: '................' },
  soft: { k: 'x...............', s: '................', h: '..x...x...x...x.' },
  epic: { k: 'x..x..x.x..x..x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  none: { k: '................', s: '................', h: '................' },
};

export const TRACKS = {
  menu: { bpm: 104, root: 60, scale: MAJOR, chords: [0, 4, 5, 3], drums: 'light', lead: 'triangle', melody: [0, 2, 4, 2, 5, 4, 2, 1], density: 0.6, pad: true },
  story: { bpm: 84, root: 57, scale: MAJOR, chords: [0, 5, 3, 4], drums: 'soft', lead: 'triangle', melody: [4, 2, 0, 2, 4, 4, 4, -1], density: 0.4, pad: true },
  training: { bpm: 118, root: 55, scale: MINOR, chords: [0, 3, 4, 3], drums: 'funk', lead: 'square', melody: [0, 0, 3, 4, 3, 0, 6, 4], density: 0.55, bassFunk: true },
  intro: { bpm: 110, root: 60, scale: MAJOR, chords: [0, 3, 4, 0], drums: 'march', lead: 'square', melody: [0, 2, 4, 7, 4, 2, 4, -1], density: 0.7 },
  // 입장 음악(상점)
  march: { bpm: 112, root: 60, scale: MAJOR, chords: [0, 3, 4, 0], drums: 'march', lead: 'square', melody: [0, 2, 4, 7, 4, 2, 4, -1], density: 0.7 },
  rock: { bpm: 142, root: 52, scale: MINOR, chords: [0, 5, 6, 4], drums: 'rock', lead: 'sawtooth', melody: [0, 3, 4, 6, 4, 3, 0, -1], density: 0.75, power: true },
  funk: { bpm: 112, root: 53, scale: MINOR, chords: [0, 3, 0, 4], drums: 'funk', lead: 'square', melody: [0, -1, 3, 4, -1, 6, 4, 3], density: 0.6, bassFunk: true },
  epic: { bpm: 92, root: 50, scale: MINOR, chords: [0, 5, 2, 6], drums: 'epic', lead: 'sawtooth', melody: [0, 4, 7, 6, 4, 3, 4, -1], density: 0.6, pad: true, power: true },
  // 경기 (대회 단계별)
  fight_gym: { bpm: 128, root: 55, scale: MINOR, chords: [0, 5, 3, 4], drums: 'rock', lead: 'square', melody: [0, 2, 3, 4, 3, 2, 0, -1], density: 0.55 },
  fight_national: { bpm: 136, root: 57, scale: MINOR, chords: [0, 3, 5, 4], drums: 'drive', lead: 'sawtooth', melody: [0, 4, 3, 2, 3, 4, 6, 4], density: 0.6 },
  fight_world: { bpm: 142, root: 52, scale: MINOR, chords: [0, 6, 5, 4], drums: 'drive', lead: 'square', melody: [4, 3, 4, 6, 7, 6, 4, 3], density: 0.65, pad: true },
  fight_stadium: { bpm: 148, root: 50, scale: MINOR, chords: [0, 5, 6, 4], drums: 'epic', lead: 'sawtooth', melody: [0, 4, 7, 4, 6, 4, 3, 4], density: 0.7, pad: true, power: true },
  // 보스 페이즈
  rage: { bpm: 162, root: 52, scale: MINOR, chords: [0, 1, 0, 6], drums: 'rock', lead: 'sawtooth', melody: [0, 1, 0, 1, 3, 1, 0, -1], density: 0.8, power: true },
  rival: { bpm: 152, root: 54, scale: MINOR, chords: [0, 5, 3, 6], drums: 'drive', lead: 'square', melody: [0, 4, 6, 7, 6, 4, 3, 4], density: 0.75, pad: true },
  boss: { bpm: 146, root: 50, scale: MINOR, chords: [0, 6, 5, 6], drums: 'epic', lead: 'sawtooth', melody: [0, 3, 4, 3, 7, 6, 4, 3], density: 0.7, pad: true, power: true },
  final: { bpm: 168, root: 50, scale: MINOR, chords: [0, 5, 6, 4], drums: 'epic', lead: 'sawtooth', melody: [7, 6, 4, 6, 7, 9, 7, 4], density: 0.85, pad: true, power: true, choir: true },
  victory: { bpm: 120, root: 60, scale: MAJOR, chords: [0, 3, 4, 0], drums: 'light', lead: 'square', melody: [0, 2, 4, 7, 9, 7, 11, 14], density: 0.8, pad: true },
  defeat: { bpm: 72, root: 57, scale: MINOR, chords: [0, 5, 3, 4], drums: 'none', lead: 'triangle', melody: [4, 3, 2, 0, -1, -1, -1, -1], density: 0.4, pad: true },
};

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.track = null;
    this.name = null;
    this.intensity = 0;
    this.timer = null;
    this.step = 0;
    this.nextTime = 0;
    this.wanted = null;
    audio.onUnlock = () => { if (this.wanted) this.play(this.wanted.name, this.wanted.opts); };
  }

  play(name, opts = {}) {
    const key = name === 'intro' && opts.track ? opts.track : name;
    this.wanted = { name, opts };
    if (!this.audio.ctx || this.audio.ctx.state !== 'running') return;
    if (this.name === key && this.timer) return;
    this.stop(true);
    this.name = key;
    this.track = TRACKS[key] || TRACKS.menu;
    this.step = 0;
    this.bar = 0;
    this.nextTime = this.audio.now + 0.08;
    this.gain = this.audio.ctx.createGain();
    this.gain.gain.setValueAtTime(0.0001, this.audio.now);
    this.gain.gain.exponentialRampToValueAtTime(0.9, this.audio.now + 0.4);
    this.gain.connect(this.audio.musicBus);
    this.filter = this.audio.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 5000;
    this.filter.connect(this.gain);
    this.timer = setInterval(() => this.schedule(), 25);
    this.oneShot = !!opts.oneShot;
  }

  stop(fast = false) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (this.gain && this.audio.ctx) {
      const g = this.gain;
      g.gain.cancelScheduledValues(this.audio.now);
      g.gain.setValueAtTime(g.gain.value, this.audio.now);
      g.gain.exponentialRampToValueAtTime(0.0001, this.audio.now + (fast ? 0.3 : 0.8));
      setTimeout(() => g.disconnect(), 1200);
    }
    this.gain = null;
    this.name = null;
  }

  // 0~1: 체력이 낮을수록 긴박하게
  setIntensity(v) {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  preview(track) {
    this.audio.unlock();
    this.play(track, {});
    clearTimeout(this.previewT);
    this.previewT = setTimeout(() => this.play('menu'), 5000);
  }

  schedule() {
    const ctx = this.audio.ctx;
    if (!ctx || !this.track) return;
    const t = this.track;
    const bpm = t.bpm * (1 + this.intensity * 0.1);
    const stepDur = 60 / bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
      if (this.step % 16 === 0) this.bar++;
      if (this.oneShot && this.bar >= 4) { this.stop(); return; }
    }
    if (this.filter) this.filter.frequency.setTargetAtTime(3200 + this.intensity * 4000, ctx.currentTime, 0.3);
  }

  playStep(step, time, dur) {
    const t = this.track;
    const s = step % 16;
    const bar = Math.floor(step / 16) % t.chords.length;
    const chordDeg = t.chords[bar];
    const d = DRUMS[t.drums] || DRUMS.light;
    if (d.k[s] === 'x') this.kick(time);
    if (d.s[s] === 'x') this.snare(time);
    if (d.h[s] === 'x' || (this.intensity > 0.5 && s % 2 === 1)) this.hat(time, s % 4 === 0 ? 0.05 : 0.03);
    // 베이스: 화음 뿌리음
    const rootNote = t.root - 12 + this.degree(t, chordDeg);
    const bassHit = t.bassFunk ? [0, 3, 6, 8, 10, 14].includes(s) : s % 4 === 0 || s === 14;
    if (bassHit) this.tone(NOTE(rootNote + (t.bassFunk && s === 10 ? 12 : 0)), time, dur * (t.bassFunk ? 1.5 : 3), 'square', 0.11, 600);
    // 패드: 마디 처음에 화음
    if (t.pad && s === 0) {
      for (const k of [0, 2, 4]) this.tone(NOTE(t.root + this.degree(t, chordDeg + k)), time, dur * 15, 'sawtooth', 0.025, 1800, 0.25);
    }
    if (t.choir && s === 0) this.tone(NOTE(t.root + 12 + this.degree(t, chordDeg + 4)), time, dur * 15, 'sine', 0.05, 3000, 0.4);
    // 파워 코드
    if (t.power && (s === 0 || s === 6 || s === 8)) {
      for (const k of [0, 7]) this.tone(NOTE(t.root - 12 + this.degree(t, chordDeg) + k), time, dur * 2, 'sawtooth', 0.04, 1400);
    }
    // 멜로디: 8분음표마다
    if (s % 2 === 0) {
      const i = (s / 2 + bar * 3) % t.melody.length;
      const m = t.melody[i];
      if (m >= 0 && ((s / 2 + bar) % 8 < t.density * 8 || s === 0)) {
        this.tone(NOTE(t.root + 12 + this.degree(t, m + (bar === 3 && s > 8 ? 1 : 0))), time, dur * 1.8, t.lead, t.lead === 'sawtooth' ? 0.045 : 0.06, 3500);
      }
    }
  }

  degree(t, d) {
    const n = t.scale.length;
    const o = Math.floor(d / n);
    return t.scale[((d % n) + n) % n] + o * 12;
  }

  tone(freq, time, dur, type, gain, cutoff = 4000, attack = 0.005) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = type;
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(gain, time + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.max(attack + 0.02, dur));
    o.connect(f).connect(g).connect(this.filter);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  kick(time) {
    const ctx = this.audio.ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, time);
    o.frequency.exponentialRampToValueAtTime(40, time + 0.12);
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    o.connect(g).connect(this.filter);
    o.start(time);
    o.stop(time + 0.2);
  }

  noise(time, dur, type, freq, gain) {
    const ctx = this.audio.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.audio.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, time);
    g.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    s.connect(f).connect(g).connect(this.filter);
    s.start(time, Math.random() * 0.5);
    s.stop(time + dur + 0.02);
  }

  snare(time) {
    this.noise(time, 0.14, 'bandpass', 1800, 0.22);
    this.tone(190, time, 0.08, 'triangle', 0.08, 2000);
  }

  hat(time, gain) {
    this.noise(time, 0.04, 'highpass', 7000, gain);
  }
}

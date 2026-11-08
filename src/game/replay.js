// 결정적 리플레이: 시드 + 프레임별 입력(비트) + 라운드 넘김 표시만 저장하면 경기를 그대로 다시 만든다.
import { Fight } from './fight.js';

export class Recorder {
  constructor(fight) {
    this.seed = fight.seed;
    this.inputs = [];
    this.marks = [];
  }
  push(input) { this.inputs.push(input); }
  mark(type) { this.marks.push({ frame: this.inputs.length, type }); }
}

export function packReplay(fight, inputs, marks, extra = {}) {
  return {
    v: 1,
    seed: fight.seed,
    opponentId: fight.oppData.id,
    difficulty: fight.difficulty,
    variant: fight.variant,
    rounds: fight.maxRounds,
    playerHp: extra.playerHp,
    inputs: compress(inputs),
    marks,
    result: fight.result ? { winner: fight.result.winner, method: fight.result.method } : null,
  };
}

// 같은 입력이 이어지는 구간을 [값, 개수]로 줄인다 (저장 용량 절약)
export function compress(inputs) {
  if (!Array.isArray(inputs) || (inputs.length && Array.isArray(inputs[0]))) return inputs;
  const out = [];
  for (const v of inputs) {
    const last = out[out.length - 1];
    if (last && last[0] === v) last[1]++;
    else out.push([v, 1]);
  }
  return out;
}

export function expand(packed) {
  if (!packed.length || !Array.isArray(packed[0])) return packed;
  const out = [];
  for (const [v, n] of packed) for (let i = 0; i < n; i++) out.push(v);
  return out;
}

export class ReplayPlayer {
  constructor(replay, opponentData) {
    this.replay = replay;
    this.inputs = expand(replay.inputs);
    this.marks = replay.marks || [];
    this.fight = new Fight({
      opponent: opponentData,
      seed: replay.seed,
      difficulty: replay.difficulty,
      variant: replay.variant,
      rounds: replay.rounds,
      playerHp: replay.playerHp,
    });
    this.i = 0;
    this.markI = 0;
  }

  get done() {
    return this.i >= this.inputs.length || this.fight.over;
  }

  stepFrame() {
    const f = this.fight;
    while (this.markI < this.marks.length && this.marks[this.markI].frame <= this.i) {
      if (this.marks[this.markI].type === 'nextRound' && f.phase === 'between') f.startNextRound();
      this.markI++;
    }
    if (f.phase === 'between') f.startNextRound();
    if (this.done) return false;
    f.step(this.inputs[this.i++]);
    return true;
  }

  // 화면 없이 빨리 감기
  skipTo(frame) {
    while (this.i < frame && !this.done) this.stepFrame();
  }
}

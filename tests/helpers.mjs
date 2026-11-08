import { Fight } from '../src/game/fight.js';
import { IN } from '../src/game/inputBits.js';

// 테스트용 상대: 행동을 직접 조종하기 쉽게 단순하게
export const TEST_OPP = {
  id: 'test', order: 0, name: '테스트', nick: '허수아비',
  look: { build: { w: 1, h: 1 }, skin: '#e0b090', hair: { style: 'buzz', color: '#222' }, trunks: '#333', gloves: '#c33' },
  stats: { maxHp: 100, idleBlock: 0, rest: [99999, 99999], restAfterHurt: [99999, 99999], maxHitsInRow: 99, getUp: { chance: [1, 1, 1], countAt: [3, 3], heal: [0.5, 0.5, 0.5] } },
  attacks: {
    hookL: { name: '훅', anim: 'hookL', tell: 800, active: 100, recovery: 400, damage: 10, avoid: ['L'], whiffMs: 700, counter: { punch: 'jab' } },
    body: { name: '몸통', anim: 'bodyL', tell: 800, active: 100, recovery: 400, damage: 8, avoid: [], whiffMs: 700 },
  },
  phases: [
    { hpBelow: 1, patterns: [{ seq: ['hookL'], w: 1 }] },
    { hpBelow: 0.5, patterns: [{ seq: ['hookL', 'hookL'], w: 1 }], tellScale: 0.8 },
  ],
};

export function makeFight(opts = {}) {
  return new Fight({ opponent: opts.opponent || TEST_OPP, seed: opts.seed || 1, difficulty: opts.difficulty || 'normal', ...opts });
}

export function toFight(f) {
  let n = 0;
  while (f.phase !== 'fight' && n++ < 1000) f.step(0);
  // 상대를 가만히 서 있게
  f.opp.enter('idle', 1e9);
  f.opp.guardUp = false;
  f.opp.guardTimer = 1e9;
  return f;
}

export function steps(f, n, input = 0) {
  for (let i = 0; i < n; i++) f.step(i === 0 ? input : input & IN.GUARD);
}

export function runUntil(f, pred, input = () => 0, max = 60 * 60) {
  for (let i = 0; i < max; i++) {
    if (pred(f)) return true;
    f.step(input(f, i));
  }
  return pred(f);
}

export function collect(f, n, inputFn = () => 0) {
  const ev = [];
  for (let i = 0; i < n; i++) {
    f.step(inputFn(f, i));
    ev.push(...f.events.map((e) => ({ ...e })));
  }
  return ev;
}

// 상대가 공격을 시작하게 만든다
export function forceAttack(f, id = 'hookL', fake = false) {
  f.opp.startSentence(f, { seq: [(fake ? '~' : '') + id] });
}

export { IN };

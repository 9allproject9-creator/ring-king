// 균형 검사용 봇. 화면이 보는 것과 같은 정보(상대 상태·텔·공격 종류)만 읽는다.
import { IN } from '../src/game/inputBits.js';
import { createRng } from '../src/game/rng.js';
import { CONFIG } from '../src/config.js';

const DODGE_BIT = { L: IN.DODGE_L, R: IN.DODGE_R, duck: IN.DUCK };
const OPEN = new Set(['whiff', 'shoved', 'counterStun', 'tired', 'taunt', 'guardBroken']);
const SOFT_OPEN = new Set(['recover', 'hurt']);
const MASH = [IN.JAB, IN.STRAIGHT, IN.UPPER];

function mash(f, i, every = 4) {
  return i % every === 0 ? MASH[(i / every) % 3 | 0] : 0;
}

// 완벽 봇: 텔을 정확히 읽고 가장 좋은 순간에 피한 뒤 반격
export function perfectBot(seed = 1) {
  let i = 0;
  let combo = 0;
  return (f) => {
    i++;
    const p = f.player;
    const o = f.opp;
    if (f.phase === 'pdown' || p.state === 'clinched') return mash(f, i, 3);
    if (f.phase !== 'fight') return 0;
    if (o.state === 'tell' && !o.fake) {
      const rem = o.dur - o.t;
      if (o.atk.avoid.length === 0) return rem < 400 ? IN.GUARD : 0;
      if (rem <= 150 && rem > 90 && p.actionable) return DODGE_BIT[o.atk.avoid[0]];
      return 0;
    }
    if (o.state === 'tell' && o.fake) return 0;
    if (!p.actionable) return 0;
    if (OPEN.has(o.state)) {
      const rem = o.dur - o.t;
      if (p.stars >= 2 && rem > 420 && o.staggerFresh === false) return IN.SPECIAL;
      if (rem < 180) return 0;
      combo = (combo + 1) % 3;
      return [IN.JAB, IN.STRAIGHT, IN.UPPER][combo];
    }
    if (SOFT_OPEN.has(o.state) && o.dur - o.t > 200) {
      combo = (combo + 1) % 2;
      return combo ? IN.JAB : IN.STRAIGHT;
    }
    return 0;
  };
}

// 버튼 연타 봇: 아무 생각 없이 공격만
export function masherBot(seed = 1) {
  let i = 0;
  return (f) => {
    i++;
    const p = f.player;
    if (f.phase === 'pdown' || p.state === 'clinched') return mash(f, i, 3);
    if (f.phase !== 'fight') return 0;
    if (i % 3 === 0) return i % 2 ? IN.JAB : IN.STRAIGHT;
    return 0;
  };
}

// 보통 봇: 반응 250~400ms, 가끔 실수, 페인트는 60%만 알아챔
export function normalBot(seed = 1, skill = {}) {
  const rng = createRng(seed * 7919 + 13);
  const s = { react: [250, 400], wrongDir: 0.1, timingErr: 110, feintRead: 0.6, guardRead: 0.8, attackIdle: 0.25, ...skill };
  let i = 0;
  let plan = null; // { tellAt, pressAt, bit, guard }
  let lastTell = -1;
  let nextAttackAt = 0;
  return (f) => {
    i++;
    const p = f.player;
    const o = f.opp;
    const now = f.clock;
    if (f.phase === 'pdown' || p.state === 'clinched') return mash(f, i, 4);
    if (f.phase !== 'fight') return 0;
    if (o.state === 'tell') {
      if (o.tellStartAt !== lastTell) {
        lastTell = o.tellStartAt;
        const react = rng.range(s.react[0], s.react[1]);
        const hitAt = o.tellStartAt + o.dur;
        const fooled = o.fake && rng() > s.feintRead;
        if (o.fake && !fooled) plan = null;
        else if (o.atk.avoid.length === 0) {
          plan = rng() < s.guardRead ? { guard: true, from: o.tellStartAt + react } : null;
        } else {
          let dir = o.atk.avoid[0];
          if (rng() < s.wrongDir) dir = rng.pick(['L', 'R', 'duck'].filter((d) => !o.atk.avoid.includes(d)));
          // 사람은 맞을 때쯤을 노려 누르지만 오차가 있다
          const ideal = hitAt - rng.range(110, 230) + rng.range(-s.timingErr, s.timingErr);
          plan = { bit: DODGE_BIT[dir], pressAt: Math.max(o.tellStartAt + react, ideal) };
        }
      }
      if (plan && plan.guard && now >= plan.from) return IN.GUARD;
      if (plan && plan.bit && now >= plan.pressAt && p.actionable) {
        const b = plan.bit;
        plan.bit = 0;
        return b;
      }
      return 0;
    }
    plan = null;
    if (!p.actionable || now < nextAttackAt) return 0;
    const open = OPEN.has(o.state) || (SOFT_OPEN.has(o.state) && o.dur - o.t > 250);
    if (open) {
      nextAttackAt = now + rng.range(60, 200);
      if (p.stars >= 2 && OPEN.has(o.state) && o.dur - o.t > 450 && rng() < 0.7) return IN.SPECIAL;
      return rng.pick([IN.JAB, IN.STRAIGHT, IN.STRAIGHT, IN.UPPER]);
    }
    if (o.state === 'idle' && rng() < s.attackIdle * 0.05) {
      nextAttackAt = now + rng.range(300, 600);
      return rng.pick([IN.JAB, IN.STRAIGHT]);
    }
    return 0;
  };
}

export const BOTS = { perfect: perfectBot, masher: masherBot, normal: normalBot };
export { CONFIG };

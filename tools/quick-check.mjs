// 개발 중 빠른 점검: 가만히 있는 봇과 간단한 회피 봇으로 경기 한 판씩.
import { Fight } from '../src/game/fight.js';
import { OPPONENTS } from '../src/data/opponents/index.js';
import { IN } from '../src/game/inputBits.js';

const DODGE_BIT = { L: IN.DODGE_L, R: IN.DODGE_R, duck: IN.DUCK };

function run(opp, bot, seed = 7) {
  const f = new Fight({ opponent: opp, seed });
  let n = 0;
  const counts = {};
  while (!f.over && n < 60 * 60 * 20) {
    if (f.phase === 'between') f.startNextRound();
    f.step(bot(f));
    for (const e of f.events) counts[e.type] = (counts[e.type] || 0) + 1;
    n++;
  }
  return { result: f.result, stats: f.stats, counts, hp: [f.player.hp, f.opp.hp] };
}

const idle = () => 0;
let lastPress = 0;
const simple = (f) => {
  const o = f.opp;
  const p = f.player;
  if (f.phase === 'pdown') return f.frame % 4 === 0 ? IN.JAB : 0;
  if (o.state === 'tell' && !o.fake) {
    const rem = o.dur - o.t;
    if (rem < 160 && rem > 100 && p.actionable) return DODGE_BIT[o.atk.avoid[0]];
  }
  if (['whiff', 'shoved', 'counterStun', 'tired', 'taunt', 'guardBroken', 'recover'].includes(o.state) && p.actionable) {
    if (p.stars >= 2) return IN.SPECIAL;
    return f.frame % 2 ? IN.JAB : IN.STRAIGHT;
  }
  return 0;
};

for (const opp of OPPONENTS) {
  console.log(opp.name, 'idle:', JSON.stringify(run(opp, idle).result));
  const r = run(opp, simple);
  console.log(opp.name, 'simple:', JSON.stringify(r.result), r.counts, 'hp', r.hp.map((x) => x.toFixed(1)));
}

// 자동 플레이 균형 검사: 화면 없이 봇으로 경기를 빠르게 돌려 상대별 승률 표를 만든다.
// 사용: node tools/balance-sim.mjs [판수=40] [--md]
import { Fight } from '../src/game/fight.js';
import { OPPONENTS } from '../src/data/opponents/index.js';
import { BOTS } from './bots.mjs';
import fs from 'node:fs';

const N = Number(process.argv.find((a) => /^\d+$/.test(a)) || 40);
const writeMd = process.argv.includes('--md');
const variant = process.argv.includes('--defense') ? 'defense' : 'normal';
const difficulty = (process.argv.find((a) => a.startsWith('--diff=')) || '--diff=normal').slice(7);

export function runFight(opp, botName, seed, opts = {}) {
  const f = new Fight({ opponent: opp, seed, difficulty: opts.difficulty || 'normal', variant: opts.variant || 'normal' });
  const bot = BOTS[botName](seed);
  let n = 0;
  const max = 60 * 60 * 30;
  while (!f.over && n < max) {
    if (f.phase === 'between') f.startNextRound();
    f.step(bot(f));
    n++;
  }
  return f;
}

export function simulate(n = N, opts = {}) {
  const rows = [];
  for (const opp of OPPONENTS) {
    const row = { id: opp.id, name: `${opp.nick} ${opp.name}` };
    for (const bot of ['perfect', 'normal', 'masher']) {
      const games = bot === 'normal' ? n : Math.max(10, Math.round(n / 2));
      let win = 0, time = 0, hp = 0, ko = 0, dec = 0;
      for (let s = 1; s <= games; s++) {
        const f = runFight(opp, bot, s * 101 + opp.order, opts);
        if (f.result && f.result.winner === 'player') {
          win++;
          hp += f.result.hpRatio;
          if (f.result.method === 'KO' || f.result.method === 'TKO') ko++;
          else dec++;
        }
        time += f.fightTime;
      }
      row[bot] = { win: win / games, time: time / games / 1000, hp: win ? hp / win : 0, ko, dec, games };
    }
    rows.push(row);
  }
  return rows;
}

function pct(x) { return `${Math.round(x * 100)}%`.padStart(4); }

export function table(rows) {
  const lines = [];
  lines.push('| # | 상대 | 완벽 봇 승률 | 완벽 봇 평균 시간 | 보통 봇 승률 | 보통 봇 평균 시간 | 연타 봇 승률 |');
  lines.push('|---|---|---|---|---|---|---|');
  rows.forEach((r, i) => {
    lines.push(`| ${i + 1} | ${r.name} | ${pct(r.perfect.win)} | ${r.perfect.time.toFixed(0)}초 | ${pct(r.normal.win)} | ${r.normal.time.toFixed(0)}초 | ${pct(r.masher.win)} |`);
  });
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].endsWith('balance-sim.mjs')) {
  const t0 = Date.now();
  const rows = simulate(N, { variant, difficulty });
  const tbl = table(rows);
  console.log(tbl);
  console.log(`\n(${variant}, ${difficulty}, 보통 봇 ${N}판·나머지 ${Math.max(10, Math.round(N / 2))}판, ${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  // 기준 검사
  const problems = [];
  rows.forEach((r, i) => {
    if (r.perfect.win < 1) problems.push(`완벽 봇이 ${r.name}에게 짐 → 불공정`);
    if (i >= 2 && r.masher.win > 0.1) problems.push(`연타 봇이 ${r.name}을(를) ${pct(r.masher.win)} 이김`);
  });
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].normal.win > rows[i - 1].normal.win + 0.12) problems.push(`보통 봇 곡선 역전: ${rows[i - 1].name} → ${rows[i].name}`);
  }
  console.log(problems.length ? '\n문제:\n- ' + problems.join('\n- ') : '\n기준 통과: 완벽 봇 전승, 연타 봇 3번부터 거의 못 이김, 보통 봇 곡선 내려감');
  if (writeMd) {
    fs.writeFileSync('tools/.last-balance.json', JSON.stringify({ rows, problems, n: N, variant, difficulty }, null, 1));
  }
}

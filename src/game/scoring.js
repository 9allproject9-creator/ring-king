// 심판 점수와 별점.
export const JUDGES = [
  { name: '김바른 심판', w: { hits: 1, counters: 2, downs: 1 }, desc: '정확한 펀치를 좋아함' },
  { name: '로사 심판', w: { hits: 1.4, counters: 1.2, downs: 1 }, desc: '많이 때린 쪽을 좋아함' },
  { name: '도윤 심판', w: { hits: 0.8, counters: 2.8, downs: 1 }, desc: '멋진 반격을 좋아함' },
];

// rounds: [{ p:{hits,counters,downs}, o:{hits,counters,downs} }]  downs = 그 선수가 상대를 쓰러뜨린 횟수
export function judgeDecision(rounds) {
  const judges = JUDGES.map((j) => {
    let p = 0;
    let o = 0;
    const perRound = [];
    for (const r of rounds) {
      const sp = r.p.hits * j.w.hits + r.p.counters * j.w.counters;
      const so = r.o.hits * j.w.hits + (r.o.counters || 0) * j.w.counters;
      let rp = 10;
      let ro = 10;
      const dd = r.p.downs - r.o.downs; // 다운을 더 많이 뺏은 쪽이 라운드를 가져간다 (10-8, 다운 1번마다 1점 더)
      if (dd > 0) ro = 9 - dd * j.w.downs;
      else if (dd < 0) rp = 9 + dd * j.w.downs;
      else if (sp > so + 0.5) ro = 9;
      else if (so > sp + 0.5) rp = 9;
      rp = Math.max(6, rp);
      ro = Math.max(6, ro);
      perRound.push([rp, ro]);
      p += rp;
      o += ro;
    }
    return { name: j.name, desc: j.desc, p, o, perRound, winner: p > o ? 'player' : o > p ? 'opponent' : 'draw' };
  });
  const pv = judges.filter((j) => j.winner === 'player').length;
  const ov = judges.filter((j) => j.winner === 'opponent').length;
  let winner = 'draw';
  if (pv > ov) winner = 'player';
  else if (ov > pv) winner = 'opponent';
  let kind = '무승부';
  if (winner !== 'draw') {
    const w = Math.max(pv, ov);
    kind = w === 3 ? '만장일치 판정' : (pv && ov) ? '판정(2:1)' : '판정';
  }
  return { judges, winner, kind };
}

// 별점: 승리 1 / 남은 체력 50% 이상 +1 / 다운 없이 + 반격 5회 이상 +1
export function starRating({ win, hpRatio, downsTaken, counters }) {
  if (!win) return 0;
  let s = 1;
  if (hpRatio >= 0.5) s++;
  if (downsTaken === 0 && counters >= 5) s++;
  return s;
}

// 결과 화면용 요약 (로직만으로 계산)
export function summarizeFight(fight, { order = 1, variant = 'normal', mode = 'career' } = {}) {
  const r = fight.result || { winner: 'opponent', method: '-', hpRatio: 0 };
  const s = fight.stats;
  const win = r.winner === 'player';
  const counters = s.counters;
  const stars = starRating({ win, hpRatio: r.hpRatio, downsTaken: s.downsTaken, counters });
  const accuracy = s.thrown ? s.landed / s.thrown : 0;
  return {
    win,
    draw: r.winner === 'draw',
    method: r.method,
    round: r.round,
    stars,
    timeMs: fight.fightTime,
    accuracy,
    counters,
    damageTaken: Math.round(s.damageTaken),
    damageDealt: Math.round(s.damageDealt),
    downsTaken: s.downsTaken,
    downsDealt: s.downsDealt,
    hpRatio: r.hpRatio,
    coins: coinReward({ win, stars, order, variant, mode }),
    decision: r.decision,
    lastPunch: r.lastPunch,
    lastKind: r.lastKind,
    difficulty: fight.difficulty,
  };
}

export function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}분 ${String(s % 60).padStart(2, '0')}초`;
}

export function coinReward({ win, stars, order, variant, mode }) {
  if (!win) return 5 + Math.floor(order * 1.5);
  const base = 30 + order * 12;
  const mul = variant === 'defense' ? 1.6 : 1;
  return Math.round((base + stars * 15) * mul) + (mode === 'rush' ? 20 : 0);
}

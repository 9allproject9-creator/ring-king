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
      if (sp > so + 0.5) ro = 9;
      else if (so > sp + 0.5) rp = 9;
      rp -= r.o.downs * j.w.downs; // 내가 다운당한 횟수만큼 감점
      ro -= r.p.downs * j.w.downs;
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

export function coinReward({ win, stars, order, variant, mode }) {
  if (!win) return 5 + Math.floor(order * 1.5);
  const base = 30 + order * 12;
  const mul = variant === 'defense' ? 1.6 : 1;
  return Math.round((base + stars * 15) * mul) + (mode === 'rush' ? 20 : 0);
}

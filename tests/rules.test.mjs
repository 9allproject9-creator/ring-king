import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFight, toFight, runUntil, collect, IN, TEST_OPP } from './helpers.mjs';
import { CONFIG } from '../src/config.js';
import { judgeDecision, starRating, summarizeFight } from '../src/game/scoring.js';

function knockPlayer(f) {
  f.player.hp = 1;
  f.player.takeHit(f, 5);
  f.onPlayerDown();
}

test('내 체력이 0이면 다운, 1초마다 카운트', () => {
  const f = toFight(makeFight());
  knockPlayer(f);
  assert.equal(f.phase, 'pdown');
  assert.equal(f.player.stars, 0);
  const ev = collect(f, 60 * 4);
  const counts = ev.filter((e) => e.type === 'count').map((e) => e.n);
  assert.deepEqual(counts.slice(0, 3), [1, 2, 3]);
});

test('연타로 일어나기 게이지를 채우면 일어나고 체력 일부 회복', () => {
  const f = toFight(makeFight());
  knockPlayer(f);
  const need = f.down.need;
  assert.equal(need, CONFIG.player.getup.baseRequired);
  runUntil(f, (f) => f.phase === 'fight', (f, i) => (i % 3 === 0 ? IN.JAB : 0), 60 * 9);
  assert.equal(f.phase, 'fight');
  assert.equal(f.player.hp, CONFIG.player.getup.healByDown[0]);
});

test('다운 횟수가 늘수록 더 많이 눌러야 한다', () => {
  const f = toFight(makeFight());
  knockPlayer(f);
  const need1 = f.down.need;
  runUntil(f, (f) => f.phase === 'fight', (f, i) => (i % 3 === 0 ? IN.JAB : 0), 60 * 9);
  runUntil(f, (f) => f.player.state !== 'getup');
  knockPlayer(f);
  assert.ok(f.down.need > need1);
});

test('10카운트까지 못 일어나면 KO 패배', () => {
  const f = toFight(makeFight());
  knockPlayer(f);
  runUntil(f, (f) => f.phase === 'over', () => 0, 60 * 14);
  assert.equal(f.result.winner, 'opponent');
  assert.equal(f.result.method, 'KO');
});

test('한 라운드에 3번 다운이면 TKO', () => {
  const f = toFight(makeFight());
  for (let i = 0; i < 2; i++) {
    knockPlayer(f);
    runUntil(f, (f) => f.phase === 'fight', (f, i) => (i % 2 === 0 ? IN.JAB : 0), 60 * 9);
    runUntil(f, (f) => f.player.state !== 'getup');
  }
  knockPlayer(f);
  runUntil(f, (f) => f.phase === 'over', () => 0, 60 * 5);
  assert.equal(f.result.method, 'TKO');
  assert.equal(f.result.winner, 'opponent');
});

test('상대 다운: 일어날 확률이 0이면 10카운트 KO 승리', () => {
  const opp = { ...TEST_OPP, stats: { ...TEST_OPP.stats, getUp: { chance: [0], countAt: [3, 3], heal: [0.5] } } };
  const f = toFight(makeFight({ opponent: opp }));
  f.opp.hp = 2;
  collect(f, 15, (f, i) => (i === 0 ? IN.JAB : 0));
  assert.equal(f.phase, 'odown');
  runUntil(f, (f) => f.phase === 'over', () => 0, 60 * 14);
  assert.equal(f.result.winner, 'player');
  assert.equal(f.result.method, 'KO');
});

test('상대 다운: 일어나면 정해진 만큼 회복', () => {
  const f = toFight(makeFight());
  f.opp.hp = 2;
  collect(f, 15, (f, i) => (i === 0 ? IN.JAB : 0));
  assert.equal(f.phase, 'odown');
  runUntil(f, (f) => f.phase === 'fight', () => 0, 60 * 8);
  assert.equal(f.opp.state, 'getup');
  assert.equal(f.opp.hp, 50);
});

test('라운드가 끝나면 사이 화면, 다음 라운드에 잃은 체력 30% 회복', () => {
  const f = toFight(makeFight());
  f.player.hp = 40;
  f.roundTime = 50;
  runUntil(f, (f) => f.phase === 'between', () => 0, 60 * 5);
  assert.equal(f.phase, 'between');
  f.startNextRound();
  assert.equal(f.round, 2);
  assert.ok(Math.abs(f.player.hp - (40 + 60 * 0.3)) < 0.01);
  assert.equal(f.roundTime, CONFIG.fight.roundMs);
});

test('마지막 라운드가 끝나면 심판 판정', () => {
  const f = toFight(makeFight({ rounds: 1 }));
  f.roundStats.p.hits = 20;
  f.roundStats.o.hits = 3;
  f.roundTime = 30;
  runUntil(f, (f) => f.phase === 'over', () => 0, 60 * 6);
  assert.equal(f.result.winner, 'player');
  assert.ok(f.result.decision);
  assert.equal(f.result.decision.judges.length, 3);
});

test('심판 판정: 만장일치, 무승부, 다운 감점', () => {
  const a = judgeDecision([{ p: { hits: 10, counters: 3, downs: 0 }, o: { hits: 2, counters: 0, downs: 0 } }]);
  assert.equal(a.winner, 'player');
  assert.equal(a.kind, '만장일치 판정');
  const b = judgeDecision([{ p: { hits: 5, counters: 0, downs: 0 }, o: { hits: 5, counters: 0, downs: 0 } }]);
  assert.equal(b.winner, 'draw');
  // 맞힌 수가 조금 적어도 상대를 다운시켰으면 이긴다 (downs = 상대를 쓰러뜨린 횟수)
  const c = judgeDecision([{ p: { hits: 6, counters: 0, downs: 1 }, o: { hits: 7, counters: 0, downs: 0 } }]);
  assert.equal(c.winner, 'player');
});

test('심판마다 기준이 달라 2:1 판정이 나올 수 있다', () => {
  // 맞힌 수는 상대가 많고 반격은 내가 많음
  const d = judgeDecision([{ p: { hits: 6, counters: 3, downs: 0 }, o: { hits: 11, counters: 0, downs: 0 } }]);
  const votes = d.judges.map((j) => j.winner);
  assert.ok(votes.includes('player') && votes.includes('opponent'));
  assert.equal(d.kind, '판정(2:1)');
});

test('별점: 승리 1 / 체력 50% 이상 +1 / 다운 없음 + 반격 5회 이상 +1', () => {
  assert.equal(starRating({ win: false, hpRatio: 1, downsTaken: 0, counters: 9 }), 0);
  assert.equal(starRating({ win: true, hpRatio: 0.2, downsTaken: 1, counters: 9 }), 1);
  assert.equal(starRating({ win: true, hpRatio: 0.6, downsTaken: 1, counters: 9 }), 2);
  assert.equal(starRating({ win: true, hpRatio: 0.6, downsTaken: 0, counters: 4 }), 2);
  assert.equal(starRating({ win: true, hpRatio: 0.6, downsTaken: 0, counters: 5 }), 3);
});

test('결과 요약에 정확도·반격·받은 피해·코인이 들어간다', () => {
  const opp = { ...TEST_OPP, stats: { ...TEST_OPP.stats, getUp: { chance: [0], countAt: [3, 3], heal: [0.5] } } };
  const f = toFight(makeFight({ opponent: opp }));
  f.opp.hp = 2;
  collect(f, 15, (f, i) => (i === 0 ? IN.JAB : 0));
  runUntil(f, (f) => f.phase === 'over', () => 0, 60 * 14);
  const s = summarizeFight(f, { order: 1 });
  assert.equal(s.win, true);
  assert.equal(s.accuracy, 1);
  assert.ok(s.coins > 0);
  assert.equal(s.stars, 2);
});

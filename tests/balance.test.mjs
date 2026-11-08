import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPPONENTS } from '../src/data/opponents/index.js';
import { runFight } from '../tools/balance-sim.mjs';

// 공정함: 텔을 정확히 읽으면 누구든 이길 수 있어야 한다 (모든 모드)
test('완벽 봇은 10명 모두 이긴다 (보통·어려움·방어전)', () => {
  for (const opts of [{}, { difficulty: 'hard' }, { variant: 'defense' }]) {
    for (const o of OPPONENTS) {
      for (const seed of [11, 22]) {
        const f = runFight(o, 'perfect', seed, opts);
        assert.equal(f.result.winner, 'player', `${o.id} ${JSON.stringify(opts)} seed ${seed}`);
      }
    }
  }
});

test('버튼 연타 봇은 3번 상대부터 못 이긴다', () => {
  for (const o of OPPONENTS.slice(2)) {
    for (const seed of [3, 4, 5]) {
      const f = runFight(o, 'masher', seed);
      assert.notEqual(f.result.winner, 'player', `${o.id} seed ${seed}`);
    }
  }
});

test('보통 봇 승률은 앞 상대가 뒤 상대보다 높다', () => {
  const rate = (o) => {
    let w = 0;
    for (let s = 1; s <= 20; s++) if (runFight(o, 'normal', s * 101 + o.order).result.winner === 'player') w++;
    return w / 20;
  };
  const first = rate(OPPONENTS[0]);
  const last = rate(OPPONENTS[9]);
  assert.ok(first >= 0.9, `1번 ${first}`);
  assert.ok(last <= 0.6, `10번 ${last}`);
  assert.ok(first > last);
});

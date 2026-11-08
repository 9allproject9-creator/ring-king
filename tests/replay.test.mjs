import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Fight } from '../src/game/fight.js';
import { getOpponent } from '../src/data/opponents/index.js';
import { normalBot } from '../tools/bots.mjs';
import { packReplay, ReplayPlayer, compress, expand } from '../src/game/replay.js';

function record(oppId, seed) {
  const opp = getOpponent(oppId);
  const f = new Fight({ opponent: opp, seed });
  const bot = normalBot(seed);
  const inputs = [];
  const marks = [];
  let n = 0;
  while (!f.over && n++ < 60 * 60 * 20) {
    if (f.phase === 'between') { f.startNextRound(); marks.push({ frame: inputs.length, type: 'nextRound' }); }
    const inp = bot(f);
    inputs.push(inp);
    f.step(inp);
  }
  return { f, rep: packReplay(f, inputs, marks) };
}

test('같은 시드·같은 입력 → 같은 결과 (결정성)', () => {
  for (const [id, seed] of [['bear', 3], ['fox', 7], ['atlas', 11]]) {
    const { f, rep } = record(id, seed);
    const p = new ReplayPlayer(JSON.parse(JSON.stringify(rep)), getOpponent(id));
    while (p.stepFrame()) { /* 재생 */ }
    assert.equal(p.fight.result.winner, f.result.winner, id);
    assert.equal(p.fight.result.method, f.result.method, id);
    assert.equal(p.fight.frame, f.frame, id);
    assert.equal(p.fight.player.hp, f.player.hp, id);
    assert.equal(p.fight.opp.hp, f.opp.hp, id);
    assert.equal(p.fight.stats.landed, f.stats.landed, id);
  }
});

test('다른 시드면 경기가 달라진다', () => {
  const a = record('fox', 1).f;
  const b = record('fox', 2).f;
  assert.ok(a.frame !== b.frame || a.stats.landed !== b.stats.landed);
});

test('입력 압축/복원', () => {
  const arr = [0, 0, 0, 1, 1, 0, 64, 64, 64, 64];
  assert.deepEqual(expand(compress(arr)), arr);
  assert.ok(compress(arr).length < arr.length);
});

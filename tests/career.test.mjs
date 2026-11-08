import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSave } from '../src/save.js';
import { applyResult, storyBefore, storyAfter, markStory, isUnlocked } from '../src/game/career.js';
import { runFight } from '../tools/balance-sim.mjs';
import { getOpponent } from '../src/data/opponents/index.js';

test('이기면 다음 상대가 열리고 코인·별·기록이 저장된다', () => {
  const s = defaultSave();
  assert.equal(isUnlocked(s, 'bolt'), false);
  const f = runFight(getOpponent('bear'), 'perfect', 7);
  const r = applyResult(s, f, { oppId: 'bear' });
  assert.equal(r.summary.win, true);
  assert.equal(r.firstWin, true);
  assert.equal(r.unlocked, 'bolt');
  assert.equal(isUnlocked(s, 'bolt'), true);
  assert.ok(s.coins > 0);
  assert.ok(s.career.results.bear.stars >= 1);
  assert.ok(s.records.timeAttack.bear > 0);
  assert.equal(s.totals.wins, 1);
});

test('지면 도전 횟수가 쌓이고 잠금은 그대로', () => {
  const s = defaultSave();
  const f = runFight(getOpponent('wall'), 'masher', 3);
  const r = applyResult(s, f, { oppId: 'wall' });
  assert.equal(r.summary.win, false);
  assert.equal(s.career.tries.wall, 1);
  assert.equal(s.career.unlocked, 0);
  assert.ok(s.coins > 0, '져도 조금은 준다');
});

test('챔피언을 이기면 클리어, 방어전 열림', () => {
  const s = defaultSave();
  s.career.unlocked = 9;
  const f = runFight(getOpponent('atlas'), 'perfect', 5);
  const r = applyResult(s, f, { oppId: 'atlas' });
  assert.equal(r.cleared, true);
  assert.equal(s.career.cleared, true);
  assert.equal(s.defense.unlocked, true);
});

test('이야기 장면은 한 번씩만', () => {
  const s = defaultSave();
  assert.equal(storyBefore(s, 'bear'), 'prologue');
  markStory(s, 'prologue');
  assert.equal(storyBefore(s, 'bear'), null);
  assert.equal(storyAfter(s, 'wall'), 'afterLeague0');
  assert.equal(storyBefore(s, 'storm'), 'beforeRival');
  assert.equal(storyAfter(s, 'atlas'), 'ending');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ACHIEVEMENTS, checkAchievements } from '../src/data/achievements.js';
import { ITEMS } from '../src/data/shop.js';
import { defaultSave } from '../src/save.js';
import { applyResult } from '../src/game/career.js';
import { runFight } from '../tools/balance-sim.mjs';
import { getOpponent } from '../src/data/opponents/index.js';

test('도전 과제 30개 이상, id 중복 없음, 보상 아이템이 상점에 있음', () => {
  assert.ok(ACHIEVEMENTS.length >= 30);
  const ids = new Set(ACHIEVEMENTS.map((a) => a.id));
  assert.equal(ids.size, ACHIEVEMENTS.length);
  for (const a of ACHIEVEMENTS) if (a.gives) assert.ok(ITEMS.find((i) => i.id === a.gives), a.gives);
  // 도전 과제 전용 아이템은 모두 어떤 도전 과제가 준다
  for (const it of ITEMS.filter((i) => i.achievement)) assert.ok(ACHIEVEMENTS.find((a) => a.gives === it.id), it.id);
});

test('첫 승리·노데미지 달성, 코인과 아이템 지급, 두 번은 안 줌', () => {
  const s = defaultSave();
  const f = runFight(getOpponent('bear'), 'perfect', 9);
  const out = applyResult(s, f, { oppId: 'bear' });
  const coins = s.coins;
  const got = checkAchievements(s, { type: 'fight', fight: f, out, ctx: { oppId: 'bear' } });
  const ids = got.map((a) => a.id);
  assert.ok(ids.includes('first_win'));
  if (f.stats.damageTaken === 0) {
    assert.ok(ids.includes('no_damage'));
    assert.ok(s.owned.includes('trunks_tiger'));
  }
  assert.ok(s.coins > coins);
  assert.equal(checkAchievements(s, { type: 'fight', fight: f, out, ctx: { oppId: 'bear' } }).length, 0);
});

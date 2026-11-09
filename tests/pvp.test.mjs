import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PvpMatch, PVP } from '../src/game/pvp.js';
import { IN } from '../src/game/inputBits.js';

function toFight(m) {
  let n = 0;
  while (m.phase !== 'fight' && n++ < 1000) m.step(0, 0);
  return m;
}
function run(m, frames, fa = () => 0, fb = () => 0) {
  const ev = [];
  for (let i = 0; i < frames; i++) { m.step(fa(i), fb(i)); ev.push(...m.events.splice(0)); }
  return ev;
}

test('PvP: 펀치에는 보이는 준비 동작이 있고 맞으면 피해', () => {
  const m = toFight(new PvpMatch());
  const ev = run(m, 40, (i) => (i === 0 ? IN.JAB : 0));
  const hit = ev.find((e) => e.type === 'hit');
  assert.ok(hit && hit.who === 0);
  assert.equal(m.f[1].hp, 100 - PVP.damage.jab);
  const t = ev.find((e) => e.type === 'punchStart');
  assert.ok(hit.clock - t.clock >= PVP.startup.jab - 20);
});

test('PvP: 올바른 방향으로 피하면 상대가 비틀거리고, 그때 치면 반격+별', () => {
  const m = toFight(new PvpMatch());
  // A가 스트레이트 → B는 오른쪽 피하기
  const ev = run(m, 27, (i) => (i === 0 ? IN.STRAIGHT : 0), (i) => (i === 12 ? IN.DODGE_R : 0));
  assert.ok(ev.some((e) => e.type === 'dodge' && e.who === 1));
  assert.ok(m.f[0].staggered);
  const ev2 = run(m, 30, () => 0, (i) => (i === 0 ? IN.JAB : 0));
  const hit = ev2.find((e) => e.type === 'hit');
  assert.equal(hit.kind, 'counter');
  assert.equal(m.f[1].stars, 1);
});

test('PvP: 반대로 피하면 맞는다 (잽은 오른쪽으로 못 피함)', () => {
  const m = toFight(new PvpMatch());
  const ev = run(m, 40, (i) => (i === 0 ? IN.JAB : 0), (i) => (i === 8 ? IN.DODGE_R : 0));
  assert.ok(ev.some((e) => e.type === 'hit' && e.who === 0));
});

test('PvP: 가드는 피해를 줄인다', () => {
  const m = toFight(new PvpMatch());
  run(m, 40, (i) => (i === 0 ? IN.STRAIGHT : 0), () => IN.GUARD);
  assert.ok(m.f[1].hp > 100 - PVP.damage.straight);
  assert.ok(m.f[1].hp < 100);
});

test('PvP: 체력 0이면 다운, 10카운트면 KO', () => {
  const m = toFight(new PvpMatch());
  m.f[1].hp = 2;
  run(m, 40, (i) => (i === 0 ? IN.JAB : 0));
  assert.equal(m.phase, 'down');
  let n = 0;
  while (!m.over && n++ < 60 * 20) m.step(0, 0);
  assert.equal(m.result.winner, 0);
  assert.equal(m.result.method, 'KO');
});

test('PvP: 연타로 일어나고, 3라운드 뒤 판정', () => {
  const m = toFight(new PvpMatch());
  m.f[1].hp = 2;
  run(m, 40, (i) => (i === 0 ? IN.JAB : 0));
  run(m, 60 * 6, () => 0, (i) => (i % 3 === 0 ? IN.JAB : 0));
  assert.equal(m.phase, 'fight');
  assert.ok(m.f[1].hp > 0);
  let n = 0;
  while (!m.over && n++ < 60 * 60 * 6) m.step(0, 0);
  assert.ok(m.result);
  assert.ok(['판정', '만장일치 판정', '판정(2:1)', '무승부'].includes(m.result.method));
  const s = m.snapshot();
  assert.equal(s.f.length, 2);
});

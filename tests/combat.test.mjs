import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFight, toFight, steps, runUntil, collect, forceAttack, IN } from './helpers.mjs';
import { CONFIG } from '../src/config.js';

const near = (a, b, eps = 0.05) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

test('잽이 가드를 내린 상대에게 3 피해', () => {
  const f = toFight(makeFight());
  const hp = f.opp.hp;
  const ev = collect(f, 20, (f, i) => (i === 0 ? IN.JAB : 0));
  assert.ok(ev.some((e) => e.type === 'hit' && e.punch === 'jab'));
  near(hp - f.opp.hp, 3);
});

test('콤보(잽→스트레이트)는 마지막 펀치에 +20%', () => {
  const f = toFight(makeFight());
  collect(f, 20, (f, i) => (i === 0 ? IN.JAB : 0));
  f.opp.enter('idle', 1e9); f.opp.guardUp = false;
  const hp = f.opp.hp;
  const ev = collect(f, 30, (f, i) => (i === 0 ? IN.STRAIGHT : 0));
  const hit = ev.find((e) => e.type === 'hit');
  assert.equal(hit.combo, '원투');
  near(hp - f.opp.hp, 6 * 1.2);
});

test('가드 올린 상대는 막고, 스트레이트는 가드 게이지를 크게 깎는다', () => {
  const f = toFight(makeFight());
  f.opp.guardUp = true;
  const g = f.opp.guardGauge;
  const hp = f.opp.hp;
  const ev = collect(f, 30, (f, i) => (i === 0 ? IN.STRAIGHT : 0));
  assert.ok(ev.some((e) => e.type === 'block'));
  assert.equal(f.opp.hp, hp);
  // 판정 뒤 몇 프레임 동안 게이지가 조금 회복되므로 여유를 둔다
  near(g - f.opp.guardGauge, 6 * 3 * CONFIG.player.punches.straight.guardDrainMul, 3);
});

test('올바르게 피하면 헛방, 첫 타에 별 +1, 피해 1.5배 (어퍼컷은 2배)', () => {
  const f = toFight(makeFight());
  forceAttack(f, 'hookL');
  // 공격 직전 150ms에 왼쪽 피하기
  runUntil(f, (f) => f.opp.dur - f.opp.t <= 150);
  const ev = collect(f, 20, (f, i) => (i === 0 ? IN.DODGE_L : 0));
  assert.ok(ev.some((e) => e.type === 'dodge'));
  assert.equal(f.opp.state, 'whiff');
  runUntil(f, (f) => f.player.actionable);
  const hp = f.opp.hp;
  const ev2 = collect(f, 30, (f, i) => (i === 0 ? IN.UPPER : 0));
  assert.ok(ev2.some((e) => e.type === 'star'));
  assert.equal(f.player.stars, 1);
  near(hp - f.opp.hp, 10 * 2);
});

test('반대로 피하면 맞고 별을 잃는다', () => {
  const f = toFight(makeFight());
  f.player.stars = 2;
  forceAttack(f, 'hookL');
  runUntil(f, (f) => f.opp.dur - f.opp.t <= 150);
  const ev = collect(f, 10, (f, i) => (i === 0 ? IN.DODGE_R : 0));
  assert.ok(ev.some((e) => e.type === 'wrongDodge'));
  assert.ok(ev.some((e) => e.type === 'playerHit'));
  assert.equal(f.player.stars, 1);
  near(100 - f.player.hp, 10);
});

test('가드는 피해 75% 감소, 가드 게이지는 피해×3 감소', () => {
  const f = toFight(makeFight());
  forceAttack(f, 'body');
  runUntil(f, (f) => f.opp.state === 'tell' && f.opp.t > 200);
  const ev = collect(f, 60, () => IN.GUARD);
  assert.ok(ev.some((e) => e.type === 'playerBlock'));
  near(100 - f.player.hp, 8 * 0.25);
  near(100 - f.player.guard, 8 * 3, 1.5);
});

test('가드만 가능한 공격은 피하기로 못 피한다', () => {
  const f = toFight(makeFight());
  forceAttack(f, 'body');
  runUntil(f, (f) => f.opp.dur - f.opp.t <= 150);
  const ev = collect(f, 10, (f, i) => (i === 0 ? IN.DUCK : 0));
  assert.ok(ev.some((e) => e.type === 'playerHit'));
});

test('끊어치기: 텔 마지막 150ms에 약점 펀치를 맞히면 카운터 + 별', () => {
  const f = toFight(makeFight());
  forceAttack(f, 'hookL');
  // 잽은 80ms 뒤 판정 → 판정 순간 남은 텔이 150ms 이하가 되게 누른다
  runUntil(f, (f) => f.opp.dur - f.opp.t <= 200);
  const hp = f.opp.hp;
  const ev = collect(f, 12, (f, i) => (i === 0 ? IN.JAB : 0));
  const hit = ev.find((e) => e.type === 'hit');
  assert.ok(hit, '맞아야 함');
  assert.equal(hit.kind, 'interrupt');
  assert.equal(f.opp.state, 'counterStun');
  assert.equal(f.player.stars, 1);
  near(hp - f.opp.hp, 3 * CONFIG.combat.counterDamageMul);
});

test('텔 초반에 치면 막힌다(끊어치기 아님)', () => {
  const f = toFight(makeFight());
  forceAttack(f, 'hookL');
  runUntil(f, (f) => f.opp.state === 'tell' && f.opp.t > 100);
  const ev = collect(f, 12, (f, i) => (i === 0 ? IN.JAB : 0));
  assert.ok(ev.some((e) => e.type === 'block'));
});

test('필살 펀치: 별 개수만큼 15/30/45, 별을 모두 쓴다', () => {
  for (const [stars, dmg] of [[1, 15], [2, 30], [3, 45]]) {
    const f = toFight(makeFight());
    f.player.stars = stars;
    const hp = f.opp.hp;
    collect(f, 40, (f, i) => (i === 0 ? IN.SPECIAL : 0));
    assert.equal(f.player.stars, 0);
    near(hp - f.opp.hp, dmg);
  }
});

test('별이 없으면 필살 펀치가 나가지 않는다', () => {
  const f = toFight(makeFight());
  const ev = collect(f, 10, (f, i) => (i === 0 ? IN.SPECIAL : 0));
  assert.ok(!ev.some((e) => e.type === 'punchStart'));
});

test('별은 최대 3개', () => {
  const f = toFight(makeFight());
  f.player.stars = 3;
  f.player.addStar(f);
  assert.equal(f.player.stars, 3);
});

test('스태미나: 펀치마다 소모, 0이 되면 1.2초 숨 고르기', () => {
  const f = toFight(makeFight());
  f.player.stamina = 40;
  collect(f, 10, (f, i) => (i === 0 ? IN.UPPER : 0));
  assert.ok(f.player.stamina <= 40 - 14 + 0.5); // 첫 프레임 회복분 약간
  runUntil(f, (f) => f.player.actionable);
  f.player.stamina = 3;
  f.opp.enter('idle', 1e9); f.opp.guardUp = false;
  f.step(IN.STRAIGHT);
  assert.ok(runUntil(f, (f) => f.player.state === 'winded'));
  const start = f.clock;
  runUntil(f, (f) => f.player.state !== 'winded');
  near(f.clock - start, CONFIG.player.stamina.windedMs, 40);
});

test('헛스윙은 스태미나 1.5배', () => {
  const f = toFight(makeFight());
  f.opp.enter('step', 1e9); // 스텝 중엔 펀치가 빗나감
  const s = f.player.stamina;
  collect(f, 14, (f, i) => (i === 0 ? IN.STRAIGHT : 0));
  // 14프레임 동안 펀치 상태라 회복 없음
  near(s - f.player.stamina, 8 * 1.5, 0.3);
});

test('가만히 있으면 스태미나가 빠르게 회복', () => {
  const f = toFight(makeFight());
  f.player.stamina = 20;
  steps(f, 60);
  assert.ok(f.player.stamina > 35);
});

test('같은 펀치 3번 연속이면 막힐 확률이 오른다', () => {
  const f = toFight(makeFight());
  for (let k = 0; k < 3; k++) {
    runUntil(f, (f) => f.player.actionable);
    f.opp.enter('idle', 1e9); f.opp.guardUp = false;
    collect(f, 1, () => IN.JAB);
  }
  assert.ok(f.player.monotony > 0);
});

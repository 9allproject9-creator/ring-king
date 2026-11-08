import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFight, toFight, runUntil, collect, forceAttack, IN, TEST_OPP } from './helpers.mjs';
import { OPPONENTS, getOpponent } from '../src/data/opponents/index.js';
import { BASE_CLIPS } from '../src/render/anims.js';

const ANIM_BASES = new Set(Object.keys(BASE_CLIPS).filter((k) => k.endsWith('_tell')).map((k) => k.replace('_tell', '').replace(/L$/, '')));

test('상대 10명 데이터가 완전하다 (모든 공격에 피하는 방법이 있다)', () => {
  assert.equal(OPPONENTS.length, 10);
  const ids = new Set();
  for (const o of OPPONENTS) {
    assert.ok(!ids.has(o.id), `중복 id ${o.id}`);
    ids.add(o.id);
    for (const k of ['name', 'nick', 'from', 'age', 'height', 'personality', 'intro', 'winLine', 'loseLine', 'look']) assert.ok(o[k], `${o.id}.${k}`);
    assert.equal(o.hints.length, 3, `${o.id} 코치 힌트 3개`);
    assert.ok(o.weakness.length >= 1);
    // 약점(끊어치기)은 1~2개
    const counters = Object.values(o.attacks).filter((a) => a.counter).length;
    assert.ok(counters >= 1 && counters <= 2, `${o.id} 끊어치기 ${counters}개`);
    for (const [id, a] of Object.entries(o.attacks)) {
      assert.ok(Array.isArray(a.avoid), `${o.id}.${id} avoid`);
      // avoid가 비어 있으면 가드로 막을 수 있어야 한다(피할 수 없는 공격 금지)
      if (a.avoid.length === 0) assert.notEqual(a.blockable, false, `${o.id}.${id} 가드도 안 되는 공격`);
      for (const d of a.avoid) assert.ok(['L', 'R', 'duck'].includes(d));
      assert.ok(a.tell >= 300, `${o.id}.${id} 텔이 너무 짧음`);
      const base = a.anim.replace(/[LR]$/, '');
      assert.ok(ANIM_BASES.has(base) || ANIM_BASES.has(a.anim), `${o.id}.${id} 애니메이션 ${a.anim}`);
      assert.ok(a.cue, `${o.id}.${id} 텔 설명`);
    }
    // 패턴 토큰은 모두 공격·변형·step으로 풀린다
    for (const ph of o.phases) {
      for (const pat of [...ph.patterns, ...((o.defense && o.defense.patterns) || [])]) {
        for (let tok of pat.seq) {
          if (tok === 'step' || tok === 'taunt') continue;
          tok = tok.replace('~', '');
          const v = o.variants && o.variants[tok];
          if (v) {
            const targets = v.byPos ? Object.values(v.byPos) : v.adaptive;
            for (const t of targets) assert.ok(o.attacks[t], `${o.id} 변형 ${tok}→${t}`);
          } else assert.ok(o.attacks[tok], `${o.id} 패턴 토큰 ${tok}`);
        }
      }
    }
    for (const k of ['punish', 'feintPunish']) if (o[k]) assert.ok(o.attacks[o[k]], `${o.id}.${k}`);
    if (o.stats.blockCounter) assert.ok(o.attacks[o.stats.blockCounter.attack]);
  }
});

test('텔 길이 곡선: 쉬운 상대는 길고 어려운 상대는 짧다', () => {
  const avg = (o) => {
    const t = Object.values(o.attacks).map((a) => a.tell);
    return t.reduce((s, x) => s + x, 0) / t.length;
  };
  assert.ok(avg(getOpponent('bear')) >= 800);
  assert.ok(avg(getOpponent('storm')) < avg(getOpponent('bear')));
  assert.ok(avg(getOpponent('atlas')) < 700);
});

test('패턴 문장은 순서대로 나온다', () => {
  const opp = { ...TEST_OPP, phases: [{ hpBelow: 1, patterns: [{ seq: ['hookL', 'body', 'hookL'] }] }] };
  const f = toFight(makeFight({ opponent: opp }));
  f.opp.startSentence(f, opp.phases[0].patterns[0]);
  const seen = [f.opp.atk.id];
  const ev = collect(f, 60 * 6, () => IN.GUARD);
  for (const e of ev) if (e.type === 'oppTell') seen.push(e.attack);
  assert.deepEqual(seen.slice(0, 3), ['hookL', 'body', 'hookL']);
});

test('페이즈 전환: 체력이 기준 아래로 떨어지면 페이즈가 바뀌고 텔이 빨라진다', () => {
  const f = toFight(makeFight());
  const t1 = f.opp.makeAttack('hookL', f).tellMs;
  f.opp.hp = 52;
  f.opp.guardUp = false;
  const ev = collect(f, 120, (f, i) => (i === 0 ? IN.STRAIGHT : 0));
  assert.ok(ev.some((e) => e.type === 'phase'));
  assert.equal(f.opp.phaseIndex, 1);
  const t2 = f.opp.makeAttack('hookL', f).tellMs;
  assert.ok(t2 < t1);
});

test('페인트: 가짜 텔은 공격이 나가지 않고, 속아서 피하면 반격이 온다', () => {
  const fox = getOpponent('fox');
  const f = toFight(makeFight({ opponent: fox }));
  f.opp.startSentence(f, { seq: ['~hookL', 'hookR'] });
  assert.equal(f.opp.fake, true);
  // 가짜 텔에 속아 피하기
  runUntil(f, (f) => f.opp.dur - f.opp.t <= 150);
  const ev = collect(f, 30, (f, i) => (i === 0 ? IN.DODGE_L : 0));
  assert.ok(ev.some((e) => e.type === 'feint'));
  assert.ok(!ev.some((e) => e.type === 'oppAttack'));
  assert.ok(ev.some((e) => e.type === 'feintFooled'));
  assert.equal(f.opp.atk.id, 'trick');
});

test('페인트를 안 속으면 다음 공격(진짜)으로 이어진다', () => {
  const fox = getOpponent('fox');
  const f = toFight(makeFight({ opponent: fox }));
  f.opp.startSentence(f, { seq: ['~hookL', 'hookR'] });
  const ev = collect(f, 60 * 2, () => 0);
  assert.ok(ev.some((e) => e.type === 'feintRead'));
  const tells = ev.filter((e) => e.type === 'oppTell');
  assert.equal(tells[0].attack, 'hookR');
  assert.equal(tells[0].fake, false);
});

test('페인트 발생: 나나미는 경기 중 가짜 텔을 쓴다', () => {
  const f = makeFight({ opponent: getOpponent('fox'), seed: 3 });
  const ev = collect(f, 60 * 40, () => IN.GUARD);
  assert.ok(ev.some((e) => e.type === 'oppTell' && e.fake));
  assert.ok(ev.some((e) => e.type === 'oppTell' && !e.fake));
});

test('클린치: 잡히면 연타로 풀고, 풀면 상대가 비틀거린다', () => {
  const f = toFight(makeFight({ opponent: getOpponent('giant') }));
  forceAttack(f, 'bear');
  runUntil(f, (f) => f.player.state === 'clinched', () => 0, 200);
  assert.equal(f.player.state, 'clinched');
  runUntil(f, (f) => f.player.state !== 'clinched', (f, i) => (i % 3 === 0 ? IN.JAB : 0), 200);
  assert.equal(f.opp.state, 'shoved');
  assert.equal(f.stats.clinchEscapes, 1);
});

test('클린치: 못 풀면 피해를 받는다', () => {
  const f = toFight(makeFight({ opponent: getOpponent('giant') }));
  forceAttack(f, 'bear');
  runUntil(f, (f) => f.player.state === 'clinched', () => 0, 200);
  const hp = f.player.hp;
  runUntil(f, (f) => f.player.state !== 'clinched', () => 0, 400);
  assert.ok(f.player.hp < hp);
});

test('볼코프는 라운드가 갈수록 느려진다', () => {
  const f = toFight(makeFight({ opponent: getOpponent('giant') }));
  const a = f.opp.makeAttack('hookL', f).tellMs;
  f.round = 3;
  const b = f.opp.makeAttack('hookL', f).tellMs;
  assert.ok(b > a);
});

test('습관 학습(에코): 늘 왼쪽으로 피하면 왼쪽으로 못 피하는 공격을 고른다', () => {
  const f = toFight(makeFight({ opponent: getOpponent('mirror'), seed: 5 }));
  for (let i = 0; i < 8; i++) f.opp.noteDodge('L');
  let leftOk = 0;
  for (let i = 0; i < 40; i++) {
    const id = f.opp.resolveToken('echo', f);
    if (getOpponent('mirror').attacks[id].avoid.includes('L')) leftOk++;
  }
  assert.ok(leftOk < 12, `왼쪽으로 피할 수 있는 공격이 ${leftOk}/40`);
});

test('스텝(리코): 서 있는 위치에 따라 피하는 방향이 바뀐다', () => {
  const riko = getOpponent('step');
  const f = toFight(makeFight({ opponent: riko }));
  f.opp.pos = -1;
  assert.deepEqual(riko.attacks[f.opp.resolveToken('cross', f)].avoid, ['R']);
  f.opp.pos = 1;
  assert.deepEqual(riko.attacks[f.opp.resolveToken('cross', f)].avoid, ['L']);
  f.opp.pos = 0;
  assert.deepEqual(riko.attacks[f.opp.resolveToken('cross', f)].avoid, ['duck']);
});

test('스텝 중에는 펀치가 빗나간다', () => {
  const f = toFight(makeFight({ opponent: getOpponent('step') }));
  f.opp.doStep(f);
  const ev = collect(f, 12, (f, i) => (i === 0 ? IN.JAB : 0));
  assert.ok(ev.some((e) => e.type === 'whiff'));
});

test('챔피언은 3페이즈, 5라운드', () => {
  const f = makeFight({ opponent: getOpponent('atlas') });
  assert.equal(f.maxRounds, 5);
  assert.equal(f.opp.phases.length, 3);
});

test('방어전 버전: 텔이 짧아지고 새 기술이 추가된다', () => {
  for (const o of OPPONENTS) {
    const n = makeFight({ opponent: o });
    const d = makeFight({ opponent: o, variant: 'defense' });
    const id = Object.keys(o.attacks)[0];
    assert.ok(d.opp.makeAttack(id, d).tellMs <= n.opp.makeAttack(id, n).tellMs);
    assert.ok(d.opp.phases[0].patterns.length > n.opp.phases[0].patterns.length, `${o.id} 방어전 패턴`);
  }
});

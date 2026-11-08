import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makePose, compileClip, sampleClip, lerpPose, solveElbow, PoseBlender } from '../src/render/rig.js';
import { buildClipSet, mirrorKey, BASE_CLIPS } from '../src/render/anims.js';

test('키프레임 보간: 중간값과 끝값', () => {
  const clip = compileClip({ keys: [{ t: 0, glx: 0 }, { t: 1, glx: 1, ease: 'linear' }] }, makePose());
  const out = makePose();
  sampleClip(out, clip, 0.5);
  assert.ok(Math.abs(out.glx - 0.5) < 1e-9);
  sampleClip(out, clip, 2);
  assert.equal(out.glx, 1);
});

test('키에 없는 값은 앞 키에서 이어받는다', () => {
  const clip = compileClip({ keys: [{ t: 0, glx: 0.3, y: 5 }, { t: 1, glx: 0.9 }] }, makePose());
  const out = makePose();
  sampleClip(out, clip, 1);
  assert.equal(out.y, 5);
});

test('반복 클립은 1을 넘으면 처음으로 돌아간다', () => {
  const clip = compileClip({ loop: true, keys: [{ t: 0, y: 0 }, { t: 0.5, y: 10, ease: 'linear' }, { t: 1, y: 0, ease: 'linear' }] }, makePose());
  const a = makePose();
  const b = makePose();
  sampleClip(a, clip, 0.25);
  sampleClip(b, clip, 1.25);
  assert.ok(Math.abs(a.y - b.y) < 1e-9);
});

test('좌우 반전: 왼손 훅 → 오른손 훅', () => {
  const m = mirrorKey({ glx: 1.5, gly: -1, glz: 0.7, twist: 0.5, rot: -0.1 });
  assert.equal(m.grx, -1.5);
  assert.equal(m.grz, 0.7);
  assert.equal(m.twist, -0.5);
  assert.equal(m.rot, 0.1);
  const set = buildClipSet();
  for (const name of ['hookR_tell', 'hookR_hit', 'hookR_whiff', 'jabR_tell', 'upperR_hit', 'bodyR_tell', 'straightR_hit', 'hurtR']) {
    assert.ok(set[name], `${name} 생성`);
  }
});

test('모든 공격 클립의 텔 끝 포즈 = 공격 시작 포즈 (끊김 없음)', () => {
  const set = buildClipSet();
  const base = makePose();
  for (const name of Object.keys(BASE_CLIPS)) {
    if (!name.endsWith('_tell')) continue;
    const pre = name.replace('_tell', '');
    const tell = compileClip(set[`${pre}_tell`], base);
    const hit = compileClip(set[`${pre}_hit`], base);
    const a = sampleClip(makePose(), tell, 1);
    const b = sampleClip(makePose(), hit, 0);
    for (const k of ['glx', 'gly', 'glz', 'grx', 'gry', 'grz']) {
      assert.ok(Math.abs(a[k] - b[k]) < 0.03, `${pre}.${k}: ${a[k]} vs ${b[k]}`);
    }
  }
});

test('IK: 팔 길이 안의 목표엔 정확히 닿고, 밖이면 최대로 뻗는다', () => {
  const e = solveElbow(0, 0, 100, 0, 80, 80, 1);
  assert.ok(Math.abs(e.tx - 100) < 1e-6);
  assert.ok(Math.abs(Math.hypot(e.ex, e.ey) - 80) < 1e-6);
  const f = solveElbow(0, 0, 500, 0, 80, 80, 1);
  assert.ok(f.tx < 161 && f.tx > 158);
});

test('블렌더: 상태가 바뀌면 이전 포즈에서 부드럽게 넘어간다', () => {
  const b = new PoseBlender();
  const p1 = makePose({ glx: 0 });
  const p2 = makePose({ glx: 1 });
  b.apply('a', p1, 16, 90);
  b.apply('a', p1, 200, 90);
  const mid = b.apply('b', p2, 30, 90);
  assert.ok(mid.glx > 0 && mid.glx < 1);
  const end = b.apply('b', p2, 200, 90);
  assert.equal(end.glx, 1);
});

test('lerpPose: 표정은 중간에 바뀐다', () => {
  const out = makePose();
  lerpPose(out, makePose({ expr: 'normal' }), makePose({ expr: 'hurt' }), 0.4);
  assert.equal(out.expr, 'normal');
  lerpPose(out, makePose({ expr: 'normal' }), makePose({ expr: 'hurt' }), 0.6);
  assert.equal(out.expr, 'hurt');
});

// 2D 뼈대 포즈와 키프레임 보간.
// 포즈 좌표: 몸 정규화 공간. y=0 엉덩이, y=-1 어깨 높이, x=±1 어깨 너비. z=장갑 깊이(1 기본, 클수록 카메라 쪽).
// gl = 상대의 왼손(화면 오른쪽), gr = 상대의 오른손(화면 왼쪽).

export const NUM_KEYS = [
  'x', 'y', 'rot', 'sx', 'sy', 'twist', 'hx', 'hy', 'hrot',
  'glx', 'gly', 'glz', 'grx', 'gry', 'grz', 'glow', 'shake',
];

export function makePose(over = {}) {
  return {
    x: 0, y: 0, rot: 0, sx: 1, sy: 1, twist: 0,
    hx: 0, hy: 0, hrot: 0,
    glx: 0.5, gly: -1.12, glz: 1,
    grx: -0.5, gry: -1.12, grz: 1,
    glow: 0, shake: 0,
    expr: 'normal',
    ...over,
  };
}

export const EASE = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  back: (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  snap: (t) => 1 - Math.pow(1 - t, 4),
  hold: () => 0,
};

export function lerpPose(out, a, b, t) {
  for (const k of NUM_KEYS) out[k] = a[k] + (b[k] - a[k]) * t;
  out.expr = t < 0.5 ? a.expr : b.expr;
  return out;
}

export function copyPose(out, a) {
  for (const k of NUM_KEYS) out[k] = a[k];
  out.expr = a.expr;
  return out;
}

// 클립: { loop?: bool, keys: [{ t:0..1, ease?, ...포즈 일부 }] }
// 키에 없는 값은 앞 키에서 이어받는다(첫 키는 기본 포즈에서).
export function compileClip(clip, base) {
  let prev = makePose(base);
  const keys = clip.keys.map((k) => {
    const full = makePose(prev);
    for (const f of Object.keys(k)) if (f !== 't' && f !== 'ease') full[f] = k[f];
    full.t = k.t;
    full.ease = k.ease || 'inOut';
    prev = full;
    return full;
  });
  return { loop: !!clip.loop, keys };
}

export function sampleClip(out, compiled, t) {
  const keys = compiled.keys;
  if (compiled.loop) t = ((t % 1) + 1) % 1;
  else t = Math.max(0, Math.min(1, t));
  if (t <= keys[0].t) return copyPose(out, keys[0]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (t <= b.t) {
      const u = (t - a.t) / Math.max(1e-6, b.t - a.t);
      return lerpPose(out, a, b, EASE[b.ease](u));
    }
  }
  return copyPose(out, keys[keys.length - 1]);
}

// 상태가 바뀔 때 이전 포즈에서 새 포즈로 짧게 섞어 준다(따라오는 동작).
export class PoseBlender {
  constructor() {
    this.from = makePose();
    this.cur = makePose();
    this.tmp = makePose();
    this.blendT = 1;
    this.blendMs = 90;
    this.key = null;
  }

  // key가 바뀌면 블렌드 시작
  apply(key, target, dt, blendMs = 90) {
    if (key !== this.key) {
      this.key = key;
      copyPose(this.from, this.cur);
      this.blendT = 0;
      this.blendMs = blendMs;
    }
    if (this.blendT < 1) {
      this.blendT = Math.min(1, this.blendT + dt / Math.max(1, this.blendMs));
      lerpPose(this.cur, this.from, target, EASE.out(this.blendT));
    } else {
      copyPose(this.cur, target);
    }
    return this.cur;
  }
}

// 2관절 IK: 어깨(sx,sy)에서 목표(tx,ty)까지, 위팔 a, 아래팔 b. bendSign으로 팔꿈치 방향.
export function solveElbow(sx, sy, tx, ty, a, b, bendSign) {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const max = (a + b) * 0.999;
  if (d > max) {
    dx *= max / d; dy *= max / d; d = max;
  }
  if (d < 1e-3) d = 1e-3;
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const ang = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const base = Math.atan2(dy, dx);
  const e = base + ang * bendSign;
  return { ex: sx + Math.cos(e) * a, ey: sy + Math.sin(e) * a, tx: sx + dx, ty: sy + dy };
}

// 간단한 스프링(머리 꺾임 등 2차 동작)
export class Spring {
  constructor(k = 0.3, damp = 0.32) {
    this.v = 0; this.x = 0; this.k = k; this.damp = damp;
  }
  kick(v) { this.v += v; }
  update(dt) {
    const steps = Math.max(1, Math.round(dt / 8));
    const s = dt / steps / 16;
    for (let i = 0; i < steps; i++) {
      this.v += (-this.k * this.x - this.damp * this.v) * s;
      this.x += this.v * s;
    }
    return this.x;
  }
}

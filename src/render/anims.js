// 상대 애니메이션 키프레임 데이터.
// 왼쪽(L: 상대의 왼손 = 화면 오른쪽) 기준으로 만들고 R은 좌우 반전으로 자동 생성한다.
// t는 0~1 진행률. 텔(_tell)의 진행률은 로직의 텔 시간과 1:1로 맞물린다.

const GUARD = { glx: 0.5, gly: -1.12, glz: 1, grx: -0.5, gry: -1.12, grz: 1 };

export const BASE_CLIPS = {
  idle: {
    loop: true,
    keys: [
      { t: 0, ...GUARD, y: 0, sy: 1, expr: 'normal' },
      { t: 0.5, y: 7, sy: 0.985, gly: -1.08, gry: -1.1, hy: 3 },
      { t: 1, y: 0, sy: 1, gly: -1.12, gry: -1.12, hy: 0 },
    ],
  },
  idleOpen: {
    loop: true,
    keys: [
      { t: 0, glx: 0.8, gly: -0.55, glz: 0.95, grx: -0.8, gry: -0.55, grz: 0.95, y: 0, expr: 'normal' },
      { t: 0.5, y: 8, sy: 0.98, gly: -0.5, gry: -0.52, hy: 4 },
      { t: 1, y: 0, sy: 1, gly: -0.55, gry: -0.55, hy: 0 },
    ],
  },
  bounce: { // 통통 튀는 스텝 대기(리코·카이)
    loop: true,
    keys: [
      { t: 0, ...GUARD, y: 0, sy: 1, expr: 'normal' },
      { t: 0.25, y: -14, sy: 1.03, gly: -1.16, gry: -1.1, ease: 'out' },
      { t: 0.5, y: 4, sy: 0.97, gly: -1.1, gry: -1.14, ease: 'in' },
      { t: 0.75, y: -14, sy: 1.03, gly: -1.14, gry: -1.16, ease: 'out' },
      { t: 1, y: 0, sy: 1, gly: -1.12, gry: -1.12, ease: 'in' },
    ],
  },
  block: {
    keys: [
      { t: 0, glx: 0.2, gly: -1.28, glz: 1.18, grx: -0.2, gry: -1.28, grz: 1.18, hy: 8, y: 4, expr: 'block' },
      { t: 1, glx: 0.2, gly: -1.26, glz: 1.16, grx: -0.2, gry: -1.26, grz: 1.16, hy: 8, y: 6 },
    ],
  },
  // ---- 훅 (왼손, 화면 오른쪽에서 날아옴 → 왼쪽으로 피하기) ----
  hookL_tell: {
    keys: [
      { t: 0, ...GUARD, expr: 'focus' },
      { t: 0.5, ease: 'out', glx: 1.45, gly: -1.05, glz: 0.74, twist: 0.55, rot: -0.1, hx: -14, sx: 1.03 },
      { t: 0.7, glow: 1 },
      { t: 1, glx: 1.6, gly: -1.0, glz: 0.68, twist: 0.68, rot: -0.13, hx: -18, glow: 1 },
    ],
  },
  hookL_hit: {
    keys: [
      { t: 0, glx: 1.6, gly: -1.0, glz: 0.68, twist: 0.68, rot: -0.13, hx: -18, glow: 1, expr: 'shout' },
      { t: 0.45, ease: 'snap', glx: 0.05, gly: -1.0, glz: 2.5, twist: -0.55, rot: 0.13, hx: 12, sx: 0.97, glow: 0 },
      { t: 1, glx: -0.08, gly: -0.96, glz: 2.4, twist: -0.6, rot: 0.14, hx: 14 },
    ],
  },
  hookL_whiff: {
    keys: [
      { t: 0, glx: 0.05, gly: -1.0, glz: 2.5, twist: -0.55, rot: 0.13, hx: 12, expr: 'surprised' },
      { t: 0.18, ease: 'out', glx: -0.75, gly: -0.78, glz: 1.4, twist: -0.85, rot: 0.28, x: -46, hx: 20 },
      { t: 0.35, expr: 'dizzy' },
      { t: 0.7, glx: -0.55, gly: -0.6, glz: 1.1, rot: 0.2, x: -34, hx: 10, hrot: 0.15 },
      { t: 1, glx: -0.3, gly: -0.75, glz: 1.0, rot: 0.1, x: -16, twist: -0.3, hrot: 0.05 },
    ],
  },
  // ---- 잽 (짧고 빠름) ----
  jabL_tell: {
    keys: [
      { t: 0, ...GUARD, expr: 'focus' },
      { t: 0.6, ease: 'out', glx: 0.7, gly: -1.15, glz: 0.8, twist: 0.25, rot: -0.04, hx: -6 },
      { t: 0.75, glow: 1 },
      { t: 1, glx: 0.75, gly: -1.14, glz: 0.76, twist: 0.3, glow: 1 },
    ],
  },
  jabL_hit: {
    keys: [
      { t: 0, glx: 0.75, gly: -1.14, glz: 0.76, twist: 0.3, glow: 1, expr: 'focus' },
      { t: 0.4, ease: 'snap', glx: 0.06, gly: -1.12, glz: 2.4, twist: -0.25, rot: 0.04, glow: 0 },
      { t: 1, glx: 0.1, gly: -1.1, glz: 2.2, twist: -0.2 },
    ],
  },
  jabL_whiff: {
    keys: [
      { t: 0, glx: 0.06, gly: -1.12, glz: 2.4, twist: -0.25, expr: 'surprised' },
      { t: 0.2, ease: 'out', glx: -0.35, gly: -1.0, glz: 1.6, twist: -0.5, rot: 0.15, x: -24 },
      { t: 0.4, expr: 'dizzy' },
      { t: 1, glx: 0.2, gly: -0.9, glz: 1.0, rot: 0.06, x: -8, twist: -0.1 },
    ],
  },
  // ---- 스트레이트 (왼손) ----
  straightL_tell: {
    keys: [
      { t: 0, ...GUARD, expr: 'focus' },
      { t: 0.55, ease: 'out', glx: 0.78, gly: -1.0, glz: 0.7, twist: 0.48, rot: -0.05, hy: 4, hx: -6 },
      { t: 0.72, glow: 1 },
      { t: 1, glx: 0.84, gly: -0.98, glz: 0.66, twist: 0.55, rot: -0.06, glow: 1 },
    ],
  },
  straightL_hit: {
    keys: [
      { t: 0, glx: 0.84, gly: -0.98, glz: 0.66, twist: 0.55, rot: -0.06, glow: 1, expr: 'shout' },
      { t: 0.4, ease: 'snap', glx: 0.0, gly: -1.12, glz: 2.75, twist: -0.4, rot: 0.03, y: -6, glow: 0 },
      { t: 1, glx: 0.02, gly: -1.1, glz: 2.6, twist: -0.4 },
    ],
  },
  straightL_whiff: {
    keys: [
      { t: 0, glx: 0.0, gly: -1.12, glz: 2.75, twist: -0.4, expr: 'surprised' },
      { t: 0.2, ease: 'out', glx: -0.4, gly: -1.0, glz: 1.9, rot: 0.2, x: -34, twist: -0.6 },
      { t: 0.4, expr: 'dizzy' },
      { t: 1, glx: 0.1, gly: -0.85, glz: 1.0, rot: 0.08, x: -10, twist: -0.1 },
    ],
  },
  // ---- 어퍼컷 (왼손, 아래에서 위로) ----
  upperL_tell: {
    keys: [
      { t: 0, ...GUARD, expr: 'focus' },
      { t: 0.55, ease: 'out', glx: 0.62, gly: -0.25, glz: 0.88, y: 20, sy: 0.94, twist: 0.32, rot: -0.07, hy: 10 },
      { t: 0.72, glow: 1 },
      { t: 1, glx: 0.66, gly: -0.18, glz: 0.85, y: 24, sy: 0.93, twist: 0.36, rot: -0.08, hy: 12, glow: 1 },
    ],
  },
  upperL_hit: {
    keys: [
      { t: 0, glx: 0.66, gly: -0.18, glz: 0.85, y: 24, sy: 0.93, twist: 0.36, rot: -0.08, hy: 12, glow: 1, expr: 'shout' },
      { t: 0.4, ease: 'snap', glx: 0.06, gly: -1.5, glz: 2.1, y: -18, sy: 1.08, twist: -0.3, rot: 0.05, hy: -14, glow: 0 },
      { t: 1, glx: 0.06, gly: -1.6, glz: 2.0, y: -20, sy: 1.07, twist: -0.3, hy: -16 },
    ],
  },
  upperL_whiff: {
    keys: [
      { t: 0, glx: 0.06, gly: -1.5, glz: 2.1, y: -18, sy: 1.08, twist: -0.3, hy: -14, expr: 'surprised' },
      { t: 0.25, ease: 'out', glx: -0.2, gly: -1.95, glz: 1.3, y: -24, sy: 1.1, rot: 0.15, x: -20, hy: -24 },
      { t: 0.45, expr: 'dizzy' },
      { t: 1, glx: 0.3, gly: -1.0, glz: 1.0, y: 0, sy: 1, rot: 0.06, x: -8, hy: 0 },
    ],
  },
  // ---- 몸통 치기 (가드만 가능) ----
  bodyL_tell: {
    keys: [
      { t: 0, ...GUARD, expr: 'focus' },
      { t: 0.55, ease: 'out', glx: 0.95, gly: -0.35, glz: 0.78, y: 16, sy: 0.95, twist: 0.42, rot: -0.06, hy: 12 },
      { t: 0.72, glow: 1 },
      { t: 1, glx: 1.0, gly: -0.3, glz: 0.75, y: 18, sy: 0.94, twist: 0.48, hy: 14, glow: 1 },
    ],
  },
  bodyL_hit: {
    keys: [
      { t: 0, glx: 1.0, gly: -0.3, glz: 0.75, y: 18, sy: 0.94, twist: 0.48, hy: 14, glow: 1, expr: 'shout' },
      { t: 0.4, ease: 'snap', glx: 0.12, gly: -0.5, glz: 2.3, y: 22, twist: -0.4, rot: 0.06, glow: 0 },
      { t: 1, glx: 0.1, gly: -0.52, glz: 2.2, y: 22, twist: -0.42 },
    ],
  },
  bodyL_whiff: {
    keys: [
      { t: 0, glx: 0.12, gly: -0.5, glz: 2.3, y: 22, twist: -0.4, expr: 'surprised' },
      { t: 0.3, ease: 'out', glx: -0.3, gly: -0.4, glz: 1.6, y: 28, rot: 0.18, x: -26 },
      { t: 0.45, expr: 'dizzy' },
      { t: 1, glx: 0.4, gly: -0.7, glz: 1.0, y: 6, rot: 0.05, x: -8 },
    ],
  },
  // ---- 내려찍기 (양손, 숙이기) ----
  swing_tell: {
    keys: [
      { t: 0, ...GUARD, expr: 'focus' },
      { t: 0.5, ease: 'out', glx: 0.55, gly: -2.05, glz: 0.9, grx: -0.55, gry: -2.05, grz: 0.9, y: -12, sy: 1.06, hy: -6, rot: 0 },
      { t: 0.7, glow: 1, expr: 'shout' },
      { t: 1, glx: 0.5, gly: -2.15, glz: 0.85, grx: -0.5, gry: -2.15, grz: 0.85, y: -16, sy: 1.08, hy: -8, glow: 1 },
    ],
  },
  swing_hit: {
    keys: [
      { t: 0, glx: 0.5, gly: -2.15, glz: 0.85, grx: -0.5, gry: -2.15, grz: 0.85, y: -16, sy: 1.08, glow: 1, expr: 'shout' },
      { t: 0.45, ease: 'snap', glx: 0.16, gly: -1.0, glz: 2.3, grx: -0.16, gry: -1.0, grz: 2.3, y: 16, sy: 0.92, hy: 8, glow: 0 },
      { t: 1, glx: 0.16, gly: -0.95, glz: 2.2, grx: -0.16, gry: -0.95, grz: 2.2, y: 18, sy: 0.92 },
    ],
  },
  swing_whiff: {
    keys: [
      { t: 0, glx: 0.16, gly: -1.0, glz: 2.3, grx: -0.16, gry: -1.0, grz: 2.3, y: 16, sy: 0.92, expr: 'surprised' },
      { t: 0.22, ease: 'out', glx: 0.25, gly: -0.35, glz: 1.6, grx: -0.25, gry: -0.35, grz: 1.6, y: 40, sy: 0.88, hy: 16, rot: 0.05 },
      { t: 0.4, expr: 'dizzy' },
      { t: 1, glx: 0.6, gly: -0.6, glz: 1.0, grx: -0.6, gry: -0.6, grz: 1.0, y: 14, sy: 0.96, hy: 6, rot: 0 },
    ],
  },
  // ---- 클린치 (붙잡기) ----
  clinch_tell: {
    keys: [
      { t: 0, ...GUARD, expr: 'focus' },
      { t: 0.55, ease: 'out', glx: 1.5, gly: -1.15, glz: 0.9, grx: -1.5, gry: -1.15, grz: 0.9, y: 8, sx: 1.05, hy: 6 },
      { t: 0.75, glow: 1, expr: 'smug' },
      { t: 1, glx: 1.6, gly: -1.1, glz: 0.88, grx: -1.6, gry: -1.1, grz: 0.88, y: 10, glow: 1 },
    ],
  },
  clinch_hit: {
    keys: [
      { t: 0, glx: 1.6, gly: -1.1, glz: 0.88, grx: -1.6, gry: -1.1, grz: 0.88, y: 10, glow: 1, expr: 'smug' },
      { t: 0.5, ease: 'snap', glx: 0.35, gly: -0.85, glz: 2.1, grx: -0.35, gry: -0.85, grz: 2.1, y: 26, sy: 1.04, glow: 0 },
      { t: 1, glx: 0.32, gly: -0.85, glz: 2.1, grx: -0.32, gry: -0.85, grz: 2.1, y: 28 },
    ],
  },
  clinch_whiff: {
    keys: [
      { t: 0, glx: 0.35, gly: -0.85, glz: 2.1, grx: -0.35, gry: -0.85, grz: 2.1, y: 26, expr: 'surprised' },
      { t: 0.25, ease: 'out', glx: 0.1, gly: -0.6, glz: 1.5, grx: -0.1, gry: -0.6, grz: 1.5, y: 44, sy: 0.9, rot: 0.1, x: -30 },
      { t: 0.45, expr: 'dizzy' },
      { t: 1, glx: 0.6, gly: -0.6, glz: 1.0, grx: -0.6, gry: -0.6, grz: 1.0, y: 10, rot: 0.04, x: -10 },
    ],
  },
  clinchHold: {
    loop: true,
    keys: [
      { t: 0, glx: 0.32, gly: -0.85, glz: 2.1, grx: -0.32, gry: -0.85, grz: 2.1, y: 28, sy: 1.04, expr: 'smug' },
      { t: 0.5, y: 32, rot: 0.03 },
      { t: 1, y: 28, rot: 0 },
    ],
  },
  // ---- 맞음 ----
  hurtL: { // 화면 왼쪽에서 맞음(내 잽) → 머리가 화면 오른쪽으로
    keys: [
      { t: 0, ...GUARD, expr: 'hurt' },
      { t: 0.18, ease: 'snap', hx: 30, hrot: 0.32, x: 14, rot: 0.07, glx: 0.75, gly: -0.9, grx: -0.38, gry: -1.0, sx: 1.04, sy: 0.96 },
      { t: 1, hx: 6, hrot: 0.06, x: 4, rot: 0.02, glx: 0.55, gly: -1.05, grx: -0.48, gry: -1.08, sx: 1, sy: 1 },
    ],
  },
  hurtUp: {
    keys: [
      { t: 0, ...GUARD, expr: 'hurtBig' },
      { t: 0.18, ease: 'snap', hy: -26, y: -10, sy: 1.06, glx: 0.85, gly: -1.3, grx: -0.85, gry: -1.3, glz: 0.9, grz: 0.9 },
      { t: 1, hy: -4, y: 0, sy: 1, glx: 0.6, gly: -1.0, grx: -0.6, gry: -1.0, glz: 1, grz: 1 },
    ],
  },
  counterStun: {
    keys: [
      { t: 0, expr: 'hurtBig' },
      { t: 0.12, ease: 'snap', y: -14, hy: -30, sy: 1.08, rot: -0.06, glx: 1.25, gly: -1.35, glz: 0.85, grx: -1.25, gry: -1.35, grz: 0.85 },
      { t: 0.35, expr: 'dizzy', y: 10, sy: 0.95, hy: 6, rot: 0.08 },
      { t: 0.7, rot: -0.08, x: 10, glx: 0.9, gly: -0.6, grx: -0.9, gry: -0.6 },
      { t: 1, rot: 0.04, x: 0, y: 4, glx: 0.8, gly: -0.6, grx: -0.8, gry: -0.6 },
    ],
  },
  guardBroken: {
    keys: [
      { t: 0, expr: 'surprised' },
      { t: 0.15, ease: 'snap', glx: 1.35, gly: -1.55, glz: 0.85, grx: -1.35, gry: -1.55, grz: 0.85, y: -8, hy: -12, sy: 1.05 },
      { t: 0.5, expr: 'hurt' },
      { t: 1, glx: 1.1, gly: -1.0, grx: -1.1, gry: -1.0, y: 0, hy: 0, sy: 1 },
    ],
  },
  shoved: {
    keys: [
      { t: 0, expr: 'surprised' },
      { t: 0.2, ease: 'out', y: -8, x: 0, glx: 1.0, gly: -0.7, grx: -1.0, gry: -0.7, glz: 0.9, grz: 0.9, sy: 1.04, rot: -0.05 },
      { t: 0.4, expr: 'dizzy' },
      { t: 1, glx: 0.8, gly: -0.6, grx: -0.8, gry: -0.6, y: 2, sy: 1, rot: 0.03 },
    ],
  },
  tired: {
    loop: true,
    keys: [
      { t: 0, glx: 0.72, gly: -0.42, glz: 0.95, grx: -0.72, gry: -0.42, grz: 0.95, y: 20, sy: 0.95, hy: 14, expr: 'tired' },
      { t: 0.5, y: 28, sy: 0.93, hy: 18, gly: -0.38, gry: -0.38 },
      { t: 1, y: 20, sy: 0.95, hy: 14, gly: -0.42, gry: -0.42 },
    ],
  },
  taunt: {
    loop: true,
    keys: [
      { t: 0, glx: 1.15, gly: -0.55, glz: 0.95, grx: -1.15, gry: -0.55, grz: 0.95, hrot: 0.12, expr: 'smug' },
      { t: 0.5, glx: 1.25, gly: -0.65, grx: -1.25, gry: -0.65, hrot: -0.12, y: 6 },
      { t: 1, glx: 1.15, gly: -0.55, grx: -1.15, gry: -0.55, hrot: 0.12, y: 0 },
    ],
  },
  phase: {
    keys: [
      { t: 0, expr: 'angry' },
      { t: 0.25, ease: 'out', glx: 1.05, gly: -0.65, glz: 0.95, grx: -1.05, gry: -0.65, grz: 0.95, y: 14, sy: 0.94, hy: 8, shake: 1, expr: 'shout' },
      { t: 0.75, y: 6, sy: 1.04, sx: 1.06, glow: 1, shake: 1 },
      { t: 1, ...GUARD, y: 0, sy: 1, sx: 1, glow: 0, shake: 0, expr: 'angry' },
    ],
  },
  down: {
    keys: [
      { t: 0, expr: 'hurtBig' },
      { t: 0.25, ease: 'out', y: 60, rot: 0.18, hy: -10, glx: 1.0, gly: -1.4, grx: -1.1, gry: -1.2, sy: 1.04 },
      { t: 0.45, expr: 'dizzy' },
      { t: 0.75, ease: 'in', y: 250, rot: 0.32, sy: 0.85, hy: 12, glx: 1.25, gly: -0.4, grx: -1.25, gry: -0.4, glz: 0.95, grz: 0.95 },
      { t: 1, y: 245, rot: 0.3, sy: 0.86 },
    ],
  },
  getup: {
    keys: [
      { t: 0, y: 245, rot: 0.3, sy: 0.86, hy: 12, glx: 1.25, gly: -0.4, grx: -1.25, gry: -0.4, expr: 'dizzy' },
      { t: 0.6, ease: 'out', y: 30, rot: -0.05, sy: 1, hy: 0, glx: 0.7, gly: -0.8, grx: -0.7, gry: -0.8, expr: 'angry' },
      { t: 1, ...GUARD, y: 0, rot: 0 },
    ],
  },
  ko: {
    keys: [
      { t: 0, expr: 'ko' },
      { t: 0.35, ease: 'out', y: 80, rot: -0.2, hy: -14, glx: 1.2, gly: -1.6, grx: -1.2, gry: -1.6 },
      { t: 1, ease: 'in', y: 330, rot: -0.55, sy: 0.85, hy: 10, glx: 1.5, gly: -0.6, grx: -1.4, gry: -0.4 },
    ],
  },
  win: {
    loop: true,
    keys: [
      { t: 0, glx: 0.75, gly: -2.2, glz: 0.95, grx: -0.75, gry: -2.2, grz: 0.95, expr: 'happy', y: 0 },
      { t: 0.5, y: -18, sy: 1.04, gly: -2.35, gry: -2.35 },
      { t: 1, y: 0, sy: 1, gly: -2.2, gry: -2.2 },
    ],
  },
};

const MIRROR_NEG = ['x', 'rot', 'twist', 'hx', 'hrot'];

export function mirrorKey(k) {
  const m = { ...k };
  for (const f of MIRROR_NEG) if (f in k) m[f] = -k[f];
  delete m.glx; delete m.gly; delete m.glz; delete m.grx; delete m.gry; delete m.grz;
  if ('grx' in k) m.glx = -k.grx;
  if ('gry' in k) m.gly = k.gry;
  if ('grz' in k) m.glz = k.grz;
  if ('glx' in k) m.grx = -k.glx;
  if ('gly' in k) m.gry = k.gly;
  if ('glz' in k) m.grz = k.glz;
  return m;
}

export function mirrorClip(clip) {
  return { loop: clip.loop, keys: clip.keys.map(mirrorKey) };
}

// L 클립에서 R 클립 자동 생성
export function buildClipSet(extra = {}) {
  const set = { ...BASE_CLIPS, ...extra };
  for (const name of Object.keys(set)) {
    const m = name.match(/^(\w+?)L(_\w+)?$/);
    if (m) {
      const rName = `${m[1]}R${m[2] || ''}`;
      if (!set[rName]) set[rName] = mirrorClip(set[name]);
    }
  }
  if (!set.hurtR) set.hurtR = mirrorClip(set.hurtL);
  return set;
}

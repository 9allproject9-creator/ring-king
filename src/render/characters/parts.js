// 캐릭터 부위별 그리기. 나중에 그림 파일로 바꿀 때 이 함수들만 교체하면 된다.
import { solveElbow } from '../rig.js';
import { shade, hexA, starPath } from '../ring.js';

export const INK = '#1a1410';
const LW = 5;

// 표정 세트
export const EXPRESSIONS = {
  normal: { eye: 'open', brow: 0, mouth: 'line' },
  focus: { eye: 'focus', brow: -0.3, mouth: 'line' },
  hurt: { eye: 'shut', brow: 0.35, mouth: 'wobble' },
  hurtBig: { eye: 'shut', brow: 0.45, mouth: 'open', sweat: true },
  dizzy: { eye: 'spiral', brow: 0.3, mouth: 'open', tongue: true },
  tired: { eye: 'half', brow: 0.3, mouth: 'pant', sweat: true },
  smug: { eye: 'open', brow: 0, browUp: true, mouth: 'smirk' },
  angry: { eye: 'focus', brow: -0.5, mouth: 'teeth' },
  surprised: { eye: 'wide', brow: 0.4, mouth: 'o' },
  ko: { eye: 'x', brow: 0.2, mouth: 'open', tongue: true },
  happy: { eye: 'happy', brow: 0.15, mouth: 'grin' },
  block: { eye: 'squint', brow: -0.35, mouth: 'teeth' },
  shout: { eye: 'focus', brow: -0.5, mouth: 'shout' },
  sly: { eye: 'half', brow: -0.1, browUp: true, mouth: 'smirk' },
  blink: { eye: 'closed', brow: 0, mouth: 'line' },
  calm: { eye: 'half', brow: 0, mouth: 'line' },
  grin: { eye: 'open', brow: -0.15, mouth: 'grin' },
};

// 캐릭터별 표정 바꾸기: look.exprMap = { normal: 'calm', ... }
export function resolveExpr(look, expr) {
  return (look.exprMap && look.exprMap[expr]) || expr;
}

export function bodyDims(look) {
  const b = look.build;
  return {
    S: 112 * b.w,
    T: 205 * b.h,
    HR: 56 * (b.head || 1),
    neck: 26 * (b.neck || 1),
    armA: 104 * (b.arm || 1) * b.h,
    armB: 96 * (b.arm || 1) * b.h,
    GR: 40 * (b.glove || 1),
  };
}

// 몸 전체 (정면)
export function drawFrontBody(ctx, look, pose, opt = {}) {
  const d = bodyDims(look);
  const { S, T, HR } = d;
  const tw = pose.twist;
  const shL = { x: S * (1 - Math.max(0, tw) * 0.2) + Math.min(0, tw) * -6, y: -T + Math.max(0, tw) * 10 };
  const shR = { x: -S * (1 - Math.max(0, -tw) * 0.2) + Math.max(0, tw) * -6 * -1, y: -T + Math.max(0, -tw) * 10 };
  const gl = { x: pose.glx * S, y: pose.gly * T, z: pose.glz };
  const gr = { x: pose.grx * S, y: pose.gry * T, z: pose.grz };
  const head = { x: pose.hx + tw * -8, y: -T - d.neck - HR * 0.78 + pose.hy };

  const back = [];
  const front = [];
  (gl.z < 0.86 ? back : front).push(['L', shL, gl]);
  (gr.z < 0.86 ? back : front).push(['R', shR, gr]);
  // 먼 팔 먼저
  front.sort((a, b) => a[2].z - b[2].z);

  for (const [side, sh, g] of back) drawArm(ctx, look, d, side, sh, g, opt);
  drawLegs(ctx, look, d);
  drawTorso(ctx, look, d, pose, opt);
  drawTrunks(ctx, look, d, opt);
  drawNeck(ctx, look, d, head);
  ctx.save();
  ctx.translate(head.x, head.y);
  ctx.rotate(pose.hrot);
  drawHead(ctx, look, d, pose, opt);
  ctx.restore();
  for (const [side, sh, g] of front) drawArm(ctx, look, d, side, sh, g, opt);
  return { head, gl, gr };
}

function strokeFill(ctx, fill, lw = LW) {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

export function drawLegs(ctx, look, d) {
  const { S } = d;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(sgn * S * 0.12, 60);
    ctx.lineTo(sgn * S * 0.62, 60);
    ctx.lineTo(sgn * S * 0.66, 300);
    ctx.lineTo(sgn * S * 0.16, 300);
    ctx.closePath();
    strokeFill(ctx, shade(look.skin, -0.08));
  }
}

export function drawTorso(ctx, look, d, pose, opt) {
  const { S, T } = d;
  const b = look.build;
  const belly = b.belly || 0;
  const hipW = (0.6 + belly * 0.3) * S;
  const bulge = belly * 0.4 * S;
  ctx.beginPath();
  ctx.moveTo(-S * 0.95, -T + 4);
  ctx.quadraticCurveTo(-S * 0.5, -T - 26, 0, -T - 22);
  ctx.quadraticCurveTo(S * 0.5, -T - 26, S * 0.95, -T + 4);
  ctx.bezierCurveTo(S * 1.12, -T + 40, S * 0.86 + bulge, -T * 0.42, hipW, 0);
  ctx.lineTo(-hipW, 0);
  ctx.bezierCurveTo(-S * 0.86 - bulge, -T * 0.42, -S * 1.12, -T + 40, -S * 0.95, -T + 4);
  ctx.closePath();
  const skin = opt.skin || look.skin;
  const gr = ctx.createLinearGradient(-S, 0, S, 0);
  gr.addColorStop(0, shade(skin, -0.18 - pose.twist * 0.08));
  gr.addColorStop(0.45, shade(skin, 0.06));
  gr.addColorStop(1, shade(skin, -0.18 + pose.twist * 0.08));
  ctx.save();
  if (opt.outlineGlow) {
    ctx.shadowColor = opt.outlineGlow;
    ctx.shadowBlur = 28;
  }
  strokeFill(ctx, gr, 6);
  ctx.restore();
  // 가슴·배 선
  ctx.strokeStyle = hexA('#000000', 0.22);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-S * 0.55, -T * 0.7);
  ctx.quadraticCurveTo(-S * 0.25, -T * 0.6, -S * 0.04, -T * 0.72);
  ctx.moveTo(S * 0.55, -T * 0.7);
  ctx.quadraticCurveTo(S * 0.25, -T * 0.6, S * 0.04, -T * 0.72);
  ctx.stroke();
  if (belly < 0.2) {
    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const y = -T * 0.5 + i * T * 0.13;
      ctx.moveTo(-S * 0.2, y);
      ctx.lineTo(-S * 0.04, y + 3);
      ctx.moveTo(S * 0.2, y);
      ctx.lineTo(S * 0.04, y + 3);
    }
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(0, -T * 0.2, 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // 땀(지침)
  if (opt.sweaty) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(((i * 37) % 120) - 60, -T * 0.3 - ((i * 53) % 110), 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (look.extras && look.extras.includes('steam') && opt.time !== undefined) {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    for (let i = 0; i < 5; i++) {
      const ph = ((opt.time / 900 + i / 5) % 1);
      ctx.beginPath();
      ctx.arc((i - 2) * S * 0.4 + Math.sin(ph * 6 + i) * 10, -T - ph * 160, 14 + ph * 20, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function drawTrunks(ctx, look, d) {
  const { S } = d;
  const belly = look.build.belly || 0;
  const w = (0.66 + belly * 0.3) * S;
  ctx.beginPath();
  ctx.moveTo(-w, -24);
  ctx.lineTo(w, -24);
  ctx.lineTo(w * 1.06, 92);
  ctx.lineTo(S * 0.08, 98);
  ctx.lineTo(0, 70);
  ctx.lineTo(-S * 0.08, 98);
  ctx.lineTo(-w * 1.06, 92);
  ctx.closePath();
  strokeFill(ctx, look.trunks);
  ctx.beginPath();
  ctx.rect(-w, -26, w * 2, 20);
  strokeFill(ctx, look.trim || '#ffffff', 4);
  // 옆 줄무늬
  ctx.fillStyle = hexA(look.trim || '#ffffff', 0.7);
  ctx.fillRect(-w * 1.02, -6, 10, 96);
  ctx.fillRect(w * 1.02 - 10, -6, 10, 96);
  if (look.extras && look.extras.includes('bolt')) {
    ctx.fillStyle = '#ffe23a';
    ctx.beginPath();
    ctx.moveTo(-8, 4); ctx.lineTo(10, 4); ctx.lineTo(0, 30); ctx.lineTo(14, 30); ctx.lineTo(-10, 66); ctx.lineTo(-2, 38); ctx.lineTo(-14, 38);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.stroke();
  }
  if (look.extras && look.extras.includes('belt')) {
    ctx.beginPath();
    ctx.rect(-w * 1.05, -34, w * 2.1, 38);
    strokeFill(ctx, '#c9a227', 4);
    ctx.beginPath();
    ctx.ellipse(0, -15, 44, 30, 0, 0, Math.PI * 2);
    strokeFill(ctx, '#ffd84a', 4);
    ctx.fillStyle = '#b31d2a';
    starPath(ctx, 0, -15, 16, 5);
    ctx.fill();
  }
}

function drawNeck(ctx, look, d, head) {
  const w = d.S * 0.3 * (look.build.neck || 1);
  ctx.beginPath();
  ctx.moveTo(-w, -d.T + 2);
  ctx.lineTo(-w * 0.85 + head.x * 0.5, head.y + d.HR * 0.4);
  ctx.lineTo(w * 0.85 + head.x * 0.5, head.y + d.HR * 0.4);
  ctx.lineTo(w, -d.T + 2);
  ctx.closePath();
  strokeFill(ctx, shade(look.skin, -0.12));
}

export function drawArm(ctx, look, d, side, sh, g, opt) {
  const sideSign = side === 'L' ? 1 : -1;
  const zf = Math.max(0, Math.min(1.6, g.z - 1)) / 1.6;
  const a = d.armA * (1 - 0.42 * zf);
  const b = d.armB * (1 - 0.42 * zf);
  const e1 = solveElbow(sh.x, sh.y, g.x, g.y, a, b, 1);
  const e2 = solveElbow(sh.x, sh.y, g.x, g.y, a, b, -1);
  const score = (e) => e.ex * sideSign + e.ey * 0.7;
  const e = score(e1) > score(e2) ? e1 : e2;
  const thick = 34 * (look.build.arm || 1) * (0.8 + 0.25 * g.z);
  const skin = opt.skin || look.skin;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = thick + LW * 2;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y + 6);
  ctx.lineTo(e.ex, e.ey);
  ctx.lineTo(e.tx, e.ty);
  ctx.stroke();
  ctx.strokeStyle = shade(skin, g.z < 1 ? -0.15 : 0);
  ctx.lineWidth = thick;
  ctx.stroke();
  // 어깨 둥글게
  ctx.beginPath();
  ctx.arc(sh.x, sh.y + 8, thick * 0.62, 0, Math.PI * 2);
  ctx.fillStyle = shade(skin, -0.05);
  ctx.fill();
  const ang = Math.atan2(e.ty - e.ey, e.tx - e.ex);
  drawGlove(ctx, e.tx, e.ty, d.GR * g.z, ang, look.gloves, sideSign, opt.glovePattern, opt);
}

// 장갑: 정면/옆 공용
export function drawGlove(ctx, x, y, r, ang, color, sideSign = 1, pattern, opt = {}) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang - Math.PI / 2);
  if (opt.outlineGlow) {
    ctx.shadowColor = opt.outlineGlow;
    ctx.shadowBlur = 24;
  }
  // 손목 커프
  ctx.beginPath();
  ctx.rect(-r * 0.55, -r * 1.25, r * 1.1, r * 0.55);
  strokeFill(ctx, '#f4f4f4', LW * Math.min(1.4, Math.max(0.7, r / 40)));
  // 본체
  ctx.beginPath();
  ctx.ellipse(0, 0, r, r * 1.06, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, shade(color, 0.35));
  g.addColorStop(0.6, color);
  g.addColorStop(1, shade(color, -0.3));
  strokeFill(ctx, g, LW * Math.min(1.4, Math.max(0.7, r / 40)));
  ctx.shadowBlur = 0;
  // 엄지
  ctx.beginPath();
  ctx.ellipse(sideSign * -r * 0.78, -r * 0.2, r * 0.32, r * 0.5, sideSign * 0.4, 0, Math.PI * 2);
  strokeFill(ctx, shade(color, -0.08), LW * 0.8);
  if (pattern) drawGlovePattern(ctx, r, pattern);
  // 반짝임
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.45, r * 0.28, r * 0.15, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawGlovePattern(ctx, r, pattern) {
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.94, r, 0, 0, Math.PI * 2);
  ctx.clip();
  if (pattern === 'stripe') {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillRect(-r, -r * 0.15, r * 2, r * 0.22);
  } else if (pattern === 'star') {
    ctx.fillStyle = '#ffe23a';
    starPath(ctx, 0, r * 0.15, r * 0.42, 5);
    ctx.fill();
  } else if (pattern === 'flame') {
    ctx.fillStyle = '#ffb02a';
    ctx.beginPath();
    ctx.moveTo(-r, r);
    for (let i = 0; i <= 6; i++) ctx.lineTo(-r + (i * r) / 3, r * (0.1 + (i % 2) * 0.45));
    ctx.lineTo(r, r);
    ctx.fill();
  } else if (pattern === 'bolt') {
    ctx.fillStyle = '#ffe23a';
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.6); ctx.lineTo(r * 0.3, -r * 0.6); ctx.lineTo(0, 0); ctx.lineTo(r * 0.3, 0); ctx.lineTo(-r * 0.25, r * 0.7); ctx.lineTo(-r * 0.05, r * 0.15); ctx.lineTo(-r * 0.35, r * 0.15);
    ctx.closePath();
    ctx.fill();
  } else if (pattern === 'dots') {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.arc(Math.cos(i * 2.4) * r * 0.55, Math.sin(i * 2.4) * r * 0.55, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === 'heart') {
    ctx.fillStyle = '#ff6fa8';
    ctx.beginPath();
    const s = r * 0.35;
    ctx.moveTo(0, s * 1.2);
    ctx.bezierCurveTo(-s * 2, -s * 0.3, -s * 0.6, -s * 1.6, 0, -s * 0.5);
    ctx.bezierCurveTo(s * 0.6, -s * 1.6, s * 2, -s * 0.3, 0, s * 1.2);
    ctx.fill();
  } else if (pattern === 'gold') {
    ctx.fillStyle = 'rgba(255,230,120,0.5)';
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.fillStyle = '#fff6c0';
    starPath(ctx, r * 0.3, -r * 0.2, r * 0.18, 4, 0.3);
    ctx.fill();
  }
  ctx.restore();
}

// 머리: 귀, 얼굴, 머리 모양
export function drawHead(ctx, look, d, pose, opt) {
  const R = d.HR;
  const hair = look.hair || { style: 'buzz', color: '#222' };
  const skin = opt.skin || look.skin;
  drawHairBack(ctx, hair, R, opt.time || 0);
  // 귀
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * R * 0.98, R * 0.05, R * 0.18, R * 0.26, 0, 0, Math.PI * 2);
    strokeFill(ctx, shade(skin, -0.05), 4);
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, R, R * 1.08, 0, 0, Math.PI * 2);
  const g = ctx.createRadialGradient(-R * 0.3, -R * 0.4, R * 0.2, 0, 0, R * 1.2);
  g.addColorStop(0, shade(skin, 0.12));
  g.addColorStop(1, shade(skin, -0.12));
  ctx.save();
  if (opt.outlineGlow) {
    ctx.shadowColor = opt.outlineGlow;
    ctx.shadowBlur = 26;
  }
  strokeFill(ctx, g, 6);
  ctx.restore();
  drawFace(ctx, look, R, pose, opt);
  drawHairFront(ctx, hair, R);
  drawExtras(ctx, look, R, opt);
}

export function drawFace(ctx, look, R, pose, opt) {
  const ex = EXPRESSIONS[resolveExpr(look, pose.expr)] || EXPRESSIONS.normal;
  const eyeY = -R * 0.04;
  const eyeX = R * 0.37;
  const eyeSize = look.eyes === 'big' ? 1.25 : look.eyes === 'small' ? 0.8 : look.eyes === 'sharp' ? 0.95 : 1;
  const er = R * 0.13 * eyeSize;
  ctx.lineCap = 'round';
  // 볼터치/주근깨 등은 extras에서
  for (const s of [-1, 1]) {
    const x = s * eyeX;
    ctx.save();
    ctx.translate(x, eyeY);
    drawEye(ctx, ex.eye, er, s, look, opt);
    ctx.restore();
    // 눈썹
    const browY = eyeY - er * 1.9 - (ex.browUp && s > 0 ? er * 0.7 : 0);
    const tilt = ex.brow * s * -1;
    ctx.save();
    ctx.translate(x, browY);
    ctx.rotate(tilt * 0.9);
    ctx.strokeStyle = (look.hair && look.hair.browColor) || (look.hair ? look.hair.color : INK);
    if (ctx.strokeStyle === '#ffffff' || ctx.strokeStyle === '#f4f4f4') ctx.strokeStyle = '#999';
    ctx.lineWidth = look.brow === 'thick' ? 9 : look.brow === 'thin' ? 3.5 : 6;
    ctx.beginPath();
    ctx.moveTo(-er * 1.4, 0);
    ctx.quadraticCurveTo(0, -er * 0.5, er * 1.4, 0);
    ctx.stroke();
    ctx.restore();
  }
  if (look.brow === 'uni') {
    ctx.strokeStyle = look.hair.color;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(-eyeX + er, eyeY - er * 1.9);
    ctx.lineTo(eyeX - er, eyeY - er * 1.9);
    ctx.stroke();
  }
  // 코
  ctx.strokeStyle = shade(look.skin, -0.35);
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (look.nose === 'round') {
    ctx.arc(0, R * 0.22, R * 0.12, 0.2, Math.PI - 0.2);
  } else if (look.nose === 'big') {
    ctx.ellipse(0, R * 0.2, R * 0.16, R * 0.12, 0, 0, Math.PI);
  } else {
    ctx.moveTo(-R * 0.02, R * 0.05);
    ctx.lineTo(-R * 0.08, R * 0.26);
    ctx.lineTo(R * 0.06, R * 0.28);
  }
  ctx.stroke();
  drawMouth(ctx, ex, R, look);
  if (ex.sweat || opt.sweaty) {
    ctx.fillStyle = '#9fdcff';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    for (const [sx, sy, sc] of [[R * 0.85, -R * 0.55, 1], [-R * 0.9, -R * 0.2, 0.8]]) {
      ctx.beginPath();
      ctx.moveTo(sx, sy - 12 * sc);
      ctx.quadraticCurveTo(sx + 8 * sc, sy, sx, sy + 6 * sc);
      ctx.quadraticCurveTo(sx - 8 * sc, sy, sx, sy - 12 * sc);
      ctx.fill();
      ctx.stroke();
    }
  }
  // 텔: 눈 반짝임 (진짜 공격에만)
  if (pose.glow > 0.02 && opt.glowColor) {
    for (const s of [-1, 1]) {
      const a = Math.min(1, pose.glow);
      ctx.save();
      ctx.translate(s * eyeX, eyeY);
      ctx.globalAlpha = a;
      ctx.fillStyle = hexA(opt.glowColor, 0.35);
      ctx.beginPath();
      ctx.arc(0, 0, er * 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = opt.glowColor;
      starPath(ctx, 0, 0, er * 1.8 * (0.8 + 0.2 * a), 4, 0.28);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      starPath(ctx, 0, 0, er * 0.9, 4, 0.3);
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawEye(ctx, type, r, s, look, opt) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  const pupil = look.eyeColor || '#2a1a10';
  switch (type) {
    case 'shut':
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-s * -r * 1.0, -r * 0.65);
      ctx.lineTo(-s * r * 0.7, 0);
      ctx.lineTo(-s * -r * 1.0, r * 0.65);
      ctx.stroke();
      break;
    case 'half':
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 1.05, r * 0.95, 0, 0, Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, r * 0.25, r * 0.45, 0, Math.PI);
      ctx.fillStyle = pupil;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-r * 1.15, 0);
      ctx.lineTo(r * 1.15, 0);
      ctx.lineWidth = 5;
      ctx.stroke();
      break;
    case 'spiral':
      ctx.beginPath();
      for (let i = 0; i < 26; i++) {
        const a = i * 0.55 + (opt.time || 0) / 120 * s;
        const rr = (i / 26) * r * 1.2;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = 3;
      ctx.stroke();
      break;
    case 'x':
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-r, -r); ctx.lineTo(r, r);
      ctx.moveTo(r, -r); ctx.lineTo(-r, r);
      ctx.stroke();
      break;
    case 'happy':
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, r * 0.4, r, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    case 'closed':
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, r * 0.1);
      ctx.quadraticCurveTo(0, r * 0.5, r * 1.0, r * 0.1);
      ctx.stroke();
      break;
    case 'squint':
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, -r * 0.2 * s);
      ctx.stroke();
      break;
    default: {
      const wide = type === 'wide' ? 1.3 : 1;
      const focus = type === 'focus';
      ctx.beginPath();
      if (focus) {
        ctx.moveTo(-r * 1.1, -r * 0.35 * -s + (s > 0 ? -r * 0.2 : -r * 0.2));
        ctx.ellipse(0, r * 0.1, r * 1.05, r * 0.7, 0, Math.PI * 1.05, Math.PI * 1.95, true);
        ctx.closePath();
        ctx.beginPath();
        ctx.ellipse(0, r * 0.1, r * 1.05, r * 0.72, 0, 0, Math.PI * 2);
      } else {
        ctx.ellipse(0, 0, r * 0.95 * wide, r * 1.1 * wide, 0, 0, Math.PI * 2);
      }
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, focus ? r * 0.1 : r * 0.1, r * (type === 'wide' ? 0.42 : 0.52), 0, Math.PI * 2);
      ctx.fillStyle = pupil;
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-r * 0.18, -r * 0.12, r * 0.17, 0, Math.PI * 2);
      ctx.fill();
      if (focus) {
        // 눈꺼풀
        ctx.fillStyle = shade(look.skin, -0.08);
        ctx.beginPath();
        ctx.moveTo(-r * 1.3, -r * 1.2);
        ctx.lineTo(r * 1.3, -r * 1.2);
        ctx.lineTo(r * 1.3, -r * 0.1 - r * 0.35 * s);
        ctx.lineTo(-r * 1.3, -r * 0.1 + r * 0.35 * s);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-r * 1.15, -r * 0.1 + r * 0.32 * s);
        ctx.lineTo(r * 1.15, -r * 0.1 - r * 0.32 * s);
        ctx.lineWidth = 4.5;
        ctx.stroke();
      }
    }
  }
}

function drawMouth(ctx, ex, R, look) {
  const y = R * 0.52;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  switch (ex.mouth) {
    case 'smile':
      ctx.arc(0, y - R * 0.12, R * 0.25, 0.25, Math.PI - 0.25);
      ctx.stroke();
      break;
    case 'grin':
      ctx.moveTo(-R * 0.32, y - R * 0.06);
      ctx.quadraticCurveTo(0, y + R * 0.34, R * 0.32, y - R * 0.06);
      ctx.closePath();
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
      break;
    case 'smirk':
      ctx.moveTo(-R * 0.2, y);
      ctx.quadraticCurveTo(R * 0.1, y + R * 0.08, R * 0.28, y - R * 0.1);
      ctx.stroke();
      break;
    case 'frown':
      ctx.arc(0, y + R * 0.2, R * 0.22, Math.PI + 0.4, -0.4);
      ctx.stroke();
      break;
    case 'o':
      ctx.ellipse(0, y, R * 0.1, R * 0.14, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5a1a1a';
      ctx.fill();
      ctx.stroke();
      break;
    case 'open':
    case 'pant':
    case 'shout': {
      const big = ex.mouth === 'shout' ? 1.35 : ex.mouth === 'pant' ? 0.85 : 1;
      ctx.ellipse(0, y, R * 0.22 * big, R * 0.16 * big, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#5a1a1a';
      ctx.fill();
      ctx.stroke();
      if (ex.tongue) {
        ctx.beginPath();
        ctx.ellipse(R * 0.04, y + R * 0.12, R * 0.1, R * 0.09, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#ff7a8a';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.stroke();
      }
      if (ex.mouth === 'shout') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-R * 0.18, y - R * 0.16, R * 0.36, R * 0.07);
      }
      break;
    }
    case 'teeth':
      ctx.rect(-R * 0.26, y - R * 0.08, R * 0.52, R * 0.17);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-R * 0.26, y);
      ctx.lineTo(R * 0.26, y);
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(i * R * 0.1, y - R * 0.08);
        ctx.lineTo(i * R * 0.1, y + R * 0.09);
      }
      ctx.lineWidth = 2;
      ctx.stroke();
      break;
    case 'wobble':
      ctx.moveTo(-R * 0.25, y);
      for (let i = 1; i <= 6; i++) ctx.lineTo(-R * 0.25 + i * R * 0.083, y + (i % 2 ? -1 : 1) * R * 0.05);
      ctx.stroke();
      break;
    default:
      ctx.moveTo(-R * 0.2, y);
      ctx.lineTo(R * 0.2, y);
      ctx.stroke();
  }
}

function drawHairBack(ctx, hair, R, time) {
  ctx.fillStyle = hair.color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  switch (hair.style) {
    case 'afro':
      ctx.beginPath();
      ctx.arc(0, -R * 0.35, R * 1.45, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'long':
      ctx.beginPath();
      ctx.moveTo(-R * 1.05, -R * 0.4);
      ctx.lineTo(-R * 1.2, R * 1.5);
      ctx.lineTo(R * 1.2, R * 1.5);
      ctx.lineTo(R * 1.05, -R * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'ponytail': {
      const sw = Math.sin(time / 300) * 0.15;
      ctx.save();
      ctx.translate(R * 0.8, -R * 0.6);
      ctx.rotate(0.6 + sw);
      ctx.beginPath();
      ctx.ellipse(R * 0.5, R * 0.3, R * 0.35, R * 0.9, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }
    case 'twinbuns':
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(s * R * 0.78, -R * 0.85, R * 0.42, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      break;
    default:
      break;
  }
}

function drawHairFront(ctx, hair, R) {
  ctx.fillStyle = hair.color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  const cap = (top = 1.12, edge = -0.25) => {
    ctx.beginPath();
    ctx.moveTo(-R * 1.02, R * edge);
    ctx.bezierCurveTo(-R * 1.1, -R * top * 1.1, R * 1.1, -R * top * 1.1, R * 1.02, R * edge);
    ctx.quadraticCurveTo(R * 0.5, -R * 0.55, 0, -R * 0.6);
    ctx.quadraticCurveTo(-R * 0.5, -R * 0.55, -R * 1.02, R * edge);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  switch (hair.style) {
    case 'buzz':
      ctx.beginPath();
      ctx.moveTo(-R * 0.98, -R * 0.2);
      ctx.bezierCurveTo(-R, -R * 1.25, R, -R * 1.25, R * 0.98, -R * 0.2);
      ctx.quadraticCurveTo(0, -R * 0.75, -R * 0.98, -R * 0.2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'spiky':
      ctx.beginPath();
      ctx.moveTo(-R * 1.05, -R * 0.15);
      for (let i = 0; i <= 7; i++) {
        const a = Math.PI + (i / 7) * Math.PI;
        const r1 = R * 1.05;
        const r2 = R * 1.55;
        ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1 - R * 0.1);
        if (i < 7) {
          const am = Math.PI + ((i + 0.5) / 7) * Math.PI;
          ctx.lineTo(Math.cos(am) * r2, Math.sin(am) * r2 - R * 0.1);
        }
      }
      ctx.quadraticCurveTo(0, -R * 0.55, -R * 1.05, -R * 0.15);
      ctx.fill();
      ctx.stroke();
      break;
    case 'mohawk':
      ctx.beginPath();
      ctx.moveTo(-R * 0.22, -R * 0.6);
      ctx.lineTo(-R * 0.3, -R * 1.25);
      for (let i = 0; i < 5; i++) {
        ctx.lineTo(-R * 0.3 + (i + 0.5) * R * 0.12, -R * (1.75 - Math.abs(i - 2) * 0.12));
        ctx.lineTo(-R * 0.3 + (i + 1) * R * 0.12, -R * 1.3);
      }
      ctx.lineTo(R * 0.22, -R * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'slick':
      cap(1.12, -0.3);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-R * 0.1, -R * 0.2, R * 0.75, Math.PI * 1.2, Math.PI * 1.6);
      ctx.stroke();
      break;
    case 'afro':
      ctx.beginPath();
      ctx.moveTo(-R * 1.0, -R * 0.2);
      ctx.quadraticCurveTo(0, -R * 0.75, R * 1.0, -R * 0.2);
      ctx.lineTo(R * 1.0, -R * 0.9);
      ctx.lineTo(-R * 1.0, -R * 0.9);
      ctx.closePath();
      ctx.fill();
      break;
    case 'bob':
      ctx.beginPath();
      ctx.moveTo(-R * 1.12, R * 0.5);
      ctx.bezierCurveTo(-R * 1.3, -R * 1.4, R * 1.3, -R * 1.4, R * 1.12, R * 0.5);
      ctx.lineTo(R * 0.8, R * 0.45);
      ctx.quadraticCurveTo(R * 0.8, -R * 0.4, 0, -R * 0.45);
      ctx.quadraticCurveTo(-R * 0.8, -R * 0.4, -R * 0.8, R * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'flattop':
      ctx.beginPath();
      ctx.moveTo(-R * 0.98, -R * 0.15);
      ctx.lineTo(-R * 0.95, -R * 1.45);
      ctx.lineTo(R * 0.95, -R * 1.45);
      ctx.lineTo(R * 0.98, -R * 0.15);
      ctx.quadraticCurveTo(0, -R * 0.7, -R * 0.98, -R * 0.15);
      ctx.fill();
      ctx.stroke();
      break;
    case 'long':
    case 'ponytail':
    case 'twinbuns':
      cap(1.15, 0);
      break;
    case 'curly':
      ctx.beginPath();
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * 0.95 + (i / 8) * Math.PI * 1.1;
        ctx.moveTo(Math.cos(a) * R + R * 0.28, Math.sin(a) * R - R * 0.1);
        ctx.arc(Math.cos(a) * R, Math.sin(a) * R - R * 0.1, R * 0.28, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.stroke();
      break;
    case 'bald':
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(-R * 0.35, -R * 0.65, R * 0.25, R * 0.12, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      cap();
  }
}

function drawExtras(ctx, look, R, opt) {
  const ex = look.extras || [];
  if (ex.includes('blush')) {
    ctx.fillStyle = 'rgba(255,90,90,0.28)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * R * 0.58, R * 0.28, R * 0.17, R * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (ex.includes('freckles')) {
    ctx.fillStyle = 'rgba(120,60,20,0.5)';
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(s * (R * 0.45 + i * 7), R * 0.22 + (i % 2) * 6, 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (ex.includes('stubble')) {
    ctx.fillStyle = 'rgba(40,30,20,0.35)';
    for (let i = 0; i < 26; i++) {
      const a = Math.PI * 0.15 + (i / 26) * Math.PI * 0.7;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * R * 0.78, Math.sin(a) * R * 0.85, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (ex.includes('mustache')) {
    ctx.fillStyle = look.hair.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, R * 0.36);
    ctx.quadraticCurveTo(-R * 0.3, R * 0.28, -R * 0.42, R * 0.46);
    ctx.quadraticCurveTo(-R * 0.2, R * 0.42, 0, R * 0.44);
    ctx.quadraticCurveTo(R * 0.2, R * 0.42, R * 0.42, R * 0.46);
    ctx.quadraticCurveTo(R * 0.3, R * 0.28, 0, R * 0.36);
    ctx.fill();
    ctx.stroke();
  }
  if (ex.includes('beard')) {
    ctx.fillStyle = look.hair.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-R * 0.9, R * 0.2);
    ctx.quadraticCurveTo(-R * 0.7, R * 1.25, 0, R * 1.3);
    ctx.quadraticCurveTo(R * 0.7, R * 1.25, R * 0.9, R * 0.2);
    ctx.quadraticCurveTo(R * 0.5, R * 0.75, 0, R * 0.72);
    ctx.quadraticCurveTo(-R * 0.5, R * 0.75, -R * 0.9, R * 0.2);
    ctx.fill();
    ctx.stroke();
  }
  if (ex.includes('headband')) {
    ctx.fillStyle = look.headband || '#e23b3b';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-R * 1.02, -R * 0.42);
    ctx.quadraticCurveTo(0, -R * 0.62, R * 1.02, -R * 0.42);
    ctx.lineTo(R * 1.0, -R * 0.2);
    ctx.quadraticCurveTo(0, -R * 0.4, -R * 1.0, -R * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    const sw = Math.sin((opt.time || 0) / 160) * 0.2;
    ctx.beginPath();
    ctx.moveTo(R * 0.95, -R * 0.32);
    ctx.lineTo(R * 1.6, -R * (0.1 + sw));
    ctx.lineTo(R * 1.5, R * (0.1 - sw));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (ex.includes('visor')) {
    const g = ctx.createLinearGradient(-R, 0, R, 0);
    g.addColorStop(0, '#9be7ff');
    g.addColorStop(0.5, '#f0fbff');
    g.addColorStop(1, '#6fb8ff');
    ctx.fillStyle = g;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-R * 0.95, -R * 0.3);
    ctx.quadraticCurveTo(0, -R * 0.42, R * 0.95, -R * 0.3);
    ctx.lineTo(R * 0.85, R * 0.12);
    ctx.quadraticCurveTo(0, R * 0.02, -R * 0.85, R * 0.12);
    ctx.closePath();
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  }
  if (ex.includes('foxears')) {
    ctx.fillStyle = look.hair.color;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * R * 0.35, -R * 0.95);
      ctx.lineTo(s * R * 0.85, -R * 1.6);
      ctx.lineTo(s * R * 0.95, -R * 0.65);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd6c8';
      ctx.beginPath();
      ctx.moveTo(s * R * 0.5, -R * 0.95);
      ctx.lineTo(s * R * 0.82, -R * 1.4);
      ctx.lineTo(s * R * 0.86, -R * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = look.hair.color;
    }
  }
  if (ex.includes('earring')) {
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-R * 1.0, R * 0.32, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (ex.includes('crown')) {
    ctx.fillStyle = '#ffd23a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-R * 0.5, -R * 1.0);
    ctx.lineTo(-R * 0.55, -R * 1.45);
    ctx.lineTo(-R * 0.25, -R * 1.2);
    ctx.lineTo(0, -R * 1.55);
    ctx.lineTo(R * 0.25, -R * 1.2);
    ctx.lineTo(R * 0.55, -R * 1.45);
    ctx.lineTo(R * 0.5, -R * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (ex.includes('scarH')) {
    // 반창고 대신 별 스티커 (상처 표현 없음)
    ctx.fillStyle = '#ffd23a';
    starPath(ctx, R * 0.55, -R * 0.55, 9, 5);
    ctx.fill();
  }
}

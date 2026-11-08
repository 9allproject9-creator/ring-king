// 내 선수 뒷모습(반투명). 무대 좌표 1280×720 기준.
import { drawGlove, INK } from './parts.js';
import { shade } from '../ring.js';
import { solveElbow } from '../rig.js';

export const DEFAULT_PLAYER_LOOK = {
  skin: '#f0c8a0',
  hair: { style: 'short', color: '#2a1a12' },
  gloves: '#2f7de1',
  glovePattern: null,
  trunks: '#e8e8e8',
  shoes: '#222',
};

// pose: { x, y, rot, gl:{x,y,s}, gr:{x,y,s}, alpha }
export function drawPlayerBack(ctx, look, pose, opt = {}) {
  const cx = 640 + pose.x;
  const cy = 790 + pose.y;
  const sc = 0.86;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(pose.rot);
  ctx.scale(sc, sc);
  const bodyAlpha = opt.bodyAlpha ?? 0.62;
  // 팔 (어깨 → 장갑)
  const shoulders = { L: { x: -150, y: -96 }, R: { x: 150, y: -96 } };
  const order = pose.gl.s < pose.gr.s ? ['L', 'R'] : ['R', 'L'];
  // 몸통
  ctx.globalAlpha = bodyAlpha;
  ctx.beginPath();
  ctx.moveTo(-190, 60);
  ctx.lineTo(-175, -70);
  ctx.quadraticCurveTo(-150, -118, -70, -126);
  ctx.lineTo(70, -126);
  ctx.quadraticCurveTo(150, -118, 175, -70);
  ctx.lineTo(190, 60);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -130, 0, 60);
  g.addColorStop(0, shade(look.skin, -0.05));
  g.addColorStop(1, shade(look.skin, -0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // 등 근육 선
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -110);
  ctx.lineTo(0, 40);
  ctx.moveTo(-90, -80);
  ctx.quadraticCurveTo(-50, -40, -70, 10);
  ctx.moveTo(90, -80);
  ctx.quadraticCurveTo(50, -40, 70, 10);
  ctx.stroke();
  // 트렁크 허리띠 살짝
  ctx.fillStyle = look.trunks;
  ctx.fillRect(-186, 40, 372, 30);
  // 목과 뒤통수
  ctx.fillStyle = shade(look.skin, -0.12);
  ctx.beginPath();
  ctx.rect(-36, -170, 72, 56);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(pose.hx || 0, -200);
  drawBackHead(ctx, look);
  ctx.restore();
  ctx.globalAlpha = 1;
  for (const side of order) {
    const sh = shoulders[side];
    const gp = side === 'L' ? pose.gl : pose.gr;
    // 장갑 위치는 무대 좌표 기준이므로 몸 기준으로 바꾼다(회전은 무시하고 평행이동만)
    drawBackArm(ctx, look, sh, { x: (gp.x - cx) / sc, y: (gp.y - cy) / sc, s: gp.s }, side, bodyAlpha, opt);
  }
  ctx.restore();
}

function drawBackHead(ctx, look) {
  const R = 64;
  // 귀
  ctx.fillStyle = shade(look.skin, -0.08);
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * R * 0.98, 6, 12, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, R, R * 1.05, 0, 0, Math.PI * 2);
  ctx.fillStyle = look.skin;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  const hc = look.hair.color;
  ctx.fillStyle = hc;
  switch (look.hair.style) {
    case 'buzz':
      ctx.beginPath();
      ctx.ellipse(0, -6, R * 0.97, R * 0.98, 0, 0, Math.PI * 2);
      ctx.globalAlpha *= 0.85;
      ctx.fill();
      ctx.globalAlpha /= 0.85;
      break;
    case 'long':
      ctx.beginPath();
      ctx.moveTo(-R * 1.02, -10);
      ctx.bezierCurveTo(-R * 1.1, -R * 1.3, R * 1.1, -R * 1.3, R * 1.02, -10);
      ctx.lineTo(R * 1.1, R * 1.6);
      ctx.lineTo(-R * 1.1, R * 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'ponytail':
      ctx.beginPath();
      ctx.ellipse(0, -10, R * 1.0, R * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, R * 1.0, R * 0.32, R * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e23b3b';
      ctx.fillRect(-14, R * 0.25, 28, 14);
      break;
    case 'spiky':
      ctx.beginPath();
      ctx.moveTo(-R, 10);
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i / 8) * Math.PI;
        ctx.lineTo(Math.cos(a) * R * 1.02, Math.sin(a) * R * 1.02);
        if (i < 8) {
          const am = Math.PI + ((i + 0.5) / 8) * Math.PI;
          ctx.lineTo(Math.cos(am) * R * 1.45, Math.sin(am) * R * 1.45);
        }
      }
      ctx.lineTo(R, 10);
      ctx.quadraticCurveTo(0, R * 0.7, -R, 10);
      ctx.fill();
      ctx.stroke();
      break;
    case 'curly':
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * R * 0.75, Math.sin(a) * R * 0.75 - 6, R * 0.38, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'bun':
      ctx.beginPath();
      ctx.ellipse(0, -6, R * 1.0, R * 1.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -R * 0.9, R * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    default: // short
      ctx.beginPath();
      ctx.moveTo(-R * 1.02, 14);
      ctx.bezierCurveTo(-R * 1.15, -R * 1.35, R * 1.15, -R * 1.35, R * 1.02, 14);
      ctx.quadraticCurveTo(R * 0.5, R * 0.55, 0, R * 0.6);
      ctx.quadraticCurveTo(-R * 0.5, R * 0.55, -R * 1.02, 14);
      ctx.fill();
      ctx.stroke();
  }
}

function drawBackArm(ctx, look, sh, g, side, bodyAlpha, opt) {
  const sgn = side === 'L' ? -1 : 1;
  // 장갑이 멀리 갈수록(작아질수록) 팔이 화면 안쪽으로 길게 뻗는다
  const reach = 150 * (1 + Math.max(0, 1 - g.s) * 1.7);
  const e1 = solveElbow(sh.x, sh.y, g.x, g.y, reach, reach, 1);
  const e2 = solveElbow(sh.x, sh.y, g.x, g.y, reach, reach, -1);
  const score = (e) => e.ex * sgn + e.ey * 0.5;
  const e = score(e1) > score(e2) ? e1 : e2;
  const th = 50 * (0.6 + 0.4 * g.s);
  ctx.save();
  ctx.globalAlpha = bodyAlpha;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = INK;
  ctx.lineWidth = th + 12;
  ctx.beginPath();
  ctx.moveTo(sh.x, sh.y);
  ctx.lineTo(e.ex, e.ey);
  ctx.lineTo(e.tx, e.ty);
  ctx.stroke();
  ctx.strokeStyle = shade(look.skin, -0.1);
  ctx.lineWidth = th;
  ctx.stroke();
  ctx.restore();
  // 장갑은 거의 불투명하게(어디로 가는지 확실히 보이도록)
  ctx.save();
  ctx.globalAlpha = opt.gloveAlpha ?? 0.92;
  const ang = Math.atan2(e.ty - e.ey, e.tx - e.ex);
  if (opt.specialGlow && side === 'R') {
    ctx.shadowColor = '#ffe23a';
    ctx.shadowBlur = 40;
  }
  drawGlove(ctx, e.tx, e.ty, 62 * g.s, ang, look.gloves, -sgn, look.glovePattern, {});
  ctx.restore();
}

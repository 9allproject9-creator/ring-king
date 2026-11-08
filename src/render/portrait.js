// 상반신 초상화(컷신·소개·코치 말풍선용). 경기용 부품 그리기를 그대로 재사용한다.
import { drawFrontBody, drawHead, bodyDims, INK } from './characters/parts.js';
import { makePose } from './rig.js';
import { shade } from './ring.js';

export const COACH_LOOK = {
  build: { w: 1.05, h: 0.95, belly: 0.25, head: 1.05 },
  skin: '#e2b48a',
  hair: { style: 'bald', color: '#f0f0f0', browColor: '#e8e8e8' },
  brow: 'thick',
  eyes: 'small',
  nose: 'big',
  extras: ['mustache'],
  jacket: '#2c4a8a',
  jacketTrim: '#ffd23a',
  trunks: '#2c4a8a',
  gloves: '#888',
};

export function drawPortrait(canvas, look, expr = 'normal', opts = {}) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (opts.bg !== false) {
    const g = ctx.createRadialGradient(W / 2, H * 0.4, 10, W / 2, H / 2, W * 0.75);
    g.addColorStop(0, opts.bgColor || '#ffe9a8');
    g.addColorStop(1, opts.bgColor2 || '#e0902a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  const d = bodyDims(look);
  // 머리 꼭대기부터 가슴까지 보이게 맞춘다
  const span = d.HR * 2.6 + d.neck + d.T * 0.6;
  const k = (H * 0.98) / span;
  ctx.save();
  ctx.translate(W / 2, H * 0.08 + (d.HR * 1.5) * k);
  ctx.scale(k, k);
  const pose = makePose({ expr, ...(opts.pose || {}) });
  if (look.jacket) {
    drawJacketBust(ctx, look, d, pose);
  } else {
    // 머리 중심이 원점이 되도록 몸을 옮겨 그린다
    ctx.translate(0, d.T + d.neck + d.HR * 0.78);
    if (opts.noGloves) {
      pose.glx = 1.05; pose.gly = 0.2; pose.grx = -1.05; pose.gry = 0.2;
    }
    drawFrontBody(ctx, look, pose, { time: opts.time || 0, glowColor: look.tellColor });
  }
  ctx.restore();
}

function drawJacketBust(ctx, look, d, pose) {
  const { S, T, HR } = d;
  const top = HR * 0.78 + d.neck;
  ctx.save();
  ctx.translate(0, top);
  ctx.beginPath();
  ctx.moveTo(-S * 1.15, T * 0.9);
  ctx.lineTo(-S * 1.0, 10);
  ctx.quadraticCurveTo(-S * 0.5, -22, 0, -18);
  ctx.quadraticCurveTo(S * 0.5, -22, S * 1.0, 10);
  ctx.lineTo(S * 1.15, T * 0.9);
  ctx.closePath();
  ctx.fillStyle = look.jacket;
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = INK;
  ctx.stroke();
  // 지퍼와 줄무늬
  ctx.strokeStyle = look.jacketTrim;
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-S * 1.05, 30);
  ctx.lineTo(-S * 1.1, T * 0.9);
  ctx.moveTo(S * 1.05, 30);
  ctx.lineTo(S * 1.1, T * 0.9);
  ctx.stroke();
  ctx.strokeStyle = '#ddd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.lineTo(0, T);
  ctx.stroke();
  // 목에 건 호루라기 줄
  ctx.strokeStyle = '#e23b3b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-S * 0.3, -14);
  ctx.quadraticCurveTo(0, T * 0.4, S * 0.3, -14);
  ctx.stroke();
  ctx.fillStyle = '#c8c8c8';
  ctx.beginPath();
  ctx.ellipse(0, T * 0.3, 14, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // 목
  ctx.fillStyle = shade(look.skin, -0.12);
  ctx.fillRect(-S * 0.25, HR * 0.5, S * 0.5, top - HR * 0.5 + 4);
  drawHead(ctx, look, d, pose, {});
}

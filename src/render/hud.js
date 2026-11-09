// 경기 화면 HUD
import { roundRect, starPath } from './ring.js';

const FONT_T = '"Black Han Sans", "Jua", "Malgun Gothic", sans-serif';
const FONT_B = '"Gowun Dodum", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

export class Hud {
  constructor() {
    this.ghostP = 1;
    this.ghostO = 1;
    this.shownP = 1;
    this.shownO = 1;
    this.starPulse = [0, 0, 0];
    this.time = 0;
    this.lowTimeFlash = 0;
  }

  reset(fight) {
    this.ghostP = this.shownP = fight.player.hp / fight.player.maxHp;
    this.ghostO = this.shownO = fight.opp.hp / fight.opp.maxHp;
  }

  onEvent(e) {
    if (e.type === 'star') this.starPulse[e.stars - 1] = 1;
  }

  update(dt, fight) {
    this.time += dt;
    const p = fight.player.hp / fight.player.maxHp;
    const o = fight.opp.hp / fight.opp.maxHp;
    this.shownP += (p - this.shownP) * Math.min(1, dt / 60);
    this.shownO += (o - this.shownO) * Math.min(1, dt / 60);
    // 흰 잔상: 잠깐 멈췄다가 천천히 따라감
    this.ghostP = p > this.ghostP ? p : this.ghostP - Math.min(this.ghostP - p, dt / 1600);
    this.ghostO = o > this.ghostO ? o : this.ghostO - Math.min(this.ghostO - o, dt / 1600);
    for (let i = 0; i < 3; i++) this.starPulse[i] = Math.max(0, this.starPulse[i] - dt / 600);
  }

  draw(ctx, L, fight, info) {
    const { w, h, portrait } = L;
    const p = fight.player;
    const o = fight.opp;
    const pad = 16;
    const barW = portrait ? (w - pad * 2 - 110) / 2 : Math.min(470, (w - 300) / 2);
    const barH = portrait ? 26 : 30;
    const topY = portrait ? 18 : 16;
    // 이름
    ctx.textBaseline = 'alphabetic';
    ctx.font = `${portrait ? 22 : 24}px ${FONT_T}`;
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    const faceR = portrait ? 18 : 21;
    const fy = topY + barH + 8 + faceR;
    const face = (img, x) => {
      if (!img) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, fy, faceR, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(img, x - faceR, fy - faceR, faceR * 2, faceR * 2);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(x, fy, faceR, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    };
    const pOff = info.playerFace ? faceR * 2 + 10 : 0;
    const oOff = info.oppFace ? faceR * 2 + 10 : 0;
    face(info.playerFace, pad + 4 + faceR);
    face(info.oppFace, w - pad - 4 - faceR);
    ctx.textAlign = 'left';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#fff';
    ctx.strokeText(info.playerName, pad + 4 + pOff, topY + barH + 28);
    ctx.fillText(info.playerName, pad + 4 + pOff, topY + barH + 28);
    ctx.textAlign = 'right';
    const oname = `${o.data.nick} ${o.data.name}`;
    ctx.strokeText(oname, w - pad - 4 - oOff, topY + barH + 28);
    ctx.fillText(oname, w - pad - 4 - oOff, topY + barH + 28);
    // 체력 바
    this.bar(ctx, pad, topY, barW, barH, this.shownP, this.ghostP, '#3fd46a', false);
    this.bar(ctx, w - pad - barW, topY, barW, barH, this.shownO, this.ghostO, '#ff7a2a', true);
    // 다운 횟수 점
    this.downDots(ctx, pad + 4 + pOff, topY + barH + 42, p.downsRound, false, portrait);
    this.downDots(ctx, w - pad - 4 - oOff, topY + barH + 42, o.downsRound, true, portrait);
    // 페이즈 표시
    if (o.phases.length > 1) {
      for (let i = 1; i < o.phases.length; i++) {
        const x = w - pad - barW + barW * (1 - o.phases[i].hpBelow);
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(x - 2, topY - 4, 4, barH + 8);
      }
    }
    // 라운드와 시간
    const cx = w / 2;
    {
      // 시간 배지: 금색 테두리 + 어두운 남색 판 + 윗부분 광택
      const bh = portrait ? 66 : 74;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.55)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
      const fg = ctx.createLinearGradient(0, topY - 9, 0, topY + bh);
      fg.addColorStop(0, '#fff0a8');
      fg.addColorStop(0.5, '#e0a520');
      fg.addColorStop(1, '#7a4a08');
      ctx.fillStyle = fg;
      roundRect(ctx, cx - 57, topY - 10, 114, bh + 8, 16);
      ctx.fill();
      ctx.restore();
      const pg = ctx.createLinearGradient(0, topY - 6, 0, topY + bh);
      pg.addColorStop(0, '#2c2458');
      pg.addColorStop(1, '#0c0a1e');
      ctx.fillStyle = pg;
      roundRect(ctx, cx - 53, topY - 6, 106, bh, 13);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, cx - 49, topY - 3, 98, bh * 0.36, 10);
      ctx.fill();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd23a';
    ctx.font = `${portrait ? 18 : 20}px ${FONT_T}`;
    ctx.fillText(`${fight.round}라운드`, cx, topY + 18);
    const secs = Math.max(0, Math.ceil(fight.roundTime / 1000));
    const low = secs <= 10 && fight.phase === 'fight';
    ctx.fillStyle = low && Math.floor(this.time / 250) % 2 ? '#ff5050' : '#ffffff';
    ctx.font = `${portrait ? 32 : 36}px ${FONT_T}`;
    ctx.fillText(fight.noTimer ? '∞' : `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, cx, topY + (portrait ? 52 : 58));

    // 아래쪽: 스태미나, 가드, 별 (KO 연출 중에는 숨김)
    if (info.cinematic) return;
    const gy = L.gaugeY;
    const gw = Math.min(portrait ? 300 : 300, w * 0.36);
    const gx = cx - gw / 2;
    this.smallBar(ctx, gx, gy, gw, 14, p.stamina / p.maxStamina, p.state === 'winded' ? '#ff5050' : '#ffd23a', '체력 힘', p.stamina < 25);
    this.smallBar(ctx, gx, gy + 26, gw, 14, p.guard / p.maxGuard, p.state === 'guardBroken' ? '#ff5050' : '#5ab8ff', '가드', p.guard < 30);
    // 별 3칸
    const sy = gy - 34;
    for (let i = 0; i < 3; i++) {
      const sx = cx + (i - 1) * 50;
      const on = i < p.stars;
      const pulse = this.starPulse[i];
      ctx.save();
      ctx.translate(sx, sy);
      ctx.scale(1 + pulse * 0.5, 1 + pulse * 0.5);
      starPath(ctx, 0, 0, 20, 5);
      ctx.fillStyle = on ? '#ffd23a' : 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = on ? '#1a1410' : 'rgba(255,255,255,0.4)';
      ctx.stroke();
      ctx.restore();
    }
    if (p.stars > 0 && fight.phase === 'fight' && info.specialKeyLabel) {
      ctx.font = `16px ${FONT_B}`;
      ctx.fillStyle = '#ffe9a0';
      ctx.textAlign = 'center';
      ctx.fillText(`${info.specialKeyLabel}: 필살 펀치!`, cx, sy - 30);
    }

    // 다운 카운트와 일어나기 게이지
    if (fight.down && fight.down.count > 0) {
      const n = fight.down.count;
      ctx.save();
      ctx.translate(cx, h * 0.42);
      const k = 1 + Math.max(0, 0.4 - ((fight.down.t - 900) % 1000) / 1000) * 1.2;
      ctx.scale(k, k);
      ctx.font = `140px ${FONT_T}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 16;
      ctx.strokeStyle = '#1a1410';
      ctx.strokeText(String(n), 0, 0);
      ctx.fillStyle = n >= 8 ? '#ff5050' : '#ffffff';
      ctx.fillText(String(n), 0, 0);
      ctx.restore();
    }
    if (fight.phase === 'pdown' && fight.down) {
      const d = fight.down;
      const mw = Math.min(420, w * 0.7);
      const mx = cx - mw / 2;
      const my = h * 0.62;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, mx - 10, my - 46, mw + 20, 84, 14);
      ctx.fill();
      ctx.font = `26px ${FONT_T}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(info.mashLabel || '공격 버튼 연타로 일어나!', cx, my - 14);
      this.smallBar(ctx, mx, my, mw, 22, Math.min(1, d.mash / d.need), '#3fd46a', '', false);
    }
    if (fight.clinch) {
      const c = fight.clinch;
      const mw = Math.min(380, w * 0.7);
      const mx = cx - mw / 2;
      const my = h * 0.6;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(ctx, mx - 10, my - 46, mw + 20, 84, 14);
      ctx.fill();
      ctx.font = `26px ${FONT_T}`;
      ctx.fillStyle = '#ffd23a';
      ctx.textAlign = 'center';
      ctx.fillText('붙잡혔다! 공격 버튼 연타로 풀어!', cx, my - 14);
      this.smallBar(ctx, mx, my, mw, 22, c.mash / c.need, '#ffd23a', '', false);
    }
  }

  // 체력 바: 비스듬한 모양 + 금색 테두리 + 눈금 + 광택 (격투 게임 느낌)
  bar(ctx, x, y, w, h, v, ghost, color, right) {
    const s = h * 0.55; // 기울기
    const shape = (px, py, pw, ph, sk) => {
      ctx.beginPath();
      if (!right) {
        ctx.moveTo(px, py); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw - sk, py + ph); ctx.lineTo(px, py + ph);
      } else {
        ctx.moveTo(px, py); ctx.lineTo(px + pw, py); ctx.lineTo(px + pw, py + ph); ctx.lineTo(px + sk, py + ph);
      }
      ctx.closePath();
    };
    // 바깥 그림자 + 금색 테두리
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    shape(x - 5, y - 5, w + 10, h + 10, s + 3);
    const fg = ctx.createLinearGradient(0, y - 5, 0, y + h + 5);
    fg.addColorStop(0, '#fff0a8');
    fg.addColorStop(0.45, '#e0a520');
    fg.addColorStop(1, '#7a4a08');
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
    shape(x - 2, y - 2, w + 4, h + 4, s + 1);
    ctx.fillStyle = '#140a0a';
    ctx.fill();
    // 안쪽 내용은 모양으로 잘라서 그림
    ctx.save();
    shape(x, y, w, h, s);
    ctx.clip();
    const bg = ctx.createLinearGradient(0, y, 0, y + h);
    bg.addColorStop(0, '#4a1414');
    bg.addColorStop(1, '#220808');
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    const gw = w * Math.max(0, ghost);
    const vw = w * Math.max(0, v);
    // 방금 깎인 부분(흰색 → 빨강으로 사라짐)
    ctx.fillStyle = '#ffe0c0';
    ctx.fillRect(right ? x + w - gw : x, y, gw, h);
    const col = v < 0.3 ? (Math.floor(this.time / 220) % 2 ? '#ff3a3a' : '#ff7a7a') : color;
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, lightSimple(col));
    g.addColorStop(0.5, col);
    g.addColorStop(1, shadeSimple(col));
    ctx.fillStyle = g;
    ctx.fillRect(right ? x + w - vw : x, y, vw, h);
    // 광택
    const gl = ctx.createLinearGradient(0, y, 0, y + h * 0.5);
    gl.addColorStop(0, 'rgba(255,255,255,0.55)');
    gl.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = gl;
    ctx.fillRect(right ? x + w - vw : x, y + 2, vw, h * 0.42);
    // 10칸 눈금
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    for (let i = 1; i < 10; i++) ctx.fillRect(x + (w * i) / 10 - 1, y, 2, h);
    // 체력 끝 반짝이
    if (vw > 4) {
      const ex = right ? x + w - vw : x + vw;
      const eg = ctx.createLinearGradient(ex - 8, 0, ex + 8, 0);
      eg.addColorStop(0, 'rgba(255,255,255,0)');
      eg.addColorStop(0.5, 'rgba(255,255,255,0.7)');
      eg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = eg;
      ctx.fillRect(ex - 8, y, 16, h);
    }
    ctx.restore();
  }

  smallBar(ctx, x, y, w, h, v, color, label, warn) {
    ctx.fillStyle = 'rgba(8,6,20,0.72)';
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, (h + 6) / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const sv = Math.max(0, Math.min(1, v));
    if (sv > 0) {
      const c0 = warn && Math.floor(this.time / 200) % 2 ? '#ff5050' : color;
      ctx.save();
      roundRect(ctx, x, y, Math.max(h, w * sv), h, h / 2);
      ctx.clip();
      const g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, lightSimple(c0));
      g.addColorStop(0.55, c0);
      g.addColorStop(1, shadeSimple(c0));
      ctx.fillStyle = g;
      ctx.fillRect(x, y, w * sv, h);
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x, y + 1, w * sv, h * 0.35);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(0,0,0,0)';
    if (label) {
      ctx.font = `bold ${h - 1}px ${FONT_B}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.strokeText(label, x - 8, y + h / 2 + 1);
      ctx.fillText(label, x - 8, y + h / 2 + 1);
      ctx.textBaseline = 'alphabetic';
    }
  }

  downDots(ctx, x, y, n, right, portrait) {
    for (let i = 0; i < 3; i++) {
      const dx = right ? x - i * 22 - 8 : x + i * 22 + 8;
      ctx.beginPath();
      ctx.arc(dx, y + (portrait ? 4 : 6), 7, 0, Math.PI * 2);
      ctx.fillStyle = i < n ? '#ff4040' : 'rgba(0,0,0,0.45)';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}

// 텔 강조: 피하는 방향 아이콘(모양+화살표, 색만으로 구분하지 않음)
export function drawAvoidIcon(ctx, x, y, avoid, color) {
  const n = avoid.length || 1;
  const gap = 64;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const kind = avoid.length ? avoid[i] : 'guard';
    const cx = x + (i - (n - 1) / 2) * gap;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.arc(cx, y, 27, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    if (kind === 'L' || kind === 'R') {
      const s = kind === 'L' ? -1 : 1;
      ctx.moveTo(cx + s * 16, y);
      ctx.lineTo(cx - s * 2, y - 15);
      ctx.lineTo(cx - s * 2, y - 6);
      ctx.lineTo(cx - s * 16, y - 6);
      ctx.lineTo(cx - s * 16, y + 6);
      ctx.lineTo(cx - s * 2, y + 6);
      ctx.lineTo(cx - s * 2, y + 15);
      ctx.closePath();
    } else if (kind === 'duck') {
      ctx.moveTo(cx, y + 16);
      ctx.lineTo(cx - 15, y + 2);
      ctx.lineTo(cx - 6, y + 2);
      ctx.lineTo(cx - 6, y - 16);
      ctx.lineTo(cx + 6, y - 16);
      ctx.lineTo(cx + 6, y + 2);
      ctx.lineTo(cx + 15, y + 2);
      ctx.closePath();
    } else {
      ctx.moveTo(cx, y - 16);
      ctx.lineTo(cx + 14, y - 10);
      ctx.lineTo(cx + 12, y + 6);
      ctx.lineTo(cx, y + 17);
      ctx.lineTo(cx - 12, y + 6);
      ctx.lineTo(cx - 14, y - 10);
      ctx.closePath();
    }
    ctx.fill();
  }
  ctx.restore();
}

function lightSimple(hex) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c) => Math.min(255, c + (255 - c) * 0.45) | 0;
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function shadeSimple(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) * 0.65;
  const g = ((n >> 8) & 255) * 0.65;
  const b = (n & 255) * 0.65;
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

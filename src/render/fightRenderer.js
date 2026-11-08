// 경기 화면 그리기. 로직(Fight)의 상태와 이벤트만 읽는다.
import { RingRenderer, roundRect, starPath, hexA } from './ring.js';
import { drawFrontBody, bodyDims } from './characters/parts.js';
import { drawPlayerBack, DEFAULT_PLAYER_LOOK } from './characters/player.js';
import { OpponentAnimator } from './opponentAnimator.js';
import { PlayerAnimator } from './playerAnimator.js';
import { Effects } from './effects.js';
import { Hud } from './hud.js';

const HIP_Y = 585;
const HIT_WORDS = { jab: '퍽!', straight: '팍!', upper: '쾅!', special: '필살!!' };

export function stageLayout(view) {
  const { w, h, portrait } = view;
  if (portrait) {
    const s = (w / 1280) * 1.3;
    const sy = 112;
    const stageH = 720 * s;
    return { w, h, portrait, s, x: (w - 1280 * s) / 2, y: sy, gaugeY: sy + stageH + 64, stageBottom: sy + stageH };
  }
  const s = 1;
  return { w, h, portrait, s, x: (w - 1280) / 2, y: (h - 720) / 2, gaugeY: h - 50, stageBottom: h };
}

export class FightRenderer {
  constructor({ fight, venue = 'gym', settings = {}, playerLook, playerName = '나', audio = null, floorPattern = null }) {
    this.ring = new RingRenderer();
    this.effects = new Effects();
    this.hud = new Hud();
    this.audio = audio;
    this.settings = settings;
    this.playerLook = playerLook || DEFAULT_PLAYER_LOOK;
    this.playerName = playerName;
    this.venue = venue;
    this.floorPattern = floorPattern;
    this.slow = { t: 0, scale: 1 };
    this.excite = 0.2;
    this.lastActionAt = 0;
    this.time = 0;
    this.tiltT = 0;
    this.labels = { special: 'Space', mash: '공격 버튼 연타로 일어나!' };
    this.coachLine = null;
    this.setFight(fight);
  }

  setFight(fight) {
    this.fight = fight;
    this.oppAnim = new OpponentAnimator(fight.oppData);
    this.plAnim = new PlayerAnimator();
    this.effects.reset();
    this.effects.shakeEnabled = this.settings.shake !== false;
    this.effects.reduceFlash = !!this.settings.reduceFlash;
    this.hud.reset(fight);
    this.headPos = { x: 640, y: 300 };
    this.oppPose = null;
  }

  timeScale() {
    return this.slow.t > 0 ? this.slow.scale : 1;
  }

  slowmo(ms, scale) {
    if (this.settings.reduceMotion) return;
    this.slow.t = ms;
    this.slow.scale = scale;
  }

  onEvents(events) {
    const fx = this.effects;
    const f = this.fight;
    const a = this.audio;
    const hp = this.headPos;
    for (const e of events) {
      this.oppAnim.onEvent(e);
      this.hud.onEvent(e);
      switch (e.type) {
        case 'punchStart':
          a && a.sfx('whoosh', { punch: e.punch });
          if (e.punch === 'special') {
            a && a.sfx('charge');
            fx.dim = 1;
          }
          break;
        case 'hit': {
          this.lastActionAt = this.time;
          const big = e.kind === 'counter' || e.kind === 'interrupt' || e.kind === 'special';
          const mag = Math.min(1.6, e.dmg / 8);
          const ix = hp.x + (e.punch === 'jab' ? -30 : e.punch === 'straight' ? 30 : 0);
          const iy = hp.y + (e.punch === 'upper' ? 40 : 10);
          fx.impact(ix, iy, 70 + mag * 50, big ? '#ffe23a' : '#ffffff');
          fx.sweat(hp.x, hp.y - 20, e.punch === 'jab' ? 1 : e.punch === 'straight' ? -1 : 0);
          fx.shake(4 + e.dmg * 0.9);
          if (e.dmg >= 9 || big) fx.punchZoom(0.03 + Math.min(0.05, e.dmg / 400), hp.x, hp.y);
          let word = HIT_WORDS[e.punch];
          let color = '#ffe23a';
          let size = 60 + mag * 20;
          if (e.kind === 'counter') { word = '카운터!'; color = '#ff5a3a'; size = 84; }
          if (e.kind === 'interrupt') { word = '끊어치기!'; color = '#3ad7ff'; size = 84; }
          if (e.kind === 'special') { word = '★필살 펀치★'; color = '#ffe23a'; size = 92; fx.doFlash(0.6); fx.dim = 0; }
          if (e.kind === 'stagger' && e.punch !== 'special') word = word.replace('!', '!!');
          fx.text(word, ix + (Math.random() - 0.5) * 60, iy - 70, { size, color });
          if (e.combo) fx.text(e.combo + '!', ix, iy + 40, { size: 34, color: '#ffffff', life: 650, rot: 0 });
          if (big) this.bumpExcite(0.35); else this.bumpExcite(0.08);
          a && a.sfx('hit', { punch: e.punch, kind: e.kind, dmg: e.dmg });
          if (big) a && a.sfx('crowd', { cheer: 0.8 });
          break;
        }
        case 'block':
          fx.impact(hp.x + (e.punch === 'jab' ? -40 : 40), hp.y + 40, 50, '#9ab8ff');
          fx.text(e.why === 'read' ? '읽혔다!' : '막힘', hp.x + (Math.random() - 0.5) * 80, hp.y - 60, { size: 36, color: '#c8d8ff', life: 500 });
          fx.shake(2);
          a && a.sfx('block');
          break;
        case 'whiff':
          fx.text('헛손질', hp.x, hp.y - 50, { size: 32, color: '#dddddd', life: 450 });
          a && a.sfx('miss');
          break;
        case 'playerHit':
          this.lastActionAt = this.time;
          fx.shake(10 + e.dmg * 0.9);
          fx.hurtVignette(Math.min(1, 0.4 + e.dmg / 20));
          fx.text('윽!', 640 + (Math.random() - 0.5) * 200, 560, { size: 54, color: '#ff6a6a' });
          fx.burst(640, 560, 8, { speed: 0.6, size: 7, color: '#ffffff', kind: 'spark', grav: 0 });
          this.bumpExcite(0.12);
          a && a.sfx('hurt', { dmg: e.dmg });
          break;
        case 'playerBlock':
          fx.shake(5);
          fx.impact(640, 520, 60, '#9ad0ff');
          fx.text('가드!', 640, 470, { size: 38, color: '#bfe2ff', life: 450 });
          a && a.sfx('block', { heavy: true });
          break;
        case 'guardBreak':
          fx.text('가드가 깨졌다!', 640, 470, { size: 50, color: '#ff8a3a' });
          fx.shake(14);
          a && a.sfx('guardBreak');
          break;
        case 'dodge':
          fx.text('피했다!', 640 + (e.dir === 'L' ? -220 : e.dir === 'R' ? 220 : 0), 470, { size: 46, color: '#7affd0', life: 550 });
          for (let i = 0; i < 6; i++) fx.particle(640 + (Math.random() - 0.5) * 300, 420 + Math.random() * 200, (e.dir === 'L' ? 1 : e.dir === 'R' ? -1 : 0) * 0.9, e.dir === 'duck' ? -0.6 : 0, 220, 4, 'rgba(255,255,255,0.8)', 'line', 0);
          this.bumpExcite(0.1);
          a && a.sfx('dodge');
          break;
        case 'dodgeStart':
          a && a.sfx('swish');
          break;
        case 'wrongDodge':
          fx.text('반대쪽!', 640, 420, { size: 40, color: '#ffb0b0', life: 600 });
          break;
        case 'star': {
          const L = this.layout;
          a && a.sfx('star');
          fx.burst(hp.x, hp.y, 10, { speed: 0.5, life: 600, size: 10, color: '#ffe23a', kind: 'star', grav: 0.0008 });
          if (L) fx.text('★', hp.x, hp.y - 110, { size: 60, color: '#ffe23a', life: 600, rot: 0, vy: 0.15 });
          break;
        }
        case 'starLost':
          fx.burst(640, 640, 4 * e.lost, { speed: 0.4, life: 700, size: 12, color: '#ffe23a', kind: 'star', grav: 0.002 });
          break;
        case 'down':
          if (e.who === 'opponent') {
            fx.text(e.tko ? 'T.K.O.!' : '다운!', 640, 260, { size: 120, color: '#ffe23a', life: 1400, rot: -0.08, vy: 0 });
            this.slowmo(1100, 0.3);
            fx.punchZoom(0.12, hp.x, hp.y);
            fx.doFlash(0.5);
            this.bumpExcite(1);
            a && a.sfx('down');
            a && a.sfx('crowd', { cheer: 1 });
          } else {
            fx.text('다운…', 640, 300, { size: 100, color: '#ff6a6a', life: 1300, rot: 0.06, vy: 0 });
            this.slowmo(900, 0.35);
            fx.shake(22);
            this.tiltT = 1;
            a && a.sfx('down', { player: true });
          }
          break;
        case 'count':
          a && a.sfx('count', { n: e.n });
          break;
        case 'getup':
          fx.text(e.who === 'player' ? '일어났다!' : '다시 일어났다!', 640, 300, { size: 64, color: '#ffffff', life: 900, rot: 0 });
          a && a.sfx('crowd', { cheer: 0.6 });
          break;
        case 'bell':
          a && a.sfx('bell', { start: e.start });
          if (e.start) fx.text('시작!', 640, 330, { size: 120, color: '#ffe23a', life: 900, rot: 0, vy: 0 });
          else fx.text('라운드 종료', 640, 330, { size: 90, color: '#ffffff', life: 1500, rot: 0, vy: 0 });
          break;
        case 'roundStart':
          break;
        case 'phase':
          fx.doFlash(0.7, '#ff4a2a');
          fx.shake(16);
          if (e.line) fx.text(e.line, 640, 200, { size: 46, color: '#ff8a5a', life: 1800, rot: 0, vy: 0 });
          a && a.sfx('phase');
          a && a.sfx('crowd', { cheer: 0.9 });
          break;
        case 'feintFooled':
          fx.text('속았다!', 640, 430, { size: 50, color: '#ff9ad0' });
          break;
        case 'feintRead':
          fx.text('안 속지!', hp.x, hp.y - 120, { size: 40, color: '#9affc8', life: 600 });
          break;
        case 'oppTired':
          fx.text('헉헉…', hp.x + 80, hp.y - 90, { size: 40, color: '#ffffff', life: 900, vy: -0.03 });
          break;
        case 'oppTaunt':
          fx.text('가드가 열렸다!', hp.x, hp.y - 130, { size: 34, color: '#ffe9a0', life: 900, rot: 0 });
          break;
        case 'oppGuardBreak':
          fx.text('가드 붕괴!', hp.x, hp.y - 100, { size: 56, color: '#ff8a3a' });
          fx.shake(10);
          a && a.sfx('guardBreak');
          break;
        case 'clinch':
          fx.text('붙잡기!', 640, 300, { size: 64, color: '#ffb03a' });
          a && a.sfx('block', { heavy: true });
          break;
        case 'clinchEscape':
          fx.text('뿌리쳤다!', 640, 330, { size: 60, color: '#7affd0' });
          fx.shake(8);
          a && a.sfx('dodge');
          break;
        case 'mash':
          a && a.sfx('tick');
          break;
        case 'winded':
          fx.text('숨이 차…', 640, 520, { size: 40, color: '#ffd0a0', life: 900 });
          a && a.sfx('winded');
          break;
        case 'oppTell':
          if (!e.fake) a && a.sfx('tell', { ms: e.ms });
          break;
        case 'oppAttack':
          a && a.sfx('whoosh', { punch: 'opp' });
          break;
        case 'finish':
          if (e.method === 'KO' || e.method === 'TKO') {
            fx.text(e.method === 'KO' ? 'K.O.!' : 'T.K.O.!', 640, 300, { size: 150, color: e.winner === 'player' ? '#ffe23a' : '#ff5050', life: 2200, rot: -0.05, vy: 0 });
            this.slowmo(1300, 0.25);
          } else {
            fx.text(e.winner === 'draw' ? '무승부' : '판정!', 640, 300, { size: 110, color: '#ffffff', life: 1800, rot: 0, vy: 0 });
          }
          a && a.sfx('bell', { end: true });
          a && a.sfx('crowd', { cheer: 1 });
          this.bumpExcite(1);
          break;
        default:
          break;
      }
    }
  }

  bumpExcite(v) {
    this.excite = Math.min(1, this.excite + v);
  }

  update(dt, alphaMs = 0) {
    this.time += dt;
    if (this.slow.t > 0) this.slow.t -= dt; // 실제 시간 기준
    const f = this.fight;
    this.excite = Math.max(0, this.excite - dt / 9000);
    const boring = this.time - this.lastActionAt > 12000 && f.phase === 'fight';
    this.ring.update(dt, this.excite);
    this.audio && this.audio.crowdLevel && this.audio.crowdLevel(this.excite, boring);
    this.effects.update(dt);
    this.hud.update(dt, f);
    const frozen = f.hitstop > 0 ? 0 : alphaMs;
    this.oppPose = this.oppAnim.update(dt, f.opp, frozen);
    this.computeHead();
    this.plPose = this.plAnim.update(dt, f.player, this.headPos, frozen, f.phase);
    if (this.tiltT > 0 && f.phase !== 'pdown') this.tiltT = Math.max(0, this.tiltT - dt / 600);
    if (this.effects.dim > 0) {
      const p = f.player;
      if (!(p.state === 'punch' && p.action === 'special' && p.t < 380)) this.effects.dim = Math.max(0, this.effects.dim - dt / 150);
      else if (Math.random() < 0.5) {
        const gp = this.plPose.gr;
        const a = Math.random() * Math.PI * 2;
        this.effects.particle(gp.x + Math.cos(a) * 220, gp.y + Math.sin(a) * 160, -Math.cos(a) * 0.9, -Math.sin(a) * 0.7, 240, 9, '#ffe23a', 'star', 0);
      }
    }
  }

  computeHead() {
    const pose = this.oppPose;
    const d = bodyDims(this.fight.oppData.look);
    const cx = 640 + pose.x;
    const hy = HIP_Y + pose.y + (-d.T - d.neck - d.HR * 0.78) * pose.sy + pose.hy;
    const hx = cx + pose.hx + Math.sin(pose.rot) * (d.T + d.neck);
    this.headPos.x = hx;
    this.headPos.y = hy;
    this.headR = d.HR;
  }

  draw(ctx, view) {
    const L = (this.layout = stageLayout(view));
    const f = this.fight;
    const fx = this.effects;
    const o = f.opp;
    ctx.fillStyle = '#0b0b12';
    ctx.fillRect(0, 0, L.w, L.h);
    ctx.save();
    ctx.translate(L.x, L.y);
    ctx.scale(L.s, L.s);
    if (L.portrait) {
      ctx.beginPath();
      ctx.rect(-400, -400, 2080, 720 + 400);
      ctx.clip();
    }
    // 카메라: 줌, 흔들림, 다운 기울기
    ctx.translate(fx.shakeX, fx.shakeY);
    if (fx.zoom !== 1) {
      ctx.translate(fx.zoomX, fx.zoomY);
      ctx.scale(fx.zoom, fx.zoom);
      ctx.translate(-fx.zoomX, -fx.zoomY);
    }
    if (this.tiltT > 0 || f.phase === 'pdown') {
      const k = f.phase === 'pdown' ? 1 : this.tiltT;
      ctx.translate(640, 400);
      ctx.rotate(0.06 * k);
      ctx.translate(-640, -400);
    }
    this.ring.draw(ctx, this.venue, { reduceFlash: this.settings.reduceFlash, floorPattern: this.floorPattern });
    this.ring.drawBackRopes(ctx, this.venue);
    this.drawOpponent(ctx);
    if (fx.dim > 0) {
      ctx.fillStyle = `rgba(0,0,20,${0.55 * fx.dim})`;
      ctx.fillRect(-400, -100, 2080, 1000);
    }
    fx.drawWorld(ctx);
    this.ring.drawFrontRopes(ctx, this.venue);
    const p = f.player;
    drawPlayerBack(ctx, this.playerLook, this.plPose, {
      bodyAlpha: 0.6,
      specialGlow: p.state === 'punch' && p.action === 'special',
    });
    fx.drawTexts(ctx);
    ctx.restore();
    if (L.portrait) {
      // 무대 아래 바닥
      ctx.fillStyle = '#14141f';
      ctx.fillRect(0, L.stageBottom, L.w, L.h - L.stageBottom);
    }
    fx.drawScreen(ctx, L.w, L.h);
    this.hud.draw(ctx, L, f, { playerName: this.playerName, specialKeyLabel: this.labels.special, mashLabel: this.labels.mash });
    if (f.phase === 'intro') this.drawIntro(ctx, L);
    if (this.coachLine) this.drawCoachLine(ctx, L);
  }

  drawOpponent(ctx) {
    const f = this.fight;
    const o = f.opp;
    const pose = this.oppPose;
    const look = this.effectiveLook();
    const tellGlow = o.state === 'tell' && !o.fake;
    const outline = tellGlow && this.settings.tellHighlight ? (look.tellColor || '#ff5a3a') : null;
    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(640 + pose.x, 700, 190 * look.build.w, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(640 + pose.x, HIP_Y + pose.y);
    ctx.rotate(pose.rot);
    ctx.scale(pose.sx, pose.sy);
    drawFrontBody(ctx, look, pose, {
      glowColor: look.tellColor || '#ff5a3a',
      outlineGlow: outline,
      time: this.time,
      sweaty: o.hp / o.maxHp < 0.3 || o.state === 'tired',
      skin: look.skin,
    });
    ctx.restore();
    // 머리 위 빙빙 별 (다운, 헛방)
    const hp = this.headPos;
    const dizzy = o.state === 'down' || o.state === 'counterStun' || o.state === 'ko' || (o.state === 'whiff' && o.t > 150) || o.state === 'shoved';
    if (dizzy) {
      for (let i = 0; i < 4; i++) {
        const a = this.time / 260 + (i * Math.PI) / 2;
        const sx = hp.x + Math.cos(a) * 70;
        const sy = hp.y - this.headR * 1.25 + Math.sin(a) * 18;
        starPath(ctx, sx, sy, 13, 5);
        ctx.fillStyle = '#ffe23a';
        ctx.fill();
        ctx.strokeStyle = '#1a1410';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }
    // 텔 강조: 피하는 방향 아이콘(모양+화살표, 색만으로 구분하지 않음)
    if (tellGlow && this.settings.tellHighlight && o.t > o.dur * 0.25) {
      drawAvoidIcon(ctx, hp.x, hp.y - this.headR * 1.9, o.atk.avoid, look.tellColor || '#ff5a3a');
    }
  }

  effectiveLook() {
    const o = this.fight.opp;
    const base = this.fight.oppData.look;
    const ph = o.ph && o.ph.look;
    if (!ph) return base;
    if (this._lookKey === o.phaseIndex) return this._look;
    this._lookKey = o.phaseIndex;
    this._look = { ...base, ...ph, extras: [...(base.extras || []), ...(ph.extras || [])] };
    return this._look;
  }

  drawIntro(ctx, L) {
    const f = this.fight;
    const k = f.phaseT / 1600;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (1 - k) * 3);
    ctx.font = `110px "Black Han Sans", "Jua", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1a1410';
    const txt = f.round >= f.maxRounds && f.maxRounds > 1 ? '마지막 라운드' : `${f.round}라운드`;
    const y = L.portrait ? L.y + 330 * L.s : L.h * 0.42;
    const sc = 0.8 + Math.min(1, k * 4) * 0.2;
    ctx.translate(L.w / 2, y);
    ctx.scale(sc, sc);
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  drawCoachLine(ctx, L) {
    const c = this.coachLine;
    const y = L.portrait ? L.stageBottom + 120 : L.h - 150;
    ctx.save();
    ctx.font = `24px "Gowun Dodum", "Malgun Gothic", sans-serif`;
    const tw = Math.min(L.w - 40, ctx.measureText(c).width + 40);
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    roundRect(ctx, L.w / 2 - tw / 2, y - 24, tw, 48, 14);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(c, L.w / 2, y + 1, L.w - 60);
    ctx.restore();
  }
}

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
      // 방패 (가드만 가능)
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

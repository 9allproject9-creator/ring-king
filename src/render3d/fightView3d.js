// 3D 경기 화면: Fight 상태와 이벤트만 읽어 3D 장면(상대·1인칭 장갑·경기장)과 2D HUD를 그린다.
import * as THREE from 'three';
import { Fighter3D } from './fighter.js';
import { FirstPerson, EYE } from './firstPerson.js';
import { OpponentAnimator } from '../render/opponentAnimator.js';
import { Effects } from '../render/effects.js';
import { Hud, drawAvoidIcon } from '../render/hud.js';
import { roundRect } from '../render/ring.js';
import { EASE } from '../render/rig.js';

const HIT_WORDS = { jab: '퍽!', straight: '팍!', upper: '쾅!', special: '필살!!' };
export const DEFAULT_PLAYER_LOOK = { skin: '#f0c8a0', gloves: '#2f7de1', glovePattern: null };

export function hudLayout(view) {
  const { w, h, portrait } = view;
  return { w, h, portrait, gaugeY: portrait ? Math.round(h * 0.6) : h - 50, stageBottom: portrait ? Math.round(h * 0.6) + 60 : h };
}

export class FightView3D {
  constructor({ stage, fight, venue = 'gym', settings = {}, playerLook, playerName = '나', audio = null, floorPattern = null }) {
    this.stage = stage;
    this.effects = new Effects();
    this.hud = new Hud();
    this.audio = audio;
    this.settings = settings;
    this.playerLook = playerLook || DEFAULT_PLAYER_LOOK;
    this.playerName = playerName;
    this.venue = venue;
    this.slow = { t: 0, scale: 1 };
    this.excite = 0.2;
    this.lastActionAt = 0;
    this.time = 0;
    this.labels = { special: 'Space', mash: '공격 버튼 연타로 일어나!' };
    this.coachLine = null;
    this.fovKick = 0;
    this.lookDown = 0;
    this.headScreen = { x: 640, y: 300 };
    this.headWorld = new THREE.Vector3();
    stage.arena.build(venue, floorPattern);
    this.fp = new FirstPerson(stage.camera, this.playerLook);
    this.setFight(fight);
  }

  setFight(fight) {
    this.fight = fight;
    if (this.fighter) {
      this.stage.scene.remove(this.fighter.root);
      this.fighter.dispose();
    }
    this.fighter = new Fighter3D(fight.oppData.look);
    this.stage.scene.add(this.fighter.root);
    this.oppAnim = new OpponentAnimator(fight.oppData);
    this.effects.reset();
    this.effects.reduceFlash = !!this.settings.reduceFlash;
    this.hud.reset(fight);
    this.phaseSeen = 0;
    this.stage.arena.setPhaseMood('normal');
  }

  dispose() {
    if (this.fighter) {
      this.stage.scene.remove(this.fighter.root);
      this.fighter.dispose();
      this.fighter = null;
    }
    if (this.fp) this.stage.camera.remove(this.fp.rig);
    this.stage.arena.group.rotation.y = 0;
  }

  timeScale() {
    return this.slow.t > 0 ? this.slow.scale : 1;
  }

  slowmo(ms, scale) {
    if (this.settings.reduceMotion) return;
    this.slow.t = ms;
    this.slow.scale = scale;
  }

  camShake(amount) {
    if (this.settings.shake === false || this.settings.reduceMotion) return;
    this.fp.onHit(amount * 0.0022);
  }

  zoom(amount) {
    if (this.settings.shake === false || this.settings.reduceMotion) return;
    this.fovKick = Math.max(this.fovKick, amount);
  }

  onEvents(events) {
    const fx = this.effects;
    const a = this.audio;
    const hp = this.headScreen;
    for (const e of events) {
      this.oppAnim.onEvent(e);
      this.hud.onEvent(e);
      switch (e.type) {
        case 'punchStart':
          a && a.sfx('whoosh', { punch: e.punch });
          if (e.punch === 'special') { a && a.sfx('charge'); fx.dim = 1; }
          break;
        case 'hit': {
          this.lastActionAt = this.time;
          const big = e.kind === 'counter' || e.kind === 'interrupt' || e.kind === 'special';
          const mag = Math.min(1.6, e.dmg / 8);
          const ix = hp.x + (e.punch === 'jab' ? -30 : e.punch === 'straight' ? 30 : 0);
          const iy = hp.y + (e.punch === 'upper' ? 40 : 10);
          fx.impact(ix, iy, 70 + mag * 50, big ? '#ffe23a' : '#ffffff');
          fx.sweat(hp.x, hp.y - 20, e.punch === 'jab' ? 1 : e.punch === 'straight' ? -1 : 0);
          this.camShake(3 + e.dmg * 0.7);
          if (e.dmg >= 9 || big) this.zoom(0.06 + Math.min(0.08, e.dmg / 300));
          let word = HIT_WORDS[e.punch];
          let color = '#ffe23a';
          let size = 60 + mag * 20;
          if (e.kind === 'counter') { word = '카운터!'; color = '#ff5a3a'; size = 84; }
          if (e.kind === 'interrupt') { word = '끊어치기!'; color = '#3ad7ff'; size = 84; }
          if (e.kind === 'special') { word = '★필살 펀치★'; color = '#ffe23a'; size = 92; fx.doFlash(0.6); fx.dim = 0; }
          if (e.kind === 'stagger' && e.punch !== 'special') word = word.replace('!', '!!');
          fx.text(word, ix + (Math.random() - 0.5) * 60, iy - 90, { size, color });
          if (e.combo) fx.text(e.combo + '!', ix, iy + 50, { size: 34, color: '#ffffff', life: 650, rot: 0 });
          this.bumpExcite(big ? 0.35 : 0.08);
          this.stage.arena.ropeShake = Math.min(1, this.stage.arena.ropeShake + e.dmg / 30);
          a && a.sfx('hit', { punch: e.punch, kind: e.kind, dmg: e.dmg });
          if (big) a && a.sfx('crowd', { cheer: 0.8 });
          break;
        }
        case 'block':
          fx.impact(hp.x + (e.punch === 'jab' ? -40 : 40), hp.y + 60, 50, '#9ab8ff');
          fx.text(e.why === 'read' ? '읽혔다!' : '막힘', hp.x + (Math.random() - 0.5) * 80, hp.y - 70, { size: 36, color: '#c8d8ff', life: 500 });
          this.camShake(2);
          a && a.sfx('block');
          break;
        case 'outOfRange': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('멀어서 안 닿았다!', L.w / 2, L.h * 0.5, { size: 36, color: '#dddddd', life: 600 });
          a && a.sfx('miss');
          break;
        }
        case 'whiff':
          fx.text(e.far ? '너무 멀어!' : e.evaded ? '스텝으로 피했다!' : '헛손질', hp.x, hp.y - 60, { size: 32, color: '#dddddd', life: 500 });
          a && a.sfx('miss');
          break;
        case 'playerHit': {
          this.lastActionAt = this.time;
          const L = this.layout || { w: 1280, h: 720 };
          this.camShake(12 + e.dmg * 1.1);
          fx.hurtVignette(Math.min(1, 0.45 + e.dmg / 18));
          fx.doFlash(0.18, '#ffffff');
          fx.text('윽!', L.w / 2 + (Math.random() - 0.5) * 200, L.h * 0.62, { size: 60, color: '#ff6a6a' });
          fx.burst(L.w / 2, L.h * 0.5, 12, { speed: 0.8, size: 8, color: '#ffffff', kind: 'spark', grav: 0 });
          this.bumpExcite(0.12);
          a && a.sfx('hurt', { dmg: e.dmg });
          break;
        }
        case 'playerBlock': {
          const L = this.layout || { w: 1280, h: 720 };
          this.camShake(5);
          fx.impact(L.w / 2, L.h * 0.62, 70, '#9ad0ff');
          fx.text('가드!', L.w / 2, L.h * 0.5, { size: 40, color: '#bfe2ff', life: 450 });
          a && a.sfx('block', { heavy: true });
          break;
        }
        case 'guardBreak': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('가드가 깨졌다!', L.w / 2, L.h * 0.55, { size: 50, color: '#ff8a3a' });
          this.camShake(14);
          a && a.sfx('guardBreak');
          break;
        }
        case 'dodge': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('피했다!', L.w / 2 + (e.dir === 'L' ? -260 : e.dir === 'R' ? 260 : 0), L.h * (e.dir === 'duck' ? 0.36 : 0.55), { size: 48, color: '#7affd0', life: 550 });
          for (let i = 0; i < 10; i++) {
            const sx = e.dir === 'L' ? 1 : e.dir === 'R' ? -1 : 0;
            fx.particle(L.w / 2 + (Math.random() - 0.5) * L.w * 0.6, L.h * (0.3 + Math.random() * 0.5), sx * 1.2, e.dir === 'duck' ? -0.9 : 0, 220, 4, 'rgba(255,255,255,0.8)', 'line', 0);
          }
          this.bumpExcite(0.1);
          a && a.sfx('dodge');
          break;
        }
        case 'dodgeStart':
          a && a.sfx('swish');
          break;
        case 'wrongDodge': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('반대쪽!', L.w / 2, L.h * 0.42, { size: 42, color: '#ffb0b0', life: 650 });
          break;
        }
        case 'star':
          a && a.sfx('star');
          fx.burst(hp.x, hp.y, 10, { speed: 0.5, life: 600, size: 10, color: '#ffe23a', kind: 'star', grav: 0.0008 });
          fx.text('★', hp.x, hp.y - 130, { size: 60, color: '#ffe23a', life: 600, rot: 0, vy: 0.15 });
          break;
        case 'starLost': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.burst(L.w / 2, L.gaugeY - 34, 4 * e.lost, { speed: 0.4, life: 700, size: 12, color: '#ffe23a', kind: 'star', grav: 0.002 });
          break;
        }
        case 'down': {
          const L = this.layout || { w: 1280, h: 720 };
          if (e.who === 'opponent') {
            fx.text(e.tko ? 'T.K.O.!' : '다운!', L.w / 2, L.h * 0.3, { size: 120, color: '#ffe23a', life: 1400, rot: -0.08, vy: 0 });
            this.slowmo(1100, 0.3);
            this.zoom(0.18);
            fx.doFlash(0.5);
            this.bumpExcite(1);
            a && a.sfx('down');
            a && a.sfx('crowd', { cheer: 1 });
          } else {
            fx.text('다운…', L.w / 2, L.h * 0.38, { size: 100, color: '#ff6a6a', life: 1300, rot: 0.06, vy: 0 });
            this.slowmo(900, 0.35);
            this.camShake(22);
            a && a.sfx('down', { player: true });
          }
          break;
        }
        case 'count':
          a && a.sfx('count', { n: e.n });
          break;
        case 'getup': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text(e.who === 'player' ? '일어났다!' : '다시 일어났다!', L.w / 2, L.h * 0.38, { size: 64, color: '#ffffff', life: 900, rot: 0 });
          a && a.sfx('crowd', { cheer: 0.6 });
          break;
        }
        case 'bell': {
          const L = this.layout || { w: 1280, h: 720 };
          a && a.sfx('bell', { start: e.start });
          if (e.start) fx.text('시작!', L.w / 2, L.h * 0.42, { size: 120, color: '#ffe23a', life: 900, rot: 0, vy: 0 });
          else fx.text('라운드 종료', L.w / 2, L.h * 0.42, { size: 90, color: '#ffffff', life: 1500, rot: 0, vy: 0 });
          break;
        }
        case 'phase': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.doFlash(0.7, '#ff4a2a');
          this.camShake(16);
          if (e.line) fx.text(e.line, L.w / 2, L.h * 0.24, { size: Math.min(46, L.w / 22), color: '#ff8a5a', life: 1900, rot: 0, vy: 0 });
          a && a.sfx('phase');
          a && a.sfx('crowd', { cheer: 0.9 });
          break;
        }
        case 'feintFooled': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('속았다!', L.w / 2, L.h * 0.55, { size: 50, color: '#ff9ad0' });
          break;
        }
        case 'feintRead':
          fx.text('안 속지!', hp.x, hp.y - 130, { size: 40, color: '#9affc8', life: 600 });
          break;
        case 'oppTired':
          fx.text('헉헉…', hp.x + 90, hp.y - 100, { size: 40, color: '#ffffff', life: 900, vy: -0.03 });
          break;
        case 'oppTaunt':
          fx.text('가드가 열렸다!', hp.x, hp.y - 140, { size: 34, color: '#ffe9a0', life: 900, rot: 0 });
          break;
        case 'oppLearn':
          fx.text('패턴 학습!', hp.x, hp.y - 150, { size: 36, color: '#3affea', life: 800, rot: 0 });
          break;
        case 'oppGuardBreak':
          fx.text('가드 붕괴!', hp.x, hp.y - 110, { size: 56, color: '#ff8a3a' });
          this.camShake(10);
          a && a.sfx('guardBreak');
          break;
        case 'clinch': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('붙잡기!', L.w / 2, L.h * 0.38, { size: 64, color: '#ffb03a' });
          a && a.sfx('block', { heavy: true });
          break;
        }
        case 'clinchEscape': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('뿌리쳤다!', L.w / 2, L.h * 0.42, { size: 60, color: '#7affd0' });
          this.camShake(8);
          a && a.sfx('dodge');
          break;
        }
        case 'mash':
          a && a.sfx('tick');
          break;
        case 'winded': {
          const L = this.layout || { w: 1280, h: 720 };
          fx.text('숨이 차…', L.w / 2, L.h * 0.66, { size: 40, color: '#ffd0a0', life: 900 });
          a && a.sfx('winded');
          break;
        }
        case 'oppTell':
          if (!e.fake) a && a.sfx('tell', { ms: e.ms });
          break;
        case 'oppAttack': {
          a && a.sfx('whoosh', { punch: 'opp' });
          const L = this.layout || { w: 1280, h: 720 };
          for (let i = 0; i < 10; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r0 = 180 + Math.random() * 220;
            fx.particle(L.w / 2 + Math.cos(ang) * r0, L.h * 0.55 + Math.sin(ang) * r0 * 0.6, -Math.cos(ang) * 0.8, -Math.sin(ang) * 0.5, 170, 3, 'rgba(255,255,255,0.7)', 'line', 0);
          }
          break;
        }
        case 'finish': {
          const L = this.layout || { w: 1280, h: 720 };
          if (e.method === 'KO' || e.method === 'TKO') {
            fx.text(e.method === 'KO' ? 'K.O.!' : 'T.K.O.!', L.w / 2, L.h * 0.38, { size: 150, color: e.winner === 'player' ? '#ffe23a' : '#ff5050', life: 2200, rot: -0.05, vy: 0 });
            this.slowmo(1300, 0.25);
          } else {
            fx.text(e.winner === 'draw' ? '무승부' : '판정!', L.w / 2, L.h * 0.38, { size: 110, color: '#ffffff', life: 1800, rot: 0, vy: 0 });
          }
          a && a.sfx('bell', { end: true });
          a && a.sfx('crowd', { cheer: 1 });
          this.bumpExcite(1);
          break;
        }
        default:
          break;
      }
    }
  }

  bumpExcite(v) {
    this.excite = Math.min(1, this.excite + v);
  }

  effectiveLook() {
    const o = this.fight.opp;
    const base = this.fight.oppData.look;
    const ph = o.ph && o.ph.look;
    if (!ph) return base;
    return { ...base, ...ph, extras: [...(base.extras || []), ...(ph.extras || [])] };
  }

  update(dt, alphaMs = 0) {
    this.time += dt;
    if (this.slow.t > 0) this.slow.t -= dt;
    const f = this.fight;
    const o = f.opp;
    const st = this.stage;
    this.excite = Math.max(0, this.excite - dt / 9000);
    const boring = this.time - this.lastActionAt > 12000 && f.phase === 'fight';
    st.arena.update(dt, this.excite, this.settings.reduceFlash);
    this.audio && this.audio.crowdLevel && this.audio.crowdLevel(this.excite, boring);
    this.effects.update(dt);
    this.hud.update(dt, f);
    // 페이즈 외형·조명
    if (o.phaseIndex !== this.phaseSeen) {
      this.phaseSeen = o.phaseIndex;
      this.fighter.setColors(this.effectiveLook());
      st.arena.setPhaseMood(o.ph.music || 'normal');
    }
    const frozen = f.hitstop > 0 ? 0 : alphaMs;
    const pose = this.oppAnim.update(dt, o, frozen);
    const tellReal = o.state === 'tell' && !o.fake;
    this.fighter.setHighlight(tellReal && this.settings.tellHighlight ? (this.fight.oppData.look.tellColor || '#ff5a3a') : null);
    let fall = 0;
    let ko = false;
    const ot = o.t + frozen;
    if (o.state === 'down') fall = EASE.out(Math.min(1, ot / 900));
    else if (o.state === 'getup') fall = 1 - EASE.inOut(Math.min(1, ot / Math.max(1, o.dur)));
    else if (o.state === 'ko') { fall = EASE.in(Math.min(1, ot / 1100)); ko = true; }
    const dizzy = o.state === 'down' || o.state === 'counterStun' || o.state === 'ko' || (o.state === 'whiff' && o.t > 150) || o.state === 'shoved';
    this.fighter.update(dt, pose, {
      glowColor: this.fight.oppData.look.tellColor || '#ff5a3a',
      fall, ko, dizzy,
      sweaty: o.hp / o.maxHp < 0.3 || o.state === 'tired',
    });
    this.fighter.root.position.x = pose.x * 0.0026;
    // 1인칭 카메라·장갑: 상대 머리를 겨눈다
    this.fighter.headWorld(this.headWorld);
    const targetCam = st.toCamera(this.headWorld);
    this.fp.update(dt, f.player, targetCam, frozen, f.phase, this.settings);
    const cam = st.camera;
    // 링 안 이동: 거리만큼 뒤로, 돈 만큼 경기장이 반대로 돈다(= 내가 상대 주위를 돎)
    this.gapS = (this.gapS || 0) + (f.gap - (this.gapS || 0)) * Math.min(1, dt / 60);
    this.orbitS = (this.orbitS || 0) + (f.orbit - (this.orbitS || 0)) * Math.min(1, dt / 60);
    st.arena.group.rotation.y = this.orbitS;
    cam.position.z += this.gapS;
    const moving = Math.abs(f.orbit - this.orbitS) > 0.002 || Math.abs(f.gap - this.gapS) > 0.002;
    if (moving && !this.settings.reduceMotion) cam.position.y += Math.abs(Math.sin(this.time / 110)) * 0.025;
    // 상대가 쓰러지면 내려다본다
    const wantDown = (o.state === 'down' || o.state === 'ko') ? 0.32 : 0;
    this.lookDown += (wantDown - this.lookDown) * Math.min(1, dt / 300);
    cam.rotation.x -= this.lookDown;
    // 첫 라운드 시작: 넓은 화면에서 1인칭으로 날아 들어오기
    if (f.phase === 'intro' && f.round === 1 && !this.settings.reduceMotion) {
      const k = EASE.inOut(Math.min(1, f.phaseT / 1500));
      const wide = new THREE.Vector3(2.6, 2.1, 3.4);
      cam.position.lerpVectors(wide, cam.position.clone(), k);
      const look = new THREE.Vector3(0, 1.3, 0);
      const q0 = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(wide, look, new THREE.Vector3(0, 1, 0)));
      cam.quaternion.slerpQuaternions(q0, cam.quaternion.clone(), k);
    }
    // 줌(시야각)
    this.fovKick *= Math.pow(0.004, dt / 1000);
    cam.fov = st.baseFov * (1 - this.fovKick);
    cam.updateProjectionMatrix();
    // 필살 펀치 준비: 별이 장갑으로 모인다
    const fx = this.effects;
    if (fx.dim > 0) {
      const p = f.player;
      if (!(p.state === 'punch' && p.action === 'special' && p.t < 380)) fx.dim = Math.max(0, fx.dim - dt / 150);
      else if (Math.random() < 0.6 && this.layout) {
        const gp = st.project(this.fp.gloves.R.group.getWorldPosition(new THREE.Vector3()));
        const a = Math.random() * Math.PI * 2;
        fx.particle(gp.x + Math.cos(a) * 260, gp.y + Math.sin(a) * 180, -Math.cos(a) * 1.0, -Math.sin(a) * 0.8, 250, 10, '#ffe23a', 'star', 0);
      }
    }
    this.fp.setSpecialGlow(f.player.state === 'punch' && f.player.action === 'special');
  }

  draw(ctx, view) {
    const L = (this.layout = hudLayout(view));
    const st = this.stage;
    st.render();
    st.project(this.headWorld, this.headScreen);
    const f = this.fight;
    const o = f.opp;
    const fx = this.effects;
    ctx.clearRect(0, 0, L.w, L.h);
    if (fx.dim > 0) {
      ctx.fillStyle = `rgba(0,0,20,${0.5 * fx.dim})`;
      ctx.fillRect(0, 0, L.w, L.h);
    }
    fx.drawWorld(ctx);
    // 텔 강조: 피하는 방향 아이콘
    if (o.state === 'tell' && !o.fake && this.settings.tellHighlight && o.t > o.dur * 0.25) {
      const r = Math.max(60, 150 * (st.baseFov / st.camera.fov));
      drawAvoidIcon(ctx, this.headScreen.x, this.headScreen.y - r, o.atk.avoid, f.oppData.look.tellColor || '#ff5a3a');
    }
    fx.drawTexts(ctx);
    fx.drawScreen(ctx, L.w, L.h);
    this.hud.draw(ctx, L, f, { playerName: this.playerName, specialKeyLabel: this.labels.special, mashLabel: this.labels.mash });
    if (f.phase === 'intro') this.drawIntro(ctx, L);
    if (this.coachLine) this.drawCoachLine(ctx, L);
  }

  drawIntro(ctx, L) {
    const f = this.fight;
    const k = f.phaseT / 1600;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, (1 - k) * 3));
    ctx.font = `${Math.min(110, L.w / 9)}px "Black Han Sans", "Jua", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#1a1410';
    const txt = f.round >= f.maxRounds && f.maxRounds > 1 ? '마지막 라운드' : `${f.round}라운드`;
    const sc = 0.8 + Math.min(1, k * 4) * 0.2;
    ctx.translate(L.w / 2, L.h * (L.portrait ? 0.3 : 0.42));
    ctx.scale(sc, sc);
    ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(txt, 0, 0);
    ctx.restore();
  }

  drawCoachLine(ctx, L) {
    const c = this.coachLine;
    const y = L.portrait ? L.gaugeY + 110 : L.h - 150;
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

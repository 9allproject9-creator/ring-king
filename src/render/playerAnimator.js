// 내 선수 로직 상태 → 뒷모습 포즈 (무대 좌표)
import { CONFIG } from '../config.js';
import { EASE } from './rig.js';

const P = CONFIG.player;

function lerp(a, b, t) { return a + (b - a) * t; }

export class PlayerAnimator {
  constructor() {
    this.pose = { x: 0, y: 0, rot: 0, hx: 0, gl: { x: 540, y: 652, s: 1 }, gr: { x: 740, y: 652, s: 1 } };
    this.time = 0;
    this.shake = 0;
  }

  // target: 상대 머리 위치(무대 좌표)
  update(dt, p, target, alphaMs = 0, fightPhase = 'fight') {
    this.time += dt;
    const t = p.t + alphaMs;
    const bob = Math.sin(this.time / 260) * 5;
    let x = 0, y = bob, rot = 0;
    let gl = { x: 540, y: 652 + bob, s: 1 };
    let gr = { x: 740, y: 652 - bob * 0.6, s: 1 };
    let direct = false;
    const tx = target.x;
    const ty = target.y;
    switch (p.state) {
      case 'guard':
      case 'guardRelease':
        gl = { x: 588, y: 548, s: 1.12 };
        gr = { x: 692, y: 548, s: 1.12 };
        y = 10;
        break;
      case 'punch': {
        direct = true;
        const pc = P.punches[p.action];
        const s = pc.startup, a = pc.active, r = pc.recovery + p.extraRecovery;
        let k; // 0=제자리, 1=뻗음
        let wind = 0;
        if (t < s) { wind = EASE.out(t / s); k = 0; }
        else if (t < s + a) { k = EASE.snap(Math.min(1, (t - s) / Math.max(30, a * 0.6))); }
        else { k = 1 - EASE.inOut(Math.min(1, (t - s - a) / r)); }
        if (p.action === 'jab') {
          gl = { x: lerp(540 + wind * -8, tx - 30, k), y: lerp(652 + wind * 10, ty + 30, k), s: lerp(1 + wind * 0.05, 0.4, k) };
          x = -10 * k; rot = 0.03 * k;
        } else if (p.action === 'straight') {
          gr = { x: lerp(740 + wind * 20, tx + 20, k), y: lerp(652 + wind * 18, ty + 34, k), s: lerp(1 + wind * 0.08, 0.38, k) };
          x = 26 * k + wind * -10; rot = -0.06 * k + wind * 0.03;
        } else if (p.action === 'upper') {
          const low = { x: 735, y: 715, s: 1.1 };
          const sx = lerp(740, low.x, wind);
          const sy = lerp(652, low.y, wind);
          gr = { x: lerp(sx, tx + 10, k), y: lerp(sy, ty + 70, k), s: lerp(1 + wind * 0.1, 0.46, k) };
          y = wind * 26 - k * 18; x = 14 * k; rot = -0.04 * k;
        } else if (p.action === 'special') {
          gr = { x: lerp(lerp(740, 860, wind), tx, k), y: lerp(lerp(652, 660, wind), ty + 30, k), s: lerp(1 + wind * 0.2, 0.5, k) };
          gl = { x: lerp(540, 560, wind), y: lerp(652, 560, wind), s: 1.05 };
          y = wind * 22 - k * 10; x = -wind * 30 + k * 40; rot = wind * 0.08 - k * 0.1;
        }
        break;
      }
      case 'dodge': {
        const d = P.dodges[p.action];
        const end = p.dodgeEnd();
        let k;
        if (t < d.invulnStart) k = EASE.out(t / d.invulnStart);
        else if (t < d.invulnEnd) k = 1;
        else k = 1 - EASE.inOut(Math.min(1, (t - d.invulnEnd) / Math.max(1, end - d.invulnEnd)));
        direct = true;
        if (p.action === 'duck') {
          y = 165 * k;
          gl = { x: 560, y: 620 + 150 * k, s: 1.1 };
          gr = { x: 720, y: 620 + 150 * k, s: 1.1 };
        } else {
          const sg = p.action === 'L' ? -1 : 1;
          x = sg * 210 * k;
          rot = sg * 0.24 * k;
          y = 30 * k;
          gl = { x: 540 + x, y: 600 + 30 * k, s: 1 };
          gr = { x: 740 + x, y: 600 + 30 * k, s: 1 };
        }
        break;
      }
      case 'hurt':
        x = Math.sin(t / 25) * 14 * (1 - t / p.dur);
        y = 30;
        rot = 0.06 * Math.sin(t / 40);
        gl = { x: 490, y: 650, s: 0.95 };
        gr = { x: 800, y: 640, s: 0.95 };
        break;
      case 'winded':
        y = 46 + Math.sin(this.time / 180) * 8;
        gl = { x: 510, y: 700, s: 0.95 };
        gr = { x: 770, y: 700, s: 0.95 };
        break;
      case 'guardBroken':
        y = 20;
        gl = { x: 400, y: 560, s: 0.95 };
        gr = { x: 880, y: 560, s: 0.95 };
        rot = Math.sin(t / 60) * 0.04;
        break;
      case 'clinched':
        y = -10 + Math.sin(this.time / 50) * 5;
        gl = { x: 575 + Math.sin(this.time / 40) * 10, y: 535, s: 1.1 };
        gr = { x: 705 - Math.sin(this.time / 40) * 10, y: 535, s: 1.1 };
        break;
      case 'down':
        y = 470;
        rot = 0.28;
        gl = { x: 520, y: 1100, s: 1 };
        gr = { x: 760, y: 1100, s: 1 };
        break;
      case 'getup': {
        const k = 1 - EASE.out(Math.min(1, t / p.dur));
        y = 470 * k;
        rot = 0.28 * k;
        gl = { x: 540, y: 652 + 480 * k, s: 1 };
        gr = { x: 740, y: 652 + 480 * k, s: 1 };
        break;
      }
      default:
        break;
    }
    if (fightPhase === 'odown' || fightPhase === 'ending') {
      // 승리 세리머니: 팔 들기
      if (fightPhase === 'ending' && p.hp > 0) {
        gl = { x: 470, y: 330 + Math.sin(this.time / 200) * 14, s: 0.9 };
        gr = { x: 810, y: 330 + Math.cos(this.time / 200) * 14, s: 0.9 };
        y = -20;
      }
    }
    const pose = this.pose;
    const k = direct ? 1 : Math.min(1, dt / 45);
    pose.x = lerp(pose.x, x, direct ? Math.min(1, dt / 25) : k);
    pose.y = lerp(pose.y, y, direct ? Math.min(1, dt / 25) : k);
    pose.rot = lerp(pose.rot, rot, direct ? Math.min(1, dt / 25) : k);
    for (const [cur, tg] of [[pose.gl, gl], [pose.gr, gr]]) {
      cur.x = lerp(cur.x, tg.x, k);
      cur.y = lerp(cur.y, tg.y, k);
      cur.s = lerp(cur.s, tg.s, k);
    }
    return pose;
  }
}

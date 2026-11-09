// 1인칭: 카메라(내 눈)와 화면 아래 내 장갑. 피하면 화면 자체가 좌우·아래로 움직인다.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { EASE } from '../render/rig.js';
import { toonMat, outlineMat, GEO } from './toon.js';

const P = CONFIG.player;
export const EYE = { x: 0, y: 1.46, z: 1.62 };
const IDLE = { L: new THREE.Vector3(-0.19, -0.2, -0.56), R: new THREE.Vector3(0.19, -0.2, -0.56) };
const GUARD = { L: new THREE.Vector3(-0.07, -0.14, -0.4), R: new THREE.Vector3(0.07, -0.14, -0.4) };
const GLOVE_SCALE = 0.72;

const lerp = (a, b, t) => a + (b - a) * t;
// 팔: 손목 쪽이 가늘고 어깨 쪽이 굵은 원기둥 (+y가 손목)
const ARM_GEO = new THREE.CylinderGeometry(1, 1.45, 1, 16, 1, true);
// 팔뚝 원기둥을 a→b 사이에 정확히 놓기
const _ad = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
function placeArm(obj, a, b, r) {
  _ad.subVectors(b, a);
  const len = Math.max(0.001, _ad.length());
  obj.position.copy(a).addScaledVector(_ad, 0.5);
  obj.quaternion.setFromUnitVectors(_up, _ad.multiplyScalar(1 / len));
  obj.scale.set(r, len, r);
}
// 2차 베지어 곡선: 펀치가 직선이 아니라 자연스러운 호를 그리게
const bez = (p0, c, p1, u) => {
  const m = 1 - u;
  return new THREE.Vector3(
    m * m * p0.x + 2 * m * u * c.x + u * u * p1.x,
    m * m * p0.y + 2 * m * u * c.y + u * u * p1.y,
    m * m * p0.z + 2 * m * u * c.z + u * u * p1.z,
  );
};

function patternTexture(color, pattern) {
  if (!pattern) return null;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.fillRect(0, 0, 256, 128);
  if (pattern === 'stripe') {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(0, 54, 256, 20);
  } else if (pattern === 'star' || pattern === 'gold') {
    g.fillStyle = pattern === 'gold' ? '#fff6c0' : '#ffe23a';
    for (const cx of [64, 192]) {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 9 : 22;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        g.lineTo(cx + Math.cos(a) * r, 64 + Math.sin(a) * r);
      }
      g.fill();
    }
  } else if (pattern === 'flame') {
    g.fillStyle = '#ffb02a';
    g.beginPath();
    g.moveTo(0, 128);
    for (let x = 0; x <= 256; x += 32) g.lineTo(x, 70 + ((x / 32) % 2) * 34);
    g.lineTo(256, 128);
    g.fill();
  } else if (pattern === 'bolt') {
    g.fillStyle = '#ffe23a';
    for (const cx of [64, 192]) {
      g.beginPath();
      g.moveTo(cx - 4, 30); g.lineTo(cx + 14, 30); g.lineTo(cx + 2, 62); g.lineTo(cx + 16, 62); g.lineTo(cx - 12, 102); g.lineTo(cx - 2, 72); g.lineTo(cx - 14, 72);
      g.fill();
    }
  } else if (pattern === 'dots') {
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 24; i++) { g.beginPath(); g.arc((i * 47) % 256, (i * 29) % 128, 7, 0, Math.PI * 2); g.fill(); }
  } else if (pattern === 'heart') {
    g.fillStyle = '#ff6fa8';
    for (const cx of [64, 192]) {
      g.beginPath();
      g.moveTo(cx, 88);
      g.bezierCurveTo(cx - 40, 56, cx - 16, 28, cx, 46);
      g.bezierCurveTo(cx + 16, 28, cx + 40, 56, cx, 88);
      g.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class FirstPerson {
  constructor(camera, look) {
    this.camera = camera;
    this.rig = new THREE.Group(); // 장갑은 카메라를 따라다닌다
    camera.add(this.rig);
    this.time = 0;
    this.pos = new THREE.Vector3(EYE.x, EYE.y, EYE.z);
    this.rot = new THREE.Euler(0, 0, 0, 'YXZ');
    this.shake = new THREE.Vector3();
    this.shakeAmt = 0;
    this.kick = 0;
    this.fovPulse = 0;
    this.gl = IDLE.L.clone();
    this.gr = IDLE.R.clone();
    this.glS = 1;
    this.grS = 1;
    this.rotL = new THREE.Vector3(-0.15, 0.18, -0.1);
    this.rotR = new THREE.Vector3(-0.15, -0.18, 0.1);
    this.strL = 1;
    this.strR = 1;
    this.setLook(look);
  }

  setLook(look) {
    if (this.gloves) {
      for (const g of Object.values(this.gloves)) this.rig.remove(g.group, g.arm, ...g.ghosts);
    }
    this.look = look;
    const ol = outlineMat(0.006);
    const tex = patternTexture(look.gloves, look.glovePattern);
    const gMat = tex ? toonMat('#ffffff', { map: tex }) : toonMat(look.gloves);
    const dark = toonMat('#' + new THREE.Color(look.gloves).multiplyScalar(0.72).getHexString());
    const skin = toonMat(look.skin || '#f0c8a0');
    const wrap = toonMat('#f4f4f4');
    const mk = (sg) => {
      const group = new THREE.Group();
      // 본체: 둥근 주먹 덩어리 (children[0] 유지: 필살기 빛남에 씀)
      const main = new THREE.Mesh(GEO.sphere, gMat);
      main.scale.set(0.085, 0.078, 0.1);
      main.add(new THREE.Mesh(GEO.sphere, ol));
      group.add(main);
      // 주먹 앞쪽 두툼한 패드(너클)
      const knuckle = new THREE.Mesh(GEO.sphere, gMat);
      knuckle.scale.set(0.08, 0.068, 0.066);
      knuckle.position.set(0, 0.012, -0.042);
      group.add(knuckle);
      // 엄지: 장갑 옆면에 납작하게 붙은 혹 (밖으로 튀어나오지 않게, 외곽선 없음)
      const thumb = new THREE.Mesh(GEO.sphere, gMat);
      thumb.scale.set(0.024, 0.034, 0.06);
      thumb.position.set(-sg * 0.064, 0.016, -0.012);
      thumb.rotation.set(0.2, 0, -sg * 0.35);
      group.add(thumb);
      // 손목: 장갑 색(조금 어둡게) + 흰 끈 띠
      const cuff = new THREE.Mesh(GEO.cyl, dark);
      cuff.scale.set(0.06, 0.07, 0.06);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.z = 0.1;
      cuff.add(new THREE.Mesh(GEO.cyl, ol));
      group.add(cuff);
      const band = new THREE.Mesh(GEO.cyl, wrap);
      band.scale.set(0.0625, 0.016, 0.0625);
      band.rotation.x = Math.PI / 2;
      band.position.z = 0.09;
      group.add(band);
      // 손등 로고 패치
      const patch = new THREE.Mesh(GEO.sphere, wrap);
      patch.scale.set(0.034, 0.008, 0.03);
      patch.position.set(0, 0.073, 0.012);
      group.add(patch);
      // 팔뚝: 정확한 길이의 원기둥 (늘인 캡슐은 끝이 장갑 위로 뾰족하게 튀어나왔음)
      const arm = new THREE.Mesh(ARM_GEO, skin);
      arm.add(new THREE.Mesh(ARM_GEO, ol));
      // 빠르게 뻗을 때 남는 잔상
      const ghosts = [0.32, 0.2, 0.11].map((op) => {
        const m = new THREE.Mesh(GEO.sphereLo, new THREE.MeshBasicMaterial({ color: look.gloves, transparent: true, opacity: op, depthWrite: false }));
        m.userData.op = op;
        m.visible = false;
        return m;
      });
      this.rig.add(group, arm, ...ghosts);
      return { group, arm, sg, ghosts, hist: [], prev: new THREE.Vector3(), speed: 0 };
    };
    this.gloves = { L: mk(-1), R: mk(1) };
    this.glowMat = null;
  }

  // 내 펀치가 맞았을 때: 손에 반동이 오고 화면이 살짝 튕김
  onPunchHit(punch) {
    const m = { jab: 0.5, straight: 1, upper: 1.1, special: 1.6 }[punch] || 1;
    this.recoil = { z: 0.025 * m, pitch: punch === 'upper' ? 0.04 * m : 0, yaw: punch === 'jab' ? 0.012 : punch === 'straight' ? -0.018 : 0, t: 1 };
  }

  onHit(strength) {
    this.shakeAmt = Math.min(0.08, this.shakeAmt + strength);
  }

  // p: Player, targetCam: 상대 머리(카메라 좌표), phase: 경기 단계
  update(dt, p, targetCam, alphaMs, phase, settings = {}) {
    this.time += dt;
    const t = p.t + alphaMs;
    const bob = Math.sin(this.time / 300) * 0.006;
    let cx = 0, cy = 0, cz = 0, roll = 0, pitch = 0, yaw = 0;
    let gl = IDLE.L.clone(), gr = IDLE.R.clone();
    gl.y += bob; gr.y -= bob * 0.7;
    let glS = 1, grS = 1;
    const rotL = new THREE.Vector3(-0.15, 0.18, -0.1), rotR = new THREE.Vector3(-0.15, -0.18, 0.1);
    let strL = 1, strR = 1;
    let direct = false;
    const tgt = targetCam.clone();
    tgt.z = Math.max(-1.05, Math.min(-0.4, tgt.z + 0.18));
    switch (p.state) {
      case 'guard':
      case 'guardRelease':
        gl = GUARD.L.clone(); gr = GUARD.R.clone();
        cy = -0.03;
        break;
      case 'punch': {
        direct = true;
        const pc = P.punches[p.action];
        const s = pc.startup, a = pc.active, r = pc.recovery + p.extraRecovery;
        // wind: 준비(뒤로 당김), k: 뻗기(0→1), imp: 닿는 순간 찌그러짐, spd: 뻗는 속도감
        let k, wind = 0, imp = 0, spd = 0;
        if (t < s) {
          const u = t / s;
          // 앞 70%는 살짝 당기고, 마지막 30%에 폭발적으로 뻗기 시작
          if (u < 0.7) { wind = EASE.out(u / 0.7); k = 0; }
          else { const v = (u - 0.7) / 0.3; wind = 1 - v; k = 0.55 * v * v; spd = v; }
        } else if (t < s + a) {
          const v = Math.min(1, (t - s) / Math.max(30, a * 0.5));
          k = 0.55 + 0.45 * EASE.snap(v);
          spd = 1 - v;
          imp = Math.sin(Math.min(1, (t - s) / Math.max(40, a)) * Math.PI);
        } else {
          const v = Math.min(1, (t - s - a) / r);
          k = 1 - EASE.inOut(v);
          imp = Math.max(0, 1 - v * 4) * 0.4;
        }
        const stretch = 1 + 0.22 * spd - 0.12 * imp;
        if (p.action === 'jab') {
          // 앞 손: 짧고 빠르게, 끝에서 주먹을 돌려 너클로 맞힘. 뒷손은 턱을 지킴
          const from = IDLE.L.clone().add(new THREE.Vector3(0.015, -0.015, 0.05).multiplyScalar(wind));
          const to = tgt.clone().add(new THREE.Vector3(-0.035, -0.015, 0));
          const ctrl = from.clone().lerp(to, 0.5).add(new THREE.Vector3(0.03, 0.025, 0));
          gl = bez(from, ctrl, to, k);
          gr = GUARD.R.clone().lerp(IDLE.R, 0.55);
          rotL.set(-0.15 + 0.1 * k, 0.18 - 0.1 * k, -0.1 + 1.25 * k);
          strL = stretch;
          glS = 1 + 0.2 * k;
          yaw = 0.035 * k; roll = -0.025 * k; cz = -0.03 * k; cx = -0.012 * k;
        } else if (p.action === 'straight') {
          // 뒷손: 허리·어깨를 돌리며 체중을 실어 길게 뻗음
          const from = IDLE.R.clone().add(new THREE.Vector3(0.05, -0.035, 0.1).multiplyScalar(wind));
          const to = tgt.clone().add(new THREE.Vector3(0.025, -0.025, 0));
          const ctrl = from.clone().lerp(to, 0.45).add(new THREE.Vector3(0.06, 0.03, 0.02));
          gr = bez(from, ctrl, to, k);
          gl = GUARD.L.clone().lerp(IDLE.L, 0.6).add(new THREE.Vector3(-0.02, 0.02, 0.02 * k));
          rotR.set(-0.15 + 0.12 * k, -0.18 + 0.14 * k, 0.1 - 1.35 * k);
          strR = stretch * (1 + 0.05 * spd);
          grS = 1 + 0.22 * k;
          yaw = -0.085 * k + wind * 0.045; roll = 0.035 * k - wind * 0.02; cx = 0.045 * k - wind * 0.02; cz = -0.075 * k + wind * 0.03;
        } else if (p.action === 'upper') {
          // 무릎을 굽혀 낮췄다가 아래에서 위로 퍼 올림: 손바닥이 나를 보게
          const low = new THREE.Vector3(0.12, -0.42, -0.36);
          const from = IDLE.R.clone().lerp(low, wind);
          const to = tgt.clone().add(new THREE.Vector3(0.015, -0.05, 0));
          const ctrl = new THREE.Vector3(lerp(from.x, to.x, 0.6), Math.min(from.y, to.y) - 0.12, lerp(from.z, to.z, 0.85));
          gr = bez(from, ctrl, to, k);
          gl = GUARD.L.clone().lerp(IDLE.L, 0.6).add(new THREE.Vector3(-0.02, 0.01, 0));
          rotR.set(-0.15 + 0.95 * k - 0.35 * wind, -0.18 + 0.1 * k, 0.1 - 0.35 * k);
          strR = stretch;
          grS = 1 + 0.2 * k;
          cy = -0.075 * wind + 0.045 * k; pitch = 0.07 * k - 0.05 * wind; cz = -0.04 * k; roll = 0.02 * k - 0.03 * wind; yaw = -0.03 * k;
        } else if (p.action === 'special') {
          const back = new THREE.Vector3(0.32, -0.2, -0.15);
          const from = IDLE.R.clone().lerp(back, wind);
          const ctrl = from.clone().lerp(tgt, 0.5).add(new THREE.Vector3(0.08, 0.05, 0));
          gr = bez(from, ctrl, tgt.clone(), k);
          gl = IDLE.L.clone().lerp(new THREE.Vector3(-0.12, -0.12, -0.4), wind);
          grS = 1 + wind * 0.25;
          rotR.set(-0.15, -0.18, 0.1 - 1.3 * k);
          strR = stretch;
          yaw = wind * 0.1 - k * 0.12; cy = -0.04 * wind; roll = wind * 0.05 - k * 0.06; cz = -0.08 * k;
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
          cy = -0.42 * k; pitch = 0.08 * k; cz = 0.05 * k;
          gl.y += 0.04 * k; gr.y += 0.04 * k;
        } else {
          const sg = p.action === 'L' ? -1 : 1;
          cx = sg * 0.42 * k; roll = -sg * 0.16 * k; cy = -0.08 * k; yaw = -sg * 0.1 * k;
        }
        break;
      }
      case 'hurt': {
        const k = 1 - t / Math.max(1, p.dur);
        cz = 0.08 * k; roll = Math.sin(t / 30) * 0.05 * k; pitch = 0.05 * k;
        gl.add(new THREE.Vector3(-0.06, -0.05, 0.05)); gr.add(new THREE.Vector3(0.06, -0.05, 0.05));
        break;
      }
      case 'winded':
        cy = -0.1 + Math.sin(this.time / 180) * 0.02; pitch = -0.08;
        gl.add(new THREE.Vector3(-0.02, -0.12, 0.05)); gr.add(new THREE.Vector3(0.02, -0.12, 0.05));
        break;
      case 'guardBroken':
        gl = new THREE.Vector3(-0.42, -0.08, -0.4); gr = new THREE.Vector3(0.42, -0.08, -0.4);
        roll = Math.sin(t / 60) * 0.03; cz = 0.05;
        break;
      case 'clinched':
        cz = -0.12; cy = -0.04 + Math.sin(this.time / 50) * 0.01; roll = Math.sin(this.time / 70) * 0.04;
        gl = new THREE.Vector3(-0.1 + Math.sin(this.time / 40) * 0.02, -0.12, -0.3);
        gr = new THREE.Vector3(0.1 - Math.sin(this.time / 40) * 0.02, -0.12, -0.3);
        break;
      case 'down':
        direct = true;
        cy = -1.15; roll = 0.5; pitch = 0.45; cz = 0.3;
        gl = new THREE.Vector3(-0.3, -0.6, -0.3); gr = new THREE.Vector3(0.35, -0.55, -0.35);
        break;
      case 'getup': {
        direct = true;
        const k = 1 - EASE.out(Math.min(1, t / p.dur));
        cy = -1.15 * k; roll = 0.5 * k; pitch = 0.45 * k; cz = 0.3 * k;
        break;
      }
      default:
        break;
    }
    if (phase === 'ending' && p.hp > 0 && p.state !== 'down') {
      gl = new THREE.Vector3(-0.25, 0.15 + Math.sin(this.time / 200) * 0.03, -0.55);
      gr = new THREE.Vector3(0.25, 0.15 + Math.cos(this.time / 200) * 0.03, -0.55);
      pitch = 0.08;
    }
    // 부드럽게 따라가기 (피하기·펀치는 즉시에 가깝게)
    const kPos = direct ? Math.min(1, dt / 22) : Math.min(1, dt / 70);
    this.pos.x = lerp(this.pos.x, EYE.x + cx, kPos);
    this.pos.y = lerp(this.pos.y, EYE.y + cy, kPos);
    this.pos.z = lerp(this.pos.z, EYE.z + cz, kPos);
    this.rot.z = lerp(this.rot.z, roll, kPos);
    this.rot.x = lerp(this.rot.x, pitch, kPos);
    this.rot.y = lerp(this.rot.y, yaw, kPos);
    const kG = direct ? Math.min(1, dt / 16) : Math.min(1, dt / 55);
    this.gl.lerp(gl, kG);
    this.gr.lerp(gr, kG);
    this.glS = lerp(this.glS, glS, kG);
    this.grS = lerp(this.grS, grS, kG);
    this.rotL.lerp(rotL, kG);
    this.rotR.lerp(rotR, kG);
    this.strL = lerp(this.strL, strL, Math.min(1, dt / 12));
    this.strR = lerp(this.strR, strR, Math.min(1, dt / 12));
    // 흔들림
    this.shakeAmt *= Math.pow(0.002, dt / 1000);
    const sAmt = settings.shake === false ? 0 : this.shakeAmt;
    this.shake.set((Math.random() - 0.5) * sAmt, (Math.random() - 0.5) * sAmt, 0);
    const cam = this.camera;
    cam.position.copy(this.pos).add(this.shake);
    cam.rotation.copy(this.rot);
    if (this.recoil && this.recoil.t > 0) {
      const r = this.recoil;
      r.t = Math.max(0, r.t - dt / 160);
      const e = r.t * r.t;
      cam.position.z += r.z * e;
      cam.rotation.x += r.pitch * e;
      cam.rotation.y += r.yaw * e;
    }
    // 장갑 배치(카메라 좌표)
    for (const key of ['L', 'R']) {
      const g = this.gloves[key];
      const gp = key === 'L' ? this.gl : this.gr;
      const sc = key === 'L' ? this.glS : this.grS;
      g.group.position.copy(gp);
      const str = key === 'L' ? this.strL : this.strR;
      // 앞(-z)으로 늘어나고 옆은 살짝 가늘어짐 (닿는 순간엔 반대로 찌그러짐)
      const side = sc * GLOVE_SCALE / Math.sqrt(str);
      g.group.scale.set(side, side, sc * GLOVE_SCALE * str);
      // 장갑 방향(펀치마다 주먹을 돌림)
      const rv = key === 'L' ? this.rotL : this.rotR;
      g.group.rotation.set(rv.x, rv.y, rv.z);
      // 잔상: 빠르게 움직일 때만
      const sp = (g.prev.distanceTo(gp) / Math.max(1, dt)) * 1000;
      g.prev.copy(gp);
      g.speed = lerp(g.speed, sp, 0.5);
      g.hist.unshift(gp.clone());
      if (g.hist.length > 6) g.hist.length = 6;
      const show = g.speed > 1.6 && !settings.reduceMotion;
      g.ghosts.forEach((m, i) => {
        const h = g.hist[i * 2 + 1];
        m.visible = show && !!h;
        if (!m.visible) return;
        m.position.copy(h);
        m.rotation.copy(g.group.rotation);
        const gs = sc * GLOVE_SCALE * (1 - i * 0.1);
        m.scale.set(0.085 * gs, 0.078 * gs, 0.1 * gs);
        m.material.opacity = m.userData.op * Math.min(1, (g.speed - 1.6) / 1.5);
      });
      // 팔뚝은 장갑 뒤쪽 아래로 짧게(화면 밖으로) 뻗는다
      const wrist = gp.clone().add(new THREE.Vector3(0, -0.012 * sc, 0.07 * sc));
      // 어깨: 화면 밖 아래 옆 고정점. 팔을 뻗으면 팔 전체가 길게 보인다
      const elbow = new THREE.Vector3(g.sg * 0.2, -0.34, -0.04);
      placeArm(g.arm, elbow, wrist, 0.042 * sc);
    }
  }

  setSpecialGlow(on) {
    for (const g of Object.values(this.gloves)) {
      g.group.children[0].material.emissive && g.group.children[0].material.emissive.set(on ? 0x664400 : 0x000000);
    }
  }
}

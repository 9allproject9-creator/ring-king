// 1인칭: 카메라(내 눈)와 화면 아래 내 장갑. 피하면 화면 자체가 좌우·아래로 움직인다.
import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { EASE } from '../render/rig.js';
import { toonMat, outlineMat, GEO, placeLimb } from './toon.js';

const P = CONFIG.player;
export const EYE = { x: 0, y: 1.46, z: 1.62 };
const IDLE = { L: new THREE.Vector3(-0.19, -0.2, -0.56), R: new THREE.Vector3(0.19, -0.2, -0.56) };
const GUARD = { L: new THREE.Vector3(-0.07, -0.14, -0.4), R: new THREE.Vector3(0.07, -0.14, -0.4) };
const GLOVE_SCALE = 0.72;

const lerp = (a, b, t) => a + (b - a) * t;

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
    this.setLook(look);
  }

  setLook(look) {
    if (this.gloves) {
      for (const g of Object.values(this.gloves)) this.rig.remove(g.group, g.arm);
    }
    this.look = look;
    const ol = outlineMat(0.006);
    const tex = patternTexture(look.gloves, look.glovePattern);
    const gMat = tex ? toonMat('#ffffff', { map: tex }) : toonMat(look.gloves);
    const skin = toonMat(look.skin || '#f0c8a0');
    const wrap = toonMat('#f4f4f4');
    const mk = (sg) => {
      const group = new THREE.Group();
      const main = new THREE.Mesh(GEO.sphere, gMat);
      main.scale.set(0.085, 0.078, 0.1);
      main.add(new THREE.Mesh(GEO.sphere, ol));
      group.add(main);
      const thumb = new THREE.Mesh(GEO.sphere, gMat);
      thumb.scale.set(0.03, 0.042, 0.05);
      thumb.position.set(-sg * 0.07, 0.01, 0.02);
      thumb.add(new THREE.Mesh(GEO.sphere, ol));
      group.add(thumb);
      const cuff = new THREE.Mesh(GEO.cyl, wrap);
      cuff.scale.set(0.058, 0.06, 0.058);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.z = 0.1;
      cuff.add(new THREE.Mesh(GEO.cyl, ol));
      group.add(cuff);
      const arm = new THREE.Mesh(GEO.capsule, skin);
      arm.add(new THREE.Mesh(GEO.capsule, ol));
      this.rig.add(group, arm);
      return { group, arm, sg };
    };
    this.gloves = { L: mk(-1), R: mk(1) };
    this.glowMat = null;
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
        let k, wind = 0;
        if (t < s) { wind = EASE.out(t / s); k = 0; }
        else if (t < s + a) k = EASE.snap(Math.min(1, (t - s) / Math.max(30, a * 0.6)));
        else k = 1 - EASE.inOut(Math.min(1, (t - s - a) / r));
        if (p.action === 'jab') {
          const from = IDLE.L.clone().add(new THREE.Vector3(-0.01, -0.01, 0.04).multiplyScalar(wind));
          gl = from.lerp(tgt.clone().add(new THREE.Vector3(-0.04, -0.02, 0)), k);
          yaw = 0.04 * k; roll = -0.02 * k;
        } else if (p.action === 'straight') {
          const from = IDLE.R.clone().add(new THREE.Vector3(0.04, -0.03, 0.08).multiplyScalar(wind));
          gr = from.lerp(tgt.clone().add(new THREE.Vector3(0.03, -0.03, 0)), k);
          yaw = -0.07 * k + wind * 0.03; cx = 0.03 * k;
        } else if (p.action === 'upper') {
          const low = new THREE.Vector3(0.14, -0.45, -0.38);
          const from = IDLE.R.clone().lerp(low, wind);
          gr = from.lerp(tgt.clone().add(new THREE.Vector3(0.02, -0.06, 0)), k);
          cy = -0.05 * wind + 0.03 * k; pitch = 0.05 * k - 0.04 * wind;
        } else if (p.action === 'special') {
          const back = new THREE.Vector3(0.32, -0.2, -0.15);
          const from = IDLE.R.clone().lerp(back, wind);
          gr = from.lerp(tgt.clone(), k);
          gl = IDLE.L.clone().lerp(new THREE.Vector3(-0.12, -0.12, -0.4), wind);
          grS = 1 + wind * 0.25;
          yaw = wind * 0.1 - k * 0.12; cy = -0.04 * wind; roll = wind * 0.05 - k * 0.06;
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
    // 흔들림
    this.shakeAmt *= Math.pow(0.002, dt / 1000);
    const sAmt = settings.shake === false ? 0 : this.shakeAmt;
    this.shake.set((Math.random() - 0.5) * sAmt, (Math.random() - 0.5) * sAmt, 0);
    const cam = this.camera;
    cam.position.copy(this.pos).add(this.shake);
    cam.rotation.copy(this.rot);
    // 장갑 배치(카메라 좌표)
    for (const key of ['L', 'R']) {
      const g = this.gloves[key];
      const gp = key === 'L' ? this.gl : this.gr;
      const sc = key === 'L' ? this.glS : this.grS;
      g.group.position.copy(gp);
      g.group.scale.setScalar(sc * GLOVE_SCALE);
      // 장갑이 앞을 보게, 살짝 안쪽으로
      g.group.rotation.set(-0.15, g.sg * -0.18, g.sg * 0.1);
      // 팔뚝은 장갑 뒤쪽 아래로 짧게(화면 밖으로) 뻗는다
      const wrist = gp.clone().add(new THREE.Vector3(0, -0.012 * sc, 0.07 * sc));
      const elbow = wrist.clone().add(new THREE.Vector3(g.sg * 0.05, -0.2, 0.24));
      placeLimb(g.arm, elbow, wrist, 0.055);
    }
  }

  setSpecialGlow(on) {
    for (const g of Object.values(this.gloves)) {
      g.group.children[0].material.emissive && g.group.children[0].material.emissive.set(on ? 0x664400 : 0x000000);
    }
  }
}

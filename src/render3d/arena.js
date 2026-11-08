// 3D 경기장: 링, 로프, 코너 기둥, 관중, 조명, 카메라 플래시. 대회 단계마다 장소가 바뀐다.
import * as THREE from 'three';
import { VENUES } from '../render/ring.js';
import { toonMat, outlineMat, GEO, radialTex } from './toon.js';

const RING = 3.0; // 링 반 폭(m)
const ROPE_H = [0.5, 0.9, 1.3];

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class Arena {
  constructor() {
    this.group = new THREE.Group();
    this.venueId = null;
    this.time = 0;
    this.excite = 0.2;
    this.flashes = [];
    this.crowd = null;
    this.ropeShake = 0;
    this.lightMode = 'normal';
  }

  build(venueId, floorPattern = null) {
    const key = venueId + '|' + floorPattern;
    if (this.key === key) return;
    this.key = key;
    this.venueId = venueId;
    this.dispose();
    const v = VENUES[venueId] || VENUES.gym;
    this.v = v;
    const g = this.group;
    const ol = outlineMat(0.02);
    this.ol = ol;

    // 바깥 벽(안쪽을 보는 원통) + 바닥
    const wallTex = canvasTex(64, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#05050a');
      gr.addColorStop(0.55, v.wallTop);
      gr.addColorStop(1, v.wallBot);
      c.fillStyle = gr;
      c.fillRect(0, 0, w, h);
    });
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 16, 32, 1, true), new THREE.MeshBasicMaterial({ map: wallTex, side: THREE.BackSide }));
    wall.position.y = 6;
    g.add(wall);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(22, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(v.wallTop).multiplyScalar(0.6) }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.0;
    g.add(ground);

    // 링 단상
    const apron = new THREE.Mesh(new THREE.BoxGeometry(RING * 2 + 0.6, 1.0, RING * 2 + 0.6), toonMat(v.apron));
    apron.position.y = -0.5;
    g.add(apron);
    const apronOl = new THREE.Mesh(apron.geometry, ol);
    apronOl.position.copy(apron.position);
    g.add(apronOl);
    // 링 바닥(캔버스 텍스처: 로고·무늬)
    const floorTex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = v.floor;
      c.fillRect(0, 0, w, h);
      drawFloorPattern(c, w, h, floorPattern);
      c.strokeStyle = v.floorEdge;
      c.lineWidth = 14;
      c.strokeRect(7, 7, w - 14, h - 14);
      c.save();
      c.translate(w / 2, h / 2);
      c.beginPath();
      c.arc(0, 0, 150, 0, Math.PI * 2);
      c.globalAlpha = 0.35;
      c.fillStyle = v.logo;
      c.fill();
      c.globalAlpha = 0.7;
      c.lineWidth = 12;
      c.strokeStyle = v.logo;
      c.beginPath();
      c.arc(0, 0, 190, 0, Math.PI * 2);
      c.stroke();
      c.globalAlpha = 0.6;
      c.fillStyle = '#ffffff';
      c.font = '56px "Black Han Sans", "Jua", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('링의 왕', 0, 0);
      c.restore();
    });
    this.floorTex = floorTex;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(RING * 2 + 0.6, RING * 2 + 0.6), toonMat('#ffffff', { map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    g.add(floor);

    // 코너 기둥과 패드
    const postMat = toonMat(v.post);
    const padMat = toonMat(v.rope[0]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = new THREE.Mesh(GEO.cyl, postMat);
      p.scale.set(0.07, 1.55, 0.07);
      p.position.set(sx * RING, 0.775, sz * RING);
      g.add(p);
      const po = new THREE.Mesh(GEO.cyl, ol);
      po.scale.copy(p.scale);
      po.position.copy(p.position);
      g.add(po);
      for (const h of ROPE_H) {
        const pad = new THREE.Mesh(GEO.box, padMat);
        pad.scale.set(0.18, 0.2, 0.18);
        pad.position.set(sx * (RING - 0.06), h, sz * (RING - 0.06));
        g.add(pad);
      }
    }
    // 로프
    this.ropes = [];
    for (let i = 0; i < 3; i++) {
      const mat = toonMat(v.rope[i]);
      const h = ROPE_H[i];
      const sides = [
        [new THREE.Vector3(-RING, h, -RING), new THREE.Vector3(RING, h, -RING)],
        [new THREE.Vector3(-RING, h, RING), new THREE.Vector3(RING, h, RING)],
        [new THREE.Vector3(-RING, h, -RING), new THREE.Vector3(-RING, h, RING)],
        [new THREE.Vector3(RING, h, -RING), new THREE.Vector3(RING, h, RING)],
      ];
      for (const [a, b] of sides) {
        const len = a.distanceTo(b);
        const r = new THREE.Mesh(GEO.cyl, mat);
        r.scale.set(0.028, len, 0.028);
        r.position.copy(a).add(b).multiplyScalar(0.5);
        r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
        g.add(r);
        this.ropes.push({ mesh: r, base: r.position.clone() });
      }
    }

    // 관중(인스턴스): 계단식 객석
    const rnd = seeded(venueId.length * 977 + 13);
    const rows = Math.max(0, v.crowdRows) * 2;
    const spots = [];
    for (let r = 0; r < rows; r++) {
      const radius = 6.5 + r * 1.05;
      const y = -0.6 + r * 0.55;
      const n = Math.floor(radius * 4.2);
      for (let i = 0; i < n; i++) {
        if (rnd() > v.crowdDensity) continue;
        const a = (i / n) * Math.PI * 2 + rnd() * 0.05;
        // 카메라 바로 뒤(보이지 않는 곳)는 생략
        if (Math.sin(a) > 0.75) continue;
        spots.push({ x: Math.cos(a) * radius, z: Math.sin(a) * radius - 0.5, y, ph: rnd() * 6.28, s: 0.85 + rnd() * 0.3 });
      }
    }
    if (spots.length) {
      const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.35, 3, 6);
      const headGeo = new THREE.SphereGeometry(0.15, 8, 6);
      const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const bodies = new THREE.InstancedMesh(bodyGeo, mat, spots.length);
      const heads = new THREE.InstancedMesh(headGeo, mat, spots.length);
      const base = new THREE.Color(v.crowd);
      const tmp = new THREE.Color();
      spots.forEach((s, i) => {
        tmp.copy(base).offsetHSL(rnd() * 0.2 - 0.1, 0.15, 0.05 + rnd() * 0.18);
        bodies.setColorAt(i, tmp);
        heads.setColorAt(i, tmp.clone().offsetHSL(0, -0.1, 0.06));
      });
      g.add(bodies, heads);
      this.crowd = { spots, bodies, heads, m: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3(), p: new THREE.Vector3() };
      this.updateCrowd(0, true);
    }

    // 현수막
    const banner = canvasTex(512, 96, (c, w, h) => {
      c.fillStyle = v.logo;
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#ffffff';
      c.font = '54px "Black Han Sans", "Jua", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(v.banner, w / 2, h / 2 + 2);
    });
    this.bannerTex = banner;
    for (const x of [-4.5, 4.5]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.8), new THREE.MeshBasicMaterial({ map: banner }));
      b.position.set(x, 4.2, -9.5);
      g.add(b);
    }
    if (venueId === 'world' || venueId === 'stadium') {
      // 큰 전광판
      const scr = new THREE.Mesh(new THREE.BoxGeometry(6, 2.6, 0.3), new THREE.MeshBasicMaterial({ color: 0x0a0a14 }));
      scr.position.set(0, 7, -11);
      g.add(scr);
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.2), new THREE.MeshBasicMaterial({ map: banner, color: 0xffffff }));
      glow.position.set(0, 7, -10.84);
      g.add(glow);
    }
    if (venueId === 'gym' || venueId === 'training') {
      // 샌드백
      const bagMat = toonMat('#7a3a2a');
      for (const x of [-6, 6]) {
        const bag = new THREE.Mesh(GEO.capsule, bagMat);
        bag.scale.set(0.6, 1.2, 0.6);
        bag.position.set(x, 1.4, -6);
        g.add(bag);
        const bo = new THREE.Mesh(GEO.capsule, ol);
        bo.scale.copy(bag.scale);
        bo.position.copy(bag.position);
        g.add(bo);
      }
    }

    // 조명
    const hemi = new THREE.HemisphereLight(0xfff4e0, new THREE.Color(v.wallBot), 1.25);
    g.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(1.5, 6, 4);
    g.add(keyLight);
    const rim = new THREE.DirectionalLight(new THREE.Color(v.light.replace(/,[\d.]+\)$/, ')').replace('rgba', 'rgb')), 0.8);
    rim.position.set(-3, 4, -5);
    g.add(rim);
    this.hemi = hemi;
    this.keyLight = keyLight;
    // 빛 기둥(가산 혼합 원뿔)
    const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2d0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    this.cones = [];
    for (const [x, z] of [[-2, -2], [2, -2], [-2, 1.5], [2, 1.5]]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(1.6, 8, 20, 1, true), coneMat.clone());
      c.position.set(x * 0.8, 4.6, z * 0.8);
      g.add(c);
      this.cones.push(c);
    }
    // 카메라 플래시
    const flashMat = new THREE.SpriteMaterial({ map: radialTex(), color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(flashMat.clone());
      s.visible = false;
      g.add(s);
      this.flashes.push({ s, life: 0, max: 1 });
    }
  }

  dispose() {
    const g = this.group;
    while (g.children.length) {
      const o = g.children.pop();
      o.traverse((n) => {
        if (n.isMesh || n.isSprite || n.isInstancedMesh) {
          if (n.geometry && !Object.values(GEO).includes(n.geometry)) n.geometry.dispose();
          if (n.material) {
            if (n.material.map && !n.material.map.userData.shared) n.material.map.dispose();
            n.material.dispose();
          }
        }
      });
    }
    this.flashes = [];
    this.crowd = null;
  }

  setPhaseMood(mood) {
    // 보스 마지막 페이즈 등: 조명 색 바꾸기
    this.lightMode = mood;
    if (!this.hemi) return;
    if (mood === 'final') {
      this.hemi.color.set(0xffc080);
      this.cones.forEach((c) => c.material.color.set(0xffb040));
    } else if (mood === 'rage') {
      this.hemi.color.set(0xffa090);
      this.cones.forEach((c) => c.material.color.set(0xff6040));
    } else {
      this.hemi.color.set(0xfff4e0);
      this.cones.forEach((c) => c.material.color.set(0xfff2d0));
    }
  }

  updateCrowd(dt, force = false) {
    const c = this.crowd;
    if (!c) return;
    this.crowdFrame = (this.crowdFrame || 0) + 1;
    if (!force && this.crowdFrame % 2) return;
    const t = this.time / 1000;
    const ex = this.excite;
    for (let i = 0; i < c.spots.length; i++) {
      const s = c.spots[i];
      const jump = ex > 0.25 ? Math.max(0, Math.sin(t * (6 + ex * 6) + s.ph)) * 0.25 * ex : Math.sin(t * 1.5 + s.ph) * 0.02;
      c.p.set(s.x, s.y + 0.45 + jump, s.z);
      c.sc.set(s.s, s.s, s.s);
      c.m.compose(c.p, c.q, c.sc);
      c.bodies.setMatrixAt(i, c.m);
      c.p.y += 0.52 * s.s;
      c.m.compose(c.p, c.q, c.sc);
      c.heads.setMatrixAt(i, c.m);
    }
    c.bodies.instanceMatrix.needsUpdate = true;
    c.heads.instanceMatrix.needsUpdate = true;
  }

  update(dt, excite, reduceFlash) {
    this.time += dt;
    this.excite += (excite - this.excite) * Math.min(1, dt / 600);
    this.updateCrowd(dt);
    const v = this.v;
    if (!v) return;
    // 플래시
    const rate = reduceFlash ? 0 : v.flash * (0.15 + this.excite * 1.5);
    for (const f of this.flashes) {
      if (f.life <= 0) {
        f.s.visible = false;
        if (Math.random() < rate * 0.015) {
          const a = Math.PI + (Math.random() - 0.5) * 2.6;
          const r = 7 + Math.random() * 6;
          f.s.position.set(Math.cos(a) * r * 0.9, 0.5 + Math.random() * 4, Math.sin(a) * r);
          f.max = f.life = 70 + Math.random() * 110;
          f.s.visible = true;
        }
        continue;
      }
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      f.s.material.opacity = k;
      f.s.scale.setScalar(0.4 + k * 0.9);
    }
    // 빛 기둥 깜빡임
    for (let i = 0; i < this.cones.length; i++) {
      this.cones[i].material.opacity = 0.06 + 0.025 * Math.sin(this.time / 900 + i) + this.excite * 0.03;
    }
    // 로프 흔들림
    if (this.ropeShake > 0) {
      this.ropeShake = Math.max(0, this.ropeShake - dt / 500);
      const off = Math.sin(this.time / 30) * 0.03 * this.ropeShake;
      for (const r of this.ropes) r.mesh.position.y = r.base.y + off;
    }
  }
}

function drawFloorPattern(c, w, h, pattern) {
  if (!pattern || pattern === 'none') return;
  c.save();
  if (pattern === 'stripes') {
    c.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = 0; i < w; i += 64) c.fillRect(i, 0, 32, h);
  } else if (pattern === 'stars') {
    c.fillStyle = 'rgba(255,200,40,0.3)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 131) % w;
      const y = (i * 197) % h;
      c.beginPath();
      for (let k = 0; k < 10; k++) {
        const r = k % 2 ? 7 : 16;
        const a = -Math.PI / 2 + (k * Math.PI) / 5;
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.fill();
    }
  } else if (pattern === 'checker') {
    c.fillStyle = 'rgba(0,0,0,0.08)';
    for (let y = 0; y < h; y += 64) for (let x = (y / 64) % 2 ? 64 : 0; x < w; x += 128) c.fillRect(x, y, 64, 64);
  } else if (pattern === 'flame') {
    const g = c.createLinearGradient(0, h, 0, h * 0.4);
    g.addColorStop(0, 'rgba(255,90,20,0.5)');
    g.addColorStop(1, 'rgba(255,200,40,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(0, h);
    for (let x = 0; x <= w; x += 32) c.lineTo(x, h * 0.6 - Math.abs(Math.sin(x * 0.05)) * 120);
    c.lineTo(w, h);
    c.fill();
  } else if (pattern === 'tiger') {
    c.strokeStyle = 'rgba(30,20,0,0.2)';
    c.lineWidth = 18;
    for (let x = -40; x < w; x += 70) {
      c.beginPath();
      c.moveTo(x, 0);
      c.quadraticCurveTo(x + 40, h / 2, x - 20, h);
      c.stroke();
    }
  }
  c.restore();
}

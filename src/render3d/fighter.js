// 코드로 만든 3D 카툰 복서. 부위별(머리·몸통·팔 위아래·장갑·다리)로 나뉜 뼈대에
// render/anims.js의 키프레임 포즈를 연결한다. 외형은 상대 데이터의 look으로 정한다.
import * as THREE from 'three';
import { toonMat, outlineMat, GEO, placeLimb, radialTex, starTex, disposeTree } from './toon.js';
import { FaceTexture, faceGeometry } from './face.js';

export const PX = 0.0024; // 2D 포즈 값(px) → m

export function dims3d(look) {
  const b = look.build;
  return {
    S: 0.21 * b.w,
    T: 0.47 * b.h,
    HR: 0.125 * (b.head || 1),
    hipY: 0.9 * b.h,
    neck: 0.055 * (b.neck || 1),
    armA: 0.27 * (b.arm || 1) * b.h,
    armB: 0.26 * (b.arm || 1) * b.h,
    GR: 0.088 * (b.glove || 1),
    limb: 0.105 * (b.arm || 1) * (0.85 + b.w * 0.18),
    w: b.w,
    belly: b.belly || 0,
  };
}

const V = () => new THREE.Vector3();

// 3D 2관절 IK: 어깨 s → 목표 t, 길이 a·b, 팔꿈치가 향할 쪽 pole. 너무 멀면 만화처럼 팔이 늘어난다.
export function ik3(s, t, a, b, pole, outE, outT, maxStretch = 1.7) {
  const d = V().subVectors(t, s);
  let len = d.length();
  let k = 1;
  if (len > (a + b) * 0.999) {
    k = Math.min(maxStretch, len / ((a + b) * 0.999));
    a *= k; b *= k;
    if (len > (a + b) * 0.999) { d.multiplyScalar(((a + b) * 0.999) / len); len = (a + b) * 0.999; }
  }
  len = Math.max(1e-4, len);
  const dir = d.clone().multiplyScalar(1 / len);
  const cosA = (a * a + len * len - b * b) / (2 * a * len);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  const perp = pole.clone().addScaledVector(dir, -pole.dot(dir));
  if (perp.lengthSq() < 1e-6) perp.set(0, -1, 0);
  perp.normalize();
  outE.copy(s).addScaledVector(dir, a * cosA).addScaledVector(perp, a * sinA);
  outT.copy(s).add(d);
  return k;
}

// 샌드백: Fighter3D와 같은 모양의 함수들을 가진 간단한 매달린 자루
export class Bag3D {
  constructor(look) {
    this.look = look;
    this.d = { hipY: 0.9, T: 0.5, HR: 0.2, neck: 0.05, S: 0.3 };
    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.pivot.position.y = 2.6;
    this.root.add(this.pivot);
    const ol = (this.ol = outlineMat(0.014));
    const bag = new THREE.Mesh(GEO.capsule, toonMat(look.trunks || '#8a3a2a'));
    bag.scale.set(0.5, 1.0, 0.5);
    bag.position.y = -1.25;
    bag.add(new THREE.Mesh(GEO.capsule, ol));
    this.pivot.add(bag);
    const band = new THREE.Mesh(GEO.cyl, toonMat('#ffd23a'));
    band.scale.set(0.255, 0.12, 0.255);
    band.position.y = -1.0;
    this.pivot.add(band);
    const chain = new THREE.Mesh(GEO.cyl, toonMat('#888'));
    chain.scale.set(0.02, 0.6, 0.02);
    chain.position.y = -0.3;
    this.pivot.add(chain);
    this.head = new THREE.Object3D();
    this.head.position.y = -1.0;
    this.pivot.add(this.head);
    this.swing = { x: 0, z: 0, vx: 0, vz: 0 };
    this.time = 0;
  }
  hit(dir, power) {
    this.swing.vz -= power * 0.004;
    this.swing.vx += dir * power * 0.003;
  }
  update(dt) {
    const s = this.swing;
    const k = dt / 16;
    s.vx += -s.x * 0.02 * k; s.vz += -s.z * 0.02 * k;
    s.vx *= Math.pow(0.97, k); s.vz *= Math.pow(0.97, k);
    s.x += s.vx * k; s.z += s.vz * k;
    this.pivot.rotation.set(s.z, 0, s.x);
  }
  setColors() {}
  setHighlight() {}
  headWorld(out = V()) { return this.head.getWorldPosition(out); }
  dispose() { disposeTree(this.root); }
}

export class Fighter3D {
  constructor(look, opts = {}) {
    this.look = look;
    this.d = dims3d(look);
    this.root = new THREE.Group(); // 바닥 기준
    this.fallPivot = new THREE.Group();
    this.body = new THREE.Group(); // 엉덩이 높이
    this.upper = new THREE.Group(); // 상체(기울기·찌그러짐)
    this.chest = new THREE.Group(); // 비틀기
    this.headPivot = new THREE.Group();
    this.root.add(this.fallPivot);
    this.fallPivot.add(this.body);
    this.body.add(this.upper);
    this.upper.add(this.chest);
    this.time = 0;
    this.olThick = opts.outline ?? 0.011;
    this.build();
  }

  build() {
    const L = this.look;
    const d = this.d;
    const ol = (this.ol = outlineMat(this.olThick));
    this.mats = {
      skin: toonMat(L.skin),
      skinDark: toonMat(new THREE.Color(L.skin).multiplyScalar(0.86)),
      trunks: toonMat(L.trunks),
      trim: toonMat(L.trim || '#ffffff'),
      gloves: toonMat(L.gloves),
      cuff: toonMat('#f4f4f4'),
      hair: toonMat((L.hair && L.hair.color) || '#222222'),
      shoe: toonMat(L.shoes || '#1c1c22'),
      sock: toonMat('#f0f0f0'),
    };
    const M = this.mats;
    const add = (parent, geo, mat, withOutline = true) => {
      const m = new THREE.Mesh(geo, mat);
      parent.add(m);
      if (withOutline) {
        const o = new THREE.Mesh(geo, ol);
        m.add(o);
      }
      return m;
    };
    this.add = add;

    this.body.position.y = d.hipY;
    // 다리 (IK로 매 프레임 배치)
    this.legs = [-1, 1].map((sg) => ({
      sg,
      thigh: add(this.root, GEO.capsule, M.skin),
      shin: add(this.root, GEO.capsule, M.skinDark),
      shoe: add(this.root, GEO.sphere, M.shoe),
      sock: add(this.root, GEO.cyl, M.sock, false),
    }));
    // 트렁크
    const tr = add(this.body, GEO.cyl, M.trunks);
    tr.scale.set(d.S * 0.92 * (1 + d.belly * 0.35), 0.24, d.S * 0.62 * (1 + d.belly * 0.4));
    tr.position.y = -0.06;
    const band = add(this.body, GEO.cyl, M.trim, false);
    band.scale.set(d.S * 0.95 * (1 + d.belly * 0.35), 0.05, d.S * 0.65 * (1 + d.belly * 0.4));
    band.position.y = 0.07;
    if ((L.extras || []).includes('belt')) {
      const belt = add(this.body, GEO.cyl, toonMat('#c9a227'));
      belt.scale.set(d.S * 1.0 * (1 + d.belly * 0.35), 0.1, d.S * 0.7 * (1 + d.belly * 0.4));
      belt.position.y = 0.06;
      const plate = add(this.body, GEO.sphere, toonMat('#ffd84a'));
      plate.scale.set(0.12, 0.09, 0.03);
      plate.position.set(0, 0.06, d.S * 0.7 * (1 + d.belly * 0.4));
    }
    // 몸통: 배(아래) + 가슴(위)
    const belly = add(this.chest, GEO.sphere, M.skin);
    belly.scale.set(d.S * 0.82 * (1 + d.belly * 0.45), d.T * 0.42, d.S * 0.6 * (1 + d.belly * 0.9));
    belly.position.set(0, d.T * 0.32, d.belly * 0.04);
    const chestM = add(this.chest, GEO.sphere, M.skin);
    chestM.scale.set(d.S * 1.02, d.T * 0.42, d.S * 0.62);
    chestM.position.set(0, d.T * 0.72, 0);
    // 어깨
    this.shoulders = [-1, 1].map((sg) => {
      const sh = add(this.chest, GEO.sphere, M.skin);
      sh.scale.setScalar(d.limb * 0.78);
      sh.position.set(sg * d.S, d.T * 0.92, 0);
      return sh;
    });
    // 목, 머리
    const neck = add(this.chest, GEO.cyl, M.skinDark);
    neck.scale.set(d.S * 0.32 * (this.look.build.neck || 1), d.neck + d.HR * 0.6, d.S * 0.3 * (this.look.build.neck || 1));
    neck.position.y = d.T + d.neck * 0.5;
    this.chest.add(this.headPivot);
    this.headPivot.position.y = d.T + d.neck + d.HR * 0.9;
    this.buildHead();
    // 팔
    this.arms = { L: this.makeArm(1), R: this.makeArm(-1) };
    // 바닥 그림자
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: radialTex('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.01;
    sh.scale.set(d.S * 4.5, d.S * 3.2, 1);
    this.root.add(sh);
    this.shadow = sh;
    // 눈 반짝임(텔)
    const glowMat = new THREE.SpriteMaterial({ map: radialTex(), color: new THREE.Color(L.tellColor || '#ff5a3a'), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, depthTest: false });
    this.eyeGlows = [-1, 1].map((sg) => {
      const s = new THREE.Sprite(glowMat.clone());
      s.position.set(sg * d.HR * 0.37, d.HR * 0.06, d.HR * 1.05);
      s.visible = false;
      s.renderOrder = 10;
      this.headPivot.add(s);
      return s;
    });
    // 어지러운 별
    this.dizzy = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), transparent: true, depthWrite: false }));
      s.scale.setScalar(0.09);
      s.visible = false;
      this.headPivot.add(s);
      this.dizzy.push(s);
    }
    // 김(화난 상태)
    this.steam = [];
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: radialTex('rgba(255,255,255,0.7)', 'rgba(255,255,255,0)'), transparent: true, depthWrite: false }));
      s.visible = false;
      this.chest.add(s);
      this.steam.push(s);
    }
  }

  makeArm(sg) {
    const M = this.mats;
    const d = this.d;
    const upper = this.add(this.upper, GEO.capsule, M.skin);
    const fore = this.add(this.upper, GEO.capsule, M.skin);
    const glove = new THREE.Group();
    this.upper.add(glove);
    const main = this.add(glove, GEO.sphere, M.gloves);
    main.scale.set(d.GR, d.GR * 1.08, d.GR * 1.02);
    main.position.y = d.GR * 0.35;
    const thumb = this.add(glove, GEO.sphere, M.gloves);
    thumb.scale.set(d.GR * 0.35, d.GR * 0.55, d.GR * 0.38);
    thumb.position.set(-sg * d.GR * 0.75, d.GR * 0.25, d.GR * 0.35);
    const cuff = this.add(glove, GEO.cyl, M.cuff);
    cuff.scale.set(d.GR * 0.62, d.GR * 0.6, d.GR * 0.62);
    cuff.position.y = -d.GR * 0.55;
    return { sg, upper, fore, glove, e: V(), t: V(), s: V() };
  }

  buildHead() {
    const L = this.look;
    const d = this.d;
    const R = d.HR;
    const hp = this.headPivot;
    const M = this.mats;
    const head = this.add(hp, GEO.sphere, M.skin);
    head.scale.set(R, R * 1.08, R * 0.98);
    for (const sg of [-1, 1]) {
      const ear = this.add(hp, GEO.sphereLo, M.skin);
      ear.scale.set(R * 0.16, R * 0.25, R * 0.12);
      ear.position.set(sg * R * 0.98, 0, -R * 0.05);
    }
    const nose = new THREE.Mesh(GEO.sphereLo, M.skin);
    const nb = L.nose === 'big' ? 1.35 : L.nose === 'small' ? 0.8 : 1;
    nose.scale.set(R * 0.13 * nb, R * 0.11 * nb, R * 0.12 * nb);
    nose.position.set(0, -R * 0.2, R * 0.98);
    hp.add(nose);
    // 얼굴 텍스처
    this.face = new FaceTexture(L);
    const faceMesh = new THREE.Mesh(faceGeometry(R), new THREE.MeshBasicMaterial({ map: this.face.tex, transparent: true, depthWrite: false }));
    faceMesh.scale.set(1, 1.08, 0.98);
    faceMesh.renderOrder = 2;
    hp.add(faceMesh);
    this.faceMesh = faceMesh;
    this.buildHair();
    this.buildExtras();
  }

  buildHair() {
    const L = this.look;
    const R = this.d.HR;
    const hp = this.headPivot;
    const M = this.mats;
    const style = (L.hair && L.hair.style) || 'buzz';
    const cap = (theta = 1.25, tilt = -0.35, r = 1.04) => {
      const geo = new THREE.SphereGeometry(R * r, 22, 12, 0, Math.PI * 2, 0, theta);
      const m = this.add(hp, geo, M.hair);
      m.scale.set(1, 1.08, 0.98);
      m.rotation.x = tilt;
      return m;
    };
    switch (style) {
      case 'buzz':
        cap(1.3, -0.45, 1.03);
        break;
      case 'slick': {
        cap(1.45, -0.55, 1.05);
        const bump = this.add(hp, GEO.sphere, M.hair);
        bump.scale.set(R * 0.7, R * 0.35, R * 0.5);
        bump.position.set(R * 0.15, R * 0.85, R * 0.35);
        break;
      }
      case 'spiky': {
        cap(1.3, -0.45, 1.04);
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2;
          const tilt = 0.6 + (i % 2) * 0.25;
          const sp = this.add(hp, GEO.cone, M.hair);
          sp.scale.set(R * 0.28, R * 0.75, R * 0.28);
          const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt) - 0.35).normalize();
          sp.position.copy(dir).multiplyScalar(R * 1.05);
          sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        }
        break;
      }
      case 'mohawk':
        for (let i = 0; i < 6; i++) {
          const a = -0.5 + i * 0.42;
          const sp = this.add(hp, GEO.cone, M.hair);
          sp.scale.set(R * 0.16, R * (0.85 - Math.abs(i - 2.5) * 0.08), R * 0.32);
          const dir = new THREE.Vector3(0, Math.cos(a), -Math.sin(a) * 1).normalize();
          sp.position.copy(dir).multiplyScalar(R * 1.0);
          sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        }
        break;
      case 'afro': {
        const af = this.add(hp, GEO.sphere, M.hair);
        af.scale.set(R * 1.45, R * 1.3, R * 1.35);
        af.position.set(0, R * 0.42, -R * 0.3);
        break;
      }
      case 'bob': {
        cap(1.2, -0.2, 1.08);
        const back = new THREE.SphereGeometry(R * 1.12, 24, 14, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, 2.1);
        const m = this.add(hp, back, M.hair);
        m.scale.set(1, 1.05, 1);
        break;
      }
      case 'flattop': {
        cap(1.1, -0.3, 1.02);
        const top = this.add(hp, GEO.cyl, M.hair);
        top.scale.set(R * 0.92, R * 0.55, R * 0.88);
        top.position.set(0, R * 0.95, -R * 0.08);
        break;
      }
      case 'ponytail': {
        cap(1.35, -0.4, 1.05);
        const tail = this.add(hp, GEO.capsule, M.hair);
        tail.scale.set(R * 0.42, R * 1.0, R * 0.42);
        tail.position.set(0, R * 0.3, -R * 1.15);
        tail.rotation.x = 0.7;
        this.tail = tail;
        break;
      }
      case 'long': {
        cap(1.35, -0.35, 1.05);
        const back = this.add(hp, GEO.box, M.hair);
        back.scale.set(R * 2.0, R * 2.4, R * 0.5);
        back.position.set(0, -R * 0.5, -R * 0.75);
        break;
      }
      case 'curly':
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const c = this.add(hp, GEO.sphereLo, M.hair);
          c.scale.setScalar(R * 0.42);
          c.position.set(Math.cos(a) * R * 0.75, R * 0.72 + (i % 2) * R * 0.1, Math.sin(a) * R * 0.7 - R * 0.15);
        }
        break;
      case 'twinbuns':
        cap(1.35, -0.4, 1.05);
        for (const sg of [-1, 1]) {
          const b = this.add(hp, GEO.sphere, M.hair);
          b.scale.setScalar(R * 0.42);
          b.position.set(sg * R * 0.8, R * 0.8, -R * 0.2);
        }
        break;
      default:
        break; // bald
    }
  }

  buildExtras() {
    const L = this.look;
    const R = this.d.HR;
    const hp = this.headPivot;
    const ex = L.extras || [];
    if (ex.includes('headband')) {
      const mat = toonMat(L.headband || '#e23b3b');
      const band = this.add(hp, new THREE.CylinderGeometry(R * 1.06, R * 1.06, R * 0.24, 24, 1, true), mat);
      band.position.y = R * 0.42;
      band.rotation.x = -0.25;
      band.material.side = THREE.DoubleSide;
      const tail = this.add(hp, GEO.box, mat);
      tail.scale.set(R * 0.12, R * 0.2, R * 0.9);
      tail.position.set(R * 0.5, R * 0.3, -R * 1.25);
      tail.rotation.set(0.4, 0.4, 0);
      this.bandTail = tail;
    }
    if (ex.includes('visor')) {
      const v = new THREE.Mesh(
        new THREE.CylinderGeometry(R * 1.12, R * 1.12, R * 0.48, 24, 1, true, -1.15, 2.3),
        new THREE.MeshToonMaterial({ color: 0x9be7ff, transparent: true, opacity: 0.55, side: THREE.DoubleSide }),
      );
      v.position.y = R * 0.05;
      v.rotation.y = Math.PI / 2 * 0; // 앞쪽
      v.renderOrder = 5;
      // CylinderGeometry의 각도 0은 +z 방향
      hp.add(v);
    }
    if (ex.includes('beard')) {
      const b = this.add(hp, GEO.sphere, this.mats.hair);
      b.scale.set(R * 0.85, R * 0.62, R * 0.62);
      b.position.set(0, -R * 0.72, R * 0.32);
    }
    if (ex.includes('foxears')) {
      for (const sg of [-1, 1]) {
        const e = this.add(hp, GEO.cone, this.mats.hair);
        e.scale.set(R * 0.32, R * 0.6, R * 0.18);
        e.position.set(sg * R * 0.62, R * 1.05, -R * 0.05);
        e.rotation.z = -sg * 0.35;
      }
    }
    if (ex.includes('crown')) {
      const c = this.add(hp, GEO.cyl, toonMat('#ffd23a'));
      c.scale.set(R * 0.55, R * 0.3, R * 0.55);
      c.position.y = R * 1.15;
    }
    if (ex.includes('earring')) {
      const r = this.add(hp, GEO.torus, toonMat('#ffd23a'), false);
      r.scale.setScalar(R * 0.12);
      r.position.set(-R * 1.0, -R * 0.3, 0);
      r.rotation.y = Math.PI / 2;
    }
  }

  // 페이즈 외형 변화(피부·장갑 색)
  setColors(look) {
    this.mats.skin.color.set(look.skin);
    this.mats.skinDark.color.set(new THREE.Color(look.skin).multiplyScalar(0.86));
    this.mats.gloves.color.set(look.gloves);
    this.hasSteam = (look.extras || []).includes('steam');
  }

  setHighlight(color) {
    if (color) {
      this.ol.color.set(color);
      this.ol.userData.thick.value = this.olThick * 2.4;
    } else {
      this.ol.color.set(0x1a1410);
      this.ol.userData.thick.value = this.olThick;
    }
  }

  // pose: anims.js 포즈, o: { glowColor, glow, expr, fall, dizzy, sweaty, x }
  update(dt, pose, o = {}) {
    this.time += dt;
    const d = this.d;
    const t = this.time;
    // 좌우 위치(root.position.x)는 화면 쪽에서 정한다
    // 넘어짐: 앞쪽 발끝을 축으로 뒤로
    const fall = o.fall || 0;
    const kb = o.koBlend; // 쓰러진 자세(0) → 완전히 누움(1)
    const angle = kb !== null && kb !== undefined ? 0.55 + (1.45 - 0.55) * kb : (o.ko ? 1.45 : 0.55);
    const sink = kb !== null && kb !== undefined ? 0.4 + (0.1 - 0.4) * kb : (o.ko ? 0.1 : 0.4);
    this.fallPivot.rotation.x = -fall * angle;
    this.fallPivot.position.z = -fall * 0.15;
    const dropPx = kb !== null && kb !== undefined ? 0 : Math.min(70, Math.max(-40, pose.y));
    this.body.position.y = d.hipY - dropPx * PX - fall * sink;
    // 공격하면 상체를 앞으로 내민다
    const reachZ = Math.max(0, Math.max(pose.glz, pose.grz) - 1.2);
    this.body.position.z = reachZ * 0.12;
    this.upper.rotation.set(reachZ * 0.12, 0, -pose.rot);
    this.upper.scale.set(pose.sx, pose.sy, pose.sx);
    this.chest.rotation.y = pose.twist * 0.55;
    // 머리
    this.headPivot.position.x = pose.hx * PX * 0.7;
    this.headPivot.position.y = d.T + d.neck + d.HR * 0.9 - pose.hy * PX * 0.7;
    this.headPivot.rotation.set(-pose.hy * 0.002, -pose.hx * 0.004, -pose.hrot);
    // 팔: 어깨(가슴 좌표) → 장갑 목표(상체 좌표)
    this.chest.updateMatrix();
    for (const key of ['L', 'R']) {
      const arm = this.arms[key];
      const gx = key === 'L' ? pose.glx : pose.grx;
      const gy = key === 'L' ? pose.gly : pose.gry;
      const gz = key === 'L' ? pose.glz : pose.grz;
      const shL = this.shoulders[key === 'L' ? 1 : 0].position;
      arm.s.copy(shL).applyMatrix4(this.chest.matrix);
      const target = V().set(gx * d.S, -gy * d.T, 0.26 + (gz - 1) * 0.6);
      const pole = V().set(arm.sg * 1, -1.1, -0.5);
      ik3(arm.s, target, d.armA, d.armB, pole, arm.e, arm.t, 1.9);
      placeLimb(arm.upper, arm.s, arm.e, d.limb);
      placeLimb(arm.fore, arm.e, arm.t, d.limb * 0.92);
      arm.glove.position.copy(arm.t);
      const dir = V().subVectors(arm.t, arm.e).normalize();
      arm.glove.quaternion.setFromUnitVectors(V().set(0, 1, 0), dir);
      const gs = 1 + Math.max(0, gz - 1.6) * 0.12;
      arm.glove.scale.setScalar(gs);
    }
    // 다리
    this.root.updateMatrixWorld();
    for (const lg of this.legs) {
      const hip = V().set(lg.sg * d.S * 0.42, this.body.position.y - 0.05, this.body.position.z * 0.5);
      hip.applyAxisAngle(V().set(1, 0, 0), 0); // 루트 좌표
      const foot = V().set(lg.sg * d.S * 0.7, 0.07, 0.05);
      const knee = V();
      const ankle = V();
      ik3(hip, foot, d.hipY * 0.5, d.hipY * 0.5, V().set(lg.sg * 0.2, 0, 1), knee, ankle, 1.05);
      // 다리는 fallPivot 바깥(root)에 있으므로 넘어질 때 같이 돌려 준다
      const rot = this.fallPivot.rotation.x;
      if (rot) {
        for (const p of [hip, knee, ankle]) p.applyAxisAngle(V().set(1, 0, 0), rot).add(V().set(0, 0, this.fallPivot.position.z));
      }
      placeLimb(lg.thigh, hip, knee, d.limb * 1.35);
      placeLimb(lg.shin, knee, ankle, d.limb * 1.15);
      lg.shoe.position.copy(ankle).add(V().set(0, -0.02, 0.05));
      lg.shoe.scale.set(0.075 * d.w + 0.02, 0.06, 0.13);
      lg.sock.position.copy(ankle).add(V().set(0, 0.06, 0));
      lg.sock.scale.set(d.limb * 0.62, 0.08, d.limb * 0.62);
    }
    // 얼굴
    const glow = o.glow ?? pose.glow;
    this.face.update(pose.expr, glow, o.glowColor, t, o.sweaty);
    for (const s of this.eyeGlows) {
      s.visible = glow > 0.05;
      if (s.visible) {
        const k = glow * (0.85 + 0.15 * Math.sin(t / 40));
        s.scale.setScalar(d.HR * 1.1 * k);
        s.material.opacity = Math.min(1, glow);
      }
    }
    // 어지러운 별
    for (let i = 0; i < this.dizzy.length; i++) {
      const s = this.dizzy[i];
      s.visible = !!o.dizzy;
      if (s.visible) {
        const a = t / 260 + (i * Math.PI) / 2;
        s.position.set(Math.cos(a) * d.HR * 1.5, d.HR * 1.35 + Math.sin(a * 2) * 0.02, Math.sin(a) * d.HR * 1.5);
      }
    }
    // 김
    for (let i = 0; i < this.steam.length; i++) {
      const s = this.steam[i];
      s.visible = !!this.hasSteam;
      if (s.visible) {
        const ph = (t / 1100 + i / this.steam.length) % 1;
        s.position.set((i - 2.5) * d.S * 0.35 + Math.sin(ph * 6 + i) * 0.03, d.T + ph * 0.7, -0.05);
        s.scale.setScalar(0.12 + ph * 0.25);
        s.material.opacity = 0.6 * (1 - ph);
      }
    }
    if (this.tail) this.tail.rotation.z = Math.sin(t / 280) * 0.25;
    if (this.bandTail) this.bandTail.rotation.y = 0.4 + Math.sin(t / 150) * 0.2;
    this.shadow.material.opacity = 1 - fall * 0.3;
  }

  // 머리 월드 위치(효과·조준용)
  headWorld(out = V()) {
    return this.headPivot.getWorldPosition(out);
  }

  gloveWorld(key, out = V()) {
    return this.arms[key].glove.getWorldPosition(out);
  }

  dispose() {
    this.face.dispose();
    disposeTree(this.root);
  }
}

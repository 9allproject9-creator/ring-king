// 3D 체육관: 1인칭으로 걸어 다니며 링(커리어)·샌드백(훈련)·상점·트로피(도전·기록)·코치에게 간다.
import * as THREE from 'three';
import { el } from './dom.js';
import { Screen, topBar } from './common.js';
import { toonMat, outlineMat, GEO, radialTex } from '../render3d/toon.js';
import { Fighter3D } from '../render3d/fighter.js';
import { OpponentAnimator } from '../render/opponentAnimator.js';
import { COACH_LOOK } from '../render/portrait.js';
import { getOpponent } from '../data/opponents/index.js';
import { roundRect } from '../render/ring.js';

const ROOM = { x0: -7, x1: 7, z0: -8, z1: 6 };
const COACH_TIPS = [
  '복싱은 읽고, 피하고, 때리는 거다. 버튼만 누르면 절대 못 이긴다.',
  '상대 눈이 번쩍 빛나면 진짜 공격이다. 웃기만 하면 가짜!',
  '피한 다음에 바로 쳐야 별을 얻는다. 별 세 개 모아서 필살 펀치!',
  '경기 중에 Q·E로 상대 주위를 돌 수 있다. 뒤로 물러나면 숨 고를 시간은 벌지만 별은 못 얻지.',
  '샌드백에서 콤보 연습을 해 봐라. 원투, 원투 어퍼!',
  '지면 힌트를 줄 테니 걱정 마라. 다시 하면 된다.',
];

export class GymScreen extends Screen {
  constructor(app) {
    super(app);
    this.group = null;
    this.keys = new Set();
  }

  build() {
    const g = new THREE.Group();
    const ol = outlineMat(0.02);
    const addO = (mesh) => { const o = new THREE.Mesh(mesh.geometry, ol); mesh.add(o); return mesh; };
    // 바닥(나무)
    const floorTex = (() => {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const x = c.getContext('2d');
      for (let i = 0; i < 8; i++) {
        x.fillStyle = i % 2 ? '#b98a5a' : '#c99a68';
        x.fillRect(0, i * 32, 256, 32);
        x.fillStyle = 'rgba(0,0,0,0.12)';
        x.fillRect(0, i * 32, 256, 2);
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(4, 4);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), toonMat('#ffffff', { map: floorTex }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, -1);
    g.add(floor);
    // 벽
    const wallMat = toonMat('#6b4a32');
    for (const [w, h, x, z, ry] of [[14, 5, 0, -8, 0], [14, 5, 0, 6, Math.PI], [14, 5, -7, -1, Math.PI / 2], [14, 5, 7, -1, -Math.PI / 2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
      m.position.set(x, h / 2, z);
      m.rotation.y = ry;
      g.add(m);
    }
    // 창문 빛
    for (const x of [-4, 0, 4]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.4), new THREE.MeshBasicMaterial({ color: 0xfff2c0 }));
      win.position.set(x, 3, -7.98);
      g.add(win);
    }
    // 현수막
    const ban = (() => {
      const c = document.createElement('canvas');
      c.width = 512; c.height = 96;
      const x = c.getContext('2d');
      x.fillStyle = '#b23a2e'; x.fillRect(0, 0, 512, 96);
      x.fillStyle = '#fff'; x.font = '52px "Black Han Sans", "Jua", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillText('문철 복싱 체육관', 256, 50);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const bm = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.95), new THREE.MeshBasicMaterial({ map: ban }));
    bm.position.set(0, 4.3, -7.95);
    g.add(bm);
    // 작은 링 (커리어)
    const ring = new THREE.Group();
    const plat = addO(new THREE.Mesh(new THREE.BoxGeometry(4, 0.5, 4), toonMat('#2d5fd0')));
    plat.position.y = 0.25;
    ring.add(plat);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8), toonMat('#d9cdb5'));
    mat.rotation.x = -Math.PI / 2; mat.position.y = 0.51;
    ring.add(mat);
    const ropeCols = ['#e23b3b', '#f2f2f2', '#2d5fd0'];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const p = addO(new THREE.Mesh(GEO.cyl, toonMat('#cccccc')));
      p.scale.set(0.06, 1.3, 0.06); p.position.set(sx * 1.9, 1.15, sz * 1.9);
      ring.add(p);
    }
    for (let i = 0; i < 3; i++) {
      const y = 0.85 + i * 0.3;
      for (const [a, b] of [[[-1.9, -1.9], [1.9, -1.9]], [[-1.9, 1.9], [1.9, 1.9]], [[-1.9, -1.9], [-1.9, 1.9]], [[1.9, -1.9], [1.9, 1.9]]]) {
        const r = new THREE.Mesh(GEO.cyl, toonMat(ropeCols[i]));
        const A = new THREE.Vector3(a[0], y, a[1]);
        const B = new THREE.Vector3(b[0], y, b[1]);
        r.scale.set(0.025, A.distanceTo(B), 0.025);
        r.position.copy(A).add(B).multiplyScalar(0.5);
        r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
        ring.add(r);
      }
    }
    ring.position.set(0, 0, -5);
    g.add(ring);
    // 샌드백 (훈련)
    const bags = new THREE.Group();
    for (const x of [0, 1.3]) {
      const bag = addO(new THREE.Mesh(GEO.capsule, toonMat('#8a3a2a')));
      bag.scale.set(0.55, 1.1, 0.55);
      bag.position.set(x, 1.5, 0);
      bags.add(bag);
      const chain = new THREE.Mesh(GEO.cyl, toonMat('#888'));
      chain.scale.set(0.02, 1.4, 0.02);
      chain.position.set(x, 3.0, 0);
      bags.add(chain);
    }
    bags.position.set(-5.2, 0, -2);
    g.add(bags);
    this.bags = bags;
    // 상점 카운터
    const shop = new THREE.Group();
    const counter = addO(new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.8), toonMat('#3a7a3a')));
    counter.position.y = 0.5;
    shop.add(counter);
    const colors = ['#e0352f', '#2f7de1', '#2fb556', '#ffd23a', '#ff6fa8'];
    colors.forEach((c, i) => {
      const gl = addO(new THREE.Mesh(GEO.sphere, toonMat(c)));
      gl.scale.set(0.16, 0.18, 0.17);
      gl.position.set(-1 + i * 0.5, 1.2, 0);
      shop.add(gl);
    });
    const shelf = addO(new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 0.3), toonMat('#5a3a22')));
    shelf.position.set(0, 1.6, -0.9);
    shop.add(shelf);
    shop.position.set(5.0, 0, -2.5);
    shop.rotation.y = -Math.PI / 2;
    g.add(shop);
    // 트로피 선반 (도전 과제·기록)
    const trophy = new THREE.Group();
    const tsh = addO(new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.6), toonMat('#5a3a22')));
    tsh.position.y = 1.2;
    trophy.add(tsh);
    const tsh2 = tsh.clone(); tsh2.position.y = 2.0; trophy.add(tsh2);
    const gold = toonMat('#ffd23a', { emissive: new THREE.Color(0x332200) });
    for (let i = 0; i < 6; i++) {
      const cup = new THREE.Group();
      const body = addO(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.22, 12), gold));
      body.position.y = 0.2;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 0.16), toonMat('#222'));
      base.position.y = 0.03;
      cup.add(body, base);
      cup.position.set(-0.9 + (i % 3) * 0.9, i < 3 ? 1.28 : 2.08, 0);
      trophy.add(cup);
    }
    trophy.position.set(5.0, 0, 2.5);
    trophy.rotation.y = -Math.PI / 2;
    g.add(trophy);
    // 챔피언 벨트 진열대 (클리어 후)
    const belt = new THREE.Group();
    const stand = addO(new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.0, 0.8), toonMat('#222')));
    stand.position.y = 0.5;
    const bplate = addO(new THREE.Mesh(GEO.torus, toonMat('#ffd23a', { emissive: new THREE.Color(0x443300) })));
    bplate.scale.set(0.35, 0.35, 0.6);
    bplate.position.y = 1.4;
    belt.add(stand, bplate);
    belt.position.set(-5.2, 0, 3);
    g.add(belt);
    this.beltGroup = belt;
    this.beltPlate = bplate;
    // 조명
    g.add(new THREE.HemisphereLight(0xfff4e0, 0x5a3a22, 1.3));
    const dl = new THREE.DirectionalLight(0xffffff, 1.2);
    dl.position.set(2, 6, 3);
    g.add(dl);
    // 코치
    const coachLook = { ...COACH_LOOK, build: { w: 1.05, h: 0.92, belly: 0.3, head: 1.05, neck: 1 }, trunks: '#2c4a8a', gloves: '#2c4a8a', trim: '#ffd23a' };
    this.coach = new Fighter3D(coachLook);
    this.coach.root.position.set(-2.2, 0, -1.6);
    this.coach.root.rotation.y = 0.6;
    g.add(this.coach.root);
    this.coachAnim = new OpponentAnimator({ id: 'coach', look: coachLook });
    this.coachState = { state: 'idle', t: 0, dur: 1e9, guardUp: false, pos: 0, fromPos: 0, hp: 1, maxHp: 1, atk: null, lastHitDir: 0 };
    // 다음 상대가 링 위에서 몸을 푼다
    this.group = g;
    this.stations = [
      { id: 'ring', label: '🥊 링 — 커리어', pos: new THREE.Vector3(0, 1.6, -2.7), r: 2.2, go: () => this.app.go('map') },
      { id: 'bag', label: '💪 샌드백 — 훈련 캠프', pos: new THREE.Vector3(-4.6, 2.0, -2), r: 1.8, go: () => this.app.go('training') },
      { id: 'shop', label: '🛍️ 상점', pos: new THREE.Vector3(4.2, 1.8, -2.5), r: 1.9, go: () => this.app.go('shop') },
      { id: 'trophy', label: '🏅 트로피 — 도전 과제', pos: new THREE.Vector3(4.2, 2.2, 2.5), r: 1.9, go: () => this.app.go('achievements'), alt: { label: '📊 기록', go: () => this.app.go('records') } },
      { id: 'coach', label: '👴 문철 할아버지 — 말 걸기', pos: new THREE.Vector3(-2.2, 2.0, -1.6), r: 2.3, go: () => this.talk() },
      { id: 'belt', label: '👑 클리어 후 도전', pos: new THREE.Vector3(-5.2, 1.9, 3), r: 1.7, go: () => this.app.go('modes'), cond: () => this.app.save.data.career.cleared },
    ];
    this.colliders = [
      { x: 0, z: -5, r: 2.4 }, { x: -5.2, z: -2, r: 0.9 }, { x: -3.9, z: -2, r: 0.7 },
      { x: 5.0, z: -2.5, r: 1.3 }, { x: 5.0, z: 2.5, r: 1.2 }, { x: -2.2, z: -1.6, r: 0.5 }, { x: -5.2, z: 3, r: 0.6 },
    ];
  }

  enter() {
    const app = this.app;
    const st = app.stage;
    if (!this.group) this.build();
    st.arena.group.visible = false;
    st.scene.add(this.group);
    st.scene.fog.near = 30;
    this.beltGroup.visible = app.save.data.career.cleared;
    this.pos = this.pos || new THREE.Vector3(0, 1.5, 4);
    this.yaw = this.yaw ?? 0;
    this.near = null;
    this.tipI = this.tipI || 0;
    app.music && app.music.play('menu');
    app.actions.gameActive = true;
    const isTouch = matchMedia('(pointer: coarse)').matches;
    this.prompt = el('button', { class: 'btn big gym-prompt hidden', onclick: () => this.use() }, '');
    this.altBtn = el('button', { class: 'btn secondary gym-prompt2 hidden', onclick: () => this.use(true) }, '');
    this.bubble = el('div', { class: 'bubble gym-bubble hidden' });
    this.stick = el('div', { class: 'gym-stick' + (isTouch ? '' : ' hidden') }, el('div', { class: 'knob' }));
    this.mount(el('div', { class: 'screen top', style: 'pointer-events:none' }, [
      el('div', { style: 'pointer-events:auto;width:100%' }, topBar(app, null, null)),
      el('div', { class: 'gym-help small', style: 'pointer-events:none' }, isTouch ? '왼쪽 동그라미로 걷고, 화면을 밀어서 돌아요' : 'W A S D: 걷기 · Q E / ← → / 마우스 끌기: 돌기 · J 또는 Enter: 들어가기'),
      el('button', { class: 'btn secondary sm gym-menu', style: 'pointer-events:auto', onclick: () => app.go('menu') }, '☰ 버튼 메뉴'),
      this.bubble, this.prompt, this.altBtn, this.stick,
    ]));
    for (const n of [this.prompt, this.altBtn, this.bubble, this.stick]) n.style.pointerEvents = 'auto';
    this.bindPointer();
  }

  exit() {
    const st = this.app.stage;
    st.scene.remove(this.group);
    st.arena.group.visible = true;
    st.scene.fog.near = 14;
    this.app.actions.gameActive = false;
    this.keys.clear();
    this.unbindPointer && this.unbindPointer();
    super.exit();
  }

  bindPointer() {
    const cv = window;
    let drag = null;
    let stickId = null;
    const stick = this.stick;
    const down = (e) => {
      if (e.target.closest('button') || e.target.closest('.bubble')) return;
      const r = stick.getBoundingClientRect();
      if (!stick.classList.contains('hidden') && e.clientX < r.right + 40 && e.clientY > r.top - 40) {
        stickId = e.pointerId;
        this.stickCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        move(e);
      } else drag = { id: e.pointerId, x: e.clientX };
    };
    const move = (e) => {
      if (drag && e.pointerId === drag.id) {
        this.yaw -= (e.clientX - drag.x) * 0.006;
        drag.x = e.clientX;
      }
      if (stickId === e.pointerId) {
        const dx = e.clientX - this.stickCenter.x;
        const dy = e.clientY - this.stickCenter.y;
        const len = Math.min(50, Math.hypot(dx, dy));
        const a = Math.atan2(dy, dx);
        this.stickVec = { x: (Math.cos(a) * len) / 50, y: (Math.sin(a) * len) / 50 };
        stick.firstChild.style.transform = `translate(${Math.cos(a) * len}px, ${Math.sin(a) * len}px)`;
      }
    };
    const up = (e) => {
      if (drag && e.pointerId === drag.id) drag = null;
      if (stickId === e.pointerId) { stickId = null; this.stickVec = null; stick.firstChild.style.transform = ''; }
    };
    cv.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    const kd = (e) => this.keys.add(e.code);
    const ku = (e) => this.keys.delete(e.code);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    this.unbindPointer = () => {
      cv.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }

  talk() {
    const tip = COACH_TIPS[this.tipI % COACH_TIPS.length];
    this.tipI++;
    this.bubble.innerHTML = '';
    this.bubble.appendChild(el('span', { class: 'who' }, '문철 할아버지'));
    this.bubble.appendChild(document.createTextNode(tip));
    this.bubble.classList.remove('hidden');
    this.app.audio.sfx('select');
    clearTimeout(this.bubbleT);
    this.bubbleT = setTimeout(() => this.bubble.classList.add('hidden'), 6000);
  }

  use(alt = false) {
    if (!this.near) return;
    this.app.audio.sfx('select');
    if (alt && this.near.alt) this.near.alt.go();
    else this.near.go();
  }

  onUi(code) {
    if (code === 'Enter' || code === 'KeyJ' || code === 'Space') this.use();
    if (code === 'KeyK') this.use(true);
    if (code === 'Escape') this.app.go('menu');
  }

  update(dt) {
    const st = this.app.stage;
    const k = this.keys;
    const s = dt / 1000;
    // 돌기
    let turn = 0;
    if (k.has('KeyQ') || k.has('ArrowLeft')) turn += 1;
    if (k.has('KeyE') || k.has('ArrowRight')) turn -= 1;
    this.yaw += turn * 1.9 * s;
    // 걷기
    let fwd = 0, side = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
    if (k.has('KeyA')) side -= 1;
    if (k.has('KeyD')) side += 1;
    if (this.stickVec) { fwd -= this.stickVec.y; side += this.stickVec.x; }
    // 게임패드: 왼쪽 스틱 걷기, 오른쪽 스틱 돌기
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((p) => p && p.connected) : null;
    if (gp) {
      const dz = (v) => (Math.abs(v) > 0.2 ? v : 0);
      fwd -= dz(gp.axes[1] || 0);
      side += dz(gp.axes[0] || 0);
      this.yaw -= dz(gp.axes[2] || 0) * 2.2 * s;
    }
    const len = Math.hypot(fwd, side);
    if (len > 0.05) {
      const sp = 3.0 * s * Math.min(1, len) / Math.max(1, len);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      const nx = this.pos.x + (fx * fwd + rx * side) * sp;
      const nz = this.pos.z + (fz * fwd + rz * side) * sp;
      this.tryMove(nx, nz);
      this.walkT = (this.walkT || 0) + dt;
    }
    // 가까운 곳
    let best = null, bd = 1e9;
    for (const stn of this.stations) {
      if (stn.cond && !stn.cond()) continue;
      const d = Math.hypot(stn.pos.x - this.pos.x, stn.pos.z - this.pos.z);
      if (d < stn.r && d < bd) { best = stn; bd = d; }
    }
    if (best !== this.near) {
      this.near = best;
      if (best) {
        this.prompt.textContent = `${best.label}  (J / Enter)`;
        this.prompt.classList.remove('hidden');
        if (best.alt) { this.altBtn.textContent = `${best.alt.label}  (K)`; this.altBtn.classList.remove('hidden'); } else this.altBtn.classList.add('hidden');
      } else {
        this.prompt.classList.add('hidden');
        this.altBtn.classList.add('hidden');
      }
    }
    // 카메라
    const cam = st.camera;
    const bob = len > 0.05 && !this.app.settings.reduceMotion ? Math.abs(Math.sin((this.walkT || 0) / 140)) * 0.04 : 0;
    cam.position.set(this.pos.x, 1.5 + bob, this.pos.z);
    cam.rotation.set(-0.08, this.yaw, 0, 'YXZ');
    cam.fov = st.baseFov + 8;
    cam.updateProjectionMatrix();
    // 코치·샌드백 살아 있게
    this.coachState.t += dt;
    const pose = this.coachAnim.update(dt, this.coachState, 0);
    pose.glx = 0.9; pose.gly = -0.4; pose.grx = -0.9; pose.gry = -0.4;
    this.coach.update(dt, pose, {});
    // 코치는 나를 본다
    const toMe = Math.atan2(this.pos.x - this.coach.root.position.x, this.pos.z - this.coach.root.position.z);
    this.coach.root.rotation.y += (toMe - this.coach.root.rotation.y) * Math.min(1, dt / 400);
    this.bags.children.forEach((b, i) => { if (b.geometry === GEO.capsule) b.rotation.z = Math.sin(performance.now() / 700 + i) * 0.04; });
    if (this.beltPlate) this.beltPlate.rotation.y += dt / 1200;
  }

  tryMove(nx, nz) {
    nx = Math.max(ROOM.x0 + 0.5, Math.min(ROOM.x1 - 0.5, nx));
    nz = Math.max(ROOM.z0 + 0.5, Math.min(ROOM.z1 - 0.5, nz));
    for (const c of this.colliders) {
      const dx = nx - c.x, dz = nz - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + 0.35;
      if (d < min) { nx = c.x + (dx / (d || 1)) * min; nz = c.z + (dz / (d || 1)) * min; }
    }
    this.pos.x = nx;
    this.pos.z = nz;
  }

  draw(ctx, view) {
    const st = this.app.stage;
    st.render();
    ctx.clearRect(0, 0, view.w, view.h);
    // 장소 이름표
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const stn of this.stations) {
      if (stn.cond && !stn.cond()) continue;
      const p = st.project(stn.pos);
      if (p.behind || p.x < -100 || p.x > view.w + 100) continue;
      const d = Math.hypot(stn.pos.x - this.pos.x, stn.pos.z - this.pos.z);
      const size = Math.max(16, Math.min(28, 60 / Math.max(1, d)));
      ctx.font = `${size}px "Jua", "Malgun Gothic", sans-serif`;
      const w = ctx.measureText(stn.label).width + 24;
      ctx.fillStyle = stn === this.near ? 'rgba(255,190,30,0.95)' : 'rgba(10,10,20,0.75)';
      roundRect(ctx, p.x - w / 2, p.y - size * 0.9, w, size * 1.8, 12);
      ctx.fill();
      ctx.fillStyle = stn === this.near ? '#1a1410' : '#fff';
      ctx.fillText(stn.label, p.x, p.y);
    }
  }
}

// 3D 체육관: 1인칭으로 걸어 다니며 샌드백·스피드백을 직접 치고, 이긴 상대들과 이야기하고,
// 링(커리어)·샌드백(훈련)·상점·트로피(도전 과제)·화이트보드(기록)·사물함(꾸미기)·코치·벨트·문으로 간다.
import * as THREE from 'three';
import { el } from './dom.js';
import { Screen, topBar } from './common.js';
import { buildGym, ROOM, posterTex, fillTrophies, drawBoard } from '../render3d/gymWorld.js';
import { Fighter3D } from '../render3d/fighter.js';
import { FirstPerson } from '../render3d/firstPerson.js';
import { OpponentAnimator } from '../render/opponentAnimator.js';
import { Effects } from '../render/effects.js';
import { COACH_LOOK } from '../render/portrait.js';
import { OPPONENTS, getOpponent, LEAGUES } from '../data/opponents/index.js';
import { Player } from '../game/player.js';
import { IN } from '../game/inputBits.js';
import { roundRect } from '../render/ring.js';
import { totalStars } from '../game/career.js';
import { keyName } from '../input/keyboard.js';

const COACH_TIPS = [
  '복싱은 읽고, 피하고, 때리는 거다. 버튼만 누르면 절대 못 이긴다.',
  '상대 눈이 번쩍 빛나면 진짜 공격이다. 웃기만 하면 가짜!',
  '피한 다음에 바로 쳐야 별을 얻는다. 별 세 개 모아서 필살 펀치!',
  '링 안에서는 W·A·S·D로 걸어 다닐 수 있다. 옆으로 걸으면 상대 주위를 돈다.',
  '로프에 몰리면 더 못 물러난다. 코너에 갇히지 않게 옆으로 빠져라.',
  '샌드백을 직접 쳐 봐라. 잽-스트레이트, 원투! 손에 익을 때까지.',
  '스피드백은 빠르게 툭툭. 리듬이 생명이다.',
  '지면 힌트를 줄 테니 걱정 마라. 다시 하면 된다.',
];
const PUNCH_MASK = IN.JAB | IN.STRAIGHT | IN.UPPER | IN.GUARD;
const WORDS = { jab: '퍽!', straight: '팍!', upper: '쾅!' };

export class GymScreen extends Screen {
  constructor(app) {
    super(app);
    this.world = null;
    this.keys = new Set();
    this.npcs = [];
    this.effects = new Effects();
    this.tipI = 0;
  }

  enter() {
    const app = this.app;
    const st = app.stage;
    const d = app.save.data;
    if (!this.world) this.world = buildGym();
    const w = this.world;
    st.arena.group.visible = false;
    st.scene.add(w.group);
    st.scene.fog.near = 40;
    st.scene.fog.far = 60;
    this.pos = this.pos || new THREE.Vector3(0, 1.55, 4.6);
    this.yaw = this.yaw ?? 0;
    this.near = null;
    this.combo = 0;
    this.comboT = 0;
    this.hits = 0;
    this.effects.reset();
    app.music && app.music.play('menu');
    app.actions.gameActive = true;
    app.actions.clear();
    this.refreshWorld();
    // 내 장갑(1인칭) + 펀치 로직
    this.fp = new FirstPerson(st.camera, app.playerLook());
    this.player = new Player();
    this.clock = 0;
    this.stub = {
      clock: 0,
      emit: () => {},
      onPlayerPunchActive: (id) => this.punchHit(id),
      onPlayerDodgeStart: () => {},
    };
    this.buildDom();
    this.bindPointer();
  }

  // 진행도에 맞춰 포스터·화이트보드·트로피·NPC를 바꾼다
  refreshWorld() {
    const app = this.app;
    const d = app.save.data;
    const w = this.world;
    const next = OPPONENTS[Math.min(OPPONENTS.length - 1, d.career.unlocked)];
    const beaten = OPPONENTS.filter((o) => d.career.results[o.id] && d.career.results[o.id].wins);
    const setMap = (mesh, tex) => {
      if (mesh.material.map) mesh.material.map.dispose();
      mesh.material.map = tex;
      mesh.material.needsUpdate = true;
    };
    setMap(w.posterMain, posterTex(next, d.career.cleared ? '방어전 도전자' : '다음 상대'));
    const sidePick = [OPPONENTS[9], OPPONENTS[8], OPPONENTS[6]];
    w.posterSide.forEach((m, i) => setMap(m, posterTex(sidePick[i], i === 0 ? '챔피언' : i === 1 ? '라이벌' : '월드 그랑프리')));
    fillTrophies(w, beaten.map((o) => ({ league: o.league })));
    w.beltGroup.visible = !!d.career.cleared;
    const r = d.records;
    drawBoard(w, [
      { text: '📋 오늘의 훈련 계획', size: 32, color: '#b23a2e' },
      { text: `다음 상대: ${next.nick} ${next.name}`, size: 28 },
      { text: `힌트: ${next.hints[0].slice(0, 26)}…`, size: 20, color: '#333' },
      { text: `커리어 별 ★ ${totalStars(d)} / 30   ·   ${d.totals.wins}승 ${d.totals.kos}KO`, size: 24, color: '#2a6a2a' },
      { text: `샌드백 콤보 ${r.sandbag} · 미트 ${r.mitts}점 · 줄넘기 ${r.rope}번`, size: 22, color: '#444' },
      { text: `도전 과제 ${Object.keys(d.achievements).length}개 달성`, size: 22, color: '#8a5a00' },
    ]);
    // NPC: 이긴 상대들이 체육관에 놀러 와서 연습한다
    for (const n of this.npcs) { w.group.remove(n.f.root); n.f.dispose(); }
    this.npcs = [];
    const spots = [
      { x: -1.2, z: -6.6, y: 0.6, ry: 0.4, act: 'shadow' },
      { x: 1.3, z: -7.2, y: 0.6, ry: -0.5, act: 'shadow' },
      { x: -5.6, z: -4.4, y: 0, ry: -Math.PI / 2, act: 'bag' },
      { x: 5.6, z: 3.4, y: 0, ry: Math.PI, act: 'rest' },
      { x: -5.6, z: -1.4, y: 0, ry: -Math.PI / 2, act: 'bag' },
    ];
    beaten.slice(-spots.length).forEach((o, i) => {
      const s = spots[i];
      const f = new Fighter3D(o.look);
      f.root.position.set(s.x, s.y, s.z);
      f.root.rotation.y = s.ry;
      w.group.add(f.root);
      const atkId = Object.keys(o.attacks)[0];
      this.npcs.push({
        o, f, s, anim: new OpponentAnimator(o),
        fake: { state: 'idle', t: Math.random() * 600, dur: 700 + Math.random() * 500, guardUp: true, pos: 0, fromPos: 0, hp: 1, maxHp: 1, atk: { anim: o.attacks[atkId].anim }, lastHitDir: 0, tellStartAt: 0, fake: false },
        line: 0,
      });
    });
    // 코치
    if (!this.coach) {
      const look = { ...COACH_LOOK, build: { w: 1.05, h: 0.92, belly: 0.3, head: 1.05, neck: 1 }, shirt: '#2c4a8a', pants: '#2c4a8a', trunks: '#2c4a8a', gloves: COACH_LOOK.skin, trim: '#ffd23a' };
      look.build.glove = 0.45;
      this.coach = new Fighter3D(look);
      this.coach.root.position.set(-3.6, 0, -3.2);
      w.group.add(this.coach.root);
      this.coachAnim = new OpponentAnimator({ id: 'coach', look });
      this.coachState = { state: 'idle', t: 0, dur: 1e9, guardUp: false, pos: 0, fromPos: 0, hp: 1, maxHp: 1, atk: null, lastHitDir: 0 };
    }
    // 들어갈 곳
    const cleared = d.career.cleared;
    this.stations = [
      { id: 'ring', label: '🥊 링 — 커리어', pos: new THREE.Vector3(0, 1.8, -3.0), r: 2.0, go: () => app.go('map') },
      { id: 'train', label: '💪 훈련 캠프', pos: new THREE.Vector3(-6.2, 2.2, -2.9), r: 1.7, go: () => app.go('training') },
      { id: 'online', label: '🌐 온라인 1:1 대전', pos: new THREE.Vector3(-8.0, 2.3, 0.9), r: 1.9, go: () => app.go('online') },
      { id: 'speed', label: '⚡ 스피드백 (펀치로 쳐 보기)', pos: new THREE.Vector3(-8.2, 2.5, 3.2), r: 1.6, go: () => this.say('스피드백은 J·K로 빠르게 툭툭 쳐라!') },
      { id: 'shop', label: '🛍️ 상점', pos: new THREE.Vector3(6.9, 1.9, -7.0), r: 1.9, go: () => app.go('shop') },
      { id: 'trophy', label: '🏅 트로피 — 도전 과제', pos: new THREE.Vector3(8.2, 2.3, -2.3), r: 1.8, go: () => app.go('achievements') },
      { id: 'board', label: '📋 화이트보드 — 기록', pos: new THREE.Vector3(8.3, 2.0, 1.4), r: 1.8, go: () => app.go('records') },
      { id: 'locker', label: '👕 사물함 — 내 복서 꾸미기', pos: new THREE.Vector3(4.5, 2.0, 6.2), r: 1.7, go: () => app.go('create', { edit: true }) },
      { id: 'bench', label: '🪑 벤치 — 설정', pos: new THREE.Vector3(5.6, 1.4, 4.6), r: 1.4, go: () => app.go('settings') },
      { id: 'cooler', label: '💧 정수기', pos: new THREE.Vector3(-8.4, 1.6, 5.6), r: 1.4, go: () => { this.say('꿀꺽꿀꺽… 시원하다! 기운이 난다!'); app.audio.sfx('star'); } },
      { id: 'mirror', label: '🪞 거울', pos: new THREE.Vector3(-4.0, 1.8, 6.4), r: 1.6, go: () => this.say(`거울 속에 멋진 복서가 있다. ${app.playerName()}, 오늘도 화이팅!`) },
      { id: 'door', label: '🚪 문 — 타이틀로', pos: new THREE.Vector3(0, 1.8, 6.4), r: 1.3, go: () => app.go('title') },
      { id: 'coach', label: '👴 문철 할아버지 — 말 걸기', pos: new THREE.Vector3(-3.6, 2.0, -3.2), r: 2.0, go: () => this.talkCoach() },
    ];
    if (cleared) this.stations.push({ id: 'belt', label: '👑 챔피언 벨트 — 클리어 후 도전', pos: new THREE.Vector3(7.8, 2.0, -10.0), r: 1.8, go: () => app.go('modes') });
    for (const n of this.npcs) {
      this.stations.push({ id: 'npc_' + n.o.id, label: `💬 ${n.o.nick} ${n.o.name}`, pos: new THREE.Vector3(n.s.x, 2.1 + n.s.y, n.s.z), r: 1.8, go: () => this.talkNpc(n) });
    }
    this.colliders = [...this.world.colliders, { x: -3.6, z: -3.2, r: 0.45 }];
    for (const n of this.npcs) if (n.s.y === 0) this.colliders.push({ x: n.s.x, z: n.s.z, r: 0.45 });
  }

  buildDom() {
    const app = this.app;
    const isTouch = matchMedia('(pointer: coarse)').matches;
    const k = app.keyboard.keys;
    this.prompt = el('button', { class: 'btn big gym-prompt hidden', onclick: () => this.use() }, '');
    this.bubble = el('div', { class: 'bubble gym-bubble hidden' });
    this.stick = el('div', { class: 'gym-stick' + (isTouch ? '' : ' hidden') }, el('div', { class: 'knob' }));
    const punchBtn = (label, bit) => el('button', {
      class: 'tb gym-punch',
      onpointerdown: (e) => { e.preventDefault(); app.actions.press(bit, 'touch'); },
      onpointerup: () => app.actions.release(bit, 'touch'),
    }, label);
    this.touchPunch = el('div', { class: 'gym-punches' + (isTouch ? '' : ' hidden') }, [punchBtn('잽', 'jab'), punchBtn('스트', 'straight'), punchBtn('어퍼', 'upper')]);
    this.counter = el('div', { class: 'gym-counter hidden' }, '');
    this.mount(el('div', { class: 'screen top', style: 'pointer-events:none' }, [
      el('div', { style: 'pointer-events:auto;width:100%' }, topBar(app, null, null)),
      el('div', { class: 'gym-help small', style: 'pointer-events:none' }, isTouch
        ? '왼쪽 동그라미로 걷고, 화면을 밀어서 돌아요 · 펀치 버튼으로 샌드백을 쳐 봐요'
        : `WASD 걷기 · ←→/마우스 끌기 돌기 · ${keyName(k.jab[0])}·${keyName(k.straight[0])}·${keyName(k.upper[0])} 펀치 · Enter/F 들어가기`),
      el('button', { class: 'btn secondary sm gym-menu', style: 'pointer-events:auto', onclick: () => app.go('menu') }, '☰ 버튼 메뉴'),
      this.counter, this.bubble, this.prompt, this.stick, this.touchPunch,
    ]));
    for (const n of [this.prompt, this.bubble, this.stick, this.touchPunch]) n.style.pointerEvents = 'auto';
  }

  exit() {
    const st = this.app.stage;
    st.scene.remove(this.world.group);
    st.arena.group.visible = true;
    st.scene.fog.near = 18;
    st.scene.fog.far = 36;
    if (this.fp) st.camera.remove(this.fp.rig);
    this.fp = null;
    this.app.actions.gameActive = false;
    this.keys.clear();
    this.unbindPointer && this.unbindPointer();
    clearTimeout(this.bubbleT);
    super.exit();
  }

  bindPointer() {
    const win = window;
    let drag = null;
    let stickId = null;
    const stick = this.stick;
    const down = (e) => {
      if (e.target.closest && (e.target.closest('button') || e.target.closest('.bubble'))) return;
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
    win.addEventListener('pointerdown', down);
    win.addEventListener('pointermove', move);
    win.addEventListener('pointerup', up);
    win.addEventListener('pointercancel', up);
    const kd = (e) => this.keys.add(e.code);
    const ku = (e) => this.keys.delete(e.code);
    win.addEventListener('keydown', kd);
    win.addEventListener('keyup', ku);
    const blur = () => this.keys.clear();
    win.addEventListener('blur', blur);
    this.unbindPointer = () => {
      win.removeEventListener('pointerdown', down);
      win.removeEventListener('pointermove', move);
      win.removeEventListener('pointerup', up);
      win.removeEventListener('pointercancel', up);
      win.removeEventListener('keydown', kd);
      win.removeEventListener('keyup', ku);
      win.removeEventListener('blur', blur);
    };
  }

  say(text, who = '') {
    this.bubble.innerHTML = '';
    if (who) this.bubble.appendChild(el('span', { class: 'who' }, who));
    this.bubble.appendChild(document.createTextNode(text));
    this.bubble.classList.remove('hidden');
    clearTimeout(this.bubbleT);
    this.bubbleT = setTimeout(() => this.bubble.classList.add('hidden'), 6000);
  }

  talkCoach() {
    this.say(COACH_TIPS[this.tipI++ % COACH_TIPS.length], '문철 할아버지');
    this.app.audio.sfx('select');
  }

  talkNpc(n) {
    const o = n.o;
    const lines = [
      o.loseLine,
      `나를 이긴 비결? ${o.hints[(n.line) % 3]}`,
      `요즘은 ${n.s.act === 'bag' ? '샌드백' : n.s.act === 'rest' ? '체력' : '쉐도우 복싱'} 연습 중이야. 다음엔 안 진다!`,
      o.personality,
    ];
    this.say(lines[n.line++ % lines.length], `${o.nick} ${o.name}`);
    this.app.audio.sfx('select');
  }

  use() {
    if (!this.near) return;
    this.app.audio.sfx('select');
    this.near.go();
  }

  onUi(code) {
    if (code === 'Enter' || code === 'KeyF' || code === 'NumpadEnter') this.use();
    if (code === 'Escape') this.app.go('menu');
  }

  // 내 펀치가 앞에 있는 것에 닿았는지
  punchHit(id) {
    const fx = Math.sin(this.yaw) * -1;
    const fz = -Math.cos(this.yaw);
    const targets = [];
    for (const b of this.world.bags) targets.push({ kind: 'bag', obj: b, x: b.pos.x, z: b.pos.z, reach: 1.55 });
    const sb = this.world.speedBag;
    targets.push({ kind: 'speed', obj: sb, x: sb.pos.x, z: sb.pos.z, reach: 1.3 });
    for (const n of this.npcs) targets.push({ kind: 'npc', obj: n, x: n.s.x, z: n.s.z, reach: 1.4 });
    targets.push({ kind: 'coach', obj: this.coach, x: -3.6, z: -3.2, reach: 1.4 });
    let best = null;
    let bd = 1e9;
    for (const t of targets) {
      const dx = t.x - this.pos.x;
      const dz = t.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > t.reach) continue;
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (dot < 0.82) continue;
      if (d < bd) { best = t; bd = d; }
    }
    const a = this.app.audio;
    const p = this.player;
    if (!best) {
      a.sfx('miss');
      this.combo = 0;
      return;
    }
    const power = { jab: 1, straight: 1.6, upper: 2.1 }[id] || 1;
    const sp = this.app.stage.project(new THREE.Vector3(best.x, best.kind === 'speed' ? 2.0 : 1.6, best.z));
    if (best.kind === 'bag') {
      const b = best.obj;
      b.vx += fx * 0.012 * power;
      b.vz += fz * 0.012 * power;
      a.sfx('hit', { punch: id, dmg: 4 * power });
      this.hits++;
      this.combo = p.comboName ? this.combo + 1 : this.combo;
      this.effects.text(WORDS[id] || '퍽!', sp.x + (Math.random() - 0.5) * 60, sp.y - 40, { size: 50 + power * 10 });
      if (p.comboName) this.effects.text(p.comboName + '!', sp.x, sp.y + 30, { size: 32, color: '#ffffff', rot: 0 });
      this.effects.impact(sp.x, sp.y, 60 + power * 20);
      this.fp.onHit(0.004 * power);
      this.nudge = 0.03 * power;
    } else if (best.kind === 'speed') {
      best.obj.v += 0.5 * power;
      a.sfx('mitt', { good: true });
      this.hits++;
      this.effects.text('타닥!', sp.x, sp.y - 30, { size: 40, color: '#7affd0' });
    } else if (best.kind === 'npc') {
      const n = best.obj;
      a.sfx('block');
      this.say(['어이쿠! 연습 상대는 링에서 해 줄게!', '하하, 기습은 반칙이야~', '손이 근질근질하구나? 링으로 와!'][this.hits++ % 3], `${n.o.nick} ${n.o.name}`);
      n.anim.onEvent({ type: 'block' });
    } else {
      a.sfx('block');
      this.say('이 녀석! 나 말고 샌드백을 쳐라!', '문철 할아버지');
    }
    this.comboT = 1800;
    this.counter.textContent = `🥊 ${this.hits}번 명중${this.combo ? ` · 콤보 ${this.combo}` : ''}`;
    this.counter.classList.remove('hidden');
  }

  update(dt) {
    const app = this.app;
    const st = app.stage;
    const k = this.keys;
    const s = dt / 1000;
    this.clock += dt;
    this.stub.clock = this.clock;
    // 돌기 (←→, 마우스 끌기, 패드 오른쪽 스틱)
    let turn = 0;
    if (k.has('ArrowLeft')) turn += 1;
    if (k.has('ArrowRight')) turn -= 1;
    this.yaw += turn * 2.0 * s;
    // 걷기 (WASD, 터치 조이스틱, 패드 왼쪽 스틱)
    let fwd = 0, side = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) fwd += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) fwd -= 1;
    if (k.has('KeyA')) side -= 1;
    if (k.has('KeyD')) side += 1;
    if (this.stickVec) { fwd -= this.stickVec.y; side += this.stickVec.x; }
    const gp = navigator.getGamepads ? [...navigator.getGamepads()].find((p) => p && p.connected) : null;
    if (gp) {
      const dz = (v) => (Math.abs(v) > 0.2 ? v : 0);
      fwd -= dz(gp.axes[1] || 0);
      side += dz(gp.axes[0] || 0);
      this.yaw -= dz(gp.axes[2] || 0) * 2.2 * s;
    }
    const len = Math.hypot(fwd, side);
    const run = k.has('ShiftLeft') || k.has('ShiftRight');
    if (len > 0.05) {
      const sp = (run ? 4.6 : 3.0) * s * Math.min(1, len) / Math.max(1, len);
      const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
      const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
      this.tryMove(this.pos.x + (fx * fwd + rx * side) * sp, this.pos.z + (fz * fwd + rz * side) * sp);
      this.walkT = (this.walkT || 0) + dt * (run ? 1.5 : 1);
    }
    // 펀치 (경기와 같은 Player 로직으로 장갑이 움직인다)
    const bits = app.actions.consume() & PUNCH_MASK;
    this.player.update(dt, bits, this.stub);
    this.fp.update(dt, this.player, new THREE.Vector3(0, 0.02, -0.95), 0, 'gym', app.settings);
    // 카메라는 체육관 걷기가 정한다(장갑은 카메라를 따라다님)
    const cam = st.camera;
    const bob = len > 0.05 && !app.settings.reduceMotion ? Math.abs(Math.sin((this.walkT || 0) / 140)) * 0.04 : 0;
    this.nudge = (this.nudge || 0) * Math.pow(0.001, s);
    cam.position.set(this.pos.x - Math.sin(this.yaw) * this.nudge, 1.55 + bob, this.pos.z - Math.cos(this.yaw) * this.nudge);
    cam.rotation.set(-0.06, this.yaw, 0, 'YXZ');
    cam.fov = st.baseFov + 10;
    cam.updateProjectionMatrix();
    // 가까운 곳
    let best = null, bd = 1e9;
    for (const stn of this.stations) {
      const d = Math.hypot(stn.pos.x - this.pos.x, stn.pos.z - this.pos.z);
      if (d < stn.r && d < bd) { best = stn; bd = d; }
    }
    if (best !== this.near) {
      this.near = best;
      if (best) {
        this.prompt.textContent = `${best.label}  (Enter / F)`;
        this.prompt.classList.remove('hidden');
      } else this.prompt.classList.add('hidden');
    }
    // 샌드백·스피드백 흔들림
    for (const b of this.world.bags) {
      const kk = dt / 16;
      b.vx += -b.sx * 0.018 * kk; b.vz += -b.sz * 0.018 * kk;
      b.vx *= Math.pow(0.975, kk); b.vz *= Math.pow(0.975, kk);
      b.sx += b.vx * kk; b.sz += b.vz * kk;
      // 월드 x·z 흔들림 → 매달린 축 회전
      b.pivot.rotation.set(-b.sz * 0.9, 0, b.sx * 0.9);
    }
    const sb = this.world.speedBag;
    sb.ang += sb.v * s * 20;
    sb.v *= Math.pow(0.2, s);
    sb.pivot.rotation.z = Math.sin(sb.ang) * Math.min(1.2, sb.v * 2);
    // 코치: 나를 본다
    this.coachState.t += dt;
    const cp = this.coachAnim.update(dt, this.coachState, 0);
    cp.glx = 0.9; cp.gly = -0.35; cp.grx = -0.9; cp.gry = -0.35;
    this.coach.update(dt, cp, {});
    const toMe = Math.atan2(this.pos.x - this.coach.root.position.x, this.pos.z - this.coach.root.position.z);
    this.coach.root.rotation.y += (toMe - this.coach.root.rotation.y) * Math.min(1, dt / 400);
    // NPC: 쉐도우 복싱·샌드백 치기·쉬기
    for (const n of this.npcs) {
      const f0 = n.fake;
      f0.t += dt;
      if (n.s.act !== 'rest' && f0.t >= f0.dur) {
        const next = { idle: ['tell', 380], tell: ['active', 140], active: ['recover', 380], recover: ['idle', 500 + Math.random() * 700] }[f0.state];
        f0.state = next[0];
        f0.dur = next[1];
        f0.t = 0;
        if (f0.state === 'tell') f0.tellStartAt = this.clock;
        if (f0.state === 'active' && n.s.act === 'bag') {
          const bag = this.world.bags.find((b) => Math.abs(b.pos.z - n.s.z) < 0.5);
          if (bag) { bag.vx -= 0.008; }
        }
      }
      const pose = n.anim.update(dt, f0, 0);
      if (n.s.act === 'rest') { pose.glx = 0.85; pose.gly = -0.3; pose.grx = -0.85; pose.gry = -0.3; pose.expr = 'happy'; }
      n.f.update(dt, pose, { glowColor: '#fff' });
    }
    // 조명 깜빡임·햇살
    const tt = this.clock / 1000;
    this.world.lamps.forEach((c, i) => { c.material.opacity = 0.055 + 0.015 * Math.sin(tt * 0.8 + i); });
    this.world.sun.forEach((c, i) => { c.material.opacity = 0.07 + 0.02 * Math.sin(tt * 0.3 + i); });
    if (this.world.belt) this.world.belt.rotation.y += dt / 1500;
    this.comboT -= dt;
    if (this.comboT < 0 && !this.counter.classList.contains('hidden')) { this.counter.classList.add('hidden'); this.combo = 0; }
    this.effects.update(dt);
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
    for (const b of this.world.boxes) {
      const x0 = b.x0 - 0.35, x1 = b.x1 + 0.35, z0 = b.z0 - 0.35, z1 = b.z1 + 0.35;
      if (nx > x0 && nx < x1 && nz > z0 && nz < z1) {
        // 가장 가까운 면으로 밀어낸다
        const opts = [[nx - x0, x0, null], [x1 - nx, x1, null], [nz - z0, null, z0], [z1 - nz, null, z1]];
        opts.sort((p, q) => p[0] - q[0]);
        if (opts[0][1] !== null) nx = opts[0][1];
        else nz = opts[0][2];
      }
    }
    this.pos.x = nx;
    this.pos.z = nz;
  }

  draw(ctx, view) {
    const st = this.app.stage;
    st.render();
    ctx.clearRect(0, 0, view.w, view.h);
    // 장소 이름표 (가까운 것만)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const stn of this.stations) {
      const d = Math.hypot(stn.pos.x - this.pos.x, stn.pos.z - this.pos.z);
      if (d > 7 && stn !== this.near) continue;
      const p = st.project(stn.pos);
      if (p.behind || p.x < -100 || p.x > view.w + 100 || p.y < -50 || p.y > view.h + 50) continue;
      const size = Math.max(15, Math.min(26, 55 / Math.max(1, d)));
      ctx.globalAlpha = Math.min(1, (7.5 - d) / 2);
      ctx.font = `${size}px "Jua", "Malgun Gothic", sans-serif`;
      const w = ctx.measureText(stn.label).width + 22;
      ctx.fillStyle = stn === this.near ? 'rgba(255,190,30,0.95)' : 'rgba(10,10,20,0.72)';
      roundRect(ctx, p.x - w / 2, p.y - size * 0.9, w, size * 1.8, 12);
      ctx.fill();
      ctx.fillStyle = stn === this.near ? '#1a1410' : '#fff';
      ctx.fillText(stn.label, p.x, p.y);
    }
    ctx.globalAlpha = 1;
    this.effects.drawWorld(ctx);
    this.effects.drawTexts(ctx);
    // 조준점
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(view.w / 2, view.h * 0.48, 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

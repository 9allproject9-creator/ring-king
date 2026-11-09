// 온라인 1:1: 로비(빠른 대전 / 방 만들기 / 코드로 참가)와 대전 화면.
// 판정은 서버(PvpMatch)가 하고, 내 장갑은 즉시 반응하도록 내 쪽에서 미리 움직여 본다(예측).
import { el, clear, toast } from './dom.js';
import { Screen, topBar, playerLook2D } from './common.js';
import { DT } from '../config.js';
import { Player } from '../game/player.js';
import { PVP, pvpPlayerCfg } from '../game/pvp.js';
import { IN } from '../game/inputBits.js';
import { FightView3D } from '../render3d/fightView3d.js';
import { keyName } from '../input/keyboard.js';

const MOVE_BITS = IN.MOVE_BACK | IN.MOVE_FWD | IN.CIRCLE_L | IN.CIRCLE_R;
const ANIM = { jab: 'jabL', straight: 'straightR', upper: 'upperR', special: 'straightR' };

export function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  // 개발 서버(vite, 5173)일 때는 게임 서버(3000)에 붙는다
  const host = location.port === '5173' ? `${location.hostname}:3000` : location.host;
  return `${proto}://${host}/ws`;
}

export class OnlineLobby extends Screen {
  enter(params = {}) {
    this.app.backdrop.set({ venue: 'world', opponent: null, mode: 'orbit' });
    this.app.music && this.app.music.play('menu');
    this.msg = params.msg || '';
    this.state = 'menu';
    this.render();
  }

  connect(onOpen) {
    const app = this.app;
    if (app.net && app.net.readyState <= 1) { if (app.net.readyState === 1) onOpen(); else app.net.addEventListener('open', onOpen, { once: true }); return; }
    let ws;
    try { ws = new WebSocket(wsUrl()); } catch (e) { this.fail('서버에 연결할 수 없어요.'); return; }
    app.net = ws;
    ws.addEventListener('open', onOpen, { once: true });
    ws.addEventListener('error', () => this.fail('온라인 서버에 연결할 수 없어요. (게임 서버가 켜져 있어야 해요)'));
    ws.addEventListener('close', () => { if (app.currentName === 'online') this.fail('연결이 끊겼어요.'); });
    ws.addEventListener('message', (e) => {
      let m;
      try { m = JSON.parse(e.data); } catch (x) { return; }
      this.onMsg(m);
    });
  }

  onMsg(m) {
    if (this.app.currentName !== 'online') { this.app.screens.onlineFight.onMsg && this.app.screens.onlineFight.onMsg(m); return; }
    if (m.t === 'wait') { this.state = m.mode === 'room' ? 'room' : 'quick'; this.code = m.code; this.render(); }
    else if (m.t === 'err') { this.state = 'menu'; this.msg = m.msg; this.render(); this.app.audio.sfx('error'); }
    else if (m.t === 'start') { this.app.audio.sfx('bell', { start: true }); this.app.go('onlineFight', m); }
  }

  fail(msg) {
    this.state = 'menu';
    this.msg = msg;
    if (this.app.currentName === 'online') this.render();
  }

  sendJoin(t, extra = {}) {
    const app = this.app;
    this.connect(() => app.net.send(JSON.stringify({ t, name: app.playerName(), look: playerLook2D(app), ...extra })));
  }

  cancel() {
    const app = this.app;
    if (app.net && app.net.readyState === 1) app.net.send(JSON.stringify({ t: 'leave' }));
    this.state = 'menu';
    this.render();
  }

  render() {
    const app = this.app;
    let body;
    if (this.state === 'quick') {
      body = [el('div', { class: 'spinner' }), el('h3', {}, '상대를 찾는 중…'), el('p', { class: 'small' }, '다른 사람이 "빠른 대전"을 누르면 바로 시작해요.'), el('button', { class: 'btn secondary', onclick: () => this.cancel() }, '취소')];
    } else if (this.state === 'room') {
      body = [el('h3', {}, '친구에게 이 코드를 알려 주세요'), el('div', { class: 'room-code' }, this.code || '----'), el('div', { class: 'spinner' }), el('p', { class: 'small' }, '친구가 "코드로 참가"에 이 코드를 넣으면 시작해요.'), el('button', { class: 'btn secondary', onclick: () => this.cancel() }, '취소')];
    } else {
      const code = el('input', { type: 'text', maxlength: 4, placeholder: '코드 4자리', style: 'text-transform:uppercase;text-align:center;font-size:26px;letter-spacing:6px;max-width:220px' });
      body = [
        el('p', {}, '다른 사람과 실시간으로 1:1 대결! 상대의 준비 동작(텔)을 보고 피한 뒤 반격하세요.'),
        el('div', { class: 'online-rules' }, [
          el('div', {}, '⤺ 상대의 잽 → 왼쪽 피하기 또는 숙이기'),
          el('div', {}, '⤻ 상대의 스트레이트 → 오른쪽 피하기 또는 숙이기'),
          el('div', {}, '↕ 상대의 어퍼컷·필살 → 좌우 피하기 (숙이면 맞아요)'),
          el('div', {}, '🛡 가드는 피해를 줄여요 · 피한 뒤 바로 치면 반격+별!'),
        ]),
        el('button', { class: 'btn big red', onclick: () => { app.audio.sfx('select'); this.sendJoin('quick'); } }, '⚡ 빠른 대전 (아무나)'),
        el('button', { class: 'btn blue', onclick: () => { app.audio.sfx('select'); this.sendJoin('create'); } }, '🏠 방 만들기 (친구와)'),
        el('div', { class: 'row' }, [code, el('button', { class: 'btn', onclick: () => { const c = code.value.trim().toUpperCase(); if (c.length !== 4) { toast('코드 4자리를 넣어 주세요'); return; } this.sendJoin('join', { code: c }); } }, '코드로 참가')]),
        this.msg ? el('div', { class: 'bubble', style: 'font-size:16px' }, this.msg) : null,
      ];
    }
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, '온라인 1:1', () => { this.cancel(); app.go('gym'); }),
      el('div', { class: 'panel col fade-in online-panel' }, body),
    ]));
  }

  onUi(code) {
    if (code === 'Escape') { this.cancel(); this.app.go('gym'); }
  }
}

// 서버가 보낸 선수 상태로 화면용 "상대" 흉내 객체를 만든다
function oppAdapter(prev, f, elapsed, look, phase, result, you) {
  const o = prev;
  const t = f.t + elapsed;
  o.hp = f.hp;
  o.maxHp = 100;
  o.downsRound = f.dr;
  o.dodge = null;
  o.fake = false;
  o.guardUp = true;
  o.pos = 0;
  o.fromPos = 0;
  const cfg = o.cfg;
  let st = 'idle';
  let tt = t;
  let dur = f.dur || 1e9;
  if (f.state === 'punch' && f.a) {
    const pc = cfg.punches[f.a];
    o.atk = { anim: ANIM[f.a], avoid: PVP.avoid[f.a], id: f.a };
    if (t < pc.startup) { st = 'tell'; dur = pc.startup; }
    else if (t < pc.startup + pc.active) { st = 'active'; tt = t - pc.startup; dur = pc.active; }
    else { st = 'recover'; tt = t - pc.startup - pc.active; dur = pc.recovery + (f.er || 0); }
  } else if (f.state === 'hurt') { st = f.stg ? 'whiff' : 'hurt'; o.atk = o.atk || { anim: 'jabL' }; }
  else if (f.state === 'dodge') {
    o.dodge = f.a;
    const end = f.de || 520;
    o.dodgeK = t < 60 ? t / 60 : t < 320 ? 1 : Math.max(0, 1 - (t - 320) / Math.max(1, end - 320));
  } else if (f.state === 'guard' || f.state === 'guardRelease') st = 'blockStance';
  else if (f.state === 'down') st = 'down';
  else if (f.state === 'getup') st = 'getup';
  else if (f.state === 'winded') st = 'tired';
  else if (f.state === 'guardBroken') st = 'guardBroken';
  if (phase === 'ending' || phase === 'over') {
    if (result && result.winner === you) { st = 'ko'; o.koFromDown = f.state === 'down'; } else if (result && result.winner === 1 - you) st = 'win';
  }
  if (st === 'tell' && o.state !== 'tell') o.tellStartAt = (o.tellStartAt || 0) + 1;
  if (st !== o.state) { o.stateStart = performance.now(); }
  o.state = st;
  o.t = st === 'ko' || st === 'win' ? (performance.now() - o.stateStart) : tt;
  o.dur = dur;
  return o;
}

export class OnlineFight {
  constructor(app) { this.app = app; }

  enter(start) {
    const app = this.app;
    this.you = start.you;
    this.names = start.names;
    this.code = start.code;
    const oppLook = { ...start.looks[1 - this.you] };
    this.cfg = pvpPlayerCfg();
    this.player = new Player({ cfg: this.cfg });
    this.stub = { clock: 0, emit: () => {}, onPlayerPunchActive: () => {}, onPlayerDodgeStart: () => {} };
    this.oppData = { id: 'online', name: this.names[1 - this.you], nick: '온라인', look: oppLook, attacks: {}, hints: ['', '', ''] };
    this.opp = { cfg: this.cfg, data: this.oppData, phases: [{}], phaseIndex: 0, ph: {}, state: 'intro', t: 0, dur: 1, hp: 100, maxHp: 100, pos: 0, fromPos: 0, guardUp: true, fake: false, atk: { anim: 'jabL' }, lastHitDir: 0, tellStartAt: 0, staggerFresh: false, downsRound: 0 };
    // FightView3D가 읽는 "경기" 흉내
    this.fight = {
      player: this.player, opp: this.opp, oppData: this.oppData, phase: 'intro', phaseT: 0, round: 1, maxRounds: PVP.rounds,
      roundTime: PVP.roundMs, down: null, clinch: null, gap: 0, orbit: 0, op: { x: 0, z: -0.81 }, pp: { x: 0, z: 0.81 },
      hitstop: 0, result: null, training: null, noTimer: false, stats: {},
    };
    this.view = new FightView3D({
      stage: app.stage, fight: this.fight, venue: 'world', settings: app.settings,
      playerLook: app.playerLook(), playerName: app.playerName(), audio: app.audio, portraitLook: playerLook2D(app),
    });
    const k = app.keyboard.keys;
    this.view.labels = { special: keyName(k.special[0]), mash: '공격 키 연타로 일어나!' };
    this.snap = null;
    this.snapAt = 0;
    this.acc = 0;
    this.lastHeld = -1;
    this.lastSend = 0;
    this.ended = false;
    app.actions.gameActive = true;
    app.actions.clear();
    app.audio.setCrowd(true);
    app.music && app.music.play('fight_world');
    app.touch.show(true);
    this.root = el('div', { class: 'screen', style: 'pointer-events:none;justify-content:flex-start' }, [
      el('div', { class: 'replay-badge', style: 'background:rgba(40,120,220,0.85)' }, `🌐 온라인 · ${this.names[this.you]} vs ${this.names[1 - this.you]}`),
    ]);
    this.overlay = el('div', { class: 'screen dim hidden', style: 'pointer-events:auto' });
    app.ui.appendChild(this.root);
    app.ui.appendChild(this.overlay);
    this.pingT = setInterval(() => this.send({ t: 'ping', c: performance.now() }), 2000);
  }

  exit() {
    this.app.actions.gameActive = false;
    this.app.touch.show(false);
    this.app.audio.setCrowd(false);
    clearInterval(this.pingT);
    this.root && this.root.remove();
    this.overlay && this.overlay.remove();
    this.view && this.view.dispose();
    this.view = null;
  }

  send(m) {
    const ws = this.app.net;
    if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
  }

  onMsg(m) {
    if (m.t === 's') this.onSnap(m);
    else if (m.t === 'pong') this.ping = Math.round(performance.now() - m.c);
    else if (m.t === 'oppLeft') { toast('상대가 나갔어요.'); this.showEnd(true); }
    else if (m.t === 'rematchAsk') toast('상대가 다시 하자고 해요!');
    else if (m.t === 'start') { this.exit(); this.enter(m); }
  }

  onSnap(s) {
    const you = this.you;
    const me = s.f[you];
    const op = s.f[1 - you];
    const f = this.fight;
    const p = this.player;
    this.snap = s;
    this.snapAt = performance.now();
    // 내 상태: 수치는 서버를 따르고, 맞음·다운 같은 상태는 서버로 맞춘다
    p.hp = me.hp; p.stamina = me.st; p.guard = me.g; p.stars = me.s; p.downsRound = me.dr; p.specialStars = me.ss;
    const forced = ['hurt', 'down', 'getup', 'guardBroken', 'winded'];
    if (forced.includes(me.state) && p.state !== me.state) { p.state = me.state; p.t = me.t; p.dur = me.dur; p.action = null; p.buffer = null; }
    if (!forced.includes(me.state) && forced.includes(p.state) && p.state !== me.state) { p.state = 'idle'; p.t = 0; }
    // 경기 진행
    const phMap = { intro: 'intro', fight: 'fight', roundOver: 'roundOver', between: 'between', ending: 'ending', over: 'over' };
    f.phase = s.ph === 'down' ? (s.d && s.d.w === you ? 'pdown' : 'odown') : phMap[s.ph] || 'fight';
    f.phaseT = s.pt;
    f.round = s.r;
    f.roundTime = s.rt;
    f.down = s.d ? { who: s.d.w === you ? 'player' : 'opponent', count: s.d.c, t: s.d.t, mash: s.d.m, need: s.d.n } : null;
    if (s.res) f.result = { winner: s.res.winner === you ? 'player' : s.res.winner === 1 - you ? 'opponent' : 'draw', method: s.res.method };
    oppAdapter(this.opp, op, 0, this.oppData.look, s.ph, s.res, you);
    this.opRaw = op;
    // 이벤트를 내 시점으로 바꿔서 화면·소리에
    const evs = [];
    for (const e of s.ev || []) {
      const mine = e.who === you;
      switch (e.type) {
        case 'hit': evs.push(mine ? { type: 'hit', punch: e.punch, dmg: e.dmg, kind: e.kind, combo: e.combo } : { type: 'playerHit', dmg: e.dmg }); if (!mine) this.opp.lastHitDir = 0; else this.opp.lastHitDir = e.punch === 'jab' ? -1 : e.punch === 'straight' ? 1 : 0; break;
        case 'block': evs.push(mine ? { type: 'block', punch: e.punch } : { type: 'playerBlock' }); break;
        case 'dodge': evs.push(mine ? { type: 'dodge', dir: e.dir } : { type: 'whiff', punch: e.punch }); break;
        case 'wrongDodge': if (mine) evs.push({ type: 'wrongDodge' }); break;
        case 'guardBreak': evs.push({ type: mine ? 'guardBreak' : 'oppGuardBreak' }); break;
        case 'down': evs.push({ type: 'down', who: mine ? 'player' : 'opponent', tko: e.tko }); break;
        case 'count': evs.push({ type: 'count', n: e.n }); break;
        case 'getup': evs.push({ type: 'getup', who: mine ? 'player' : 'opponent' }); break;
        case 'bell': evs.push({ type: 'bell', start: e.start, round: e.round }); break;
        case 'star': if (mine) evs.push({ type: 'star', stars: e.stars }); break;
        case 'starLost': if (mine) evs.push({ type: 'starLost', stars: e.stars, lost: e.lost }); break;
        case 'punchStart': if (!mine) evs.push({ type: 'oppTell', ms: PVP.startup[e.punch] || 300 }); break;
        case 'mash': if (mine) evs.push({ type: 'mash' }); break;
        case 'finish': evs.push({ type: 'finish', winner: e.winner === you ? 'player' : e.winner === 1 - you ? 'opponent' : 'draw', method: e.method }); break;
        default: break;
      }
    }
    if (evs.length && this.view) this.view.onEvents(evs);
    if (s.ph === 'over' && !this.ended) { this.ended = true; setTimeout(() => this.showEnd(false), 1200); }
  }

  showEnd(left) {
    const app = this.app;
    const f = this.fight;
    const r = f.result;
    clear(this.overlay);
    this.overlay.classList.remove('hidden');
    app.touch.show(false);
    const win = r && r.winner === 'player';
    const title = left ? '상대가 나갔어요' : win ? '승리!' : r && r.winner === 'draw' ? '무승부' : '패배…';
    if (win && !left) {
      const d = app.save.data;
      d.coins += 40;
      d.records.onlineWins = (d.records.onlineWins || 0) + 1;
      app.save.save();
    }
    this.overlay.appendChild(el('div', { class: 'panel col fade-in', style: 'width:min(440px,92vw);text-align:center' }, [
      el('h1', { style: `font-size:60px;color:${win ? '#ffd23a' : '#fff'}` }, title),
      r && !left ? el('p', {}, `${r.method} · ${f.round}라운드`) : null,
      win && !left ? el('p', {}, '🪙 +40') : null,
      left ? null : el('button', { class: 'btn big', onclick: () => { this.send({ t: 'rematch' }); toast('상대를 기다리는 중…'); } }, '한 판 더!'),
      el('button', { class: 'btn secondary', onclick: () => { this.send({ t: 'leave' }); app.go('online'); } }, '로비로'),
    ]));
  }

  onUi(code) {
    if (code === 'Escape' && !this.ended) {
      if (confirm('대전을 그만둘까요? (지는 걸로 처리돼요)')) { this.send({ t: 'leave' }); this.app.go('online'); }
    }
  }

  update(dt) {
    const app = this.app;
    const f = this.fight;
    // 입력: 눌림은 바로 보내고, 누르고 있는 것은 바뀔 때·주기적으로
    const bits = app.actions.consume() & ~MOVE_BITS;
    const pressed = bits & ~IN.GUARD;
    const held = bits & IN.GUARD;
    const now = performance.now();
    if (pressed || held !== this.lastHeld || now - this.lastSend > 100) {
      this.send({ t: 'in', p: pressed, h: held });
      this.lastHeld = held;
      this.lastSend = now;
    }
    // 내 장갑 예측
    this.acc += Math.min(100, dt);
    let first = true;
    while (this.acc >= DT) {
      this.stub.clock += DT;
      if (f.phase === 'fight') this.player.update(DT, first ? bits : held, this.stub);
      first = false;
      this.acc -= DT;
    }
    // 상대: 마지막 상태에서 시간만큼 앞으로
    if (this.snap && this.opRaw) {
      const el2 = Math.min(150, now - this.snapAt);
      oppAdapter(this.opp, this.opRaw, f.phase === 'fight' ? el2 : 0, this.oppData.look, this.snap.ph, this.snap.res, this.you);
      if (f.phase === 'fight') f.roundTime = this.snap.rt - el2;
    }
    this.view.update(dt, 0);
  }

  draw(ctx, view) {
    this.view.draw(ctx, view);
    if (this.ping !== undefined) {
      ctx.save();
      ctx.font = '14px "Gowun Dodum", sans-serif';
      ctx.fillStyle = this.ping < 120 ? '#7affd0' : this.ping < 250 ? '#ffd23a' : '#ff7a7a';
      ctx.textAlign = 'right';
      ctx.fillText(`핑 ${this.ping}ms`, view.w - 16, view.h - 14);
      ctx.restore();
    }
    if (this.fight.phase === 'between' && this.snap) {
      ctx.save();
      ctx.font = '40px "Black Han Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 8;
      const s = Math.max(0, Math.ceil((PVP.betweenMs - this.snap.pt) / 1000));
      const txt = `${this.fight.round}라운드 끝! 다음 라운드까지 ${s}초`;
      ctx.strokeText(txt, view.w / 2, view.h * 0.4);
      ctx.fillText(txt, view.w / 2, view.h * 0.4);
      ctx.restore();
    }
  }
}

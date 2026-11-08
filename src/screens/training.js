// 훈련 캠프: 샌드백(콤보), 미트 치기(리듬), 피하기 훈련(다음 상대 텔), 줄넘기(박자). 보상은 코인·도전 과제만.
import { el } from './dom.js';
import { Screen, topBar } from './common.js';
import { COMBOS } from '../data/combos.js';
import { OPPONENTS, getOpponent, leagueOf } from '../data/opponents/index.js';
import { COACH_LOOK } from '../render/portrait.js';
import { roundRect } from '../render/ring.js';
import { drawAvoidIcon } from '../render/hud.js';
import { keyName } from '../input/keyboard.js';

const DUMMY_STATS = { maxHp: 999, hpScale: 1, idleBlock: 0, rest: [1e9, 1e9], restAfterHurt: [1e9, 1e9], hurtMs: 160, maxHitsInRow: 9999, blockCounter: null, guardGauge: 9999 };
export const SANDBAG = {
  id: 'sandbag', order: 0, name: '샌드백', nick: '훈련용', bag: true,
  look: { build: { w: 1, h: 1 }, skin: '#e0b090', trunks: '#8a3a2a', gloves: '#888', hair: { style: 'bald', color: '#000' } },
  stats: DUMMY_STATS, attacks: {}, phases: [{ hpBelow: 1, patterns: [{ seq: ['taunt'] }] }], hints: ['', '', ''],
};
export const MITT_COACH = {
  id: 'mittcoach', order: 0, name: '할아버지', nick: '미트 든', bag: false,
  look: { ...COACH_LOOK, build: { w: 1.05, h: 0.92, belly: 0.3, head: 1.05, neck: 1, glove: 1.3 }, trunks: '#2c4a8a', gloves: '#e23b3b', trim: '#ffd23a' },
  stats: { ...DUMMY_STATS, idleBlock: 0 }, attacks: {}, phases: [{ hpBelow: 1, patterns: [{ seq: ['taunt'] }] }], hints: ['', '', ''],
};

const PUNCH_NAME = { jab: '잽', straight: '스트레이트', upper: '어퍼컷' };

export class TrainingScreen extends Screen {
  enter() {
    const app = this.app;
    const d = app.save.data;
    app.backdrop.set({ venue: 'training', opponent: null, mode: 'orbit' });
    const unlocked = OPPONENTS.slice(0, d.career.unlocked + 1);
    const next = unlocked[unlocked.length - 1];
    this.drillOpp = this.drillOpp || next.id;
    const sel = el('select', { 'aria-label': '피하기 훈련 상대', onchange: (e) => { this.drillOpp = e.target.value; } }, unlocked.map((o) => {
      const op = el('option', { value: o.id }, `${o.nick} ${o.name}`);
      if (o.id === this.drillOpp) op.selected = true;
      return op;
    }));
    const k = app.keyboard.keys;
    const card = (ico, title, desc, best, onclick, extra) => el('div', { class: 'shop-item', style: 'align-items:stretch;text-align:left' }, [
      el('div', { style: 'font-size:44px;text-align:center' }, ico),
      el('h3', { style: 'margin:0;text-align:center' }, title),
      el('div', { class: 'small' }, desc),
      el('div', { class: 'small', style: 'color:#ffd23a' }, best),
      extra || null,
      el('button', { class: 'btn', onclick: () => { app.audio.sfx('select'); onclick(); } }, '시작'),
    ]);
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, '훈련 캠프', () => app.go('gym')),
      el('div', { class: 'panel col fade-in', style: 'width:min(980px,96vw);margin-top:70px;max-height:calc(100vh - 90px);overflow:auto' }, [
        el('div', { class: 'small', style: 'text-align:center' }, '훈련은 실력을 키우는 곳! 능력치는 오르지 않고, 코인과 도전 과제만 얻어요.'),
        el('div', { class: 'shop-grid', style: 'grid-template-columns:repeat(auto-fill,minmax(210px,1fr))' }, [
          card('🥊', '샌드백', `60초 동안 콤보 연습. 콤보 목록과 입력이 화면에 보여요. (잽 ${keyName(k.jab[0])} · 스트레이트 ${keyName(k.straight[0])} · 어퍼 ${keyName(k.upper[0])})`, `최고 콤보 ${d.records.sandbag}번`, () => this.sandbag()),
          card('🎯', '미트 치기', '할아버지가 내미는 미트에 맞는 펀치를 박자에 맞춰 치기!', `최고 ${d.records.mitts}점`, () => this.mitts()),
          card('👀', '피하기 훈련', '고른 상대의 공격만 12번 보여 줘요. "이 동작이 보이면 오른쪽으로!" 안내가 나와요. 맞아도 안 아파요.', `최고 ${Math.max(0, ...Object.values(d.records.dodgeDrill || { a: 0 }))}/12`, () => this.drill(), sel),
          card('🪢', '줄넘기', '줄이 발밑에 올 때 Space(또는 화면)를 눌러 뛰기. 점점 빨라져요!', `최고 ${d.records.rope}번`, () => app.go('rope')),
        ]),
      ]),
    ]));
  }

  onUi(code) { if (code === 'Escape') this.app.go('gym'); }

  // ---- 샌드백 ----
  sandbag() {
    const app = this.app;
    const st = { combos: 0, last: null, lastAt: 0, inputs: [] };
    app.go('fight', {
      opponent: SANDBAG, venue: 'training', training: 'sandbag', rounds: 1, roundMs: 60000,
      onStep: (f, r, events) => {
        for (const e of events) {
          if (e.type === 'punchStart') { st.inputs.push(PUNCH_NAME[e.punch] || '필살'); if (st.inputs.length > 6) st.inputs.shift(); }
          if (e.type === 'hit' && e.combo) { st.combos++; st.last = e.combo; st.lastAt = f.clock; }
        }
      },
      drawExtra: (ctx, L, r, f) => drawComboPanel(ctx, L, st, f),
      onQuit: () => app.go('training'),
      onEnd: () => this.finish('sandbag', st.combos, `콤보 ${st.combos}번!`, st.combos * 3, () => { app.save.data.records.sandbag = Math.max(app.save.data.records.sandbag, st.combos); }),
    });
  }

  // ---- 미트 치기 ----
  mitts() {
    const app = this.app;
    const kinds = ['jab', 'straight', 'upper'];
    const st = { beats: [], score: 0, combo: 0, next: 1800, judged: new Set(), msg: null, msgAt: 0, i: 0 };
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
    app.go('fight', {
      opponent: MITT_COACH, venue: 'training', training: 'mitts', rounds: 1, roundMs: 40000,
      onStep: (f, r, events) => {
        if (f.phase !== 'fight') return;
        const t = f.fightTime;
        if (t >= st.next) {
          const interval = Math.max(560, 1000 - st.i * 14);
          st.beats.push({ at: t + 900, kind: kinds[Math.floor(rnd() * 3)], done: false });
          st.next = t + interval;
          st.i++;
        }
        for (const e of events) {
          if (e.type !== 'hit' && e.type !== 'whiff' && e.type !== 'block') continue;
          const b = st.beats.find((x) => !x.done && Math.abs(x.at - t) < 260);
          if (!b) continue;
          b.done = true;
          const dtt = Math.abs(b.at - t);
          if (e.punch !== b.kind) { st.combo = 0; st.msg = '다른 펀치!'; }
          else if (dtt < 100) { st.combo++; st.score += 300 + st.combo * 10; st.msg = '완벽!'; app.audio.sfx('mitt', { good: true }); }
          else { st.combo++; st.score += 150 + st.combo * 5; st.msg = '좋아!'; app.audio.sfx('mitt'); }
          st.msgAt = t;
        }
        for (const b of st.beats) if (!b.done && t - b.at > 260) { b.done = true; st.combo = 0; st.msg = '놓쳤다'; st.msgAt = t; }
        st.beats = st.beats.filter((b) => t - b.at < 600);
      },
      setup: (r) => {
        // 할아버지가 다음 펀치에 맞는 미트를 내민다
        r.poseOverride = (pose, f) => {
          const t = f.fightTime;
          const b = st.beats.find((x) => !x.done);
          if (!b) return;
          const k = Math.max(0, Math.min(1, 1 - (b.at - t) / 900));
          if (b.kind === 'jab') { pose.grx += (-0.25 - pose.grx) * k; pose.gry += (-1.3 - pose.gry) * k; pose.grz += (1.6 - pose.grz) * k; }
          if (b.kind === 'straight') { pose.glx += (0.25 - pose.glx) * k; pose.gly += (-1.3 - pose.gly) * k; pose.glz += (1.6 - pose.glz) * k; }
          if (b.kind === 'upper') { pose.glx += (0.1 - pose.glx) * k; pose.gly += (-0.75 - pose.gly) * k; pose.glz += (1.6 - pose.glz) * k; }
          pose.expr = 'happy';
        };
      },
      drawExtra: (ctx, L, r, f) => drawMittPanel(ctx, L, st, f, r),
      onQuit: () => app.go('training'),
      onEnd: () => this.finish('mitts', st.score, `${st.score}점!`, Math.floor(st.score / 100), () => { app.save.data.records.mitts = Math.max(app.save.data.records.mitts, st.score); }),
    });
  }

  // ---- 피하기 훈련 ----
  drill() {
    const app = this.app;
    const opp = getOpponent(this.drillOpp);
    const st = { attacks: 0, dodges: 0, total: 12, cue: null };
    const data = { ...opp, stats: { ...opp.stats, rest: [900, 1300], idleBlock: 1, blockCounter: null, step: opp.stats.step } };
    app.go('fight', {
      opponent: data, venue: leagueOf(opp.id).venue, training: 'drill', rounds: 1, noTimer: true,
      onStep: (f, r, events) => {
        const o = f.opp;
        r.coachLine = o.state === 'tell' && !o.fake && o.atk ? o.atk.cue : (o.state === 'tell' && o.fake ? '눈빛이 없다… 가짜다! 피하지 마!' : `피하기 ${st.dodges} / ${st.attacks}  (남은 공격 ${st.total - st.attacks})`);
        for (const e of events) {
          if (e.type === 'oppAttack') st.attacks++;
          if (e.type === 'dodge') st.dodges++;
          if (e.type === 'playerBlock' && o.atk && o.atk.avoid.length === 0) st.dodges++;
        }
        if (st.attacks >= st.total && (o.state === 'recover' || o.state === 'whiff' || o.state === 'idle')) f.endTraining();
      },
      onQuit: () => app.go('training'),
      onEnd: () => this.finish('drill', st.dodges, `${st.total}번 중 ${st.dodges}번 성공!`, st.dodges * 4, () => {
        const dd = app.save.data.records.dodgeDrill;
        dd[opp.id] = Math.max(dd[opp.id] || 0, st.dodges);
      }),
      forceTell: true,
    });
  }

  finish(kind, score, text, coins, saveFn) {
    const app = this.app;
    saveFn();
    app.save.data.coins += coins;
    app.award && app.award({ type: 'training', kind, score });
    app.save.save();
    const fs = app.screens.fight;
    fs.root.innerHTML = '';
    fs.root.style.pointerEvents = 'auto';
    fs.root.classList.add('dim');
    const done = () => app.go('training');
    fs.overlayConfirm = done;
    fs.root.appendChild(el('div', { class: 'panel col fade-in', style: 'text-align:center;width:min(420px,92vw)' }, [
      el('h2', {}, '훈련 끝!'),
      el('div', { style: 'font-family:var(--title);font-size:44px;color:#ffd23a' }, text),
      el('div', {}, `🪙 +${coins}`),
      el('div', { class: 'bubble', style: 'text-align:left;font-size:17px' }, [el('span', { class: 'who' }, '문철 할아버지'), score > 0 ? '좋다! 연습한 만큼 경기에서 보인다.' : '처음엔 다 그렇다. 한 번 더 해 보자.']),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn secondary', onclick: () => this[kind === 'drill' ? 'drill' : kind]() }, '다시 하기'),
        el('button', { class: 'btn', onclick: done }, '훈련 캠프로'),
      ]),
    ]));
  }
}

function drawComboPanel(ctx, L, st, f) {
  const x = 16, y = L.portrait ? L.gaugeY + 80 : 120;
  const w = Math.min(300, L.w * 0.42);
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, x, y, w, 40 + COMBOS.length * 26, 14);
  ctx.fill();
  ctx.fillStyle = '#ffd23a';
  ctx.font = '20px "Jua", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`콤보 목록 (성공 ${st.combos})`, x + 12, y + 10);
  ctx.font = '16px "Gowun Dodum", sans-serif';
  COMBOS.forEach((c, i) => {
    ctx.fillStyle = st.last === c.name && f.clock - st.lastAt < 900 ? '#7affd0' : '#fff';
    ctx.fillText(`${c.name}: ${c.seq.map((s) => PUNCH_NAME[s]).join('→')}`, x + 12, y + 40 + i * 26, w - 20);
  });
  // 최근 입력
  ctx.textAlign = 'center';
  ctx.font = '22px "Jua", sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(st.inputs.join(' · '), L.w / 2, L.portrait ? L.gaugeY - 90 : L.h - 130);
  ctx.restore();
}

function drawMittPanel(ctx, L, st, f, r) {
  const t = f.fightTime;
  const b = st.beats.find((x) => !x.done);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (b) {
    const k = Math.max(0, Math.min(1, (b.at - t) / 900));
    const cx = L.w / 2 + (b.kind === 'jab' ? -110 : b.kind === 'straight' ? 110 : 0);
    const cy = L.h * (b.kind === 'upper' ? 0.52 : 0.36);
    ctx.strokeStyle = '#ffd23a';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 40 + k * 90, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, cx - 80, cy - 22, 160, 44, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '26px "Jua", sans-serif';
    ctx.fillText(PUNCH_NAME[b.kind], cx, cy + 1);
  }
  ctx.font = '30px "Black Han Sans", sans-serif';
  ctx.fillStyle = '#ffd23a';
  ctx.fillText(`${st.score}점  · 연속 ${st.combo}`, L.w / 2, 130);
  if (st.msg && t - st.msgAt < 600) {
    ctx.font = '48px "Black Han Sans", sans-serif';
    ctx.fillStyle = st.msg === '완벽!' ? '#7affd0' : st.msg === '좋아!' ? '#fff' : '#ff9a9a';
    ctx.fillText(st.msg, L.w / 2, L.h * 0.62);
  }
  ctx.restore();
}

// ---- 줄넘기 ----
export class JumpRopeScreen extends Screen {
  enter() {
    const app = this.app;
    app.backdrop.set({ venue: 'training', opponent: null, mode: 'orbit' });
    this.state = 'ready';
    this.t = 0;
    this.phase = 0;
    this.period = 1100;
    this.count = 0;
    this.jumpT = -1;
    this.fails = 0;
    this.msg = '';
    this.mount(el('div', { class: 'screen', style: 'justify-content:flex-end', onpointerdown: (e) => { if (!e.target.closest('button')) this.jump(); } }, [
      topBar(app, '줄넘기', () => app.go('training')),
      el('div', { class: 'small', style: 'margin-bottom:20px;background:rgba(0,0,0,0.6);padding:8px 14px;border-radius:999px' }, '줄이 발밑에 올 때 Space · J · 화면 누르기! 세 번 걸리면 끝'),
    ]));
  }

  jump() {
    if (this.state === 'ready') { this.state = 'play'; this.app.audio.unlock(); }
    if (this.state !== 'play' || this.jumpT >= 0) return;
    this.jumpT = 0;
    // 줄이 바닥(phase≈0.5) 근처일 때 뛰면 성공
    const d = Math.abs(((this.phase % 1) + 1) % 1 - 0.5);
    if (d < 0.14) {
      this.count++;
      this.period = Math.max(520, this.period - 12);
      this.msg = d < 0.06 ? '완벽!' : '좋아!';
      this.app.audio.sfx('jump', { good: true });
      this.passed = true;
    } else {
      this.msg = '너무 일러!';
      this.app.audio.sfx('jump');
    }
    this.msgT = 600;
  }

  onUi(code) {
    if (code === 'Space' || code === 'KeyJ' || code === 'Enter') this.jump();
    if (code === 'Escape') this.app.go('training');
  }

  update(dt) {
    super.update(dt);
    if (this.msgT > 0) this.msgT -= dt;
    if (this.jumpT >= 0) { this.jumpT += dt; if (this.jumpT > 380) this.jumpT = -1; }
    if (this.state !== 'play') return;
    const prev = this.phase;
    this.phase += dt / this.period;
    // 줄이 발밑을 지나갔는데 공중에 있지 않으면 걸림
    if (Math.floor(prev - 0.5) !== Math.floor(this.phase - 0.5)) {
      if (this.jumpT < 0 && !this.passed) {
        this.fails++;
        this.msg = '걸렸다!';
        this.msgT = 700;
        this.app.audio.sfx('error');
        if (this.fails >= 3) this.end();
      }
      this.passed = false;
    }
  }

  end() {
    const app = this.app;
    this.state = 'end';
    const d = app.save.data;
    d.records.rope = Math.max(d.records.rope, this.count);
    const coins = Math.floor(this.count / 2);
    d.coins += coins;
    app.award && app.award({ type: 'training', kind: 'rope', score: this.count });
    app.save.save();
    this.root.appendChild(el('div', { class: 'panel col fade-in', style: 'position:absolute;top:30%;left:50%;transform:translateX(-50%);text-align:center' }, [
      el('h2', {}, `${this.count}번!`),
      el('div', {}, `🪙 +${coins} · 최고 ${d.records.rope}번`),
      el('div', { class: 'row' }, [
        el('button', { class: 'btn secondary', onclick: () => this.enter() }, '다시'),
        el('button', { class: 'btn', onclick: () => app.go('training') }, '훈련 캠프로'),
      ]),
    ]));
  }

  draw(ctx, view) {
    super.draw(ctx, view);
    const w = view.w, h = view.h;
    const cx = w / 2, footY = h * 0.78;
    const jy = this.jumpT >= 0 ? Math.sin((this.jumpT / 380) * Math.PI) * 90 : 0;
    // 줄 (앞/뒤)
    const ang = this.phase * Math.PI * 2;
    const ropeY = Math.cos(ang); // 1=위, -1=아래(발밑)
    const front = Math.sin(ang) > 0;
    const drawRope = () => {
      ctx.strokeStyle = '#ffd23a';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx - 120, footY - 150 - jy);
      ctx.quadraticCurveTo(cx, footY - 150 - ropeY * 230 - (ropeY < 0 ? -60 : 0) - jy * 0, cx + 120, footY - 150 - jy);
      ctx.stroke();
    };
    ctx.save();
    if (!front) drawRope();
    // 사람(뒷모습 실루엣 대신 귀여운 앞모습)
    ctx.fillStyle = this.app.save.data.profile.skin;
    ctx.strokeStyle = '#1a1410';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, footY - 260 - jy, 50, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e8e8e8';
    roundRect(ctx, cx - 55, footY - 210 - jy, 110, 140, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222';
    roundRect(ctx, cx - 50, footY - 70 - jy, 40, 70, 12); ctx.fill(); ctx.stroke();
    roundRect(ctx, cx + 10, footY - 70 - jy, 40, 70, 12); ctx.fill(); ctx.stroke();
    if (front) drawRope();
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.ellipse(cx, footY + 6, 80 - jy * 0.3, 14, 0, 0, Math.PI * 2); ctx.fill();
    ctx.textAlign = 'center';
    ctx.font = '64px "Black Han Sans", sans-serif';
    ctx.fillStyle = '#fff';
    ctx.lineWidth = 8;
    ctx.strokeText(String(this.count), cx, h * 0.22);
    ctx.fillText(String(this.count), cx, h * 0.22);
    ctx.font = '22px "Jua", sans-serif';
    ctx.fillText('❤'.repeat(3 - this.fails) + '♡'.repeat(this.fails), cx, h * 0.3);
    if (this.state === 'ready') {
      ctx.font = '40px "Jua", sans-serif';
      ctx.fillText('눌러서 시작!', cx, h * 0.42);
    }
    if (this.msgT > 0) {
      ctx.font = '44px "Black Han Sans", sans-serif';
      ctx.fillStyle = this.msg === '걸렸다!' || this.msg === '너무 일러!' ? '#ff8a8a' : '#7affd0';
      ctx.fillText(this.msg, cx, h * 0.4);
    }
    ctx.restore();
  }
}

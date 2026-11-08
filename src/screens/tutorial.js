// 튜토리얼: 코치와 함께 약 3분. 단계마다 직접 해야 다음으로. 건너뛰기 가능, 메뉴에서 다시 보기 가능.
import { el } from './dom.js';
import { Screen } from './common.js';
import { COACH_LOOK, drawPortrait } from '../render/portrait.js';
import { roundRect } from '../render/ring.js';
import { keyName } from '../input/keyboard.js';

export const SPARRING = {
  id: 'sparring', order: 0, name: '두만', nick: '연습 상대',
  look: { build: { w: 1.2, h: 1.0, belly: 0.35, neck: 1.2, arm: 1.15 }, skin: '#e8b07f', hair: { style: 'buzz', color: '#3b2a1c' }, trunks: '#3f73d0', trim: '#ffffff', gloves: '#ffffff', brow: 'thick', eyes: 'small', nose: 'round', extras: ['blush'], tellColor: '#ff5a3a', idleExpr: 'happy' },
  stats: { maxHp: 999, hpScale: 1, idleBlock: 0, rest: [1e9, 1e9], restAfterHurt: [1e9, 1e9], hurtMs: 250, maxHitsInRow: 9999, blockCounter: null },
  attacks: {
    hookL: { name: '느린 훅', anim: 'hookL', tell: 1150, active: 130, recovery: 500, damage: 4, avoid: ['L'], whiffMs: 1100, cue: '화면 오른쪽 팔을 뒤로 젖힌다 → 왼쪽으로!' },
    body: { name: '느린 몸통 치기', anim: 'bodyL', tell: 1150, active: 120, recovery: 500, damage: 4, avoid: [], whiffMs: 800, cue: '몸을 낮추고 왼손이 아래로 → 가드!' },
  },
  phases: [{ hpBelow: 1, patterns: [{ seq: ['taunt'] }] }],
  hints: ['', '', ''],
};

export class TutorialScreen extends Screen {
  enter({ first = false } = {}) {
    const app = this.app;
    this.first = first;
    const k = app.keyboard.keys;
    const K = (a) => keyName((k[a] || [])[0]);
    const touch = matchMedia('(pointer: coarse)').matches;
    const L = touch
      ? { jab: '잽', straight: '스트', upper: '어퍼', guard: '가드', dodgeL: '←', dodgeR: '→', duck: '↓', special: '필살' }
      : { jab: K('jab'), straight: K('straight'), upper: K('upper'), guard: K('guard'), dodgeL: K('dodgeL'), dodgeR: K('dodgeR'), duck: K('duck'), special: K('special') };
    const st = { step: 0, punched: new Set(), t: 0, done: false, msgT: 0 };
    this.st = st;
    const steps = [
      { text: `펀치부터! 잽(${L.jab}), 스트레이트(${L.straight}), 어퍼컷(${L.upper})을 한 번씩 맞혀 봐라.`, check: () => st.punched.size >= 3 },
      { text: `몸을 낮추고 칠 때는 피할 수 없다. 가드(${L.guard})를 꾹 누르고 막아라!`, attack: 'body', check: (e) => e.type === 'playerBlock' },
      { text: `잘 봐라. 오른쪽 팔을 크게 젖히면 반대쪽, 왼쪽(${L.dodgeL})으로 피해!`, attack: 'hookL', check: (e) => e.type === 'dodge' },
      { text: '피한 다음 비틀거릴 때 바로 때려라! 그게 반격이다. (피하고 → 펀치)', attack: 'hookL', check: (e) => e.type === 'hit' && e.kind === 'counter' },
      { text: '반격하면 별을 얻는다. 별을 2개 모아 봐라!', attack: 'hookL', check: (e, f) => f.player.stars >= 2 },
      { text: `별이 있으면 필살 펀치(${L.special})! 헛방 칠 때 쓰면 확실하다.`, attack: 'hookL', check: (e) => e.type === 'hit' && e.kind === 'special', ensureStar: true },
      { text: '마지막! 다운당하면 공격 버튼을 마구 눌러서 일어나라!', down: true, check: (e) => e.type === 'getup' && e.who === 'player' },
    ];
    this.steps = steps;
    const finish = (skipped) => {
      if (st.done) return;
      st.done = true;
      const d = app.save.data;
      const firstTime = !d.tutorialDone;
      d.tutorialDone = true;
      if (firstTime && !skipped) d.coins += 30;
      app.save.save();
      if (skipped) { app.go('gym'); return; }
      const fs = app.screens.fight;
      fs.root.innerHTML = '';
      fs.root.style.pointerEvents = 'auto';
      fs.root.classList.add('dim');
      const go = () => app.go(this.first ? 'map' : 'gym');
      fs.overlayConfirm = go;
      const pc = el('canvas', { width: 200, height: 200, style: 'width:100px;height:100px;border-radius:14px' });
      drawPortrait(pc, COACH_LOOK, 'happy');
      fs.root.appendChild(el('div', { class: 'panel col fade-in', style: 'width:min(480px,92vw);text-align:center;align-items:center' }, [
        el('h2', {}, '튜토리얼 끝!'), pc,
        el('div', { class: 'bubble', style: 'text-align:left' }, [el('span', { class: 'who' }, '문철 할아버지'), '읽고, 피하고, 때린다. 이게 전부다. 이제 진짜 상대를 만나러 가자!']),
        firstTime ? el('div', {}, '🪙 +30') : null,
        el('button', { class: 'btn big', onclick: go }, this.first ? '커리어 시작 ▶' : '체육관으로'),
      ]));
    };
    this.finish = finish;
    app.go('fight', {
      opponent: SPARRING, venue: 'gym', training: 'sandbag', rounds: 1, noTimer: true, difficulty: 'easy', forceTell: true,
      onQuit: () => finish(true),
      onStep: (f, r, events) => {
        if (st.done || st.complete || f.phase !== 'fight') return;
        st.t += 16.7;
        const s = steps[st.step];
        r.coachLine = null;
        this.curText = s.text;
        for (const e of events) {
          if (e.type === 'hit' && st.step === 0) st.punched.add(e.punch);
          if (s.check(e, f)) {
            st.step++;
            st.msgT = 1200;
            app.audio.sfx('star');
            if (st.step >= steps.length) { st.complete = true; setTimeout(() => f.endTraining(), 800); return; }
            break;
          }
        }
        if (st.step === 0 && st.punched.size >= 3) { st.step = 1; st.msgT = 1200; app.audio.sfx('star'); }
        const cur = steps[st.step];
        if (!cur) return;
        const o = f.opp;
        if (cur.ensureStar && f.player.stars === 0 && o.state === 'idle') f.player.stars = 1;
        if (cur.attack && o.state === 'idle' && st.msgT <= 0 && f.player.actionable) o.startSentence(f, { seq: [cur.attack] });
        if (cur.down && f.phase === 'fight' && f.player.state !== 'down' && f.player.state !== 'getup' && st.msgT <= 0) {
          f.player.hp = 1;
          f.onPlayerDown();
        }
        if (st.msgT > 0) st.msgT -= 16.7;
      },
      drawExtra: (ctx, Lyt) => this.drawPanel(ctx, Lyt),
      onEnd: () => finish(false),
    });
    // 건너뛰기 버튼
    const fs = app.screens.fight;
    fs.root.appendChild(el('button', { class: 'btn secondary sm', style: 'position:absolute;top:100px;right:14px;pointer-events:auto', onclick: () => finish(true) }, '튜토리얼 건너뛰기 ▶▶'));
  }

  drawPanel(ctx, L) {
    const st = this.st;
    if (!L || st.step >= this.steps.length) return;
    const text = this.steps[st.step].text;
    const w = Math.min(L.w - 32, 820);
    const x = (L.w - w) / 2;
    const y = L.portrait ? L.gaugeY + 70 : 108;
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    roundRect(ctx, x, y, w, 86, 16);
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#1a1410';
    ctx.stroke();
    ctx.fillStyle = '#c2410c';
    ctx.font = '20px "Black Han Sans", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`문철 할아버지 · ${st.step + 1}/${this.steps.length}단계`, x + 16, y + 10);
    ctx.fillStyle = '#1a1410';
    ctx.font = '21px "Gowun Dodum", sans-serif';
    wrap(ctx, text, x + 16, y + 40, w - 32, 24);
    if (st.msgT > 0) {
      ctx.textAlign = 'center';
      ctx.font = '60px "Black Han Sans", sans-serif';
      ctx.fillStyle = '#7affd0';
      ctx.strokeStyle = '#1a1410';
      ctx.lineWidth = 10;
      ctx.strokeText('잘했다!', L.w / 2, L.h * 0.42);
      ctx.fillText('잘했다!', L.w / 2, L.h * 0.42);
    }
    ctx.restore();
  }
}

function wrap(ctx, text, x, y, maxW, lh) {
  let line = '';
  let yy = y;
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxW) {
      ctx.fillText(line, x, yy);
      line = ch;
      yy += lh;
    } else line += ch;
  }
  ctx.fillText(line, x, yy);
}

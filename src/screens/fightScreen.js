// 경기 화면: 고정 간격(60Hz) 로직 + 보간 그리기
import { DT } from '../config.js';
import { Fight } from '../game/fight.js';
import { randomSeed } from '../game/rng.js';
import { FightView3D } from '../render3d/fightView3d.js';
import { el, clear } from './dom.js';
import { showBetween, showResult } from './fightOverlays.js';

export class FightScreen {
  constructor(app) {
    this.app = app;
  }

  enter(params) {
    const app = this.app;
    this.params = params;
    const seed = params.seed || randomSeed();
    this.fight = new Fight({
      opponent: params.opponent,
      difficulty: params.difficulty || app.settings.difficulty || 'normal',
      variant: params.variant || 'normal',
      seed,
      rounds: params.rounds,
      training: params.training || null,
      noTimer: !!params.noTimer,
      roundMs: params.roundMs || null,
    });
    this.inputs = [];
    this.marks = [];
    this.renderer = new FightView3D({
      stage: app.stage,
      fight: this.fight,
      venue: params.venue || 'gym',
      settings: app.settings,
      playerLook: app.playerLook ? app.playerLook() : undefined,
      playerName: app.playerName ? app.playerName() : '나',
      audio: app.audio,
      floorPattern: params.floorPattern,
    });
    if (params.forceTell) this.renderer.settings = { ...app.settings, tellHighlight: true };
    if (params.setup) params.setup(this.renderer);
    this.acc = 0;
    this.paused = false;
    this.ended = false;
    this.app.actions.gameActive = true;
    this.app.actions.clear();
    app.audio.setCrowd(true);
    this.root = el('div', { class: 'screen', style: 'pointer-events:none' });
    app.ui.appendChild(this.root);
  }

  exit() {
    this.app.actions.gameActive = false;
    this.app.audio.setCrowd(false);
    this.root && this.root.remove();
    if (this.renderer) this.renderer.dispose();
    this.renderer = null;
  }

  onUi(code) {
    if (this.overlayConfirm && (code === 'Enter' || code === 'Space' || code === 'KeyJ' || code === 'NumpadEnter')) {
      this.overlayConfirm();
      return;
    }
    if ((code === 'Escape' || code === 'KeyP') && !this.ended && !this.betweenShown) this.togglePause();
  }

  togglePause() {
    if (this.fight.over) return;
    this.paused = !this.paused;
    clear(this.root);
    if (this.paused) {
      this.root.style.pointerEvents = 'auto';
      this.root.classList.add('dim');
      this.root.appendChild(el('div', { class: 'panel col fade-in', style: 'min-width:280px;text-align:center' }, [
        el('h2', {}, '일시정지'),
        el('button', { class: 'btn', onclick: () => this.togglePause() }, '계속하기'),
        el('button', { class: 'btn secondary', onclick: () => this.restart() }, '처음부터 다시'),
        el('button', { class: 'btn red', onclick: () => this.quit() }, '그만두기'),
      ]));
    } else {
      this.root.style.pointerEvents = 'none';
      this.root.classList.remove('dim');
    }
  }

  restart() {
    this.exit();
    this.enter({ ...this.params, seed: undefined });
  }

  quit() {
    if (this.params.onQuit) this.params.onQuit();
    else this.restart();
  }

  update(dt) {
    if (this.paused) return;
    const f = this.fight;
    const r = this.renderer;
    this.acc += Math.min(100, dt) * r.timeScale();
    let steps = 0;
    while (this.acc >= DT && steps < 6) {
      if (f.phase === 'between') {
        this.acc = 0;
        this.onBetween();
        break;
      }
      if (f.phase === 'over') {
        this.acc = 0;
        if (!this.ended) this.onEnd();
        break;
      }
      const input = this.app.actions.consume();
      this.inputs.push(input);
      f.step(input);
      r.onEvents(f.events);
      if (this.params.onStep) this.params.onStep(f, r, f.events);
      this.acc -= DT;
      steps++;
    }
    r.update(dt, Math.min(DT, this.acc) * (f.hitstop > 0 ? 0 : 1));
  }

  draw(ctx, view) {
    this.renderer.draw(ctx, view);
    if (this.params.drawExtra) this.params.drawExtra(ctx, this.renderer.layout, this.renderer, this.fight);
  }

  onBetween() {
    if (this.betweenShown) return;
    this.betweenShown = true;
    const f = this.fight;
    const heal = f.roundHealPreview();
    clear(this.root);
    this.root.style.pointerEvents = 'auto';
    this.root.classList.add('dim');
    const go = () => {
      this.betweenShown = false;
      clear(this.root);
      this.root.style.pointerEvents = 'none';
      this.root.classList.remove('dim');
      f.startNextRound();
      this.app.actions.clear();
      this.marks.push({ frame: this.inputs.length, type: 'nextRound' });
      this.renderer.onEvents(f.events);
    };
    this.app.audio.sfx('crowd', { cheer: 0.4 });
    let done = false;
    const once = () => { if (done) return; done = true; this.overlayConfirm = null; go(); };
    this.overlayConfirm = once;
    if (this.params.onBetween) {
      this.params.onBetween(this.root, f, heal, once);
      return;
    }
    showBetween(this.root, f, heal, once);
  }

  onEnd() {
    this.ended = true;
    const f = this.fight;
    const replay = { seed: f.seed, opponentId: f.oppData.id, difficulty: f.difficulty, variant: f.variant, rounds: f.maxRounds, inputs: this.inputs, marks: this.marks };
    if (this.params.onEnd) {
      this.params.onEnd(f, replay);
      return;
    }
    showResult(this.root, f, { audio: this.app.audio, onRetry: () => this.restart(), onNext: () => this.restart() });
  }

  // 결과 화면을 띄우고 Enter로 "다음"을 누를 수 있게 한다
  showResultOverlay(opts) {
    const s = showResult(this.root, this.fight, { audio: this.app.audio, ...opts });
    let done = false;
    this.overlayConfirm = () => { if (done) return; done = true; this.overlayConfirm = null; opts.onNext && opts.onNext(); };
    return s;
  }
}

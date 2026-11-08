// 경기 화면: 고정 간격(60Hz) 로직 + 보간 그리기
import { DT } from '../config.js';
import { Fight } from '../game/fight.js';
import { randomSeed } from '../game/rng.js';
import { FightRenderer } from '../render/fightRenderer.js';
import { el, clear } from './dom.js';

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
    });
    this.inputs = [];
    this.marks = [];
    this.renderer = new FightRenderer({
      fight: this.fight,
      venue: params.venue || 'gym',
      settings: app.settings,
      playerLook: app.playerLook ? app.playerLook() : undefined,
      playerName: app.playerName ? app.playerName() : '나',
      audio: app.audio,
    });
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
  }

  onUi(code) {
    if ((code === 'Escape' || code === 'KeyP') && !this.ended) this.togglePause();
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
      this.acc -= DT;
      steps++;
    }
    r.update(dt, Math.min(DT, this.acc) * (f.hitstop > 0 ? 0 : 1));
  }

  draw(ctx, view) {
    this.renderer.draw(ctx, view);
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
      this.marks.push({ frame: this.inputs.length, type: 'nextRound' });
      this.renderer.onEvents(f.events);
    };
    if (this.params.onBetween) {
      this.params.onBetween(this.root, f, heal, go);
      return;
    }
    this.root.appendChild(el('div', { class: 'panel col fade-in', style: 'text-align:center;min-width:280px' }, [
      el('h2', {}, `${f.round}라운드 끝!`),
      el('p', {}, `체력 +${Math.round(heal)} 회복`),
      el('button', { class: 'btn big', onclick: go }, '다음 라운드'),
    ]));
  }

  onEnd() {
    this.ended = true;
    const f = this.fight;
    const replay = { seed: f.seed, opponentId: f.oppData.id, difficulty: f.difficulty, variant: f.variant, rounds: f.maxRounds, inputs: this.inputs, marks: this.marks };
    if (this.params.onEnd) {
      this.params.onEnd(f, replay);
      return;
    }
    clear(this.root);
    this.root.style.pointerEvents = 'auto';
    this.root.classList.add('dim');
    const r = f.result;
    this.root.appendChild(el('div', { class: 'panel col fade-in', style: 'text-align:center;min-width:300px' }, [
      el('h2', {}, r.winner === 'player' ? '승리!' : r.winner === 'draw' ? '무승부' : '패배…'),
      el('p', {}, `${r.method} · ${r.round}라운드`),
      el('button', { class: 'btn big', onclick: () => this.restart() }, '다시 하기'),
    ]));
  }
}

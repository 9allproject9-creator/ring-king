// 클리어 후 콘텐츠: 챔피언 방어전, 보스 러시, 타임 어택 + 리플레이 보기
import * as THREE from 'three';
import { el } from './dom.js';
import { Screen, topBar } from './common.js';
import { OPPONENTS, getOpponent, leagueOf } from '../data/opponents/index.js';
import { formatTime } from '../game/scoring.js';
import { ReplayPlayer } from '../game/replay.js';
import { FightView3D } from '../render3d/fightView3d.js';
import { DT } from '../config.js';

export class ModesScreen extends Screen {
  enter() {
    const app = this.app;
    const d = app.save.data;
    app.backdrop.set({ venue: 'stadium', opponent: getOpponent('atlas'), mode: 'orbit' });
    const br = d.records.bossRush;
    const ta = el('select', { 'aria-label': '타임 어택 상대' }, OPPONENTS.map((o) => el('option', { value: o.id }, `${o.nick} ${o.name} — ${d.records.timeAttack[o.id] ? formatTime(d.records.timeAttack[o.id]) : '기록 없음'}`)));
    const card = (ico, title, desc, extra, btn, onclick) => el('div', { class: 'shop-item', style: 'align-items:stretch;text-align:left' }, [
      el('div', { style: 'font-size:44px;text-align:center' }, ico), el('h3', { style: 'margin:0;text-align:center' }, title),
      el('div', { class: 'small' }, desc), extra || null,
      el('button', { class: 'btn red', onclick: () => { app.audio.sfx('select'); onclick(); } }, btn),
    ]);
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, '클리어 후 도전', () => app.go('gym')),
      el('div', { class: 'panel col fade-in', style: 'width:min(980px,96vw);margin-top:70px;max-height:calc(100vh - 90px);overflow:auto' }, [
        el('div', { class: 'shop-grid', style: 'grid-template-columns:repeat(auto-fill,minmax(230px,1fr))' }, [
          card('👑', '챔피언 방어전', '10명이 더 강해져서 돌아왔다! 텔이 짧아지고 새 기술이 하나씩 생겼어요. 코인 1.6배.', el('div', { class: 'small', style: 'color:#ffd23a' }, `방어 성공 ${Object.values(d.defense.results).filter((r) => r.wins).length}/10`), '도전', () => app.go('map', { mode: 'defense' })),
          card('🔥', '보스 러시', '10명과 쉬지 않고 연속 경기! 경기 사이 체력은 조금만 회복돼요(잃은 양의 40%). 각 경기 2라운드.', el('div', { class: 'small', style: 'color:#ffd23a' }, br ? `최고: ${br.reached}명${br.cleared ? ' · 완주!' : ''}` : '기록 없음'), '시작', () => app.startBossRush()),
          card('⏱️', '타임 어택', '가장 빨리 KO 시키기! 최단 기록이 저장돼요.', ta, '시작', () => app.startFight({ oppId: ta.value, mode: 'timeattack' })),
          card('🎬', '마지막 KO 다시 보기', '가장 최근에 KO로 이긴 장면을 그대로 다시 봐요.', null, '보기', () => d.lastReplay ? app.watchReplay(d.lastReplay) : app.toastMsg('아직 KO 장면이 없어요')),
        ]),
      ]),
    ]));
  }

  onUi(code) { if (code === 'Escape') this.app.go('gym'); }
}

// 리플레이 보기: 화면 없이 빨리 감은 뒤 끝나기 약 7초 전부터 실제 속도로 보여 준다
export class ReplayScreen {
  constructor(app) { this.app = app; }

  enter({ replay, back = 'gym' }) {
    const app = this.app;
    this.back = back;
    const opp = getOpponent(replay.opponentId);
    this.player = new ReplayPlayer(replay, opp);
    const total = this.player.inputs.length;
    this.player.skipTo(Math.max(0, total - 60 * 7));
    this.view = new FightView3D({
      stage: app.stage, fight: this.player.fight, venue: leagueOf(opp.id).venue, settings: app.settings,
      playerLook: app.playerLook(), playerName: app.playerName(), audio: app.audio, floorPattern: app.floorPattern(),
    });
    this.acc = 0;
    this.slowEnd = false;
    app.audio.setCrowd(true);
    app.music.play('fight_' + leagueOf(opp.id).venue);
    this.root = el('div', { class: 'screen', style: 'pointer-events:none;justify-content:flex-start' }, [
      el('div', { class: 'replay-badge' }, '🎬 다시 보기'),
      el('button', { class: 'btn secondary sm', style: 'pointer-events:auto;position:absolute;top:100px;right:14px', onclick: () => this.done() }, '그만 보기 ▶▶'),
    ]);
    app.ui.appendChild(this.root);
  }

  exit() {
    this.root && this.root.remove();
    this.view && this.view.dispose();
    this.app.audio.setCrowd(false);
  }

  done() {
    if (this.finished) return;
    this.finished = true;
    setTimeout(() => { this.finished = false; this.app.go(this.back); }, 30);
  }

  onUi(code) { if (code === 'Escape' || code === 'Enter') this.done(); }

  update(dt) {
    const p = this.player;
    this.acc += Math.min(100, dt) * this.view.timeScale();
    let n = 0;
    while (this.acc >= DT && n < 6) {
      if (!p.stepFrame()) {
        if (!this.endAt) this.endAt = performance.now();
        break;
      }
      this.view.onEvents(p.fight.events);
      this.acc -= DT;
      n++;
    }
    this.view.update(dt, 0);
    if (this.endAt && performance.now() - this.endAt > 3500) this.done();
  }

  draw(ctx, view) {
    this.view.draw(ctx, view);
  }
}

// 시작과 화면 전환
import { View } from './render/view.js';
import { Stage3D } from './render3d/stage.js';
import { AudioEngine } from './audio/sfx.js';
import { Actions } from './input/actions.js';
import { Keyboard } from './input/keyboard.js';
import { SaveStore } from './save.js';
import { FightScreen } from './screens/fightScreen.js';
import { Backdrop } from './screens/backdrop.js';
import { TitleScreen } from './screens/title.js';
import { CreateScreen } from './screens/create.js';
import { MenuScreen } from './screens/menu.js';
import { MapScreen } from './screens/map.js';
import { IntroScreen } from './screens/intro.js';
import { CutsceneScreen } from './screens/cutscene.js';
import { EndingScreen } from './screens/ending.js';
import { GymScreen } from './screens/gym.js';
import { ShopScreen } from './screens/shop.js';
import { AchievementsScreen, RecordsScreen } from './screens/records.js';
import { TrainingScreen, JumpRopeScreen } from './screens/training.js';
import { checkAchievements } from './data/achievements.js';
import { TutorialScreen } from './screens/tutorial.js';
import { SettingsScreen } from './screens/settings.js';
import { getOpponent, leagueOf } from './data/opponents/index.js';
import { getItem } from './data/shop.js';
import { applyResult, storyBefore, storyAfter, markStory, triesOf } from './game/career.js';
import { loseAdvice } from './data/dialogue.js';
import { toast } from './screens/dom.js';

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ui = document.getElementById('ui');
    this.save = new SaveStore();
    this.settings = this.save.data.settings;
    // 기기의 "동작 줄이기"를 처음 한 번 따른다
    if (!this.settings.rmInit) {
      this.settings.rmInit = true;
      try { this.settings.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* 무시 */ }
    }
    this.stage = new Stage3D(document.getElementById('gl'));
    this.view = new View(this.canvas);
    this.view.onResize = (v) => this.stage.resize(v);
    this.stage.resize(this.view);
    this.audio = new AudioEngine();
    this.audio.setVolumes(this.settings.sfx, this.settings.music);
    this.actions = new Actions();
    this.keyboard = new Keyboard(this.actions);
    this.keyboard.setKeys(this.settings.keys);
    this.backdrop = new Backdrop(this);
    this.screens = {
      fight: new FightScreen(this),
      title: new TitleScreen(this),
      create: new CreateScreen(this),
      menu: new MenuScreen(this),
      map: new MapScreen(this),
      intro: new IntroScreen(this),
      cutscene: new CutsceneScreen(this),
      ending: new EndingScreen(this),
      gym: new GymScreen(this),
      shop: new ShopScreen(this),
      achievements: new AchievementsScreen(this),
      records: new RecordsScreen(this),
      training: new TrainingScreen(this),
      rope: new JumpRopeScreen(this),
      tutorial: new TutorialScreen(this),
      settings: new SettingsScreen(this),
    };
    this.applySettings();
    this.current = null;
    this.actions.onUi((code, e) => this.current && this.current.onUi && this.current.onUi(code, e));
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.last = performance.now();
    this.playStart = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  register(name, screen) {
    this.screens[name] = screen;
  }

  go(name, params = {}) {
    const next = this.screens[name];
    if (!next) {
      toast('곧 열려요!');
      return;
    }
    if (this.current && this.current.exit) this.current.exit();
    this.actions.clear();
    // 배경용 3D 상대는 배경을 쓰지 않는 화면(경기·체육관)에서는 치운다
    if (name === 'fight' || name === 'gym' || name === 'lineup') this.backdrop.clearFighter();
    this.current = next;
    this.currentName = name;
    this.current.enter(params);
  }

  playerName() {
    return this.save.data.profile.name || '나';
  }

  playerLook() {
    const d = this.save.data;
    const g = getItem(d.equipped.gloves) || {};
    return { skin: d.profile.skin, gloves: g.color || '#2f7de1', glovePattern: g.pattern || null };
  }

  floorPattern() {
    const f = getItem(this.save.data.equipped.floor);
    return f ? f.pattern : null;
  }

  entranceTrack() {
    const m = getItem(this.save.data.equipped.music);
    return m ? m.track : 'march';
  }

  // 지도에서 상대를 고르면: 처음이면 이야기 → 상대 소개
  openOpponent(oppId, mode = 'career') {
    const d = this.save.data;
    const sid = mode === 'career' ? storyBefore(d, oppId) : null;
    if (sid) {
      this.go('cutscene', {
        id: sid,
        onDone: () => { markStory(d, sid); this.save.save(); this.go('intro', { oppId, mode }); },
      });
    } else this.go('intro', { oppId, mode });
  }

  startFight({ oppId, mode = 'career', variant = 'normal', extra = {} }) {
    const opp = getOpponent(oppId);
    const lg = leagueOf(oppId);
    this.go('fight', {
      opponent: opp,
      venue: lg.venue,
      variant,
      difficulty: this.settings.difficulty,
      floorPattern: this.floorPattern(),
      ...extra,
      onQuit: () => this.go('map', { mode }),
      onEnd: (fight, replay) => this.finishFight(fight, replay, { oppId, mode, variant }),
    });
  }

  finishFight(fight, replay, ctx) {
    const d = this.save.data;
    const out = applyResult(d, fight, ctx);
    if (out.summary.win && (out.summary.method === 'KO' || out.summary.method === 'TKO')) d.lastReplay = replay;
    this.award({ type: 'fight', fight, out, ctx });
    this.save.save();
    const fs = this.screens.fight;
    const extra = [];
    if (out.unlocked) extra.push(`🔓 새 상대: ${getOpponent(out.unlocked).nick} ${getOpponent(out.unlocked).name}`);
    if (out.newRecord) extra.push('⏱ 최단 KO 기록!');
    const next = () => {
      const sid = out.summary.win && ctx.mode === 'career' ? storyAfter(d, ctx.oppId) : null;
      if (sid) {
        this.go('cutscene', {
          id: sid,
          onDone: () => {
            markStory(d, sid);
            this.save.save();
            if (sid === 'ending') this.go('ending');
            else this.go('map', { mode: ctx.mode });
          },
        });
      } else this.go('map', { mode: ctx.mode });
    };
    fs.showResultOverlay({
      summary: out.summary,
      onRetry: () => this.startFight(ctx),
      onNext: next,
      onReplay: d.lastReplay && replay === d.lastReplay ? () => this.watchReplay && this.watchReplay(replay) : null,
      nextLabel: out.summary.win ? '다음으로 ▶' : '지도로',
      loseAdvice: loseAdvice(getOpponent(ctx.oppId), Math.max(1, triesOf(d, ctx.oppId))),
      extra: extra.length ? extra.map((t) => { const e = document.createElement('div'); e.className = 'bubble'; e.style.fontSize = '17px'; e.textContent = t; return e; }) : null,
    });
  }

  applySettings() {
    const s = this.settings;
    this.audio.setVolumes(s.sfx, s.music);
    this.keyboard.setKeys(s.keys);
    const dpr = window.devicePixelRatio || 1;
    const max = s.quality === 'high' ? 2 : s.quality === 'low' ? 1 : Math.min(2, dpr > 1.5 && matchMedia('(pointer: coarse)').matches ? 1.5 : 2);
    this.stage.setQuality(max);
    document.body.classList.toggle('reduce-motion', !!s.reduceMotion);
    this.touch && this.touch.refresh();
  }

  // 도전 과제 확인 → 알림
  award(ev) {
    const got = checkAchievements(this.save.data, ev);
    got.forEach((a, i) => setTimeout(() => {
      toast(`🏅 도전 과제 달성: ${a.name} (+🪙${a.reward})`);
      this.audio.sfx('achieve');
    }, 400 + i * 900));
    if (got.length) this.save.save();
    return got;
  }

  loop(now) {
    const dt = Math.min(100, now - this.last);
    this.last = now;
    if (this.current) {
      this.current.update(dt);
      const ctx = this.view.ctx;
      this.view.begin();
      this.current.draw(ctx, this.view);
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}

const app = new App();
window.__app = app;
const q = new URLSearchParams(location.search);
if (q.get('dev') === 'lineup') {
  import('./screens/devLineup.js').then(({ DevLineup }) => {
    app.screens.lineup = new DevLineup(app);
    app.go('lineup', { only: q.get('only'), expr: q.get('expr'), clip: q.get('clip') });
  });
} else if (q.get('opp')) {
  app.startFight({ oppId: q.get('opp'), mode: 'free' });
} else {
  app.go('title');
}
export default app;

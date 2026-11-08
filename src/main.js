// 시작과 화면 전환
import { View } from './render/view.js';
import { Stage3D } from './render3d/stage.js';
import { AudioEngine } from './audio/sfx.js';
import { Actions } from './input/actions.js';
import { Keyboard } from './input/keyboard.js';
import { FightScreen } from './screens/fightScreen.js';
import { getOpponent } from './data/opponents/index.js';

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ui = document.getElementById('ui');
    this.stage = new Stage3D(document.getElementById('gl'));
    this.view = new View(this.canvas);
    this.view.onResize = (v) => this.stage.resize(v);
    this.stage.resize(this.view);
    this.audio = new AudioEngine();
    this.actions = new Actions();
    this.keyboard = new Keyboard(this.actions);
    this.settings = { difficulty: 'normal', shake: true, reduceFlash: false, tellHighlight: true };
    this.screens = { fight: new FightScreen(this) };
    this.current = null;
    this.actions.onUi((code, e) => this.current && this.current.onUi && this.current.onUi(code, e));
    const unlock = () => this.audio.unlock();
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    this.last = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  go(name, params = {}) {
    if (this.current && this.current.exit) this.current.exit();
    this.current = this.screens[name];
    this.current.enter(params);
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
} else {
  app.go('fight', { opponent: getOpponent(q.get('opp') || 'bear'), venue: q.get('venue') || 'gym' });
}

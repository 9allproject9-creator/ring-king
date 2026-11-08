// 시작과 화면 전환
import { View } from './render/view.js';
import { AudioEngine } from './audio/sfx.js';
import { Actions } from './input/actions.js';
import { Keyboard } from './input/keyboard.js';
import { FightScreen } from './screens/fightScreen.js';
import { getOpponent } from './data/opponents/index.js';

class App {
  constructor() {
    this.canvas = document.getElementById('game');
    this.ui = document.getElementById('ui');
    this.view = new View(this.canvas);
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
app.go('fight', { opponent: getOpponent('bear'), venue: 'gym' });

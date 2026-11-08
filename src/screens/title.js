// 타이틀 화면
import { el } from './dom.js';
import { Screen } from './common.js';
import { getOpponent } from '../data/opponents/index.js';

export class TitleScreen extends Screen {
  enter() {
    this.app.backdrop.set({ venue: 'stadium', opponent: getOpponent('atlas'), mode: 'orbit' });
    this.app.music && this.app.music.play('menu');
    this.mount(el('div', { class: 'screen', style: 'justify-content:space-between;cursor:pointer', onclick: () => this.start() }, [
      el('div'),
      el('div', { class: 'col fade-in', style: 'align-items:center;text-align:center;gap:6px' }, [
        el('div', { style: 'font-family:var(--round);font-size:clamp(16px,3vw,24px);color:#fff;text-shadow:0 2px 0 #000;letter-spacing:4px' }, '읽고 · 피하고 · 때려라!'),
        el('h1', { style: 'font-size:clamp(64px,15vw,150px)' }, '링의 왕'),
      ]),
      el('div', { class: 'col', style: 'align-items:center;gap:10px;margin-bottom:4vh' }, [
        el('div', { class: 'title-press', style: 'font-family:var(--round);font-size:clamp(20px,3.6vw,30px);color:#ffe9a0;text-shadow:0 3px 0 #000' }, '화면을 누르거나 아무 키나 눌러 시작'),
        el('div', { class: 'small' }, this.app.save.ok ? '' : '⚠ 이 브라우저에서는 저장이 안 돼요(게임은 할 수 있어요)'),
      ]),
    ]));
  }

  onUi(code) {
    if (code) this.start();
  }

  start() {
    if (this.started) return;
    this.started = true;
    this.app.audio.unlock();
    this.app.audio.sfx('select');
    const d = this.app.save.data;
    setTimeout(() => {
      this.started = false;
      if (!d.profile.created) this.app.go('create');
      else this.app.go('gym');
    }, 120);
  }
}

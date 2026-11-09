// 타이틀 화면
import { el } from './dom.js';
import { Screen } from './common.js';
import { getOpponent } from '../data/opponents/index.js';

export class TitleScreen extends Screen {
  enter() {
    this.app.backdrop.set({ venue: 'stadium', opponent: getOpponent('atlas'), mode: 'orbit' });
    this.app.music && this.app.music.play('menu');
    this.mount(el('div', { class: 'screen vig', style: 'justify-content:space-between;cursor:pointer', onclick: () => this.start() }, [
      el('div'),
      el('div', { class: 'title-wrap fade-in' }, [
        el('div', { class: 'title-crown' }, '👑'),
        el('div', { class: 'title-row' }, [
          el('span', { class: 'title-glove' }, '🥊'),
          el('h1', { class: 'title-logo' }, '링의 왕'),
          el('span', { class: 'title-glove r' }, '🥊'),
        ]),
        el('div', { class: 'title-sub' }, '읽고 · 피하고 · 때려라!'),
      ]),
      el('div', { class: 'col', style: 'align-items:center;gap:12px;margin-bottom:4vh' }, [
        el('div', { class: 'title-press' }, '화면을 누르거나 아무 키나 눌러 시작'),
        el('div', { class: 'small' }, this.app.save.ok ? '' : '⚠ 이 브라우저에서는 저장이 안 돼요(게임은 할 수 있어요)'),
        el('div', { class: 'title-foot' }, '혼자 커리어 · 훈련 · 온라인 1:1'),
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

// 컷신: 상반신 초상화 + 말풍선. 건너뛰기 가능.
import { el, clear } from './dom.js';
import { Screen, speakerLook, speakerName, fillName } from './common.js';
import { STORY } from '../data/dialogue.js';
import { drawPortrait } from '../render/portrait.js';

export class CutsceneScreen extends Screen {
  enter({ id, onDone }) {
    const app = this.app;
    this.scene = STORY[id];
    this.onDone = onDone;
    this.i = 0;
    app.backdrop.set({ venue: this.scene.venue || 'gym', opponent: null, mode: 'orbit' });
    app.music && app.music.play('story');
    this.left = el('canvas', { width: 360, height: 360, class: 'cs-portrait left' });
    this.right = el('canvas', { width: 360, height: 360, class: 'cs-portrait right' });
    this.bubble = el('div', { class: 'bubble cs-bubble', onclick: () => this.next() });
    this.mount(el('div', { class: 'screen cutscene', style: 'justify-content:flex-end' }, [
      el('button', { class: 'btn secondary sm cs-skip', onclick: () => this.finish() }, '건너뛰기 ▶▶'),
      el('div', { class: 'cs-stage' }, [this.left, this.right]),
      this.bubble,
      el('div', { class: 'small', style: 'text-align:center;margin-top:6px' }, '화면·Enter·공격 키로 넘기기'),
    ]));
    this.show();
  }

  show() {
    const app = this.app;
    const line = this.scene.lines[this.i];
    const isPlayerSide = line.who === 'player' || line.who === 'coach';
    const cv = isPlayerSide ? this.left : this.right;
    const other = isPlayerSide ? this.right : this.left;
    drawPortrait(cv, speakerLook(app, line.who), line.expr || 'normal', { bgColor: isPlayerSide ? '#bfe8ff' : '#ffd0c0', bgColor2: isPlayerSide ? '#3a7ad8' : '#d84a3a' });
    cv.classList.add('talk');
    other.classList.remove('talk');
    if (!other.dataset.drawn) other.style.opacity = '0';
    cv.dataset.drawn = '1';
    cv.style.opacity = '1';
    clear(this.bubble);
    const text = fillName(app, line.text);
    const span = el('span');
    this.bubble.appendChild(el('span', { class: 'who' }, speakerName(app, line.who)));
    this.bubble.appendChild(span);
    // 한 글자씩 (움직임 줄이기면 한 번에)
    this.typing = true;
    let k = 0;
    clearInterval(this.timer);
    if (app.settings.reduceMotion) {
      span.textContent = text;
      this.typing = false;
      return;
    }
    this.timer = setInterval(() => {
      k += 1;
      span.textContent = text.slice(0, k);
      if (k % 2 === 0) app.audio.sfx('type');
      if (k >= text.length) { clearInterval(this.timer); this.typing = false; }
    }, 28);
    this.fullText = text;
    this.span = span;
  }

  next() {
    if (this.typing) {
      clearInterval(this.timer);
      this.span.textContent = this.fullText;
      this.typing = false;
      return;
    }
    this.i++;
    if (this.i >= this.scene.lines.length) this.finish();
    else this.show();
  }

  finish() {
    if (this.done) return;
    this.done = true;
    clearInterval(this.timer);
    const cb = this.onDone;
    setTimeout(() => { this.done = false; cb && cb(); }, 50);
  }

  exit() {
    clearInterval(this.timer);
    super.exit();
  }

  onUi(code) {
    if (code === 'Enter' || code === 'Space' || code === 'KeyJ') this.next();
    if (code === 'Escape') this.finish();
  }
}

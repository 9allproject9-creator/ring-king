// 주인공 만들기: 이름, 피부색, 머리 모양, 머리 색, 장갑 색
import { el, clear } from './dom.js';
import { Screen, playerLook2D } from './common.js';
import { drawPortrait } from '../render/portrait.js';
import { SKIN_TONES, HAIR_STYLES, HAIR_COLORS } from '../data/shop.js';

const START_GLOVES = [
  { id: 'gloves_blue', color: '#2f7de1', name: '파랑' },
  { id: 'gloves_red', color: '#e0352f', name: '빨강' },
  { id: 'gloves_green', color: '#2fb556', name: '초록' },
];
const NAMES = ['새싹 복서', '번쩍 주먹', '꼬마 챔프', '용감한 펀치', '날쌘돌이'];

export class CreateScreen extends Screen {
  enter(params = {}) {
    this.edit = !!params.edit;
    this.app.backdrop.set({ venue: 'gym', opponent: null, mode: 'orbit' });
    const d = this.app.save.data;
    if (!d.profile.name) d.profile.name = '';
    this.build();
  }

  build() {
    const app = this.app;
    const d = app.save.data;
    const p = d.profile;
    const canvas = el('canvas', { width: 320, height: 320, style: 'width:min(220px,40vw);height:min(220px,40vw);border-radius:20px;border:3px solid #1a1410' });
    const redraw = () => drawPortrait(canvas, playerLook2D(app), 'happy');
    const name = el('input', { type: 'text', maxlength: 8, value: p.name, placeholder: NAMES[0], 'aria-label': '이름' });
    name.addEventListener('input', () => { p.name = name.value.trim().slice(0, 8); });
    const swatches = (list, cur, onPick, isColor = true) => el('div', { class: 'row', style: 'justify-content:flex-start;gap:8px' }, list.map((v) => {
      const val = isColor ? v : v.id;
      const b = el('button', {
        class: 'swatch' + (val === cur() ? ' on' : ''),
        style: isColor ? `background:${v}` : '',
        'aria-label': isColor ? v : v.name,
        onclick: () => { onPick(val); app.audio.sfx('ui'); this.build(); },
      }, isColor ? '' : v.name);
      return b;
    }));
    const glovePick = el('div', { class: 'row', style: 'justify-content:flex-start;gap:8px' }, START_GLOVES.map((g) => el('button', {
      class: 'swatch' + (d.equipped.gloves === g.id ? ' on' : ''),
      style: `background:${g.color}`,
      'aria-label': g.name,
      onclick: () => {
        if (!d.owned.includes(g.id)) d.owned.push(g.id);
        d.equipped.gloves = g.id;
        app.audio.sfx('ui');
        this.build();
      },
    })));
    const done = () => {
      if (!p.name) p.name = name.value.trim() || NAMES[0];
      p.created = true;
      app.save.save();
      app.audio.sfx('select');
      if (this.edit) app.go('menu');
      else if (!d.tutorialDone && app.screens.tutorial) app.go('tutorial', { first: true });
      else app.go('gym');
    };
    const node = el('div', { class: 'screen dim' }, el('div', { class: 'panel col fade-in scroll', style: 'width:min(760px,96vw);max-height:96vh' }, [
      el('h2', {}, this.edit ? '내 복서 바꾸기' : '나만의 복서 만들기'),
      el('div', { class: 'row', style: 'align-items:flex-start;gap:18px;flex-wrap:wrap' }, [
        el('div', { class: 'col', style: 'align-items:center' }, [canvas, el('div', { class: 'small' }, '경기에서는 내 장갑이 화면 아래에 보여요')]),
        el('div', { class: 'col', style: 'flex:1;min-width:260px' }, [
          el('label', {}, ['이름 (8글자까지)', name]),
          el('div', { class: 'row', style: 'justify-content:flex-start;gap:6px' }, NAMES.map((n) => el('button', { class: 'btn secondary sm', onclick: () => { p.name = n; name.value = n; } }, n))),
          el('div', {}, '피부색'), swatches(SKIN_TONES, () => p.skin, (v) => { p.skin = v; }),
          el('div', {}, '머리 모양'), swatches(HAIR_STYLES, () => p.hair, (v) => { p.hair = v; }, false),
          el('div', {}, '머리 색'), swatches(HAIR_COLORS, () => p.hairColor, (v) => { p.hairColor = v; }),
          el('div', {}, '장갑 색'), glovePick,
        ]),
      ]),
      el('button', { class: 'btn big', onclick: done }, this.edit ? '저장' : '이걸로 시작! ▶'),
    ]));
    this.mount(node);
    redraw();
    setTimeout(() => { if (!this.edit && !p.name) name.focus(); }, 50);
  }

  onUi(code, e) {
    if (code === 'Enter' && e && e.target && e.target.tagName !== 'BUTTON') {
      const b = this.root && this.root.querySelector('.btn.big');
      b && b.click();
    }
  }
}

// 화면 공통: DOM 루트 관리, 배경 3D, 말하는 사람 외형
import { el } from './dom.js';
import { COACH_LOOK } from '../render/portrait.js';
import { getOpponent } from '../data/opponents/index.js';
import { getItem, HAIR_STYLES } from '../data/shop.js';

export class Screen {
  constructor(app) {
    this.app = app;
    this.root = null;
  }

  mount(node) {
    if (this.root) this.root.remove();
    this.root = node;
    this.app.ui.appendChild(node);
    return node;
  }

  exit() {
    if (this.root) this.root.remove();
    this.root = null;
  }

  update(dt) {
    this.app.backdrop.update(dt);
  }

  draw(ctx, view) {
    this.app.backdrop.draw(ctx, view);
  }

  onUi() {}
}

export function topBar(app, title, onBack) {
  return el('div', { class: 'topbar' }, [
    onBack ? el('button', { class: 'btn secondary sm', onclick: () => { app.audio.sfx('ui'); onBack(); }, 'aria-label': '뒤로' }, '◀ 뒤로') : el('span'),
    title ? el('h2', { style: 'margin:0;font-size:clamp(22px,4vw,34px)' }, title) : el('span'),
    el('div', { class: 'coins' }, ['🪙 ', el('b', {}, String(app.save.data.coins))]),
  ]);
}

// 주인공 2D 초상화용 외형
export function playerLook2D(app) {
  const d = app.save.data;
  const p = d.profile;
  const hs = HAIR_STYLES.find((h) => h.id === p.hair) || HAIR_STYLES[0];
  const gl = getItem(d.equipped.gloves) || {};
  const tr = getItem(d.equipped.trunks) || {};
  return {
    build: { w: 0.95, h: 1.0, belly: 0, neck: 0.95, arm: 1, head: 1 },
    skin: p.skin,
    hair: { style: hs.style, color: p.hairColor },
    trunks: tr.color || '#e8e8e8',
    trim: '#1a1a1a',
    gloves: gl.color || '#2f7de1',
    brow: 'normal',
    eyes: 'big',
    nose: 'small',
    extras: [],
    tellColor: '#ffe23a',
  };
}

export function speakerLook(app, who) {
  if (who === 'coach') return COACH_LOOK;
  if (who === 'player') return playerLook2D(app);
  if (who === 'kai') return getOpponent('storm').look;
  if (who === 'atlas') return getOpponent('atlas').look;
  const o = getOpponent(who);
  return o ? o.look : COACH_LOOK;
}

export function speakerName(app, who) {
  if (who === 'coach') return '문철 할아버지';
  if (who === 'player') return app.save.data.profile.name || '나';
  if (who === 'kai') return '카이';
  if (who === 'atlas') return '아틀라스 강';
  const o = getOpponent(who);
  return o ? o.name : '';
}

export function fillName(app, text) {
  return text.replace(/\{name\}/g, app.save.data.profile.name || '나');
}

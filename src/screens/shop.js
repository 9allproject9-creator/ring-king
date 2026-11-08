// 상점·꾸미기 (능력치 영향 없음, 코인만 사용)
import { el, clear } from './dom.js';
import { Screen, topBar } from './common.js';
import { SLOTS, itemsFor } from '../data/shop.js';
import { ACHIEVEMENTS } from '../data/achievements.js';

const ICON = { gloves: '🥊', trunks: '🩳', shoes: '👟', music: '🎵', entrance: '✨', floor: '🟫' };

export class ShopScreen extends Screen {
  enter() {
    this.slot = this.slot || 'gloves';
    this.app.backdrop.set({ venue: 'training', opponent: null, mode: 'orbit' });
    this.render();
  }

  render() {
    const app = this.app;
    const d = app.save.data;
    const tabs = el('div', { class: 'row', style: 'gap:6px' }, SLOTS.map((s) => el('button', {
      class: 'btn sm ' + (this.slot === s.id ? '' : 'secondary'),
      onclick: () => { this.slot = s.id; app.audio.sfx('ui'); this.render(); },
    }, `${ICON[s.id]} ${s.name}`)));
    const grid = el('div', { class: 'shop-grid' }, itemsFor(this.slot).map((it) => {
      const owned = d.owned.includes(it.id);
      const eq = d.equipped[it.slot] === it.id;
      const ach = it.achievement ? ACHIEVEMENTS.find((a) => a.gives === it.id) : null;
      let action;
      if (eq) action = el('button', { class: 'btn sm green', disabled: true }, '착용 중');
      else if (owned) action = el('button', { class: 'btn sm blue', onclick: () => { d.equipped[it.slot] = it.id; app.save.save(); app.audio.sfx('select'); this.render(); } }, '착용');
      else if (ach) action = el('div', { class: 'small', style: 'color:#ffd23a' }, `🏅 도전 과제: ${ach.name}`);
      else action = el('button', {
        class: 'btn sm', disabled: d.coins < it.price,
        onclick: () => {
          if (d.coins < it.price) { app.audio.sfx('error'); return; }
          d.coins -= it.price;
          d.owned.push(it.id);
          d.equipped[it.slot] = it.id;
          app.audio.sfx('buy');
          app.award && app.award({ type: 'shop' });
          app.save.save();
          this.render();
        },
      }, `🪙 ${it.price}`);
      const sw = el('div', { class: 'shop-swatch', style: it.color ? `background:${it.color}` : '' }, it.pattern && it.pattern !== 'none' ? patternEmoji(it.pattern) : ICON[it.slot]);
      return el('div', { class: 'shop-item' + (eq ? ' eq' : '') }, [
        sw,
        el('div', { style: 'font-family:var(--round);font-size:17px;text-align:center' }, it.name),
        it.track ? el('button', { class: 'btn sm secondary', onclick: () => app.music && app.music.preview(it.track) }, '▶ 들어보기') : null,
        action,
      ]);
    }));
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, '상점', () => app.go('gym')),
      el('div', { class: 'panel col fade-in', style: 'width:min(980px,96vw);margin-top:70px;max-height:calc(100vh - 90px);overflow:auto' }, [
        el('div', { class: 'small', style: 'text-align:center' }, '꾸미기는 멋만 바뀌고 실력에는 영향이 없어요. 코인은 경기와 훈련, 도전 과제로 얻어요.'),
        tabs,
        grid,
      ]),
    ]));
  }

  onUi(code) {
    if (code === 'Escape') this.app.go('gym');
  }
}

function patternEmoji(p) {
  return { stripe: '〰', star: '★', flame: '🔥', bolt: '⚡', dots: '●', heart: '♥', gold: '👑', stripes: '〰', checker: '▦', stars: '★', tiger: '🐯' }[p] || '';
}

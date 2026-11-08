// 커리어 지도: 대회 단계와 상대 카드
import { el, starsText } from './dom.js';
import { Screen, topBar } from './common.js';
import { LEAGUES, getOpponent } from '../data/opponents/index.js';
import { drawPortrait } from '../render/portrait.js';
import { isUnlocked, totalStars } from '../game/career.js';
import { moveFocus } from './menu.js';

export class MapScreen extends Screen {
  enter(params = {}) {
    const app = this.app;
    const d = app.save.data;
    this.mode = params.mode || 'career';
    const isDef = this.mode === 'defense';
    const results = isDef ? d.defense.results : d.career.results;
    const nextId = ['bear', 'bolt', 'wall', 'step', 'volcano', 'fox', 'giant', 'mirror', 'storm', 'atlas'][d.career.unlocked];
    app.backdrop.set({ venue: LEAGUES.find((l) => l.ids.includes(nextId)).venue, opponent: null, mode: 'orbit' });
    const sections = LEAGUES.map((lg) => el('div', { class: 'league' }, [
      el('h3', {}, `${lg.name}`),
      el('div', { class: 'cards' }, lg.ids.map((id) => {
        const o = getOpponent(id);
        const open = isDef ? true : isUnlocked(d, id);
        const r = results[id];
        const cv = el('canvas', { width: 240, height: 240, style: 'width:100%;aspect-ratio:1;border-radius:12px;display:block' });
        drawPortrait(cv, o.look, open ? (o.look.idleExpr || 'normal') : 'normal', { bgColor: open ? '#ffe9a8' : '#555', bgColor2: open ? '#e0902a' : '#222' });
        if (!open) {
          const g = cv.getContext('2d');
          g.fillStyle = 'rgba(0,0,0,0.75)';
          g.fillRect(0, 0, 240, 240);
          g.font = '90px sans-serif';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          g.fillText('🔒', 120, 125);
        }
        const card = el('button', {
          class: 'card' + (open ? '' : ' locked') + (r && r.wins ? ' cleared' : '') + (id === nextId && !isDef ? ' next' : ''),
          onclick: () => {
            if (!open) { app.audio.sfx('error'); return; }
            app.audio.sfx('select');
            app.openOpponent(id, this.mode);
          },
          'aria-label': open ? `${o.nick} ${o.name}` : '잠긴 상대',
        }, [
          cv,
          el('div', { style: 'font-family:var(--round);font-size:15px;color:#ffd23a;margin-top:6px' }, open ? o.nick : '???'),
          el('div', { style: 'font-family:var(--title);font-size:20px' }, open ? o.name : '???'),
          starsText(r ? r.stars : 0),
        ]);
        return card;
      })),
    ]));
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, isDef ? '챔피언 방어전' : `커리어  ★${totalStars(d)}/30`, () => app.go(isDef ? 'modes' : 'gym')),
      el('div', { class: 'map scroll fade-in' }, sections),
    ]));
    setTimeout(() => { const b = this.root && (this.root.querySelector('.card.next') || this.root.querySelector('.card:not(.locked)')); b && b.focus(); }, 60);
  }

  onUi(code) {
    if (code === 'Escape') this.app.go(this.mode === 'defense' ? 'modes' : 'gym');
    if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown') moveFocus(this.root, 1);
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp') moveFocus(this.root, -1);
  }
}

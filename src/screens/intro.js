// 상대 소개 화면: 3D로 상대를 비추고, 이름·별명·키·전적·한 줄 소개·등장 대사·코치 힌트를 보여 준다.
import { el, starsText } from './dom.js';
import { Screen, topBar } from './common.js';
import { getOpponent, leagueOf } from '../data/opponents/index.js';
import { drawPortrait, COACH_LOOK } from '../render/portrait.js';
import { triesOf } from '../game/career.js';
import { CONFIG } from '../config.js';

export class IntroScreen extends Screen {
  enter({ oppId, mode = 'career' }) {
    const app = this.app;
    const d = app.save.data;
    const o = getOpponent(oppId);
    this.oppId = oppId;
    this.mode = mode;
    const lg = leagueOf(oppId);
    app.backdrop.set({ venue: lg.venue, opponent: o, mode: 'intro', floor: app.floorPattern() });
    app.music && app.music.play('intro', { track: app.entranceTrack() });
    const tries = triesOf(d, oppId);
    const hint = o.hints[Math.min(o.hints.length - 1, Math.floor(tries / 1))] || o.hints[0];
    const coach = el('canvas', { width: 160, height: 160, style: 'width:72px;height:72px;flex:none;border-radius:12px' });
    drawPortrait(coach, COACH_LOOK, 'focus');
    const r = (mode === 'defense' ? d.defense.results : d.career.results)[oppId];
    const diffSel = el('div', { class: 'row', style: 'justify-content:flex-start;gap:6px' }, Object.entries(CONFIG.difficulty).map(([k, v]) => el('button', {
      class: 'btn sm ' + (d.settings.difficulty === k ? '' : 'secondary'),
      onclick: (e) => {
        d.settings.difficulty = k;
        app.save.save();
        app.audio.sfx('ui');
        for (const b of diffSel.children) b.className = 'btn sm secondary';
        e.currentTarget.className = 'btn sm';
      },
    }, v.label)));
    const rows = [
      ['출신', o.from], ['나이', `${o.age}살`], ['키', `${o.height}cm · ${o.weight}`], ['전적', o.record],
      ['라운드', `${o.rounds || CONFIG.fight.rounds}라운드`],
    ];
    this.mount(el('div', { class: 'screen top', style: 'align-items:stretch' }, [
      topBar(app, null, () => app.go('map', { mode })),
      el('div', { class: 'intro-card panel fade-in' }, [
        el('div', { style: 'font-family:var(--round);color:#ffd23a;font-size:20px' }, `${lg.name}${mode === 'defense' ? ' · 챔피언 방어전' : ''}`),
        el('h1', { style: 'font-size:clamp(40px,7vw,72px);margin:0' }, [el('span', { style: 'font-size:0.55em;color:#fff;-webkit-text-stroke:0' }, o.nick + ' '), o.name]),
        el('div', { class: 'bubble', style: 'margin:8px 0' }, [el('span', { class: 'who' }, o.name), `“${o.intro}”`]),
        el('table', { class: 'tbl' }, rows.map(([k, v]) => el('tr', {}, [el('th', { style: 'text-align:left;width:80px' }, k), el('td', { style: 'text-align:left' }, v)]))),
        el('p', {}, o.personality),
        el('div', { class: 'row', style: 'flex-wrap:nowrap;align-items:flex-start;gap:10px' }, [
          coach,
          el('div', { class: 'bubble', style: 'flex:1;font-size:17px' }, [el('span', { class: 'who' }, `문철 할아버지의 힌트${tries ? ` (도전 ${tries + 1}번째)` : ''}`), hint]),
        ]),
        el('div', { class: 'row', style: 'justify-content:space-between' }, [
          el('div', {}, ['난이도 ', diffSel]),
          r ? el('div', {}, ['최고 ', starsText(r.stars)]) : null,
        ]),
        el('button', { class: 'btn big red', id: 'go-fight', onclick: () => this.go() }, '경기 시작! 🥊'),
      ]),
    ]));
    setTimeout(() => { const b = this.root && this.root.querySelector('#go-fight'); b && b.focus(); }, 60);
  }

  go() {
    if (this.going) return;
    this.going = true;
    this.app.audio.sfx('select');
    setTimeout(() => {
      this.going = false;
      this.app.startFight({ oppId: this.oppId, mode: this.mode, variant: this.mode === 'defense' ? 'defense' : 'normal' });
    }, 100);
  }

  onUi(code) {
    if (code === 'Escape') this.app.go('map', { mode: this.mode });
  }
}

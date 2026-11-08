// 엔딩 크레딧
import { el } from './dom.js';
import { Screen } from './common.js';
import { OPPONENTS, getOpponent } from '../data/opponents/index.js';
import { totalStars } from '../game/career.js';

export class EndingScreen extends Screen {
  enter() {
    const app = this.app;
    const d = app.save.data;
    app.backdrop.set({ venue: 'stadium', opponent: getOpponent('atlas'), mode: 'orbit' });
    app.music && app.music.play('victory');
    const lines = [
      ['🏆', '새로운 챔피언'], [d.profile.name, ''],
      ['', ''],
      ['감독·코치', '문철 할아버지'],
      ...OPPONENTS.map((o) => [`${o.nick} ${o.name}`, o.from]),
      ['', ''],
      ['만든 곳', '링의 왕 개발팀'],
      ['그림', '전부 코드로 그림 (Three.js · Canvas)'],
      ['소리와 음악', '전부 코드로 만듦 (Web Audio)'],
      ['도움', '모든 연습 상대, 샌드백, 그리고 너'],
      ['', ''],
      ['너의 기록', `별 ${totalStars(d)}개 · ${d.totals.wins}승 · KO ${d.totals.kos}번 · 반격 ${d.totals.counters}번`],
      ['', ''],
      ['다음 도전', '챔피언 방어전 · 보스 러시 · 타임 어택이 열렸어요!'],
      ['', ''],
      ['고마워요!', '읽고, 피하고, 때려라!'],
    ];
    const roll = el('div', { class: 'credits-roll' }, lines.map(([a, b]) => el('div', { class: 'credit' }, [
      el('div', { class: 'c-a' }, a), b ? el('div', { class: 'c-b' }, b) : null,
    ])));
    this.mount(el('div', { class: 'screen credits', onclick: () => this.done() }, [
      roll,
      el('button', { class: 'btn secondary sm cs-skip', onclick: (e) => { e.stopPropagation(); this.done(); } }, '건너뛰기 ▶▶'),
    ]));
    const dur = app.settings.reduceMotion ? 4000 : 26000;
    roll.style.animationDuration = dur + 'ms';
    this.timer = setTimeout(() => this.done(), dur + 800);
  }

  done() {
    clearTimeout(this.timer);
    if (this.finished) return;
    this.finished = true;
    setTimeout(() => { this.finished = false; this.app.go('menu'); }, 50);
  }

  exit() {
    clearTimeout(this.timer);
    super.exit();
  }

  onUi(code) {
    if (code === 'Escape' || code === 'Enter') this.done();
  }
}

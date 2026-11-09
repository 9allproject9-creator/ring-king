// 메인 메뉴
import { el } from './dom.js';
import { Screen, topBar } from './common.js';
import { getOpponent } from '../data/opponents/index.js';
import { totalStars } from '../game/career.js';

export class MenuScreen extends Screen {
  enter() {
    const app = this.app;
    const d = app.save.data;
    const next = getOpponent(['bear', 'bolt', 'wall', 'step', 'volcano', 'fox', 'giant', 'mirror', 'storm', 'atlas'][d.career.unlocked]);
    app.backdrop.set({ venue: 'gym', opponent: next, mode: 'orbit' });
    app.music && app.music.play('menu');
    const item = (ico, label, sub, onclick, extra = '') => el('button', { class: 'btn ' + extra, onclick: () => { app.audio.sfx('select'); onclick(); } }, [
      el('span', { class: 'ico' }, ico), label, sub ? el('span', { class: 'sub' }, sub) : null,
    ]);
    const list = [
      item('🚶', '체육관 걸어 다니기', 'WASD로 돌아다녀요', () => app.go('gym'), 'blue'),
      item('🌐', '온라인 1:1', '친구·다른 사람과 실시간 대결', () => app.go('online'), 'red'),
      item('🥊', '커리어', d.career.cleared ? '클리어! ★' + totalStars(d) : `★ ${totalStars(d)} / 30`, () => app.go('map'), 'big'),
      item('💪', '훈련 캠프', '샌드백 · 미트 · 피하기 · 줄넘기', () => app.go('training'), 'blue'),
      item('🛍️', '상점', '꾸미기', () => app.go('shop'), 'green'),
      item('🏅', '도전 과제', `${Object.keys(d.achievements).length}개 달성`, () => app.go('achievements'), 'secondary'),
      item('📊', '기록', '', () => app.go('records'), 'secondary'),
    ];
    if (d.career.cleared) {
      list.splice(1, 0, item('👑', '클리어 후 도전', '방어전 · 보스 러시 · 타임 어택', () => app.go('modes'), 'red'));
    }
    list.push(item('🎓', '튜토리얼', '조작 다시 배우기', () => app.go('tutorial'), 'secondary'));
    list.push(item('⚙️', '설정', app.save.ok ? '' : '⚠ 저장 안 됨', () => app.go('settings'), 'secondary'));
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, null, null),
      el('div', { class: 'col fade-in menu-wrap' }, [
        el('h1', { class: 'menu-logo' }, '링의 왕'),
        el('div', { class: 'menu-greet' }, `${d.profile.name} 선수, 오늘도 힘내자!`),
        el('div', { class: 'menu-list two' }, list),
      ]),
    ]));
    setTimeout(() => { const b = this.root && this.root.querySelector('.menu-list .btn'); b && b.focus(); }, 50);
  }

  onUi(code) {
    if (code === 'Escape') this.app.go('title');
    if (code === 'ArrowDown' || code === 'ArrowUp' || code === 'KeyW' || code === 'KeyS') moveFocus(this.root, code === 'ArrowDown' || code === 'KeyS' ? 1 : -1);
  }
}

export function moveFocus(root, dir) {
  if (!root) return;
  const btns = [...root.querySelectorAll('button:not([disabled])')];
  if (!btns.length) return;
  const i = btns.indexOf(document.activeElement);
  const n = btns[(i + dir + btns.length) % btns.length];
  n.focus();
}

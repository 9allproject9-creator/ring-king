// 도전 과제 화면과 기록 화면
import { el, starsText } from './dom.js';
import { Screen, topBar } from './common.js';
import { ACHIEVEMENTS } from '../data/achievements.js';
import { OPPONENTS } from '../data/opponents/index.js';
import { formatTime } from '../game/scoring.js';
import { totalStars } from '../game/career.js';

export class AchievementsScreen extends Screen {
  enter() {
    const app = this.app;
    const d = app.save.data;
    app.backdrop.set({ venue: 'gym', opponent: null, mode: 'orbit' });
    const n = Object.keys(d.achievements).length;
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, `도전 과제 ${n}/${ACHIEVEMENTS.length}`, () => app.go('gym')),
      el('div', { class: 'panel fade-in', style: 'width:min(900px,96vw);margin-top:70px;max-height:calc(100vh - 90px);overflow:auto' },
        el('div', { class: 'ach-grid' }, ACHIEVEMENTS.map((a) => {
          const got = d.achievements[a.id];
          return el('div', { class: 'ach' + (got ? ' got' : '') }, [
            el('div', { class: 'ach-ico' }, got ? '🏅' : '🔒'),
            el('div', {}, [
              el('div', { style: 'font-family:var(--round);font-size:18px' }, a.name),
              el('div', { class: 'small' }, a.desc),
              el('div', { class: 'small', style: 'color:#ffd23a' }, `🪙 ${a.reward}${a.gives ? ' + 특별 아이템' : ''}`),
            ]),
          ]);
        }))),
    ]));
  }

  onUi(code) { if (code === 'Escape') this.app.go('gym'); }
}

export class RecordsScreen extends Screen {
  enter() {
    const app = this.app;
    const d = app.save.data;
    const t = d.totals;
    app.backdrop.set({ venue: 'gym', opponent: null, mode: 'orbit' });
    const acc = t.punches ? Math.round((t.landed / t.punches) * 100) : 0;
    const rows = [
      ['경기', `${t.fights}번 (${t.wins}승, KO ${t.kos}번)`], ['커리어 별', `${totalStars(d)} / 30`],
      ['펀치', `${t.punches}번 (정확도 ${acc}%)`], ['반격', `${t.counters}번`], ['끊어치기', `${t.interrupts}번`],
      ['피하기 성공', `${t.dodges}번`], ['필살 펀치', `${t.specials}번`], ['콤보', `${t.combos}번`],
      ['한 대도 안 맞고 승리', `${t.perfectWins}번`], ['싸운 시간', formatTime(t.playMs)],
      ['샌드백 최고 콤보', `${d.records.sandbag}번`], ['미트 치기 최고점', `${d.records.mitts}점`], ['줄넘기 최고', `${d.records.rope}번`],
      ['보스 러시', d.records.bossRush ? `${d.records.bossRush.reached}명 · ${d.records.bossRush.cleared ? '완주!' : '도전 중'}` : '-'],
    ];
    const opp = el('table', { class: 'tbl' }, [
      el('tr', {}, [el('th', {}, '상대'), el('th', {}, '별'), el('th', {}, '최단 KO'), el('th', {}, '방어전 최단')]),
      ...OPPONENTS.map((o) => {
        const r = d.career.results[o.id];
        const ta = d.records.timeAttack[o.id];
        const td = d.records.timeAttack['def_' + o.id];
        return el('tr', {}, [el('td', { style: 'text-align:left' }, `${o.nick} ${o.name}`), el('td', {}, starsText(r ? r.stars : 0)), el('td', {}, ta ? formatTime(ta) : '-'), el('td', {}, td ? formatTime(td) : '-')]);
      }),
    ]);
    this.mount(el('div', { class: 'screen top' }, [
      topBar(app, '기록', () => app.go('gym')),
      el('div', { class: 'panel col fade-in', style: 'width:min(820px,96vw);margin-top:70px;max-height:calc(100vh - 90px);overflow:auto' }, [
        el('table', { class: 'tbl' }, rows.map(([k, v]) => el('tr', {}, [el('th', { style: 'text-align:left' }, k), el('td', { style: 'text-align:right' }, v)]))),
        el('h3', {}, '상대별 기록 (타임 어택)'),
        opp,
        d.lastReplay ? el('button', { class: 'btn blue', onclick: () => app.watchReplay && app.watchReplay(d.lastReplay) }, '🎬 마지막 KO 다시 보기') : null,
      ]),
    ]));
  }

  onUi(code) { if (code === 'Escape') this.app.go('gym'); }
}

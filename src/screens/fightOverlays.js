// 라운드 사이 화면, 결과 화면 (경기 캔버스 위에 DOM으로 겹침)
import { el, clear, starsText } from './dom.js';
import { summarizeFight, formatTime } from '../game/scoring.js';
import { betweenAdvice } from '../data/dialogue.js';
import { drawPortrait, COACH_LOOK } from '../render/portrait.js';

export function showBetween(root, fight, heal, onNext, opts = {}) {
  clear(root);
  root.style.pointerEvents = 'auto';
  root.classList.add('dim');
  const p = fight.player;
  const r = fight.roundStats;
  const before = p.hp;
  const after = Math.min(p.maxHp, p.hp + heal);
  const bar = el('i', { style: { width: `${before}%`, transition: 'width 1.2s ease-out' } });
  const ghost = el('i', { style: { width: `${after - before}%`, background: '#a8ffbf', transition: 'width 1.2s ease-out' } });
  const advice = betweenAdvice(fight);
  const portrait = el('canvas', { width: 180, height: 180, style: 'width:90px;height:90px;flex:none' });
  drawPortrait(portrait, COACH_LOOK, 'normal');
  const btn = el('button', { class: 'btn big', onclick: () => onNext() }, opts.nextLabel || '다음 라운드 ▶');
  root.appendChild(el('div', { class: 'panel col fade-in', style: 'width:min(560px,94vw);text-align:center' }, [
    el('h2', {}, `${fight.round}라운드 끝!`),
    el('div', { class: 'row', style: 'justify-content:space-around;font-size:18px' }, [
      el('div', {}, ['맞힌 펀치 ', el('b', { style: 'color:#ffd23a;font-size:26px' }, r.p.hits)]),
      el('div', {}, ['반격 ', el('b', { style: 'color:#7affd0;font-size:26px' }, r.p.counters)]),
      el('div', {}, ['맞은 펀치 ', el('b', { style: 'color:#ff8a8a;font-size:26px' }, r.o.hits)]),
    ]),
    el('div', { style: 'text-align:left' }, [
      el('div', { class: 'small' }, `내 체력 회복 +${Math.round(heal)}`),
      el('div', { class: 'bar', style: 'display:flex;height:20px' }, [bar, ghost]),
    ]),
    el('div', { class: 'row', style: 'flex-wrap:nowrap;align-items:flex-start;text-align:left' }, [
      portrait,
      el('div', { class: 'bubble', style: 'flex:1' }, [el('span', { class: 'who' }, '문철 할아버지'), advice]),
    ]),
    btn,
    el('div', { class: 'small' }, 'Enter 또는 공격 키로 계속'),
  ]));
  requestAnimationFrame(() => { bar.style.width = `${before}%`; ghost.style.width = `${after - before}%`; });
  setTimeout(() => btn.focus(), 50);
  return { confirm: onNext };
}

// opts: { order, variant, mode, onRetry, onNext, nextLabel, extra(nodes), replay }
export function showResult(root, fight, opts = {}) {
  clear(root);
  root.style.pointerEvents = 'auto';
  root.classList.add('dim');
  const s = opts.summary || summarizeFight(fight, opts);
  const title = s.win ? '승리!' : s.draw ? '무승부' : '패배…';
  const color = s.win ? '#ffd23a' : s.draw ? '#ffffff' : '#ff7a7a';
  const starBox = el('div', { class: 'stars', style: 'font-size:54px;letter-spacing:6px;min-height:64px' });
  const rows = [
    ['결과', `${s.method} · ${s.round}라운드`],
    ['시간', formatTime(s.timeMs)],
    ['정확도', `${Math.round(s.accuracy * 100)}%`],
    ['반격 수', `${s.counters}번`],
    ['받은 피해', `${s.damageTaken}`],
    ['난이도', { easy: '쉬움', normal: '보통', hard: '어려움' }[s.difficulty] || s.difficulty],
    ['얻은 코인', `🪙 ${s.coins}`],
  ];
  const tbl = el('table', { class: 'tbl' }, rows.map(([k, v]) => el('tr', {}, [el('th', { style: 'text-align:left' }, k), el('td', { style: 'text-align:right' }, v)])));
  const judges = s.decision ? judgeTable(s.decision) : null;
  const btns = el('div', { class: 'row' }, [
    el('button', { class: 'btn secondary', onclick: () => opts.onRetry && opts.onRetry() }, '다시 하기'),
    opts.onReplay ? el('button', { class: 'btn blue', onclick: () => opts.onReplay() }, s.win && (s.method === 'KO' || s.method === 'TKO') ? 'KO 다시 보기' : '마지막 장면 보기') : null,
    el('button', { class: 'btn big', id: 'res-next', onclick: () => opts.onNext && opts.onNext() }, opts.nextLabel || '다음으로 ▶'),
  ]);
  const hint = s.win ? null : el('div', { class: 'bubble', style: 'font-size:17px;text-align:left' }, [el('span', { class: 'who' }, '문철 할아버지'), opts.loseAdvice || '괜찮다. 패턴을 하나씩 익히면 된다. 다시 해 보자!']);
  root.appendChild(el('div', { class: 'panel col fade-in scroll', style: 'width:min(560px,94vw);max-height:94vh;text-align:center' }, [
    el('h1', { style: `font-size:64px;color:${color}` }, title),
    starBox,
    tbl,
    judges,
    opts.extra || null,
    hint,
    btns,
  ]));
  // 별 하나씩 등장
  for (let i = 0; i < 3; i++) {
    const st = el('span', { class: 'off', style: 'display:inline-block;transition:transform .25s' }, '★');
    starBox.appendChild(st);
    if (i < s.stars) {
      setTimeout(() => {
        st.className = '';
        st.style.transform = 'scale(1.4)';
        setTimeout(() => { st.style.transform = 'scale(1)'; }, 220);
        opts.audio && opts.audio.sfx('star');
      }, 400 + i * 380);
    }
  }
  setTimeout(() => { const b = root.querySelector('#res-next'); b && b.focus(); }, 60);
  return s;
}

function judgeTable(d) {
  const head = el('tr', {}, [el('th', {}, '심판'), el('th', {}, '나'), el('th', {}, '상대'), el('th', {}, '판정')]);
  const rows = d.judges.map((j) => el('tr', {}, [
    el('td', { style: 'text-align:left' }, [j.name, el('div', { class: 'small' }, j.desc)]),
    el('td', { style: j.p > j.o ? 'color:#ffd23a;font-weight:bold' : '' }, j.p),
    el('td', { style: j.o > j.p ? 'color:#ff8a8a;font-weight:bold' : '' }, j.o),
    el('td', {}, j.winner === 'player' ? '나 승' : j.winner === 'opponent' ? '상대 승' : '무'),
  ]));
  return el('div', { style: 'text-align:left' }, [
    el('h3', { style: 'margin-top:8px' }, `심판 판정 — ${d.kind}`),
    el('table', { class: 'tbl' }, [head, ...rows]),
  ]);
}

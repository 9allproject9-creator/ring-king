// 커리어 진행: 경기 결과를 저장 데이터에 반영하고, 잠금 해제와 이야기 장면을 정한다. (화면과 무관)
import { OPPONENTS } from '../data/opponents/index.js';
import { summarizeFight } from './scoring.js';

export function opponentIndex(id) {
  return OPPONENTS.findIndex((o) => o.id === id);
}

// 경기 전에 볼 이야기 장면
export function storyBefore(save, oppId) {
  const s = save.career.story;
  const map = { bear: 'prologue', step: 'beforeLeague1', giant: 'beforeLeague2', storm: 'beforeRival', atlas: 'beforeTitle' };
  const id = map[oppId];
  if (id && !s[id]) return id;
  return null;
}

// 이긴 뒤 볼 이야기 장면
export function storyAfter(save, oppId) {
  const s = save.career.story;
  const map = { wall: 'afterLeague0', fox: 'afterLeague1', storm: 'afterRival', atlas: 'ending' };
  const id = map[oppId];
  if (id && !s[id]) return id;
  return null;
}

export function markStory(save, id) {
  save.career.story[id] = true;
}

// mode: 'career' | 'defense' | 'rush' | 'timeattack' | 'free'
export function applyResult(save, fight, { oppId, mode = 'career', variant = 'normal' }) {
  const idx = opponentIndex(oppId);
  const opp = OPPONENTS[idx];
  const sum = summarizeFight(fight, { order: opp.order, variant, mode });
  const t = save.totals;
  const st = fight.stats;
  t.fights++;
  t.punches += st.thrown;
  t.landed += st.landed;
  t.counters += st.counters;
  t.dodges += st.dodges;
  t.specials += st.specials;
  t.downsDealt += st.downsDealt;
  t.interrupts += st.interrupts;
  t.combos += st.combos;
  t.playMs += fight.fightTime;
  if (sum.win) {
    t.wins++;
    if (sum.method === 'KO' || sum.method === 'TKO') t.kos++;
    if (st.hitsTaken === 0 && st.damageTaken === 0) t.perfectWins++;
  }
  save.coins += sum.coins;
  const out = { summary: sum, unlocked: null, firstWin: false, cleared: false };
  const book = mode === 'defense' ? save.defense.results : save.career.results;
  if (mode === 'career' || mode === 'defense') {
    const tries = save.career.tries;
    tries[oppId] = (tries[oppId] || 0) + 1;
    const r = book[oppId] || { stars: 0, wins: 0, bestMs: null };
    if (sum.win) {
      if (!r.wins) out.firstWin = true;
      r.wins++;
      r.stars = Math.max(r.stars, sum.stars);
      if (r.bestMs === null || sum.timeMs < r.bestMs) r.bestMs = Math.round(sum.timeMs);
      tries[oppId] = 0;
    }
    book[oppId] = r;
    if (mode === 'career' && sum.win && idx + 1 > save.career.unlocked && idx + 1 <= OPPONENTS.length) {
      save.career.unlocked = Math.min(OPPONENTS.length - 1, idx + 1);
      if (idx + 1 < OPPONENTS.length) out.unlocked = OPPONENTS[idx + 1].id;
    }
    if (mode === 'career' && sum.win && oppId === 'atlas' && !save.career.cleared) {
      save.career.cleared = true;
      save.defense.unlocked = true;
      out.cleared = true;
    }
  }
  if (sum.win && (sum.method === 'KO' || sum.method === 'TKO')) {
    const ta = save.records.timeAttack;
    const ms = Math.round(sum.timeMs);
    const key = (mode === 'defense' ? 'def_' : '') + oppId;
    if (!ta[key] || ms < ta[key]) {
      ta[key] = ms;
      out.newRecord = true;
    }
  }
  return out;
}

export function triesOf(save, oppId) {
  return save.career.tries[oppId] || 0;
}

export function isUnlocked(save, oppId) {
  return opponentIndex(oppId) <= save.career.unlocked;
}

export function totalStars(save) {
  return Object.values(save.career.results).reduce((s, r) => s + (r.stars || 0), 0);
}

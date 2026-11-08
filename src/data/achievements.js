// 도전 과제 (34개). check(save, ev): ev = { type:'fight'|'training'|'shop'|'any', fight, out, ctx, ... }
import { OPPONENTS } from './opponents/index.js';

const won = (ev) => ev.type === 'fight' && ev.out && ev.out.summary.win;
const ko = (ev) => won(ev) && (ev.out.summary.method === 'KO' || ev.out.summary.method === 'TKO');
const careerStars = (s) => Object.values(s.career.results).reduce((a, r) => a + (r.stars || 0), 0);
const beat = (s, id) => !!(s.career.results[id] && s.career.results[id].wins);

export const ACHIEVEMENTS = [
  // 커리어
  { id: 'first_win', name: '첫 승리', desc: '처음으로 경기에서 이기기', reward: 20, check: (s, ev) => won(ev) },
  { id: 'league0', name: '동네 챔피언', desc: '동네 리그 우승', reward: 50, check: (s) => beat(s, 'wall') },
  { id: 'league1', name: '전국 챔피언', desc: '전국 대회 우승', reward: 80, check: (s) => beat(s, 'fox') },
  { id: 'rival', name: '라이벌을 넘어서', desc: '폭풍 카이 이기기', reward: 100, check: (s) => beat(s, 'storm') },
  { id: 'champion', name: '링의 왕', desc: '챔피언 아틀라스 강을 이기고 챔피언 되기', reward: 200, check: (s) => s.career.cleared, gives: 'gloves_gold' },
  { id: 'title_match', name: '5라운드 전사', desc: '타이틀전에서 5라운드까지 버티기', reward: 50, check: (s, ev) => ev.type === 'fight' && ev.ctx && ev.ctx.oppId === 'atlas' && ev.fight.round >= 5, gives: 'music_epic' },
  { id: 'stars_15', name: '별 수집가', desc: '커리어 별 15개 모으기', reward: 60, check: (s) => careerStars(s) >= 15 },
  { id: 'all_three_stars', name: '완벽주의자', desc: '모든 상대에게 별 3개', reward: 300, check: (s) => OPPONENTS.every((o) => (s.career.results[o.id] || {}).stars >= 3), gives: 'gloves_rainbow' },
  // 경기 기술
  { id: 'no_damage', name: '한 대도 안 맞았다', desc: '한 대도 안 맞고 이기기', reward: 80, check: (s, ev) => won(ev) && ev.fight.stats.damageTaken === 0, gives: 'trunks_tiger' },
  { id: 'counter_ko', name: '카운터 KO', desc: '반격(헛방 뒤 첫 타·끊어치기)으로 KO', reward: 60, check: (s, ev) => ko(ev) && (ev.out.summary.lastKind === 'counter' || ev.out.summary.lastKind === 'interrupt') },
  { id: 'special3_ko', name: '별 세 개 필살', desc: '별 3개 필살 펀치로 KO', reward: 80, check: (s, ev) => ko(ev) && ev.out.summary.lastPunch === 'special' && ev.fight.lastPlayerHit && ev.fight.lastPlayerHit.punch === 'special' && ev.fight.player.specialStars === 3 },
  { id: 'upper_ko', name: '하늘 높이', desc: '어퍼컷으로 KO', reward: 40, check: (s, ev) => ko(ev) && ev.out.summary.lastPunch === 'upper' },
  { id: 'jab_ko', name: '잽 한 방', desc: '잽으로 KO', reward: 60, check: (s, ev) => ko(ev) && ev.out.summary.lastPunch === 'jab' },
  { id: 'interrupt_5', name: '끊어치기 장인', desc: '한 경기에서 끊어치기 3번', reward: 60, check: (s, ev) => ev.type === 'fight' && ev.fight.stats.interrupts >= 3 },
  { id: 'counter_master', name: '반격의 달인', desc: '한 경기에서 반격 15번', reward: 80, check: (s, ev) => ev.type === 'fight' && ev.fight.stats.counters >= 15, gives: 'entrance_stars' },
  { id: 'dodge_20', name: '바람처럼', desc: '한 경기에서 20번 피하기', reward: 50, check: (s, ev) => ev.type === 'fight' && ev.fight.stats.dodges >= 20 },
  { id: 'feint_read', name: '여우보다 영리하게', desc: '한 경기에서 페인트 5번 안 속기', reward: 60, check: (s, ev) => ev.type === 'fight' && ev.fight.stats.feintsRead >= 5 },
  { id: 'clinch_escape', name: '탈출 성공', desc: '붙잡기에서 빠져나오기', reward: 30, check: (s, ev) => ev.type === 'fight' && ev.fight.stats.clinchEscapes >= 1 },
  { id: 'comeback', name: '기적의 역전', desc: '다운당한 뒤 KO로 이기기', reward: 70, check: (s, ev) => ko(ev) && ev.fight.stats.downsTaken >= 1 },
  { id: 'fast_ko', name: '번개 KO', desc: '1라운드 안에 KO', reward: 50, check: (s, ev) => ko(ev) && ev.fight.round === 1 },
  { id: 'decision_win', name: '판정승', desc: '심판 판정으로 이기기', reward: 30, check: (s, ev) => won(ev) && ev.out.summary.decision },
  { id: 'hard_win', name: '어려움도 문제없어', desc: '어려움 난이도로 이기기', reward: 60, check: (s, ev) => won(ev) && ev.fight.difficulty === 'hard' },
  { id: 'combo_10', name: '콤보 마스터', desc: '한 경기에서 콤보 10번', reward: 50, check: (s, ev) => ev.type === 'fight' && ev.fight.stats.combos >= 10 },
  // 누적
  { id: 'ko_10', name: 'KO 10번', desc: 'KO로 10번 이기기', reward: 80, check: (s) => s.totals.kos >= 10, gives: 'floor_tiger' },
  { id: 'punch_1000', name: '천 번의 주먹', desc: '펀치 1000번 날리기', reward: 60, check: (s) => s.totals.punches >= 1000 },
  { id: 'counter_100', name: '반격 100번', desc: '반격 누적 100번', reward: 80, check: (s) => s.totals.counters >= 100 },
  { id: 'wins_20', name: '20승', desc: '20번 이기기', reward: 80, check: (s) => s.totals.wins >= 20 },
  // 훈련
  { id: 'sandbag_combo', name: '샌드백 콤보', desc: '샌드백 훈련에서 콤보 15번', reward: 40, check: (s) => s.records.sandbag >= 15 },
  { id: 'mitts_good', name: '리듬 복서', desc: '미트 치기 3000점', reward: 50, check: (s) => s.records.mitts >= 3000 },
  { id: 'rope_50', name: '줄넘기 50번', desc: '줄넘기 연속 50번', reward: 40, check: (s) => s.records.rope >= 50 },
  { id: 'drill_perfect', name: '눈이 좋다', desc: '피하기 훈련에서 12번 중 12번 성공', reward: 60, check: (s) => Object.values(s.records.dodgeDrill || {}).some((v) => v >= 12) },
  // 상점·클리어 후
  { id: 'shopper', name: '멋쟁이', desc: '상점에서 처음 물건 사기', reward: 20, check: (s) => s.owned.length > 7 },
  { id: 'defense_1', name: '첫 방어 성공', desc: '챔피언 방어전에서 1번 이기기', reward: 80, check: (s) => Object.values(s.defense.results).some((r) => r.wins) },
  { id: 'boss_rush', name: '쉬지 않는 챔피언', desc: '보스 러시 끝까지 이기기', reward: 200, check: (s) => s.records.bossRush && s.records.bossRush.cleared, gives: 'shoes_gold' },
  { id: 'time_attack', name: '시간 도둑', desc: '아무 상대나 60초 안에 KO', reward: 60, check: (s) => Object.values(s.records.timeAttack).some((ms) => ms <= 60000) },
];

// 새로 달성한 것들을 기록하고 돌려준다
export function checkAchievements(save, ev = { type: 'any' }) {
  const got = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements[a.id]) continue;
    let ok = false;
    try { ok = !!a.check(save, ev); } catch (e) { ok = false; }
    if (ok) {
      save.achievements[a.id] = Date.now();
      save.coins += a.reward || 0;
      if (a.gives && !save.owned.includes(a.gives)) save.owned.push(a.gives);
      got.push(a);
    }
  }
  return got;
}

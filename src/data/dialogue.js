// 코치(문철 할아버지) 대사와 컷신. 대사는 짧고 쉽게.
export const COACH_NAME = '문철 할아버지';

const GENERIC_BETWEEN = [
  '숨 크게 쉬어. 상대 어깨만 봐라. 어깨가 먼저 움직인다.',
  '피한 다음이 진짜다. 비틀거릴 때 몰아쳐!',
  '같은 펀치만 쓰면 읽힌다. 섞어서 쳐라.',
  '힘이 빠지면 잠깐 쉬어도 된다. 가만히 있으면 숨이 돌아온다.',
];

export function betweenAdvice(fight) {
  const s = fight.stats;
  const r = fight.roundStats;
  const d = fight.oppData;
  const pool = [];
  if (r.o.hits >= 4) pool.push('너무 많이 맞았다! 상대가 팔을 젖히는 쪽을 보고 반대로 몸을 빼라.');
  if (r.p.counters === 0) pool.push('피하고 나서 바로 때려야 별을 얻는다. 헛방 칠 때가 기회야.');
  if (fight.player.stars > 0) pool.push(`별이 ${fight.player.stars}개 있다. 상대가 헛방 칠 때 필살 펀치를 꽂아!`);
  if (s.blocked > s.landed && s.blocked > 4) pool.push('가드 위만 때리고 있다. 상대가 공격한 직후나 지쳤을 때 쳐라.');
  if (s.feintsFooled > 0) pool.push('속았지? 진짜 공격은 눈이 번쩍 빛난다. 눈을 봐!');
  if (fight.player.hp < 35) pool.push('체력이 얼마 없다. 무리하지 말고 확실할 때만 쳐라.');
  if (d.coachBetween) pool.push(...d.coachBetween);
  if (!pool.length) pool.push(...GENERIC_BETWEEN);
  // 결정성 필요 없음(화면 전용) → 라운드 번호로 고른다
  return pool[(fight.round * 7 + s.thrown) % pool.length];
}

export function loseAdvice(oppData, tries = 1) {
  const h = oppData.hints || [];
  if (!h.length) return '괜찮다. 다시 해 보자.';
  return `${['괜찮다, 원래 처음엔 다 진다.', '한 번 더! 넌 점점 나아지고 있어.', '포기하지 마라. 거의 다 왔다.'][Math.min(2, tries - 1)]} ${h[(tries - 1) % h.length]}`;
}

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

// 컷신: { who, expr, text }. who = 'coach' | 'player' | 'kai' | 상대 id. {name} = 주인공 이름
export const STORY = {
  prologue: {
    venue: 'gym',
    lines: [
      { who: 'coach', expr: 'normal', text: '어이, 거기 꼬마. 매일 체육관 창문으로 구경만 하더구나.' },
      { who: 'player', expr: 'surprised', text: '어… 들켰다!' },
      { who: 'coach', expr: 'normal', text: '나는 문철. 옛날엔 챔피언이었지. 지금은 그냥 잔소리 많은 할아버지고.' },
      { who: 'coach', expr: 'smug', text: '복싱은 힘이 아니다. 읽고, 피하고, 때리는 거다. 해 볼 테냐?' },
      { who: 'player', expr: 'happy', text: '네! 저 {name}, 꼭 챔피언이 될 거예요!' },
      { who: 'coach', expr: 'happy', text: '하하! 좋다. 첫 상대는 우리 동네 체육관 관장 아들, 박두만이다.' },
    ],
  },
  afterLeague0: {
    venue: 'gym',
    lines: [
      { who: 'coach', expr: 'happy', text: '동네 리그 우승이다! 잘했다, {name}!' },
      { who: 'kai', expr: 'smug', text: '흥, 동네 리그 따위로 신났네?' },
      { who: 'player', expr: 'surprised', text: '누, 누구세요?' },
      { who: 'kai', expr: 'grin', text: '폭풍 카이. 25전 25승. 언젠가 챔피언 될 사람이지.' },
      { who: 'kai', expr: 'smug', text: '전국 대회에서 보자. 거기까지 올라올 수 있다면 말이야.' },
      { who: 'coach', expr: 'normal', text: '…자식, 말은 잘하는군. 신경 쓰지 마라. 우리는 우리 길을 간다.' },
    ],
  },
  beforeLeague1: {
    venue: 'national',
    lines: [
      { who: 'coach', expr: 'normal', text: '여기가 전국 대회다. 관중도 많고, 상대도 훨씬 똑똑하다.' },
      { who: 'coach', expr: 'focus', text: '이제부턴 위치를 바꾸고, 화를 내고, 속이는 녀석들이 나온다.' },
      { who: 'player', expr: 'happy', text: '그래도 텔은 있잖아요! 잘 보면 돼요!' },
      { who: 'coach', expr: 'happy', text: '그렇지. 이제 좀 복서 같구나.' },
    ],
  },
  afterLeague1: {
    venue: 'national',
    lines: [
      { who: 'kai', expr: 'surprised', text: '…진짜 우승했어? 나나미까지 이기고?' },
      { who: 'player', expr: 'grin', text: '눈을 봤거든! 진짜는 반짝, 가짜는 히죽!' },
      { who: 'kai', expr: 'smug', text: '쳇, 운이 좋았네. 월드 그랑프리는 차원이 달라.' },
      { who: 'kai', expr: 'grin', text: '결승에서 기다린다. 도망치지 마라, {name}!' },
    ],
  },
  beforeLeague2: {
    venue: 'world',
    lines: [
      { who: 'coach', expr: 'surprised', text: '허허, 월드 그랑프리라니. 내 제자가 여기까지 오다니.' },
      { who: 'coach', expr: 'focus', text: '여기는 한 방이 센 거인, 네 버릇을 읽는 천재가 있다.' },
      { who: 'coach', expr: 'normal', text: '네가 늘 같은 쪽으로만 피하면 들킨다. 섞어서 피해라.' },
      { who: 'player', expr: 'happy', text: '알겠어요! 왼쪽, 오른쪽, 숙이기 골고루!' },
    ],
  },
  beforeRival: {
    venue: 'world',
    lines: [
      { who: 'kai', expr: 'grin', text: '드디어 왔구나. 사실… 너 경기 다 봤어.' },
      { who: 'kai', expr: 'focus', text: '그래서 알아. 넌 강해. 그래서 더 이기고 싶어.' },
      { who: 'player', expr: 'focus', text: '나도 너랑 제대로 붙어 보고 싶었어!' },
      { who: 'coach', expr: 'normal', text: '카이는 지금까지 상대들의 기술을 전부 쓴다. 배운 걸 다 꺼내라.' },
    ],
  },
  afterRival: {
    venue: 'world',
    lines: [
      { who: 'kai', expr: 'hurt', text: '…졌다. 깔끔하게 졌어.' },
      { who: 'kai', expr: 'grin', text: '야, {name}. 챔피언 아틀라스… 그 사람 진짜 괴물이야. 꼭 이겨라.' },
      { who: 'player', expr: 'happy', text: '응! 다음엔 또 붙자, 카이!' },
      { who: 'kai', expr: 'smug', text: '당연하지. 다음엔 내가 이긴다!' },
    ],
  },
  beforeTitle: {
    venue: 'stadium',
    lines: [
      { who: 'atlas', expr: 'smug', text: '네가 그 소문의 꼬마구나. 좋은 눈을 가졌다고 들었다.' },
      { who: 'atlas', expr: 'grin', text: '5라운드다. 내 세 가지 얼굴을 다 보고도 서 있을 수 있을까?' },
      { who: 'coach', expr: 'focus', text: '{name}. 처음엔 교과서 복서, 다음엔 싸움꾼, 마지막엔… 전부다.' },
      { who: 'coach', expr: 'happy', text: '그래도 텔은 반드시 있다. 넌 할 수 있다.' },
    ],
  },
  ending: {
    venue: 'stadium',
    lines: [
      { who: 'atlas', expr: 'happy', text: '하하하! 최고의 경기였다! 이 벨트는 이제 네 거다, 챔피언!' },
      { who: 'player', expr: 'happy', text: '제… 제가 챔피언이라니!' },
      { who: 'kai', expr: 'grin', text: '축하한다, {name}. 하지만 그 벨트, 금방 뺏으러 간다!' },
      { who: 'coach', expr: 'happy', text: '…잘했다. 정말 잘했다. 넌 내 자랑이다.' },
      { who: 'coach', expr: 'smug', text: '자, 이제 챔피언 방어전이다. 다들 더 강해져서 돌아올 거다!' },
    ],
  },
};

export function loseAdvice(oppData, tries = 1) {
  const h = oppData.hints || [];
  if (!h.length) return '괜찮다. 다시 해 보자.';
  return `${['괜찮다, 원래 처음엔 다 진다.', '한 번 더! 넌 점점 나아지고 있어.', '포기하지 마라. 거의 다 왔다.'][Math.min(2, tries - 1)]} ${h[(tries - 1) % h.length]}`;
}

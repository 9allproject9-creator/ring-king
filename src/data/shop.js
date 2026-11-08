// 상점·꾸미기. 모두 능력치에 영향 없음. 현금 결제·광고·뽑기 없음. 일부는 도전 과제로만 얻는다.
export const SLOTS = [
  { id: 'gloves', name: '장갑' },
  { id: 'trunks', name: '트렁크' },
  { id: 'shoes', name: '신발' },
  { id: 'music', name: '입장 음악' },
  { id: 'entrance', name: '입장 연출' },
  { id: 'floor', name: '링 바닥' },
];

export const ITEMS = [
  // 장갑 (색 + 무늬)
  { id: 'gloves_blue', slot: 'gloves', name: '기본 파랑 장갑', price: 0, color: '#2f7de1' },
  { id: 'gloves_red', slot: 'gloves', name: '불꽃 빨강 장갑', price: 80, color: '#e0352f' },
  { id: 'gloves_green', slot: 'gloves', name: '새싹 초록 장갑', price: 80, color: '#2fb556' },
  { id: 'gloves_black', slot: 'gloves', name: '밤하늘 검정 장갑', price: 120, color: '#24242c' },
  { id: 'gloves_pink', slot: 'gloves', name: '딸기 분홍 장갑', price: 120, color: '#ff6fa8' },
  { id: 'gloves_stripe', slot: 'gloves', name: '줄무늬 장갑', price: 200, color: '#2f7de1', pattern: 'stripe' },
  { id: 'gloves_star', slot: 'gloves', name: '별무늬 장갑', price: 260, color: '#5a3ad0', pattern: 'star' },
  { id: 'gloves_flame', slot: 'gloves', name: '불꽃무늬 장갑', price: 320, color: '#c8201a', pattern: 'flame' },
  { id: 'gloves_bolt', slot: 'gloves', name: '번개무늬 장갑', price: 320, color: '#1a1a2a', pattern: 'bolt' },
  { id: 'gloves_dots', slot: 'gloves', name: '물방울 장갑', price: 240, color: '#3ab8e0', pattern: 'dots' },
  { id: 'gloves_heart', slot: 'gloves', name: '하트 장갑', price: 240, color: '#ffffff', pattern: 'heart' },
  { id: 'gloves_gold', slot: 'gloves', name: '챔피언 황금 장갑', price: 0, color: '#e8b820', pattern: 'gold', achievement: 'champion' },
  { id: 'gloves_rainbow', slot: 'gloves', name: '무지개 장갑', price: 0, color: '#ff8a1a', pattern: 'star', achievement: 'all_three_stars' },
  // 트렁크 (경기 결과 화면·초상화에 보임)
  { id: 'trunks_white', slot: 'trunks', name: '기본 흰 트렁크', price: 0, color: '#e8e8e8' },
  { id: 'trunks_red', slot: 'trunks', name: '빨강 트렁크', price: 60, color: '#d8352f' },
  { id: 'trunks_blue', slot: 'trunks', name: '파랑 트렁크', price: 60, color: '#2f5fc4' },
  { id: 'trunks_gold', slot: 'trunks', name: '금빛 트렁크', price: 220, color: '#e8b820' },
  { id: 'trunks_tiger', slot: 'trunks', name: '호랑이 트렁크', price: 0, color: '#ff9a1a', achievement: 'no_damage' },
  // 신발
  { id: 'shoes_black', slot: 'shoes', name: '기본 검정 신발', price: 0, color: '#222228' },
  { id: 'shoes_white', slot: 'shoes', name: '하얀 신발', price: 50, color: '#f4f4f4' },
  { id: 'shoes_red', slot: 'shoes', name: '빨간 신발', price: 70, color: '#d8352f' },
  { id: 'shoes_gold', slot: 'shoes', name: '황금 신발', price: 0, color: '#e8b820', achievement: 'boss_rush' },
  // 입장 음악 (경기 시작 전 소개 화면에서 나옴)
  { id: 'music_basic', slot: 'music', name: '기본 행진곡', price: 0, track: 'march' },
  { id: 'music_rock', slot: 'music', name: '불타는 록', price: 150, track: 'rock' },
  { id: 'music_funk', slot: 'music', name: '신나는 펑크', price: 150, track: 'funk' },
  { id: 'music_epic', slot: 'music', name: '웅장한 행진', price: 0, track: 'epic', achievement: 'title_match' },
  // 입장 연출
  { id: 'entrance_basic', slot: 'entrance', name: '기본 입장', price: 0, fx: 'none' },
  { id: 'entrance_confetti', slot: 'entrance', name: '꽃가루 입장', price: 180, fx: 'confetti' },
  { id: 'entrance_fire', slot: 'entrance', name: '불꽃 입장', price: 260, fx: 'fire' },
  { id: 'entrance_stars', slot: 'entrance', name: '별빛 입장', price: 0, fx: 'stars', achievement: 'counter_master' },
  // 링 바닥 무늬
  { id: 'floor_none', slot: 'floor', name: '기본 바닥', price: 0, pattern: 'none' },
  { id: 'floor_stripes', slot: 'floor', name: '줄무늬 바닥', price: 100, pattern: 'stripes' },
  { id: 'floor_checker', slot: 'floor', name: '체크무늬 바닥', price: 120, pattern: 'checker' },
  { id: 'floor_stars', slot: 'floor', name: '별무늬 바닥', price: 160, pattern: 'stars' },
  { id: 'floor_flame', slot: 'floor', name: '불꽃 바닥', price: 200, pattern: 'flame' },
  { id: 'floor_tiger', slot: 'floor', name: '호랑이 바닥', price: 0, pattern: 'tiger', achievement: 'ko_10' },
];

export function getItem(id) {
  return ITEMS.find((i) => i.id === id);
}

export function itemsFor(slot) {
  return ITEMS.filter((i) => i.slot === slot);
}

export const SKIN_TONES = ['#f6d7bc', '#f0c8a0', '#e0a878', '#c98a5e', '#9a6440', '#6e4428'];
export const HAIR_STYLES = [
  { id: 'short', name: '짧은 머리', style: 'slick' },
  { id: 'spiky', name: '뾰족 머리', style: 'spiky' },
  { id: 'buzz', name: '까까머리', style: 'buzz' },
  { id: 'ponytail', name: '묶은 머리', style: 'ponytail' },
  { id: 'bob', name: '단발', style: 'bob' },
  { id: 'curly', name: '곱슬 머리', style: 'curly' },
];
export const HAIR_COLORS = ['#2a1a12', '#5a3a1a', '#c88a3a', '#e23b3b', '#3a6ad8', '#f4f4f4'];

// 콤보 목록. 펀치를 comboWindowMs 안에 이어 누르면 마지막 펀치에 보너스 피해.
export const COMBOS = [
  { id: 'onetwo', name: '원투', seq: ['jab', 'straight'], tip: '잽 → 스트레이트. 가장 기본!' },
  { id: 'revtwo', name: '역원투', seq: ['straight', 'jab'], tip: '스트레이트 → 잽. 빠르게 마무리.' },
  { id: 'jjs', name: '잽잽 스트레이트', seq: ['jab', 'jab', 'straight'], tip: '잽 두 번으로 흔들고 스트레이트!' },
  { id: 'su', name: '스트레이트 어퍼', seq: ['straight', 'upper'], tip: '스트레이트로 열고 어퍼컷.' },
  { id: 'jju', name: '잽잽 어퍼', seq: ['jab', 'jab', 'upper'], tip: '빠른 잽 두 번 뒤 어퍼컷.' },
  { id: 'onetwoup', name: '원투 어퍼', seq: ['jab', 'straight', 'upper'], tip: '원투에 어퍼컷까지! 비틀거릴 때 최고.' },
  { id: 'storm', name: '폭풍 연타', seq: ['jab', 'straight', 'jab', 'straight'], tip: '원투 원투! 손이 빨라야 한다.' },
];

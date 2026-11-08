// 한 프레임의 "행동 입력"을 숫자 하나(비트)로 표현한다.
// 키보드·패드·터치·봇·리플레이·(나중의) 온라인 모두 이 형식만 주고받는다.
export const IN = {
  JAB: 1,
  STRAIGHT: 2,
  UPPER: 4,
  DODGE_L: 8,
  DODGE_R: 16,
  DUCK: 32,
  GUARD: 64, // 누르고 있는 상태
  SPECIAL: 128,
};

export const PRESS_MASK = IN.JAB | IN.STRAIGHT | IN.UPPER | IN.DODGE_L | IN.DODGE_R | IN.DUCK | IN.SPECIAL;
export const MASH_MASK = IN.JAB | IN.STRAIGHT | IN.UPPER | IN.SPECIAL;

// 동시에 눌렸을 때 우선순위: 방어 행동 먼저.
export const ACTION_ORDER = [
  ['dodgeL', IN.DODGE_L],
  ['dodgeR', IN.DODGE_R],
  ['duck', IN.DUCK],
  ['special', IN.SPECIAL],
  ['upper', IN.UPPER],
  ['straight', IN.STRAIGHT],
  ['jab', IN.JAB],
];

export function firstAction(bits) {
  for (const [name, bit] of ACTION_ORDER) if (bits & bit) return name;
  return null;
}

export const ACTION_BIT = Object.fromEntries(ACTION_ORDER);

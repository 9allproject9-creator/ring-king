// 모든 기본 수치. 시간 단위는 ms. 상대 데이터(src/data/opponents)에서 덮어쓸 수 있다.
export const DT = 1000 / 60;

export const CONFIG = {
  player: {
    maxHp: 100,
    maxStamina: 100,
    maxGuard: 100,
    punches: {
      jab: { startup: 80, active: 50, recovery: 150, damage: 3, stamina: 4, hitstop: 40, guardDrainMul: 1 },
      straight: { startup: 160, active: 60, recovery: 250, damage: 6, stamina: 8, hitstop: 60, guardDrainMul: 2.6 },
      upper: { startup: 220, active: 70, recovery: 380, damage: 10, stamina: 14, hitstop: 90, guardDrainMul: 1, staggerMul: 2, extraBlock: 0.3 },
      special: { startup: 300, active: 80, recovery: 500, damageByStars: [0, 15, 30, 45], stamina: 0, hitstop: 150 },
    },
    dodges: {
      L: { invulnStart: 60, invulnEnd: 320, recovery: 200, stamina: 2 },
      R: { invulnStart: 60, invulnEnd: 320, recovery: 200, stamina: 2 },
      duck: { invulnStart: 60, invulnEnd: 360, recovery: 220, stamina: 2 },
    },
    // 피하기에 성공하면 남은 피하기 동작을 이만큼으로 줄여 바로 반격할 수 있게 한다.
    dodgeSuccessReturnMs: 150,
    guard: { releaseMs: 80, reduction: 0.75, drainMul: 3, regenPerSec: 14 },
    stamina: { whiffMul: 1.5, windedMs: 1200, windedRecoverTo: 40, regenIdlePerSec: 22, regenBusyPerSec: 6, dodgeSuccessBonus: 8 },
    hurtMs: 300,
    blockStunMs: 110,
    guardBreakMs: 800,
    inputBufferMs: 120,
    comboWindowMs: 650,
    comboBonus: 0.2,
    monotonyStart: 3,
    monotonyBlockPerRepeat: 0.2,
    roundHealRatio: 0.3,
    getup: { baseRequired: 14, perDown: 7, decayPerSec: 3, healByDown: [45, 35, 25, 20], mashValue: 1 },
    clinch: { mashRequired: 10, timeMs: 2600 },
    // 링 안에서 움직이기
    move: {
      backSpeed: 1.1, // m/s 물러나기
      fwdSpeed: 1.6, // m/s 다가가기
      sideSpeed: 1.2, // m/s 옆걸음(상대 주위 돌기)
      maxGap: 2.4, // 가장 멀리 떨어질 수 있는 거리(기본 거리 위로)
      baseDist: 1.62, // 서로 주먹이 닿는 기본 거리(m)
      ringHalf: 3.85, // 링 안에서 설 수 있는 반 폭(m, 로프 안쪽)
      punchRange: 0.35, // 이보다 멀면 내 펀치가 안 닿음
      attackRange: 0.45, // 이보다 멀면 상대 공격이 안 닿음(헛방 보상은 없음)
      oppCloseSpeed: 0.8, // 상대가 걸어서 따라오는 속도(물러나는 동안에도)
      staminaPerSec: 6, // 물러날 때 스태미나
    },
  },
  combat: {
    staggerMul: 1.5,
    counterDamageMul: 2.2,
    counterWindowMs: 150,
    counterStunMs: 1000,
    starMax: 3,
    playerHitstopBase: 50,
  },
  fight: {
    roundMs: 90000,
    rounds: 3,
    titleRounds: 5,
    introMs: 1600,
    roundOverMs: 1800,
    downFallMs: 900,
    countIntervalMs: 1000,
    tkoDowns: 3,
    koCount: 10,
    getupAnimMs: 900,
  },
  opponentDefaults: {
    maxHp: 100,
    hpScale: 3.2, // 균형 조정: 상대 데이터의 체력에 곱함 (BALANCE.md 참고)
    tellScale: 1, // 상대별 텔 배율(난이도 곡선용)
    guardGauge: 60,
    guardRegenPerSec: 8,
    idleBlock: 0.4,
    guardReroll: [500, 900],
    hurtMs: 320,
    maxHitsInRow: 3,
    blockStanceMs: 700,
    rest: [900, 1500],
    restAfterHurt: [350, 650],
    chainGap: [140, 240],
    minTellMs: 260,
    fatigue: { perAttack: 7, threshold: 100, tiredMs: 1800, recoverPerSec: 3 },
    getUp: { chance: [1, 0.85, 0.5], countAt: [4, 7], heal: [0.45, 0.33, 0.22] },
    roundHeal: 0.25,
    taunt: null,
    step: null,
    blockCounter: { after: 3, attack: null }, // 가드 위를 3번 치면 받아친다 (attack 없으면 punish 공격)
    feintPunish: null,
    phaseChangeMs: 1700,
    damageMul: 1,
  },
  difficulty: {
    easy: { label: '쉬움', tellScale: 1.4, dmgTaken: 0.7, counterWindow: 1.4, mashMul: 0.7 },
    normal: { label: '보통', tellScale: 1, dmgTaken: 1, counterWindow: 1, mashMul: 1 },
    hard: { label: '어려움', tellScale: 0.85, dmgTaken: 1, counterWindow: 1, mashMul: 1.15 },
  },
  // 챔피언 방어전(클리어 후) 강화
  defenseVariant: { tellScale: 0.82, hpMul: 1.15, damageMul: 1.1 },
};

export function mergeDeep(base, over) {
  if (over === undefined || over === null) return base;
  if (typeof base !== 'object' || base === null || Array.isArray(base)) return over;
  const out = { ...base };
  for (const k of Object.keys(over)) {
    const b = base[k];
    const o = over[k];
    out[k] = (b && typeof b === 'object' && !Array.isArray(b) && o && typeof o === 'object' && !Array.isArray(o)) ? mergeDeep(b, o) : o;
  }
  return out;
}

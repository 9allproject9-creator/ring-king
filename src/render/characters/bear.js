// 박두만 전용 동작: 배 두드리기 도발
export const BEAR_ANIMS = {
  taunt: {
    loop: true,
    keys: [
      { t: 0, glx: 0.35, gly: -0.35, glz: 1.05, grx: -0.35, gry: -0.35, grz: 1.05, hrot: 0.1, expr: 'happy', y: 0 },
      { t: 0.25, glx: 0.25, gly: -0.25, grx: -0.42, gry: -0.42, y: 4 },
      { t: 0.5, glx: 0.42, gly: -0.42, grx: -0.25, gry: -0.25, hrot: -0.1, y: 0 },
      { t: 0.75, glx: 0.25, gly: -0.25, grx: -0.42, gry: -0.42, y: 4 },
      { t: 1, glx: 0.35, gly: -0.35, grx: -0.35, gry: -0.35, hrot: 0.1, y: 0 },
    ],
  },
};

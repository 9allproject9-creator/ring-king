import bear from './01_bear.js';
import bolt from './02_bolt.js';
import wall from './03_wall.js';
import step from './04_step.js';
import volcano from './05_volcano.js';
import fox from './06_fox.js';
import giant from './07_giant.js';
import mirror from './08_mirror.js';
import storm from './09_storm.js';
import atlas from './10_atlas.js';

export const OPPONENTS = [bear, bolt, wall, step, volcano, fox, giant, mirror, storm, atlas];

export const LEAGUES = [
  { id: 0, name: '동네 리그', venue: 'gym', ids: ['bear', 'bolt', 'wall'] },
  { id: 1, name: '전국 대회', venue: 'national', ids: ['step', 'volcano', 'fox'] },
  { id: 2, name: '월드 그랑프리', venue: 'world', ids: ['giant', 'mirror', 'storm'] },
  { id: 3, name: '타이틀전', venue: 'stadium', ids: ['atlas'] },
];

export function getOpponent(id) {
  return OPPONENTS.find((o) => o.id === id);
}

export function leagueOf(id) {
  return LEAGUES.find((l) => l.ids.includes(id));
}

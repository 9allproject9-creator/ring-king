import bear from './01_bear.js';

export const OPPONENTS = [bear];

export function getOpponent(id) {
  return OPPONENTS.find((o) => o.id === id);
}

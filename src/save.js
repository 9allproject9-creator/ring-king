// 저장: localStorage. 버전 번호 + 마이그레이션. 저장이 안 돼도(사생활 보호 모드 등) 게임은 메모리로 계속 돈다.
export const SAVE_KEY = 'ringKing.save';
export const SAVE_VERSION = 4;

export function defaultSave() {
  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    profile: { name: '', skin: '#f0c8a0', hair: 'short', hairColor: '#2a1a12', created: false },
    coins: 0,
    career: { unlocked: 0, results: {}, cleared: false, story: {}, tries: {} },
    defense: { unlocked: false, results: {} },
    owned: ['gloves_blue', 'trunks_white', 'shoes_black', 'music_basic', 'entrance_basic', 'floor_none'],
    equipped: { gloves: 'gloves_blue', trunks: 'trunks_white', shoes: 'shoes_black', music: 'music_basic', entrance: 'entrance_basic', floor: 'floor_none' },
    achievements: {},
    records: { timeAttack: {}, bossRush: null, mitts: 0, rope: 0, sandbag: 0, dodgeDrill: {} },
    totals: { fights: 0, wins: 0, kos: 0, punches: 0, landed: 0, counters: 0, dodges: 0, specials: 0, downsDealt: 0, playMs: 0, perfectWins: 0, interrupts: 0, combos: 0 },
    settings: {
      difficulty: 'normal', sfx: 0.8, music: 0.5, shake: true, reduceFlash: false, reduceMotion: false,
      tellHighlight: true, keys: null, quality: 'auto', touchSize: 1, showTouch: 'auto',
    },
    tutorialDone: false,
    lastReplay: null,
  };
}

// 버전별 옮기기. 새 버전을 만들면 여기에 단계를 추가한다.
const MIGRATIONS = {
  // v1 → v2: 기록에 훈련 기록 추가, 별명 이름 바뀜
  1: (s) => {
    s.records = s.records || {};
    s.records.mitts = s.records.mitts || 0;
    s.records.rope = s.records.rope || 0;
    if (s.playerName && !s.profile) s.profile = { name: s.playerName };
    delete s.playerName;
    s.version = 2;
    return s;
  },
  // v2 → v3: 챔피언 방어전과 리플레이 칸 추가, 설정에 접근성 항목 추가
  2: (s) => {
    s.defense = s.defense || { unlocked: !!(s.career && s.career.cleared), results: {} };
    s.lastReplay = s.lastReplay || null;
    s.settings = { ...defaultSave().settings, ...(s.settings || {}) };
    s.version = 3;
    return s;
  },
  // v3 → v4: 조작이 바뀜(WASD = 링 안 걷기, Q/E/F = 피하기). 옛날에 바꿔 둔 키는 겹치므로 기본값으로
  3: (s) => {
    if (s.settings) s.settings.keys = null;
    s.version = 4;
    return s;
  },
};

export function migrate(data) {
  if (!data || typeof data !== 'object') return defaultSave();
  let s = data;
  let guard = 0;
  while ((s.version || 1) < SAVE_VERSION && guard++ < 20) {
    const v = s.version || 1;
    const step = MIGRATIONS[v];
    if (!step) break;
    s = step(s);
  }
  // 빠진 칸은 기본값으로 채운다
  return fillDefaults(s, defaultSave());
}

function fillDefaults(s, d) {
  for (const k of Object.keys(d)) {
    if (s[k] === undefined) s[k] = d[k];
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k]) && s[k] && typeof s[k] === 'object') fillDefaults(s[k], d[k]);
  }
  return s;
}

export class SaveStore {
  constructor(storage) {
    this.storage = storage === undefined ? safeLocalStorage() : storage;
    this.ok = true; // 마지막 저장 성공 여부
    this.data = this.load();
  }

  load() {
    try {
      if (!this.storage) throw new Error('저장소 없음');
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return defaultSave();
      return migrate(JSON.parse(raw));
    } catch (e) {
      this.ok = false;
      return defaultSave();
    }
  }

  save() {
    try {
      if (!this.storage) throw new Error('저장소 없음');
      this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      this.ok = true;
    } catch (e) {
      this.ok = false;
    }
    return this.ok;
  }

  reset() {
    this.data = defaultSave();
    try {
      this.storage && this.storage.removeItem(SAVE_KEY);
    } catch (e) { /* 무시 */ }
    this.save();
  }

  // 다른 기기로 옮기기용 텍스트 (base64, 한글 안전)
  exportText() {
    const json = JSON.stringify(this.data);
    return 'RK1:' + b64encode(json);
  }

  importText(text) {
    const t = String(text || '').trim();
    if (!t.startsWith('RK1:')) throw new Error('저장 코드 형식이 아니에요.');
    let data;
    try {
      data = JSON.parse(b64decode(t.slice(4)));
    } catch (e) {
      throw new Error('저장 코드가 망가졌어요.');
    }
    if (!data || typeof data !== 'object' || !data.career) throw new Error('저장 코드가 올바르지 않아요.');
    this.data = migrate(data);
    this.save();
    return this.data;
  }
}

function safeLocalStorage() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const k = '__rk_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return localStorage;
  } catch (e) {
    return null;
  }
}

function b64encode(str) {
  if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function b64decode(b64) {
  if (typeof Buffer !== 'undefined') return Buffer.from(b64, 'base64').toString('utf8');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveStore, migrate, defaultSave, SAVE_VERSION, SAVE_KEY } from '../src/save.js';

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('처음엔 기본 저장 데이터', () => {
  const s = new SaveStore(memStorage());
  assert.equal(s.data.version, SAVE_VERSION);
  assert.equal(s.data.coins, 0);
  assert.equal(s.data.career.unlocked, 0);
});

test('저장하고 다시 불러오면 같다', () => {
  const st = memStorage();
  const a = new SaveStore(st);
  a.data.coins = 123;
  a.data.career.results.bear = { stars: 3 };
  assert.equal(a.save(), true);
  const b = new SaveStore(st);
  assert.equal(b.data.coins, 123);
  assert.equal(b.data.career.results.bear.stars, 3);
});

test('옛 버전(v1) 데이터를 최신으로 옮긴다', () => {
  const old = { version: 1, playerName: '두리', coins: 50, career: { unlocked: 4, results: { bear: { stars: 2 } }, cleared: true } };
  const s = migrate(old);
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.profile.name, '두리');
  assert.equal(s.coins, 50);
  assert.equal(s.career.unlocked, 4);
  assert.equal(s.defense.unlocked, true);
  assert.ok(s.settings && s.settings.difficulty);
  assert.ok(s.records.mitts === 0);
  assert.ok(Array.isArray(s.owned));
});

test('망가진 저장 데이터는 기본값으로', () => {
  const st = memStorage();
  st.setItem(SAVE_KEY, '{망가짐');
  const s = new SaveStore(st);
  assert.equal(s.data.coins, 0);
  assert.equal(s.ok, false);
});

test('저장이 실패해도(사생활 보호 모드) 게임은 계속, 실패 표시', () => {
  const broken = { getItem: () => { throw new Error('막힘'); }, setItem: () => { throw new Error('막힘'); }, removeItem: () => {} };
  const s = new SaveStore(broken);
  assert.equal(s.ok, false);
  s.data.coins = 10;
  assert.equal(s.save(), false);
  assert.equal(s.data.coins, 10);
  const none = new SaveStore(null);
  assert.equal(none.save(), false);
});

test('텍스트로 내보내기/가져오기 (한글 이름 포함)', () => {
  const a = new SaveStore(memStorage());
  a.data.profile.name = '김복싱';
  a.data.coins = 777;
  const text = a.exportText();
  assert.ok(text.startsWith('RK1:'));
  const b = new SaveStore(memStorage());
  b.importText(text);
  assert.equal(b.data.profile.name, '김복싱');
  assert.equal(b.data.coins, 777);
  assert.throws(() => b.importText('아무거나'));
  assert.throws(() => b.importText('RK1:@@@@'));
});

test('초기화', () => {
  const a = new SaveStore(memStorage());
  a.data.coins = 5;
  a.reset();
  assert.equal(a.data.coins, 0);
  assert.deepEqual(Object.keys(a.data).sort(), Object.keys(defaultSave()).sort());
});

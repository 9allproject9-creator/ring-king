// 온라인 1:1 확인: 브라우저 창 두 개로 빠른 대전에 들어가 서로 펀치·피하기를 주고받는다.
// 사용: (node server.mjs 실행 후) node tools/online-check.mjs [URL]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { findBrowser } from './shot.mjs';

const URL0 = process.argv[2] || 'http://localhost:3000/';
fs.mkdirSync('screenshots', { recursive: true });
const browser = await chromium.launch({ executablePath: findBrowser(), headless: true });
const logs = [];
async function open(name) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => logs.push(`[${name}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`[${name}] ${m.text()}`); });
  await page.goto(URL0);
  await page.evaluate((n) => { const d = window.__app.save.data; d.profile.created = true; d.profile.name = n; d.tutorialDone = true; window.__app.go('online'); }, name);
  await page.waitForTimeout(800);
  return page;
}
const key = (page, code) => page.evaluate((c) => { window.dispatchEvent(new KeyboardEvent('keydown', { code: c })); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: c })), 40); }, code);
try {
  const a = await open('하늘');
  const b = await open('바다');
  await a.screenshot({ path: 'screenshots/online_1_lobby.png' });
  await a.click('text=빠른 대전');
  await a.waitForTimeout(500);
  await b.click('text=빠른 대전');
  await a.waitForFunction(() => window.__app.currentName === 'onlineFight', null, { timeout: 15000 });
  await b.waitForFunction(() => window.__app.currentName === 'onlineFight', null, { timeout: 15000 });
  await a.waitForFunction(() => window.__app.current.fight.phase === 'fight', null, { timeout: 20000 });
  console.log('두 사람 연결, 경기 시작');
  console.log('상대 3D:', JSON.stringify(await b.evaluate(() => { const v = window.__app.current.view; const r = v.fighter.root; return { inScene: !!r.parent, x: r.position.x, y: r.position.y, z: r.position.z, vis: r.visible, kids: r.children.length, oppState: v.fight.opp.state, body: v.fighter.body.position.y, fall: v.fighter.fallPivot.rotation.x }; })));
  // A가 잽 → B가 맞는지
  await key(a, 'KeyJ');
  await a.waitForTimeout(250);
  await b.screenshot({ path: 'screenshots/online_2_tell.png' });
  await a.waitForTimeout(600);
  const hpB = await b.evaluate(() => window.__app.current.player.hp);
  console.log('A의 잽 뒤 B 체력:', hpB);
  // A가 스트레이트, B가 오른쪽 피하기 → A 비틀거림 → B 반격
  await key(a, 'KeyK');
  await b.waitForTimeout(200);
  await key(b, 'KeyE');
  await b.waitForTimeout(260);
  await key(b, 'KeyJ');
  await b.waitForTimeout(500);
  const st = await a.evaluate(() => ({ hp: window.__app.current.player.hp }));
  const starsB = await b.evaluate(() => window.__app.current.player.stars);
  console.log('B 반격 뒤 A 체력:', st.hp, 'B 별:', starsB);
  await a.screenshot({ path: 'screenshots/online_3_fight.png' });
  await b.screenshot({ path: 'screenshots/online_4_fight_b.png' });
  const ping = await a.evaluate(() => window.__app.current.ping);
  console.log('핑:', ping, 'ms');
} catch (e) {
  console.error('실패:', e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
console.log(logs.length ? `에러 ${logs.length}개:\n${logs.join('\n')}` : '콘솔 에러 0개');

// 실제 화면 확인: 타이틀 → 만들기 → 튜토리얼 → 지도 → 컷신 → 소개 → 1번 상대 경기 → 결과 (키보드)
// + 모바일 가로/세로 터치. 스크린샷은 screenshots/ 에 저장. 콘솔 에러를 모아서 보고한다.
// 사용: (개발 서버 또는 node server.mjs 를 켠 뒤) node tools/screenshots.mjs [URL]
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import { findBrowser } from './shot.mjs';

const URL0 = process.argv[2] || 'http://localhost:5173/';
const OUT = 'screenshots';
fs.mkdirSync(OUT, { recursive: true });

// 페이지 안에서 텔을 읽고 키를 누르는 자동 플레이어
const AUTOPLAY = `(() => {
  if (window.__auto) return;
  const key = (code, hold = 40) => { window.dispatchEvent(new KeyboardEvent('keydown', { code })); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code })), hold); };
  const D = { L: 'KeyQ', R: 'KeyE', duck: 'KeyF' };
  let last = 0, guard = false, combo = 0;
  window.__auto = setInterval(() => {
    const s = window.__app && window.__app.current;
    const f = s && s.fight;
    if (!f || window.__app.screens.fight.ended || window.__app.currentName !== 'fight') return;
    const p = f.player, o = f.opp, now = performance.now();
    if (f.phase === 'pdown' || p.state === 'clinched') { if (now - last > 90) { key('KeyJ', 20); last = now; } return; }
    if (f.phase !== 'fight') return;
    if (o.state === 'tell' && !o.fake && o.atk) {
      const rem = o.dur - o.t;
      if (o.atk.avoid.length === 0) { if (!guard && rem < 500) { window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ShiftLeft' })); guard = true; } return; }
      if (rem < 175 && rem > 70 && p.actionable && now - last > 150) { key(D[o.atk.avoid[0]]); last = now; }
      return;
    }
    if (guard && o.state !== 'tell') { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ShiftLeft' })); guard = false; }
    const open = ['whiff', 'shoved', 'counterStun', 'tired', 'taunt', 'guardBroken'].includes(o.state) || (o.state === 'idle' && !o.guardUp && f.training);
    if (open && p.actionable && now - last > 90) {
      if (p.stars >= 2 && o.dur - o.t > 450) key('Space');
      else { key(['KeyJ', 'KeyK', 'KeyL'][combo++ % 3]); }
      last = now;
    }
  }, 8);
})()`;

// 화면이 바뀌는 순간 값이 잠깐 없을 수 있으니 오류는 "아직 아님"으로 본다
const waitFor = (page, fn, timeout = 60000) => page.waitForFunction(`(() => { try { return !!(${fn.toString()})(); } catch (e) { return false; } })()`, null, { timeout, polling: 100 });

let lastPage = null;
async function desktop(browser, logs) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();
  lastPage = page;
  hook(page, logs, 'PC');
  await page.goto(URL0);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${OUT}/01_title.png` });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(800);
  await page.keyboard.type('하늘이');
  await page.screenshot({ path: `${OUT}/02_create.png` });
  await page.click('.btn.big');
  await waitFor(page, () => window.__app.currentName === 'fight');
  await waitFor(page, () => window.__app.current.fight.phase === 'fight');
  await page.screenshot({ path: `${OUT}/03_tutorial.png` });
  // 튜토리얼: 단계별로 직접 해 본다
  await page.evaluate(AUTOPLAY);
  await page.evaluate(() => {
    const k = (c) => { window.dispatchEvent(new KeyboardEvent('keydown', { code: c })); setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: c })), 40); };
    let n = 0;
    window.__tut = setInterval(() => {
      const t = window.__app.screens.tutorial.st;
      const f = window.__app.current.fight;
      if (!f || !t) return;
      if (t.step === 0 && !window.__walk) { window.__walk = 1; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' })); }
      if (t.step >= 1 && window.__walk === 1) { window.__walk = 2; window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' })); }
      if (t.step === 1 && f.player.actionable && f.gap < 0.3) k(['KeyJ', 'KeyK', 'KeyL'][n++ % 3]);
      if (t.step === 6 && f.player.actionable && f.player.stars > 0 && ['whiff', 'idle'].includes(f.opp.state)) k('Space');
    }, 300);
  });
  await waitFor(page, () => window.__app.screens.tutorial.st.step >= 4, 90000);
  await page.screenshot({ path: `${OUT}/04_tutorial_counter.png` });
  await waitFor(page, () => window.__app.currentName !== 'fight' || window.__app.screens.fight.ended, 150000);
  await page.evaluate(() => clearInterval(window.__tut));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/05_tutorial_done.png` });
  await page.keyboard.press('Enter');
  await waitFor(page, () => window.__app.currentName === 'map');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/06_map.png` });
  await page.keyboard.press('Enter');
  await waitFor(page, () => window.__app.currentName === 'cutscene');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/07_cutscene.png` });
  await page.keyboard.press('Escape');
  await waitFor(page, () => window.__app.currentName === 'intro');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/08_intro.png` });
  await page.keyboard.press('Enter');
  await waitFor(page, () => window.__app.currentName === 'fight' && window.__app.current.fight.phase === 'fight');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/09_fight.png` });
  await waitFor(page, () => { const o = window.__app.current.fight.opp; return o.state === 'tell' && o.t > o.dur * 0.6; });
  await page.screenshot({ path: `${OUT}/10_fight_tell.png` });
  await waitFor(page, () => window.__app.current.fight.player.stars > 0, 120000);
  await page.screenshot({ path: `${OUT}/11_fight_star.png` });
  // 헤드리스 브라우저는 느리므로 나머지 경기는 배속으로 진행 (판정 로직은 같음)
  await page.evaluate(() => { window.__simSpeed = 6; });
  await waitFor(page, () => window.__app.current.fight.phase === 'between' || window.__app.current.fight.over || window.__app.current.fight.phase === 'odown', 200000);
  await page.screenshot({ path: `${OUT}/12_fight_moment.png` });
  // 끝까지 (라운드 사이는 Enter)
  for (let i = 0; i < 400; i++) {
    const st = await page.evaluate(() => ({ ph: window.__app.current.fight && window.__app.current.fight.phase, ended: window.__app.screens.fight.ended }));
    if (st.ended) break;
    if (st.ph === 'between') {
      await page.screenshot({ path: `${OUT}/13_between.png` });
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(500);
  }
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}/14_result.png` });
  const res = await page.evaluate(() => window.__app.current.fight.result);
  await ctx.close();
  return res;
}

async function mobile(browser, logs, w, h, name) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  hook(page, logs, name);
  await page.goto(URL0);
  await page.evaluate(() => { localStorage.clear(); });
  await page.reload();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${name}_1_title.png` });
  await page.evaluate(() => { const d = window.__app.save.data; d.profile.created = true; d.profile.name = '터치'; d.tutorialDone = true; window.__app.go('gym'); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}_2_gym.png` });
  await page.evaluate(() => window.__app.startFight({ oppId: 'bolt', mode: 'free' }));
  await waitFor(page, () => window.__app.current.fight && window.__app.current.fight.phase === 'fight');
  // 터치로 잽 버튼 누르기
  const jab = await page.$('#touch .tb[aria-label="잽"]');
  const box = jab && await jab.boundingBox();
  if (box) await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
  await page.screenshot({ path: `${OUT}/${name}_3_fight_touch.png` });
  const thrown = await page.evaluate(() => window.__app.current.fight.stats.thrown + (window.__app.current.fight.player.state === 'punch' ? 1 : 0));
  await ctx.close();
  return thrown;
}

function hook(page, logs, tag) {
  page.on('console', (m) => { if (m.type() === 'error') logs.push(`[${tag}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[${tag}] ${e.message}`));
}

const exe = findBrowser();
if (!exe) { console.error('Chrome/Edge가 필요합니다.'); process.exit(1); }
const browser = await chromium.launch({ executablePath: exe, headless: true });
const logs = [];
try {
  const res = await desktop(browser, logs);
  console.log('PC 키보드 진행: 결과 =', JSON.stringify(res));
  const a = await mobile(browser, logs, 844, 390, 'mobile_land');
  console.log('모바일 가로 터치: 잽 버튼 →', a > 0 ? '펀치 나감' : '반응 없음');
  const b = await mobile(browser, logs, 360, 740, 'mobile_port');
  console.log('모바일 세로 터치: 잽 버튼 →', b > 0 ? '펀치 나감' : '반응 없음');
} catch (e) {
  console.error('실패:', e.message);
  try {
    console.error('상태:', JSON.stringify(await lastPage.evaluate(() => { const a = window.__app; const f = a.current && a.current.fight; return { screen: a.currentName, phase: f && f.phase, opp: f && f.opp.state, gap: f && f.gap, pstate: f && f.player.state, held: [...a.actions.held].filter(([k, v]) => v.size).map(([k]) => k), frame: f && f.frame, tut: a.screens.tutorial.st && a.screens.tutorial.st.step }; })));
    await lastPage.screenshot({ path: `${OUT}/tmp/fail.png` });
  } catch (e2) { /* 무시 */ }
  process.exitCode = 1;
} finally {
  await browser.close();
}
console.log(logs.length ? `콘솔 에러 ${logs.length}개:\n${logs.join('\n')}` : '콘솔 에러 0개');

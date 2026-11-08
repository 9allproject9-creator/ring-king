// 개발용 화면 확인 도구: 시나리오 JSON대로 브라우저를 움직이고 스크린샷을 남긴다.
// 사용: node tools/shot.mjs scenario.json
// 시나리오: { url, viewport:{width,height}, mobile?:bool, steps:[{wait},{key},{down},{up},{click:[x,y]},{tap:[x,y]},{eval},{shot}] }
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

export const BROWSER_PATHS = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

export function findBrowser() {
  for (const p of BROWSER_PATHS) if (fs.existsSync(p)) return p;
  return null;
}

export async function runScenario(sc) {
  const exe = findBrowser();
  if (!exe) throw new Error('Chrome/Edge를 찾지 못했습니다.');
  const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await browser.newContext({
    viewport: sc.viewport || { width: 1280, height: 720 },
    deviceScaleFactor: sc.dpr || 1,
    isMobile: !!sc.mobile,
    hasTouch: !!sc.mobile,
  });
  const page = await ctx.newPage();
  const logs = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') {
      logs.push(`[${m.type()}] ${m.text()}`);
      console.log(`[${m.type()}] ${m.text()}`);
    }
  });
  page.on('pageerror', (e) => { logs.push(`[pageerror] ${e.message}`); console.log(`[pageerror] ${e.message}\n${e.stack || ''}`); });
  page.setDefaultTimeout(15000);
  await page.goto(sc.url || 'http://localhost:5173', { waitUntil: 'load' });
  for (const s of sc.steps || []) {
    if (s.wait) await page.waitForTimeout(s.wait);
    if (s.key) await page.keyboard.press(s.key, { delay: s.hold || 40 });
    if (s.down) await page.keyboard.down(s.down);
    if (s.up) await page.keyboard.up(s.up);
    if (s.click) await page.mouse.click(s.click[0], s.click[1]);
    if (s.tap) await page.touchscreen.tap(s.tap[0], s.tap[1]);
    if (s.text) await page.keyboard.type(s.text);
    if (s.sel) await page.click(s.sel);
    if (s.eval) {
      const r = await page.evaluate(s.eval);
      if (r !== undefined) console.log('eval:', JSON.stringify(r));
    }
    if (s.shot) {
      const out = path.resolve(s.shot);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      await page.screenshot({ path: out });
      console.log('shot:', out);
    }
  }
  await browser.close();
  return logs;
}

if (process.argv[1] && process.argv[1].endsWith('shot.mjs')) {
  const sc = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  runScenario(sc).then((logs) => {
    console.log(logs.length ? logs.join('\n') : '콘솔 에러 없음');
  }).catch((e) => { console.error(e); process.exit(1); });
}

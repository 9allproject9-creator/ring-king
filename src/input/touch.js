// 터치 조작: 화면 왼쪽 아래 = 피하기·숙이기(+링 이동), 오른쪽 아래 = 펀치·가드·필살. 진동 대신 눌림 표시.
const LEFT = [
  { a: 'circleL', ic: '⟲', t: '돌기', small: true },
  { a: 'back', ic: '⇩', t: '물러나기', small: true },
  { a: 'circleR', ic: '⟳', t: '돌기', small: true },
  { a: 'dodgeL', ic: '◀', t: '왼쪽' },
  { a: 'duck', ic: '▼', t: '숙이기' },
  { a: 'dodgeR', ic: '▶', t: '오른쪽' },
];
const RIGHT = [
  { a: 'special', ic: '★', t: '필살', cls: 'special' },
  { a: 'upper', ic: '↥', t: '어퍼' },
  { a: 'guard', ic: '🛡', t: '가드', cls: 'guard' },
  { a: 'jab', ic: '①', t: '잽' },
  { a: 'straight', ic: '②', t: '스트' },
  { a: 'pause', ic: 'Ⅱ', t: '멈춤', cls: 'pausekey' },
];

export function isTouchDevice() {
  try { return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window; } catch (e) { return false; }
}

export class TouchControls {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('touch');
    this.btns = {};
    this.active = false;
    this.build();
  }

  build() {
    const r = this.root;
    r.innerHTML = '';
    const mk = (side, list) => {
      const pad = document.createElement('div');
      pad.className = `pad ${side}`;
      for (const b of list) {
        const e = document.createElement('button');
        e.className = 'tb' + (b.cls ? ' ' + b.cls : '') + (b.small ? ' small' : '');
        e.innerHTML = `<span class="ic">${b.ic}</span><span>${b.t}</span>`;
        e.setAttribute('aria-label', b.t);
        const down = (ev) => {
          ev.preventDefault();
          e.setPointerCapture && e.setPointerCapture(ev.pointerId);
          e.classList.add('on');
          this.app.audio.unlock();
          if (b.a === 'pause') { this.app.actions.uiKey('Escape'); return; }
          this.app.actions.press(b.a, 'touch');
        };
        const up = (ev) => {
          e.classList.remove('on');
          if (b.a !== 'pause') this.app.actions.release(b.a, 'touch');
        };
        e.addEventListener('pointerdown', down);
        e.addEventListener('pointerup', up);
        e.addEventListener('pointercancel', up);
        e.addEventListener('lostpointercapture', up);
        e.addEventListener('contextmenu', (ev) => ev.preventDefault());
        pad.appendChild(e);
        this.btns[b.a] = e;
      }
      r.appendChild(pad);
    };
    mk('left', LEFT);
    mk('right', RIGHT);
    this.tip = document.createElement('div');
    this.tip.className = 'rotate-tip hidden';
    this.tip.textContent = '📱 가로로 돌리면 더 크게 보여요 (닫기 ✕)';
    this.tip.addEventListener('pointerdown', () => { this.tip.classList.add('hidden'); this.tipClosed = true; });
    r.appendChild(this.tip);
  }

  // 경기 화면에서만 보인다
  show(on) {
    this.active = on;
    this.refresh();
  }

  refresh() {
    const s = this.app.settings;
    const want = this.active && (s.showTouch === 'on' || (s.showTouch !== 'off' && isTouchDevice()));
    this.root.classList.toggle('hidden', !want);
    document.body.classList.toggle('touch-on', want);
    this.root.style.setProperty('--tb', `${Math.round(74 * (s.touchSize || 1))}px`);
    const portrait = window.innerHeight > window.innerWidth;
    this.tip.classList.toggle('hidden', !(want && portrait && !this.tipClosed));
    this.root.classList.toggle('portrait', portrait);
  }

  update(fight) {
    if (!this.active || !fight) return;
    const sp = this.btns.special;
    if (sp) sp.classList.toggle('ready', fight.player.stars > 0);
  }
}

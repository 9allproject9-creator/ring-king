// 키보드 → 행동. 키 바꾸기는 settings.keys(행동 → 코드 배열)로.
export const DEFAULT_KEYS = {
  dodgeL: ['KeyA', 'ArrowLeft'],
  dodgeR: ['KeyD', 'ArrowRight'],
  duck: ['KeyS', 'ArrowDown'],
  guard: ['KeyW', 'ArrowUp'],
  jab: ['KeyJ', 'KeyZ'],
  straight: ['KeyK', 'KeyX'],
  upper: ['KeyL', 'KeyC'],
  special: ['Space'],
  pause: ['Escape', 'KeyP'],
};

export const ACTION_LABELS = {
  dodgeL: '왼쪽 피하기',
  dodgeR: '오른쪽 피하기',
  duck: '숙이기',
  guard: '가드(누르고 있기)',
  jab: '잽(왼손)',
  straight: '스트레이트(오른손)',
  upper: '어퍼컷',
  special: '필살 펀치',
  pause: '일시정지',
};

export function keyName(code) {
  if (!code) return '-';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const map = { Space: 'Space', ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Escape: 'Esc', Enter: 'Enter', ShiftLeft: '왼Shift', ShiftRight: '오른Shift', ControlLeft: '왼Ctrl', Semicolon: ';', Comma: ',', Period: '.', Slash: '/' };
  return map[code] || code;
}

export class Keyboard {
  constructor(actions) {
    this.actions = actions;
    this.keys = DEFAULT_KEYS;
    this.down = new Set();
    this.capture = null; // 키 바꾸기 중이면 콜백
    this.onKey = (e) => this.handle(e, true);
    this.onKeyUp = (e) => this.handle(e, false);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', () => {
      for (const a of Object.keys(this.keys)) this.actions.release(a, 'kb');
      this.down.clear();
    });
  }

  setKeys(keys) {
    this.keys = { ...DEFAULT_KEYS, ...(keys || {}) };
  }

  actionOf(code) {
    for (const [a, codes] of Object.entries(this.keys)) if (codes.includes(code)) return a;
    return null;
  }

  handle(e, isDown) {
    if (this.capture && isDown) {
      e.preventDefault();
      const cb = this.capture;
      this.capture = null;
      cb(e.code);
      return;
    }
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const a = this.actionOf(e.code);
    if (isDown) this.actions.anyKey && this.actions.anyKey(e);
    if (!a) {
      if (isDown) this.actions.uiKey(e.code, e);
      return;
    }
    if (this.actions.gameActive) e.preventDefault();
    if (isDown) {
      if (this.down.has(e.code)) return; // 자동 반복 무시
      this.down.add(e.code);
      this.actions.press(a, 'kb');
      this.actions.uiKey(e.code, e);
    } else {
      this.down.delete(e.code);
      this.actions.release(a, 'kb');
    }
  }
}

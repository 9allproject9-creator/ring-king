// 키보드·패드·터치를 하나의 "행동 입력"으로 모으는 층.
// 게임 로직은 프레임마다 비트마스크 하나(inputBits.js)만 받는다.
import { ACTION_BIT, IN } from '../game/inputBits.js';

export class Actions {
  constructor() {
    this.pressedQueue = 0; // 이번 프레임까지 쌓인 누름
    this.held = new Map(); // action → Set(source)
    this.listeners = new Set();
    this.gameActive = false;
    this.uiHandlers = new Set();
  }

  press(action, source = 'kb') {
    if (!this.held.has(action)) this.held.set(action, new Set());
    this.held.get(action).add(source);
    const bit = ACTION_BIT[action];
    if (bit) this.pressedQueue |= bit;
    for (const l of this.listeners) l(action, true, source);
  }

  release(action, source = 'kb') {
    const s = this.held.get(action);
    if (s) s.delete(source);
    for (const l of this.listeners) l(action, false, source);
  }

  isHeld(action) {
    const s = this.held.get(action);
    return !!(s && s.size);
  }

  // 고정 간격 한 번마다 호출: 누름은 한 번만 전달하고 비운다.
  consume() {
    let bits = this.pressedQueue;
    this.pressedQueue = 0;
    if (this.isHeld('guard')) bits |= IN.GUARD;
    return bits;
  }

  clear() {
    this.pressedQueue = 0;
  }

  onAction(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onUi(fn) {
    this.uiHandlers.add(fn);
    return () => this.uiHandlers.delete(fn);
  }

  uiKey(code, e) {
    for (const h of this.uiHandlers) h(code, e);
  }
}

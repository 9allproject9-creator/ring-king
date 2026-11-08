// 게임패드 (표준 Gamepad API, standard 배치)
// 경기: 왼쪽 스틱 = 링 안 걷기, 방향키 ←→ 피하기·↓ 숙이기·↑ 가드, A=잽, B=스트레이트, Y=어퍼, X/LB/LT=가드, RB/RT=필살, START=멈춤
// 메뉴: 방향키/스틱 = 이동, A = 확인, B = 뒤로
const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
const DEAD = 0.5;

export class Gamepads {
  constructor(app) {
    this.app = app;
    this.prev = {};
    this.prevDir = { x: 0, y: 0 };
    this.connected = false;
    window.addEventListener('gamepadconnected', () => { this.connected = true; });
  }

  poll() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    let gp = null;
    for (const p of pads) if (p && p.connected) { gp = p; break; }
    if (!gp) return;
    this.connected = true;
    const A = this.app.actions;
    const game = A.gameActive;
    const pressed = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const edge = (i) => pressed(i) && !this.prev[i];
    const lx = gp.axes[0] || 0, ly = gp.axes[1] || 0, rx = gp.axes[2] || 0, ry = gp.axes[3] || 0;
    const dir = {
      x: pressed(BTN.LEFT) || lx < -DEAD ? -1 : pressed(BTN.RIGHT) || lx > DEAD ? 1 : 0,
      y: pressed(BTN.UP) || ly < -DEAD ? -1 : pressed(BTN.DOWN) || ly > DEAD ? 1 : 0,
    };
    const hold = (action, on) => { if (on) { if (!A.isHeld(action)) A.press(action, 'pad'); } else if (A.isHeld(action)) A.release(action, 'pad'); };
    if (game) {
      // 왼쪽 스틱 = 링 안 걷기
      hold('fwd', ly < -DEAD);
      hold('back', ly > DEAD);
      hold('circleL', lx < -DEAD || rx < -DEAD);
      hold('circleR', lx > DEAD || rx > DEAD);
      // 방향키 = 피하기·숙이기, 위 = 가드
      const pl = pressed(BTN.LEFT), pr = pressed(BTN.RIGHT), pd = pressed(BTN.DOWN);
      if (pl && !this.prev[BTN.LEFT]) A.press('dodgeL', 'pad');
      if (pr && !this.prev[BTN.RIGHT]) A.press('dodgeR', 'pad');
      if (pd && !this.prev[BTN.DOWN]) A.press('duck', 'pad');
      if (!pl) A.release('dodgeL', 'pad');
      if (!pr) A.release('dodgeR', 'pad');
      if (!pd) A.release('duck', 'pad');
      hold('guard', pressed(BTN.UP) || pressed(BTN.X) || pressed(BTN.LB) || pressed(BTN.LT));
      if (edge(BTN.A)) A.press('jab', 'pad');
      if (edge(BTN.B)) A.press('straight', 'pad');
      if (edge(BTN.Y)) A.press('upper', 'pad');
      if (edge(BTN.RB) || edge(BTN.RT)) A.press('special', 'pad');
      for (const b of [BTN.A, BTN.B, BTN.Y]) if (!pressed(b) && this.prev[b]) A.release(['jab', 'straight', 'upper'][[BTN.A, BTN.B, BTN.Y].indexOf(b)], 'pad');
      if (edge(BTN.START)) A.uiKey('Escape');
      if (edge(BTN.A)) A.uiKey('Enter');
    } else {
      if (dir.x !== this.prevDir.x && dir.x) A.uiKey(dir.x < 0 ? 'ArrowLeft' : 'ArrowRight');
      if (dir.y !== this.prevDir.y && dir.y) A.uiKey(dir.y < 0 ? 'ArrowUp' : 'ArrowDown');
      if (edge(BTN.A)) {
        const el = document.activeElement;
        if (el && el.tagName === 'BUTTON') el.click();
        else A.uiKey('Enter');
      }
      if (edge(BTN.B) || edge(BTN.START) && false) A.uiKey('Escape');
    }
    this.prevDir = dir;
    for (let i = 0; i < gp.buttons.length; i++) this.prev[i] = pressed(i);
  }
}

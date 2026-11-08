// 캔버스: 내부 기준 1280×720(가로) 또는 720×1280에 가까운 세로 배치.
// 화면 크기에 맞춰 비율을 유지하며 확대·축소, devicePixelRatio 최대 2배.
export const BASE_W = 1280;
export const BASE_H = 720;

export class View {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.w = BASE_W; // 논리 폭
    this.h = BASE_H; // 논리 높이
    this.scale = 1;
    this.dpr = 1;
    this.portrait = false;
    this.offX = 0;
    this.offY = 0;
    this.onResize = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
  }

  resize() {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.portrait = ch > cw * 1.05;
    // 세로 화면: 폭 1280 기준 대신 더 좁고 긴 논리 화면을 써서 글자·버튼이 작아지지 않게 한다.
    if (this.portrait) {
      this.w = 760;
      this.h = Math.round(Math.min(1500, Math.max(1000, 760 * ch / cw)));
    } else {
      this.w = BASE_W;
      this.h = BASE_H;
      const ratio = cw / ch;
      // 아주 넓거나 좁은 가로 화면은 논리 폭을 살짝 늘려 꽉 채운다.
      if (ratio > 16 / 9) this.w = Math.round(Math.min(1600, BASE_H * ratio));
      else if (ratio < 16 / 9) this.h = Math.round(Math.min(900, BASE_W / ratio));
    }
    this.scale = Math.min(cw / this.w, ch / this.h);
    const pw = Math.round(this.w * this.scale);
    const ph = Math.round(this.h * this.scale);
    this.offX = Math.floor((cw - pw) / 2);
    this.offY = Math.floor((ch - ph) / 2);
    const c = this.canvas;
    c.style.width = pw + 'px';
    c.style.height = ph + 'px';
    c.style.left = this.offX + 'px';
    c.style.top = this.offY + 'px';
    c.width = Math.round(pw * this.dpr);
    c.height = Math.round(ph * this.dpr);
    this.ctx.imageSmoothingEnabled = true;
    if (this.onResize) this.onResize(this);
  }

  // 논리 좌표로 그리기 시작
  begin() {
    const k = this.scale * this.dpr;
    this.ctx.setTransform(k, 0, 0, k, 0, 0);
  }

  // 화면 좌표(px) → 논리 좌표
  toLogical(px, py) {
    return { x: (px - this.offX) / this.scale, y: (py - this.offY) / this.scale };
  }
}

// 효과: 재사용 풀(경기 중 메모리 증가 없음)
import { starPath } from './ring.js';

export class Effects {
  constructor() {
    this.parts = Array.from({ length: 260 }, () => ({ on: false }));
    this.texts = Array.from({ length: 14 }, () => ({ on: false }));
    this.rings = Array.from({ length: 16 }, () => ({ on: false }));
    this.shakeAmt = 0;
    this.shakeX = 0;
    this.shakeY = 0;
    this.flash = 0;
    this.flashColor = '#ffffff';
    this.vignette = 0;
    this.vignetteColor = '255,40,40';
    this.dim = 0;
    this.zoom = 1;
    this.zoomTarget = 1;
    this.zoomX = 640;
    this.zoomY = 360;
    this.shakeEnabled = true;
    this.reduceFlash = false;
  }

  reset() {
    for (const p of this.parts) p.on = false;
    for (const t of this.texts) t.on = false;
    for (const r of this.rings) r.on = false;
    this.shakeAmt = this.flash = this.vignette = this.dim = 0;
    this.zoom = this.zoomTarget = 1;
  }

  take(pool) {
    for (const p of pool) if (!p.on) return p;
    // 가득 차면 가장 오래된 것을 재사용
    let old = pool[0];
    for (const p of pool) if (p.life < old.life) old = p;
    return old;
  }

  particle(x, y, vx, vy, life, size, color, kind = 'dot', grav = 0.0015) {
    const p = this.take(this.parts);
    p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.max = life;
    p.size = size; p.color = color; p.kind = kind; p.grav = grav; p.rot = Math.random() * 6; p.vr = (Math.random() - 0.5) * 0.02;
    return p;
  }

  burst(x, y, n, opts = {}) {
    const { speed = 0.5, life = 500, size = 6, color = '#fff', kind = 'dot', grav = 0.0015, spread = Math.PI * 2, dir = 0 } = opts;
    for (let i = 0; i < n; i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.particle(x, y, Math.cos(a) * s, Math.sin(a) * s, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), color, kind, grav);
    }
  }

  sweat(x, y, dir) {
    this.burst(x, y, 7, { speed: 0.55, life: 600, size: 7, color: '#bfe8ff', kind: 'drop', dir: dir > 0 ? 0 : dir < 0 ? Math.PI : -Math.PI / 2, spread: 1.6 });
  }

  impact(x, y, size, color = '#fff') {
    const r = this.take(this.rings);
    r.on = true; r.x = x; r.y = y; r.life = 260; r.max = 260; r.size = size; r.color = color;
    this.burst(x, y, 10, { speed: 0.9, life: 260, size: size * 0.08, color, kind: 'spark', grav: 0 });
  }

  text(str, x, y, opts = {}) {
    const t = this.take(this.texts);
    t.on = true; t.str = str; t.x = x; t.y = y;
    t.life = t.max = opts.life || 750;
    t.size = opts.size || 64;
    t.color = opts.color || '#ffe23a';
    t.stroke = opts.stroke || '#1a1410';
    t.rot = opts.rot ?? (Math.random() - 0.5) * 0.3;
    t.vy = opts.vy ?? -0.05;
    return t;
  }

  shake(amount) {
    if (!this.shakeEnabled) return;
    this.shakeAmt = Math.min(30, Math.max(this.shakeAmt, amount));
  }

  doFlash(a, color = '#ffffff') {
    if (this.reduceFlash) a *= 0.3;
    this.flash = Math.max(this.flash, a);
    this.flashColor = color;
  }

  hurtVignette(a) {
    this.vignette = Math.max(this.vignette, a);
  }

  punchZoom(amount, x, y) {
    if (!this.shakeEnabled) return;
    this.zoom = Math.max(this.zoom, 1 + amount);
    this.zoomX = x; this.zoomY = y;
  }

  update(dt) {
    for (const p of this.parts) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    for (const t of this.texts) {
      if (!t.on) continue;
      t.life -= dt;
      t.y += t.vy * dt;
      if (t.life <= 0) t.on = false;
    }
    for (const r of this.rings) {
      if (!r.on) continue;
      r.life -= dt;
      if (r.life <= 0) r.on = false;
    }
    this.shakeAmt *= Math.pow(0.0025, dt / 1000);
    if (this.shakeAmt < 0.3) this.shakeAmt = 0;
    this.shakeX = (Math.random() - 0.5) * 2 * this.shakeAmt;
    this.shakeY = (Math.random() - 0.5) * 2 * this.shakeAmt;
    this.flash = Math.max(0, this.flash - dt / 180);
    this.vignette = Math.max(0, this.vignette - dt / 500);
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt / 120);
  }

  drawWorld(ctx) {
    for (const r of this.rings) {
      if (!r.on) continue;
      const k = 1 - r.life / r.max;
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = 1 - k;
      ctx.lineWidth = 10 * (1 - k) + 2;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.size * (0.3 + k), 0, Math.PI * 2);
      ctx.stroke();
      // 만화풍 집중선
      ctx.lineWidth = 5 * (1 - k);
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + r.x;
        const r1 = r.size * (0.5 + k * 0.8);
        const r2 = r.size * (0.9 + k * 1.1);
        ctx.moveTo(r.x + Math.cos(a) * r1, r.y + Math.sin(a) * r1);
        ctx.lineTo(r.x + Math.cos(a) * r2, r.y + Math.sin(a) * r2);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      if (!p.on) continue;
      const a = Math.min(1, p.life / p.max * 1.5);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      if (p.kind === 'drop') {
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, p.size * 0.6, p.size, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(30,60,90,0.6)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.kind === 'star') {
        starPath(ctx, p.x, p.y, p.size, 5);
        ctx.fill();
        ctx.strokeStyle = '#1a1410';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (p.kind === 'spark') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillRect(-p.size * 2, -p.size * 0.3, p.size * 4, p.size * 0.6);
        ctx.restore();
      } else if (p.kind === 'line') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 120, p.y - p.vy * 120);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawTexts(ctx) {
    for (const t of this.texts) {
      if (!t.on) continue;
      const k = 1 - t.life / t.max;
      const pop = k < 0.15 ? EASE_BACK(k / 0.15) : 1;
      const a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
      ctx.save();
      ctx.translate(t.x, t.y);
      ctx.rotate(t.rot);
      ctx.scale(pop, pop);
      ctx.globalAlpha = a;
      ctx.font = `${t.size}px "Black Han Sans", "Jua", "Malgun Gothic", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = t.size * 0.2;
      ctx.strokeStyle = t.stroke;
      ctx.strokeText(t.str, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.str, 0, 0);
      ctx.restore();
    }
  }

  drawScreen(ctx, w, h) {
    if (this.vignette > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.85);
      g.addColorStop(0, `rgba(${this.vignetteColor},0)`);
      g.addColorStop(1, `rgba(${this.vignetteColor},${0.55 * this.vignette})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (this.flash > 0) {
      ctx.globalAlpha = Math.min(0.7, this.flash);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  }
}

function EASE_BACK(t) {
  const c = 2.2;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}

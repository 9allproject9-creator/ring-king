// 링과 경기장 배경. 정적인 부분은 오프스크린 캔버스에 한 번 그려 두고 재사용한다.
// 좌표계: 무대 공간 1280×720 (넓은 화면을 위해 좌우로 -320~1600까지 그림)

export const VENUES = {
  gym: {
    name: '동네 체육관',
    wallTop: '#3a2a20', wallBot: '#6b4a32', crowd: '#24170f', crowdRows: 2, crowdDensity: 0.45,
    light: 'rgba(255,240,200,0.20)', floor: '#d9cdb5', floorEdge: '#8d6b4a', apron: '#7a2b25',
    rope: ['#e23b3b', '#f2f2f2', '#2d5fd0'], post: '#c9c9c9', logo: '#b23a2e', banner: '열혈 체육관', flash: 0.15,
  },
  national: {
    name: '전국 대회 체육관',
    wallTop: '#12203a', wallBot: '#28406b', crowd: '#0b1426', crowdRows: 3, crowdDensity: 0.75,
    light: 'rgba(200,225,255,0.22)', floor: '#d6dfeb', floorEdge: '#2f4a7a', apron: '#1d3260',
    rope: ['#ffffff', '#e23b3b', '#ffffff'], post: '#3a6fd8', logo: '#2f5fc4', banner: '전국 소년 복싱 대회', flash: 0.45,
  },
  world: {
    name: '월드 그랑프리 아레나',
    wallTop: '#1a0b2e', wallBot: '#3d1a5e', crowd: '#10061c', crowdRows: 4, crowdDensity: 0.9,
    light: 'rgba(230,180,255,0.22)', floor: '#e6dcf0', floorEdge: '#5a2a8a', apron: '#2a1046',
    rope: ['#ffd23a', '#ff4fb0', '#3ad7ff'], post: '#ff4fb0', logo: '#7a3ad0', banner: 'WORLD GRAND PRIX', flash: 0.8,
  },
  stadium: {
    name: '타이틀전 스타디움',
    wallTop: '#0a0a10', wallBot: '#2a2418', crowd: '#060608', crowdRows: 5, crowdDensity: 1,
    light: 'rgba(255,230,160,0.26)', floor: '#f2ead6', floorEdge: '#8a6a1a', apron: '#1a1408',
    rope: ['#ffd23a', '#ffffff', '#ffd23a'], post: '#ffd23a', logo: '#c8a028', banner: '챔피언 타이틀 매치', flash: 1,
  },
  training: {
    name: '훈련장',
    wallTop: '#2b3a2a', wallBot: '#4f6a46', crowd: '#1a2418', crowdRows: 0, crowdDensity: 0,
    light: 'rgba(255,250,220,0.18)', floor: '#cfc6b0', floorEdge: '#5a6a3a', apron: '#3a4a2a',
    rope: ['#e8e8e8', '#e8e8e8', '#e8e8e8'], post: '#8a8a8a', logo: '#5a7a3a', banner: '문철 복싱 캠프', flash: 0,
  },
};

export const LEAGUE_VENUE = ['gym', 'national', 'world', 'stadium'];

const X0 = -320;
const X1 = 1600;

function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export class RingRenderer {
  constructor() {
    this.cache = new Map();
    this.flashes = [];
    for (let i = 0; i < 40; i++) this.flashes.push({ x: 0, y: 0, life: 0, max: 1 });
    this.excite = 0; // 관중 흥분 0~1
    this.time = 0;
    this.ropeShake = 0;
    // 글꼴이 늦게 도착하면 현수막을 다시 그린다
    if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => this.cache.clear()).catch(() => {});
    }
  }

  getStatic(venueId, floorPattern) {
    const key = venueId + '|' + (floorPattern || '');
    if (this.cache.has(key)) return this.cache.get(key);
    const v = VENUES[venueId] || VENUES.gym;
    const c = document.createElement('canvas');
    const W = X1 - X0;
    c.width = W;
    c.height = 720;
    const g = c.getContext('2d');
    g.translate(-X0, 0);
    // 벽
    const wall = g.createLinearGradient(0, 0, 0, 420);
    wall.addColorStop(0, v.wallTop);
    wall.addColorStop(1, v.wallBot);
    g.fillStyle = wall;
    g.fillRect(X0, 0, W, 720);
    // 현수막
    g.save();
    for (const bx of [250, 1030]) {
      g.fillStyle = 'rgba(0,0,0,0.35)';
      roundRect(g, bx - 170, 104, 340, 50, 10);
      g.fill();
      g.fillStyle = v.logo;
      roundRect(g, bx - 164, 110, 328, 38, 8);
      g.fill();
      g.fillStyle = '#fff';
      g.font = '24px "Black Han Sans", "Jua", sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(v.banner, bx, 130);
    }
    g.restore();
    // 관중 실루엣
    const rnd = seeded(venueId.length * 977 + 13);
    for (let row = 0; row < v.crowdRows; row++) {
      const y = 330 - row * 52;
      const size = 26 - row * 3;
      g.fillStyle = shade(v.crowd, row * 0.06);
      for (let x = X0; x < X1; x += size * 1.5) {
        if (rnd() > v.crowdDensity) continue;
        const hx = x + rnd() * 10;
        const hy = y - rnd() * 10;
        g.beginPath();
        g.arc(hx, hy, size * 0.48, 0, Math.PI * 2);
        g.fill();
        g.beginPath();
        g.ellipse(hx, hy + size * 1.1, size * 0.85, size * 0.75, 0, Math.PI, 0);
        g.fill();
      }
    }
    // 훈련장: 샌드백 실루엣과 창문
    if (venueId === 'training' || venueId === 'gym') {
      g.fillStyle = 'rgba(255,255,220,0.10)';
      for (let i = 0; i < 4; i++) g.fillRect(X0 + 200 + i * 520, 120, 160, 110);
      g.fillStyle = 'rgba(0,0,0,0.28)';
      for (const sx of [120, 1160]) {
        g.fillRect(sx - 2, 0, 4, 160);
        roundRect(g, sx - 34, 160, 68, 150, 30);
        g.fill();
      }
    }
    // 바닥(링 매트)
    g.fillStyle = v.apron;
    g.fillRect(X0, 410, W, 310);
    g.beginPath();
    g.moveTo(170, 420);
    g.lineTo(1110, 420);
    g.lineTo(1500, 720);
    g.lineTo(-220, 720);
    g.closePath();
    const fl = g.createLinearGradient(0, 420, 0, 720);
    fl.addColorStop(0, shade(v.floor, 0.12));
    fl.addColorStop(1, v.floor);
    g.fillStyle = fl;
    g.fill();
    // 바닥 무늬(상점 꾸미기)
    drawFloorPattern(g, floorPattern, v);
    // 바닥 가운데 로고
    g.save();
    g.translate(640, 560);
    g.scale(1, 0.32);
    g.beginPath();
    g.arc(0, 0, 210, 0, Math.PI * 2);
    g.lineWidth = 14;
    g.strokeStyle = hexA(v.logo, 0.55);
    g.stroke();
    g.beginPath();
    g.arc(0, 0, 150, 0, Math.PI * 2);
    g.fillStyle = hexA(v.logo, 0.25);
    g.fill();
    g.restore();
    // 링 가장자리
    g.strokeStyle = v.floorEdge;
    g.lineWidth = 8;
    g.beginPath();
    g.moveTo(170, 420);
    g.lineTo(1110, 420);
    g.stroke();
    this.cache.set(key, c);
    return c;
  }

  update(dt, excite) {
    this.time += dt;
    this.excite += (excite - this.excite) * Math.min(1, dt / 600);
    if (this.ropeShake > 0) this.ropeShake = Math.max(0, this.ropeShake - dt / 400);
  }

  draw(ctx, venueId, opts = {}) {
    const v = VENUES[venueId] || VENUES.gym;
    const st = this.getStatic(venueId, opts.floorPattern);
    ctx.drawImage(st, X0, 0);
    const t = this.time / 1000;
    // 천장 조명
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const lx = 260 + i * 253;
      const flick = 0.85 + 0.15 * Math.sin(t * 1.3 + i);
      const gr = ctx.createRadialGradient(lx, -40, 10, lx, 120, 420);
      gr.addColorStop(0, v.light.replace(/[\d.]+\)$/, (0.5 * flick).toFixed(2) + ')'));
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.moveTo(lx - 30, -10);
      ctx.lineTo(lx + 30, -10);
      ctx.lineTo(lx + 260, 560);
      ctx.lineTo(lx - 260, 560);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    // 카메라 플래시
    if (!opts.reduceFlash && v.flash > 0) {
      const rate = v.flash * (0.15 + this.excite * 1.4);
      for (const f of this.flashes) {
        if (f.life <= 0) {
          if (Math.random() < rate * 0.02) {
            f.x = X0 + Math.random() * (X1 - X0);
            f.y = 140 + Math.random() * 200;
            f.max = f.life = 80 + Math.random() * 120;
          }
          continue;
        }
        f.life -= 16;
        const a = Math.max(0, f.life / f.max);
        ctx.fillStyle = `rgba(255,255,255,${a * 0.9})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 3 + a * 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(255,255,255,${a * 0.18})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, 22 * a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // 관중 들썩임(흥분하면 머리 그림자가 위아래로)
    if (v.crowdRows > 0 && this.excite > 0.3) {
      ctx.fillStyle = shade(v.crowd, 0.02);
      const n = 26;
      for (let i = 0; i < n; i++) {
        const x = X0 + (i + 0.5) * ((X1 - X0) / n);
        const jump = Math.max(0, Math.sin(t * 9 + i * 1.7)) * 16 * this.excite;
        ctx.beginPath();
        ctx.arc(x, 352 - jump, 13, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 3 - 10, 300 - jump, 6, 40 * this.excite); // 들어 올린 팔
      }
    }
  }

  // 상대 뒤쪽 로프 (상대보다 먼저 그림)
  drawBackRopes(ctx, venueId) {
    const v = VENUES[venueId] || VENUES.gym;
    const sh = Math.sin(this.time / 40) * this.ropeShake * 6;
    for (let i = 0; i < 3; i++) {
      const y = 300 + i * 38;
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(110, y + 4);
      ctx.quadraticCurveTo(640, y + 10 + sh, 1170, y + 4);
      ctx.stroke();
      ctx.strokeStyle = v.rope[i];
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(110, y);
      ctx.quadraticCurveTo(640, y + 6 + sh, 1170, y);
      ctx.stroke();
    }
    // 코너 기둥
    for (const x of [110, 1170]) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      roundRect(ctx, x - 12, 270, 28, 170, 8);
      ctx.fill();
      ctx.fillStyle = v.post;
      roundRect(ctx, x - 14, 266, 28, 170, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(x - 8, 272, 6, 158);
    }
  }

  // 앞쪽(화면 양옆) 로프: 원근감
  drawFrontRopes(ctx, venueId) {
    const v = VENUES[venueId] || VENUES.gym;
    for (let i = 0; i < 3; i++) {
      for (const side of [-1, 1]) {
        const bx = side < 0 ? 110 : 1170;
        const by = 300 + i * 38;
        const fx = side < 0 ? -260 : 1540;
        const fy = 470 + i * 120;
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 16;
        ctx.beginPath();
        ctx.moveTo(bx, by + 4);
        ctx.lineTo(fx, fy + 8);
        ctx.stroke();
        ctx.strokeStyle = v.rope[i];
        ctx.lineWidth = 11;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(fx, fy);
        ctx.stroke();
      }
    }
  }
}

function drawFloorPattern(g, pattern, v) {
  if (!pattern || pattern === 'none') return;
  g.save();
  g.beginPath();
  g.moveTo(170, 420);
  g.lineTo(1110, 420);
  g.lineTo(1500, 720);
  g.lineTo(-220, 720);
  g.closePath();
  g.clip();
  if (pattern === 'stripes') {
    g.fillStyle = 'rgba(0,0,0,0.07)';
    for (let i = -10; i < 20; i++) {
      g.beginPath();
      g.moveTo(640 + i * 60, 420);
      g.lineTo(640 + i * 60 + 30, 420);
      g.lineTo(640 + i * 110 + 55, 720);
      g.lineTo(640 + i * 110, 720);
      g.fill();
    }
  } else if (pattern === 'stars') {
    g.fillStyle = 'rgba(255,200,40,0.22)';
    for (let i = 0; i < 40; i++) {
      const x = 100 + ((i * 271) % 1100);
      const y = 440 + ((i * 137) % 270);
      starPath(g, x, y, 14 * (0.6 + (y - 420) / 300), 5);
      g.fill();
    }
  } else if (pattern === 'checker') {
    for (let r = 0; r < 8; r++) {
      for (let c = -8; c < 8; c++) {
        if ((r + c) % 2) continue;
        const y0 = 420 + r * 38;
        const y1 = y0 + 38;
        const k0 = 1 + r * 0.17;
        const k1 = 1 + (r + 1) * 0.17;
        g.fillStyle = 'rgba(0,0,0,0.08)';
        g.beginPath();
        g.moveTo(640 + c * 70 * k0, y0);
        g.lineTo(640 + (c + 1) * 70 * k0, y0);
        g.lineTo(640 + (c + 1) * 70 * k1, y1);
        g.lineTo(640 + c * 70 * k1, y1);
        g.fill();
      }
    }
  } else if (pattern === 'flame') {
    const gr = g.createLinearGradient(0, 720, 0, 520);
    gr.addColorStop(0, 'rgba(255,90,20,0.45)');
    gr.addColorStop(1, 'rgba(255,200,40,0)');
    g.fillStyle = gr;
    g.beginPath();
    g.moveTo(-220, 720);
    for (let x = -220; x <= 1500; x += 60) g.lineTo(x + 30, 600 - Math.abs(Math.sin(x * 0.03)) * 90);
    g.lineTo(1500, 720);
    g.fill();
  } else if (pattern === 'tiger') {
    g.strokeStyle = 'rgba(30,20,0,0.18)';
    g.lineWidth = 14;
    for (let i = 0; i < 14; i++) {
      const x = -100 + i * 120;
      g.beginPath();
      g.moveTo(x, 430);
      g.quadraticCurveTo(x + 40, 560, x - 20, 720);
      g.stroke();
    }
  }
  g.restore();
}

export function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export function starPath(g, x, y, r, n = 5, inner = 0.45) {
  g.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let gg = (n >> 8) & 255;
  let b = n & 255;
  if (amt >= 0) {
    r += (255 - r) * amt; gg += (255 - gg) * amt; b += (255 - b) * amt;
  } else {
    r *= 1 + amt; gg *= 1 + amt; b *= 1 + amt;
  }
  return `rgb(${r | 0},${gg | 0},${b | 0})`;
}

export function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

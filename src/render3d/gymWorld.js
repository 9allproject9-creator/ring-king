// 문철 복싱 체육관 3D 환경: 벽돌·나무 벽, 천장 들보와 매달린 조명, 창문 햇살, 포스터, 링, 샌드백·스피드백,
// 덤벨 선반, 벤치, 정수기, 사물함, 거울, 화이트보드, 트로피 선반, 챔피언 벨트, 출입문. 전부 코드로 만든다.
import * as THREE from 'three';
import { toonMat, outlineMat, GEO, radialTex } from './toon.js';
import { drawPortrait } from '../render/portrait.js';

export const ROOM = { x0: -9, x1: 9, z0: -11, z1: 7, h: 6 };

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  t.userData.canvas = c;
  return t;
}

function woodTex() {
  return canvasTex(256, 256, (g, w, h) => {
    for (let i = 0; i < 8; i++) {
      const base = i % 2 ? [190, 140, 92] : [204, 156, 104];
      g.fillStyle = `rgb(${base.join(',')})`;
      g.fillRect(0, i * 32, w, 32);
      // 나뭇결
      g.strokeStyle = 'rgba(90,50,20,0.15)';
      g.lineWidth = 1;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        const y = i * 32 + 4 + k * 6;
        g.moveTo(0, y);
        for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + i + k) * 1.5);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.18)';
      g.fillRect(0, i * 32, w, 2);
      g.fillRect(((i * 97) % w), i * 32, 2, 32);
    }
  }, [6, 6]);
}

function brickTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#d8cbb8';
    g.fillRect(0, 0, w, h);
    const bw = 64, bh = 28;
    for (let r = 0; r < h / bh + 1; r++) {
      for (let c = -1; c < w / bw + 1; c++) {
        const x = c * bw + (r % 2 ? bw / 2 : 0);
        const shade = 150 + ((r * 7 + c * 13) % 5) * 9;
        g.fillStyle = `rgb(${shade + 20},${shade - 50},${shade - 70})`;
        g.fillRect(x + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  }, [5, 2]);
}

function rubberTex() {
  return canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#2c3a30';
    g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,0.05)';
    for (let i = 0; i < 300; i++) g.fillRect((i * 37) % w, (i * 53) % h, 2, 2);
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 3;
    g.strokeRect(1, 1, w - 2, h - 2);
  }, [3, 3]);
}

export function posterTex(opp, label) {
  return canvasTex(256, 360, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#1a1030');
    gr.addColorStop(1, '#5a1a2a');
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const pc = document.createElement('canvas');
    pc.width = pc.height = 220;
    try { drawPortrait(pc, opp.look, opp.look.idleExpr || 'normal', { bgColor: '#ffd23a', bgColor2: '#c8501a' }); } catch (e) { /* 무시 */ }
    g.drawImage(pc, 18, 60, 220, 220);
    g.fillStyle = '#ffd23a';
    g.font = '30px "Black Han Sans", "Jua", sans-serif';
    g.textAlign = 'center';
    g.fillText(label || '다음 상대', w / 2, 44);
    g.fillStyle = '#fff';
    g.font = '34px "Black Han Sans", "Jua", sans-serif';
    g.fillText(`${opp.nick} ${opp.name}`, w / 2, 322);
    g.strokeStyle = '#ffd23a';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  });
}

export function buildGym() {
  const g = new THREE.Group();
  const ol = outlineMat(0.018);
  const colliders = [];
  const boxes = [];
  const add = (geo, mat, outline = true) => {
    const m = new THREE.Mesh(geo, mat);
    if (outline) m.add(new THREE.Mesh(geo, ol));
    g.add(m);
    return m;
  };
  const W = ROOM.x1 - ROOM.x0;
  const D = ROOM.z1 - ROOM.z0;
  const cx = (ROOM.x0 + ROOM.x1) / 2;
  const cz = (ROOM.z0 + ROOM.z1) / 2;

  // 바닥: 나무 + 고무 매트
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toonMat('#ffffff', { map: woodTex() }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(cx, 0, cz);
  g.add(floor);
  const rubber = toonMat('#ffffff', { map: rubberTex() });
  for (const [x, z, w, d] of [[-7, -3, 3.6, 10], [6.8, 4.2, 4, 4.2]]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), rubber);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, z);
    g.add(m);
  }
  // 벽: 아래 벽돌, 위 페인트, 걸레받이
  const brick = toonMat('#ffffff', { map: brickTex() });
  const paint = toonMat('#3d5a6e');
  const base = toonMat('#2a2018');
  const walls = [
    { w: W, x: cx, z: ROOM.z0, ry: 0 },
    { w: W, x: cx, z: ROOM.z1, ry: Math.PI },
    { w: D, x: ROOM.x0, z: cz, ry: Math.PI / 2 },
    { w: D, x: ROOM.x1, z: cz, ry: -Math.PI / 2 },
  ];
  for (const wl of walls) {
    const low = new THREE.Mesh(new THREE.PlaneGeometry(wl.w, 2.6), brick);
    low.position.set(wl.x, 1.3, wl.z);
    low.rotation.y = wl.ry;
    g.add(low);
    const up = new THREE.Mesh(new THREE.PlaneGeometry(wl.w, ROOM.h - 2.6), paint);
    up.position.set(wl.x, 2.6 + (ROOM.h - 2.6) / 2, wl.z);
    up.rotation.y = wl.ry;
    g.add(up);
    const bb = new THREE.Mesh(new THREE.BoxGeometry(wl.w, 0.18, 0.06), base);
    bb.position.set(wl.x, 0.09, wl.z);
    bb.rotation.y = wl.ry;
    g.add(bb);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(wl.w, 0.12, 0.05), toonMat('#ffd23a'));
    stripe.position.set(wl.x, 2.62, wl.z);
    stripe.rotation.y = wl.ry;
    g.add(stripe);
  }
  // 천장과 들보
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toonMat('#1c1a22'));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(cx, ROOM.h, cz);
  g.add(ceil);
  const beamMat = toonMat('#4a3424');
  for (let z = ROOM.z0 + 2; z < ROOM.z1; z += 3) {
    const b = add(new THREE.BoxGeometry(W, 0.3, 0.35), beamMat);
    b.position.set(cx, ROOM.h - 0.2, z);
  }
  // 매달린 조명 + 빛 기둥
  const shadeMat = toonMat('#2a5a3a');
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 });
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const lamps = [];
  for (const [x, z] of [[-5, -7], [0, -7], [5, -7], [-5, -1.5], [0, -1.5], [5, -1.5], [-5, 4], [0, 4], [5, 4]]) {
    const cord = new THREE.Mesh(GEO.cyl, toonMat('#111'));
    cord.scale.set(0.015, 1.0, 0.015);
    cord.position.set(x, ROOM.h - 0.5, z);
    g.add(cord);
    const shade = add(new THREE.ConeGeometry(0.42, 0.32, 16, 1, true), shadeMat);
    shade.material.side = THREE.DoubleSide;
    shade.position.set(x, ROOM.h - 1.1, z);
    const bulb = new THREE.Mesh(GEO.sphereLo, bulbMat);
    bulb.scale.setScalar(0.12);
    bulb.position.set(x, ROOM.h - 1.25, z);
    g.add(bulb);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, ROOM.h - 1.2, 18, 1, true), coneMat.clone());
    cone.position.set(x, (ROOM.h - 1.2) / 2, z);
    g.add(cone);
    lamps.push(cone);
  }
  // 창문과 햇살
  const winMat = new THREE.MeshBasicMaterial({ color: 0xcfe8ff });
  const frameMat = toonMat('#f4f4f4');
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const sun = [];
  for (const z of [-8, -3, 2]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.6), winMat);
    win.position.set(ROOM.x1 - 0.02, 4.2, z);
    win.rotation.y = -Math.PI / 2;
    g.add(win);
    for (const [w, h, y, dz] of [[0.08, 1.7, 4.2, 0], [2.3, 0.08, 4.2, 0], [2.3, 0.1, 5.05, 0], [2.3, 0.1, 3.35, 0]]) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, w), frameMat);
      f.position.set(ROOM.x1 - 0.04, y, z + dz);
      g.add(f);
    }
    const shaft = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 6.5), sunMat.clone());
    shaft.position.set(ROOM.x1 - 2.4, 2.3, z - 0.6);
    shaft.rotation.set(0, -Math.PI / 2, 0.85);
    g.add(shaft);
    sun.push(shaft);
  }
  // 현수막
  const banner = canvasTex(512, 96, (c, w, h) => {
    c.fillStyle = '#b23a2e';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#ffd23a';
    c.fillRect(0, 0, w, 8);
    c.fillRect(0, h - 8, w, 8);
    c.fillStyle = '#fff';
    c.font = '54px "Black Han Sans", "Jua", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('문철 복싱 체육관', w / 2, h / 2 + 2);
  });
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.1), new THREE.MeshBasicMaterial({ map: banner }));
  bm.position.set(0, 4.9, ROOM.z0 + 0.03);
  g.add(bm);
  // 큰 포스터 자리(다음 상대) + 작은 포스터들
  const posterMain = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.5), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  posterMain.position.set(-4.6, 3.6, ROOM.z0 + 0.03);
  g.add(posterMain);
  const posterSide = [];
  for (const [x, z, ry] of [[ROOM.x0 + 0.03, -9, Math.PI / 2], [ROOM.x0 + 0.03, 6, Math.PI / 2], [4.6, ROOM.z0 + 0.03, 0]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.7), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    p.position.set(x, 3.7, z);
    p.rotation.y = ry;
    g.add(p);
    posterSide.push(p);
  }

  // 링 (커리어)
  const ring = new THREE.Group();
  const RH = 2.7;
  const plat = new THREE.Mesh(new THREE.BoxGeometry(RH * 2 + 0.5, 0.6, RH * 2 + 0.5), toonMat('#2d4fa0'));
  plat.add(new THREE.Mesh(plat.geometry, ol));
  plat.position.y = 0.3;
  ring.add(plat);
  const matTex = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#e4dccb';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#b23a2e';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = 'rgba(178,58,46,0.6)';
    c.font = '40px "Black Han Sans", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('문철', w / 2, h / 2);
  });
  const mat = new THREE.Mesh(new THREE.PlaneGeometry(RH * 2 + 0.4, RH * 2 + 0.4), toonMat('#ffffff', { map: matTex }));
  mat.rotation.x = -Math.PI / 2;
  mat.position.y = 0.61;
  ring.add(mat);
  const ropeCols = ['#e23b3b', '#f2f2f2', '#2d5fd0'];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(GEO.cyl, toonMat('#d8d8d8'));
    p.scale.set(0.07, 1.5, 0.07);
    p.position.set(sx * RH, 1.35, sz * RH);
    p.add(new THREE.Mesh(GEO.cyl, ol));
    ring.add(p);
    for (let i = 0; i < 3; i++) {
      const pad = new THREE.Mesh(GEO.box, toonMat(ropeCols[i]));
      pad.scale.set(0.18, 0.2, 0.18);
      pad.position.set(sx * (RH - 0.05), 1.05 + i * 0.35, sz * (RH - 0.05));
      ring.add(pad);
    }
  }
  for (let i = 0; i < 3; i++) {
    const y = 1.05 + i * 0.35;
    for (const [a, b] of [[[-RH, -RH], [RH, -RH]], [[-RH, RH], [RH, RH]], [[-RH, -RH], [-RH, RH]], [[RH, -RH], [RH, RH]]]) {
      const A = new THREE.Vector3(a[0], y, a[1]);
      const B = new THREE.Vector3(b[0], y, b[1]);
      const r = new THREE.Mesh(GEO.cyl, toonMat(ropeCols[i]));
      r.scale.set(0.028, A.distanceTo(B), 0.028);
      r.position.copy(A).add(B).multiplyScalar(0.5);
      r.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
      ring.add(r);
    }
  }
  // 계단
  for (let i = 0; i < 2; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.4), toonMat('#5a4030'));
    st.add(new THREE.Mesh(st.geometry, ol));
    st.position.set(0, 0.1 + i * 0.2, RH + 0.55 - i * 0.35);
    ring.add(st);
  }
  ring.position.set(0, 0, -6.6);
  g.add(ring);
  boxes.push({ x0: -RH - 0.35, x1: RH + 0.35, z0: -6.6 - RH - 0.35, z1: -6.6 + RH + 0.35 });

  // 샌드백 3개 (칠 수 있음)
  const bags = [];
  const bagCols = ['#8a3a2a', '#2a4a8a', '#222'];
  [-7.4, -4.4, -1.4].forEach((z, i) => {
    const pivot = new THREE.Group();
    pivot.position.set(-7.0, 3.4, z);
    g.add(pivot);
    const chain = new THREE.Mesh(GEO.cyl, toonMat('#8a8a8a'));
    chain.scale.set(0.02, ROOM.h - 3.4, 0.02);
    chain.position.set(-7.0, 3.4 + (ROOM.h - 3.4) / 2, z);
    g.add(chain);
    const bag = new THREE.Mesh(GEO.capsule, toonMat(bagCols[i]));
    bag.scale.set(0.58, 1.15, 0.58);
    bag.position.y = -1.3;
    bag.add(new THREE.Mesh(GEO.capsule, ol));
    pivot.add(bag);
    const band = new THREE.Mesh(GEO.cyl, toonMat('#ffd23a'));
    band.scale.set(0.296, 0.12, 0.296);
    band.position.y = -1.0;
    pivot.add(band);
    bags.push({ pivot, pos: new THREE.Vector3(-7.0, 1.6, z), sx: 0, sz: 0, vx: 0, vz: 0 });
    colliders.push({ x: -7.0, z, r: 0.45 });
  });
  // 스피드백 (왼쪽 벽, 앞쪽)
  const sbBoard = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 20), toonMat('#5a3a22'));
  sbBoard.add(new THREE.Mesh(sbBoard.geometry, ol));
  sbBoard.position.set(-8.4, 2.25, 3.2);
  g.add(sbBoard);
  const sbArm = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.06), toonMat('#333'));
  sbArm.position.set(-8.7, 2.25, 3.2);
  g.add(sbArm);
  const sbPivot = new THREE.Group();
  sbPivot.position.set(-8.25, 2.2, 3.2);
  g.add(sbPivot);
  const sb = new THREE.Mesh(GEO.sphere, toonMat('#c8302a'));
  sb.scale.set(0.13, 0.19, 0.13);
  sb.position.y = -0.2;
  sb.add(new THREE.Mesh(GEO.sphere, ol));
  sbPivot.add(sb);
  const speedBag = { pivot: sbPivot, pos: new THREE.Vector3(-8.25, 2.0, 3.2), ang: 0, v: 0 };
  colliders.push({ x: -8.3, z: 3.2, r: 0.4 });

  // 덤벨 선반 + 벤치 (오른쪽 앞)
  const rack = add(new THREE.BoxGeometry(2.6, 0.9, 0.5), toonMat('#3a3a42'));
  rack.position.set(8.3, 0.45, 4.2);
  rack.rotation.y = Math.PI / 2;
  const dbCols = ['#e23b3b', '#2d5fd0', '#2fb556', '#ffd23a', '#888'];
  for (let i = 0; i < 5; i++) {
    for (const s of [-1, 1]) {
      const plate = new THREE.Mesh(GEO.cyl, toonMat(dbCols[i]));
      plate.scale.set(0.12, 0.08, 0.12);
      plate.rotation.x = Math.PI / 2;
      plate.position.set(8.3, 1.0, 3.1 + i * 0.55 + s * 0.14);
      g.add(plate);
    }
    const handle = new THREE.Mesh(GEO.cyl, toonMat('#bbb'));
    handle.scale.set(0.025, 0.28, 0.025);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(8.3, 1.0, 3.1 + i * 0.55);
    g.add(handle);
  }
  colliders.push({ x: 8.3, z: 4.2, r: 1.3 });
  const bench = add(new THREE.BoxGeometry(1.6, 0.12, 0.45), toonMat('#b23a2e'));
  bench.position.set(5.6, 0.55, 4.6);
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.4), toonMat('#222'));
    leg.position.set(5.6 + s * 0.65, 0.25, 4.6);
    g.add(leg);
  }
  colliders.push({ x: 5.6, z: 4.6, r: 0.8 });
  // 정수기 (왼쪽 앞)
  const cooler = add(new THREE.BoxGeometry(0.5, 1.0, 0.5), toonMat('#e8e8e8'));
  cooler.position.set(-8.4, 0.5, 5.6);
  const jug = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 16), new THREE.MeshToonMaterial({ color: 0x8ad0ff, transparent: true, opacity: 0.7 }));
  jug.position.set(-8.4, 1.25, 5.6);
  g.add(jug);
  colliders.push({ x: -8.4, z: 5.6, r: 0.5 });
  // 사물함 (앞벽 오른쪽)
  const lockerTex = canvasTex(64, 128, (c, w, h) => {
    c.fillStyle = '#4a7ab8';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2a4a78';
    c.lineWidth = 4;
    c.strokeRect(2, 2, w - 4, h - 4);
    c.fillStyle = '#2a4a78';
    for (let i = 0; i < 4; i++) c.fillRect(16, 12 + i * 6, 32, 2);
    c.fillStyle = '#ddd';
    c.fillRect(48, 64, 6, 14);
  });
  for (let i = 0; i < 6; i++) {
    const l = add(new THREE.BoxGeometry(0.55, 2.0, 0.5), toonMat('#ffffff', { map: lockerTex }));
    l.position.set(3.0 + i * 0.58, 1.0, ROOM.z1 - 0.3);
  }
  boxes.push({ x0: 2.6, x1: 6.7, z0: ROOM.z1 - 0.6, z1: ROOM.z1 });
  // 거울 (앞벽 왼쪽)
  const mirrorTex = canvasTex(128, 128, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#9fb8c8');
    gr.addColorStop(0.45, '#e8f4ff');
    gr.addColorStop(0.55, '#c8dcea');
    gr.addColorStop(1, '#7a92a4');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.6)';
    c.lineWidth = 6;
    c.beginPath();
    c.moveTo(20, 100); c.lineTo(60, 30);
    c.moveTo(45, 110); c.lineTo(80, 50);
    c.stroke();
  });
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.0), new THREE.MeshBasicMaterial({ map: mirrorTex }));
  mirror.position.set(-4.0, 1.6, ROOM.z1 - 0.07);
  mirror.rotation.y = Math.PI;
  g.add(mirror);
  const mf = add(new THREE.BoxGeometry(3.6, 2.2, 0.05), toonMat('#5a3a22'));
  mf.position.set(-4.0, 1.6, ROOM.z1 - 0.01);
  // 출입문 (앞벽 가운데) + EXIT
  const door = add(new THREE.BoxGeometry(1.4, 2.4, 0.08), toonMat('#7a5232'));
  door.position.set(0, 1.2, ROOM.z1 - 0.05);
  const knob = new THREE.Mesh(GEO.sphereLo, toonMat('#ffd23a'));
  knob.scale.setScalar(0.06);
  knob.position.set(0.5, 1.15, ROOM.z1 - 0.12);
  g.add(knob);
  const exitTex = canvasTex(128, 48, (c, w, h) => {
    c.fillStyle = '#1a8a3a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.font = 'bold 30px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('나가기', w / 2, h / 2 + 1);
  });
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.3), new THREE.MeshBasicMaterial({ map: exitTex }));
  exit.position.set(0, 2.65, ROOM.z1 - 0.04);
  exit.rotation.y = Math.PI;
  g.add(exit);
  // 상점 카운터 (오른쪽 뒤)
  const counter = add(new THREE.BoxGeometry(0.8, 1.05, 2.8), toonMat('#3a7a3a'));
  counter.position.set(7.6, 0.52, -7.0);
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 2.9), toonMat('#ffd23a'));
  top.position.set(7.6, 1.07, -7.0);
  g.add(top);
  const glCols = ['#e0352f', '#2f7de1', '#2fb556', '#ffd23a', '#ff6fa8'];
  glCols.forEach((c, i) => {
    const gl = new THREE.Mesh(GEO.sphere, toonMat(c));
    gl.scale.set(0.15, 0.17, 0.16);
    gl.position.set(7.6, 1.25, -8.0 + i * 0.5);
    gl.add(new THREE.Mesh(GEO.sphere, ol));
    g.add(gl);
  });
  const shopShelf = add(new THREE.BoxGeometry(0.3, 2.4, 2.8), toonMat('#5a3a22'));
  shopShelf.position.set(ROOM.x1 - 0.2, 1.6, -7.0);
  const shopSign = canvasTex(256, 64, (c, w, h) => {
    c.fillStyle = '#2fb556';
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.font = '40px "Black Han Sans", "Jua", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🛍 상점', w / 2, h / 2 + 2);
  });
  const ss = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.45), new THREE.MeshBasicMaterial({ map: shopSign }));
  ss.position.set(ROOM.x1 - 0.06, 3.2, -7.0);
  ss.rotation.y = -Math.PI / 2;
  g.add(ss);
  boxes.push({ x0: 7.1, x1: ROOM.x1, z0: -8.5, z1: -5.5 });
  // 트로피 선반 (오른쪽 벽 가운데)
  const shelfMat = toonMat('#5a3a22');
  for (const y of [1.1, 1.9, 2.7]) {
    const s = add(new THREE.BoxGeometry(0.45, 0.08, 3.2), shelfMat);
    s.position.set(ROOM.x1 - 0.25, y, -2.3);
  }
  const trophyGroup = new THREE.Group();
  g.add(trophyGroup);
  colliders.push({ x: ROOM.x1 - 0.3, z: -2.3, r: 0.4 });
  // 화이트보드 (오른쪽 벽 앞)
  const boardTex = canvasTex(512, 320, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 512, 320); });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(ROOM.x1 - 0.085, 1.9, 1.4);
  board.rotation.y = -Math.PI / 2;
  g.add(board);
  const bf = add(new THREE.BoxGeometry(0.05, 1.75, 2.75), toonMat('#888'));
  bf.position.set(ROOM.x1 - 0.03, 1.9, 1.4);
  // 챔피언 벨트 진열장 (클리어 후)
  const beltGroup = new THREE.Group();
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.9), toonMat('#222'));
  stand.add(new THREE.Mesh(stand.geometry, ol));
  stand.position.y = 0.5;
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.9, 0.85), new THREE.MeshToonMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0.25 }));
  glass.position.y = 1.45;
  const belt = new THREE.Mesh(GEO.torus, toonMat('#ffd23a', { emissive: new THREE.Color(0x443300) }));
  belt.scale.set(0.3, 0.3, 0.55);
  belt.position.y = 1.45;
  beltGroup.add(stand, glass, belt);
  beltGroup.position.set(7.8, 0, -10.0);
  g.add(beltGroup);
  colliders.push({ x: 7.8, z: -10.0, r: 0.7 });

  // 온라인 대전 모니터 (왼쪽 벽)
  const tvTex = canvasTex(256, 160, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#0a2a5a');
    gr.addColorStop(1, '#1a6ad8');
    c.fillStyle = gr;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff';
    c.font = '34px "Black Han Sans", "Jua", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('🌐 온라인 1:1', w / 2, 62);
    c.font = '22px "Jua", sans-serif';
    c.fillStyle = '#ffd23a';
    c.fillText('친구와 실시간 대결!', w / 2, 112);
  });
  const tv = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.15, 1.8), toonMat('#111'));
  tv.add(new THREE.Mesh(tv.geometry, ol));
  tv.position.set(ROOM.x0 + 0.08, 2.3, 0.9);
  g.add(tv);
  const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 1.0), new THREE.MeshBasicMaterial({ map: tvTex }));
  tvScreen.position.set(ROOM.x0 + 0.15, 2.3, 0.9);
  tvScreen.rotation.y = Math.PI / 2;
  g.add(tvScreen);

  // 조명
  g.add(new THREE.HemisphereLight(0xfff4e0, 0x5a3a22, 1.25));
  const dl = new THREE.DirectionalLight(0xfff0d8, 1.1);
  dl.position.set(6, 8, 2);
  g.add(dl);
  const pl = new THREE.PointLight(0xffe0a0, 6, 14, 1.6);
  pl.position.set(0, 4.5, -6.6);
  g.add(pl);

  return {
    group: g, colliders, boxes, bags, speedBag, trophyGroup, beltGroup, belt, lamps, sun,
    posterMain, posterSide, boardTex, ring,
  };
}

// 트로피 선반: 이긴 상대 수만큼 컵, 클리어하면 별 장식
export function fillTrophies(world, beaten) {
  const tg = world.trophyGroup;
  while (tg.children.length) tg.remove(tg.children[0]);
  const ol = outlineMat(0.012);
  const cols = ['#c87a3a', '#c8c8d8', '#ffd23a', '#ffd23a'];
  beaten.forEach((b, i) => {
    const mat = toonMat(cols[b.league] || '#ffd23a', { emissive: new THREE.Color(0x221100) });
    const cup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.05, 0.22, 12), mat);
    body.add(new THREE.Mesh(body.geometry, ol));
    body.position.y = 0.2;
    const handleL = new THREE.Mesh(GEO.torus, mat);
    handleL.scale.setScalar(0.05);
    handleL.position.set(0, 0.22, 0.12);
    const handleR = handleL.clone();
    handleR.position.z = -0.12;
    const baseM = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.14), toonMat('#222'));
    baseM.position.y = 0.03;
    cup.add(body, handleL, handleR, baseM);
    const row = Math.floor(i / 4);
    cup.position.set(ROOM.x1 - 0.25, [1.14, 1.94, 2.74][row] || 2.74, -3.5 + (i % 4) * 0.8);
    tg.add(cup);
  });
}

// 화이트보드 글씨
export function drawBoard(world, lines) {
  const c = world.boardTex.userData.canvas;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfbf6';
  g.fillRect(0, 0, c.width, c.height);
  g.textAlign = 'left';
  g.textBaseline = 'top';
  lines.forEach((ln, i) => {
    g.fillStyle = ln.color || '#1a3a8a';
    g.font = `${ln.size || 26}px "Jua", "Gowun Dodum", sans-serif`;
    g.fillText(ln.text, 22, 18 + lines.slice(0, i).reduce((s, l) => s + (l.size || 26) + 12, 0));
  });
  world.boardTex.needsUpdate = true;
}

export function lightTex() {
  return radialTex('rgba(255,240,200,0.9)', 'rgba(255,240,200,0)');
}

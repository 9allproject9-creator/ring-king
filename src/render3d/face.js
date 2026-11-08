// 3D 머리 앞쪽에 붙이는 얼굴 텍스처. 2D 표정 그리기(parts.js)를 그대로 재사용한다.
import * as THREE from 'three';
import { drawFace, drawFaceMarks } from '../render/characters/parts.js';

const SIZE = 256;

export class FaceTexture {
  constructor(look) {
    this.look = look;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = SIZE;
    this.ctx = this.canvas.getContext('2d');
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.key = '';
    this.pose = { expr: 'normal', glow: 0 };
  }

  setLook(look) {
    this.look = look;
    this.key = '';
  }

  update(expr, glow, glowColor, time, sweaty) {
    // 바뀐 게 있을 때만 다시 그린다(텔 중에는 반짝임 때문에 매 프레임)
    const g = Math.round(glow * 20) / 20;
    const animated = expr === 'dizzy';
    const key = `${expr}|${g}|${sweaty ? 1 : 0}|${animated ? Math.floor(time / 50) : 0}`;
    if (key === this.key) return;
    this.key = key;
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, SIZE, SIZE);
    c.save();
    c.translate(SIZE / 2, SIZE / 2 + 6);
    const R = 112;
    this.pose.expr = expr;
    this.pose.glow = g;
    drawFaceMarks(c, this.look, R, { time });
    drawFace(c, this.look, R, this.pose, { glowColor, time, sweaty });
    c.restore();
    this.tex.needsUpdate = true;
  }

  dispose() {
    this.tex.dispose();
  }
}

// 머리 앞면을 덮는 구 조각(얼굴판)
export function faceGeometry(r) {
  return new THREE.SphereGeometry(r * 1.012, 28, 20, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.95, 1.9);
}

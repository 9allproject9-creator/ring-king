// WebGL 무대: 렌더러, 장면, 카메라, 경기장. 메뉴와 경기 화면이 함께 쓴다.
import * as THREE from 'three';
import { Arena } from './arena.js';

export class Stage3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.ok = true;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', alpha: false });
    } catch (e) {
      this.ok = false;
      console.warn('WebGL을 쓸 수 없음', e);
      return;
    }
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x07070d, 1);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x07070d, 14, 30);
    this.camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.03, 80);
    this.baseFov = 52;
    this.scene.add(this.camera);
    this.arena = new Arena();
    this.scene.add(this.arena.group);
    this.maxDpr = 2;
    this.view = null;
    this._v = new THREE.Vector3();
  }

  resize(view) {
    if (!this.ok) return;
    this.view = view;
    const c = this.canvas;
    c.style.left = view.offX + 'px';
    c.style.top = view.offY + 'px';
    const pw = Math.round(view.w * view.scale);
    const ph = Math.round(view.h * view.scale);
    c.style.width = pw + 'px';
    c.style.height = ph + 'px';
    const dpr = Math.min(this.maxDpr, window.devicePixelRatio || 1);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(pw, ph, false);
    const cam = this.camera;
    cam.aspect = view.w / view.h;
    // 세로 화면: 시야를 넓히고 그림을 위로 올려 아래쪽을 조작 버튼 자리로 비운다
    this.baseFov = view.portrait ? 70 : 52;
    cam.fov = this.baseFov;
    if (view.portrait) cam.setViewOffset(view.w, view.h, 0, view.h * 0.2, view.w, view.h);
    else cam.clearViewOffset();
    cam.updateProjectionMatrix();
  }

  setQuality(maxDpr) {
    this.maxDpr = maxDpr;
    if (this.view) this.resize(this.view);
  }

  render() {
    if (!this.ok) return;
    this.renderer.render(this.scene, this.camera);
  }

  // 월드 좌표 → 논리 화면 좌표
  project(v, out = { x: 0, y: 0, behind: false }) {
    const p = this._v.copy(v).project(this.camera);
    const view = this.view;
    out.x = (p.x + 1) * 0.5 * view.w;
    out.y = (1 - p.y) * 0.5 * view.h;
    out.behind = p.z > 1;
    return out;
  }

  // 월드 좌표 → 카메라 좌표
  toCamera(v, out = new THREE.Vector3()) {
    this.camera.updateMatrixWorld();
    return out.copy(v).applyMatrix4(this.camera.matrixWorldInverse);
  }
}

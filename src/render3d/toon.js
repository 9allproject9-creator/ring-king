// 카툰 3D: 툰 셰이딩 재질과 뒷면 외곽선(inverted hull)
import * as THREE from 'three';

let gradTex = null;
export function gradientMap() {
  if (gradTex) return gradTex;
  const data = new Uint8Array([110, 110, 110, 255, 185, 185, 185, 255, 255, 255, 255, 255]);
  gradTex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
  gradTex.minFilter = THREE.NearestFilter;
  gradTex.magFilter = THREE.NearestFilter;
  gradTex.generateMipmaps = false;
  gradTex.needsUpdate = true;
  return gradTex;
}

export function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: gradientMap(), ...opts });
}

// 일정한 두께의 외곽선: 법선 방향으로 밀어낸 뒷면을 검게 그린다
export function outlineMat(thickness = 0.012, color = 0x1a1410) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.userData.thick = { value: thickness };
  m.onBeforeCompile = (sh) => {
    sh.uniforms.thick = m.userData.thick;
    // 크기(scale)와 상관없이 같은 두께가 되도록 카메라 공간에서 밀어낸다
    sh.vertexShader = 'uniform float thick;\n' + sh.vertexShader.replace(
      '#include <project_vertex>',
      `vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );
      vec3 nrmV = normalize( normalMatrix * normal );
      mvPosition.xyz += nrmV * thick;
      gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  return m;
}

// 메시 + 외곽선 묶음
export function inked(geo, mat, outline) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geo, mat);
  g.add(m);
  if (outline) {
    const o = new THREE.Mesh(geo, outline);
    o.renderOrder = -1;
    g.add(o);
  }
  g.userData.mesh = m;
  return g;
}

// 공용 도형 (단위 크기, 비율은 scale로)
export const GEO = {
  sphere: new THREE.SphereGeometry(1, 22, 16),
  sphereLo: new THREE.SphereGeometry(1, 12, 9),
  capsule: new THREE.CapsuleGeometry(0.5, 1, 6, 12), // 길이 1 + 양쪽 반구
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 10),
  box: new THREE.BoxGeometry(1, 1, 1),
  torus: new THREE.TorusGeometry(1, 0.18, 8, 24),
};

const _up = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();

// a→b를 잇는 캡슐(팔·다리). thick = 지름(m)
export function placeLimb(obj, a, b, thick) {
  _dir.subVectors(b, a);
  const len = Math.max(0.001, _dir.length());
  obj.position.copy(a).addScaledVector(_dir, 0.5);
  obj.quaternion.setFromUnitVectors(_up, _dir.multiplyScalar(1 / len));
  // 캡슐 전체 길이 = 1 + 반구(0.5*2) → 원하는 길이에서 지름만큼 빼서 몸통 길이로
  obj.scale.set(thick, Math.max(0.001, len - thick * 0.6), thick);
}

export function disposeTree(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      if (o.geometry && !Object.values(GEO).includes(o.geometry)) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}

// 부드러운 원형 텍스처(그림자, 빛 번짐)
const texCache = new Map();
export function radialTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 128) {
  const key = inner + outer + size;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner);
  gr.addColorStop(1, outer);
  g.fillStyle = gr;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

export function starTex(color = '#ffe23a') {
  const key = 'star' + color;
  if (texCache.has(key)) return texCache.get(key);
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 32);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 12 : 28;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath();
  g.fillStyle = color;
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#1a1410';
  g.stroke();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

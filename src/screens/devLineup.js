// 개발용: 상대 10명을 3D로 나란히 세워 실루엣·머리·색을 확인한다 (?dev=lineup)
import * as THREE from 'three';
import { Fighter3D } from '../render3d/fighter.js';
import { OPPONENTS } from '../data/opponents/index.js';
import { makePose, compileClip, sampleClip } from '../render/rig.js';
import { buildClipSet } from '../render/anims.js';

export class DevLineup {
  constructor(app) { this.app = app; }

  enter(params = {}) {
    const st = this.app.stage;
    st.arena.build('stadium');
    this.fighters = [];
    const set = buildClipSet();
    const idle = compileClip(set[params.clip || 'idle'], makePose());
    this.pose = sampleClip(makePose(), idle, 0.2);
    this.pose.expr = params.expr || 'normal';
    const list = params.only ? OPPONENTS.filter((o) => o.id === params.only) : OPPONENTS;
    list.forEach((o, i) => {
      const f = new Fighter3D(o.look);
      const n = list.length;
      f.root.position.x = (i - (n - 1) / 2) * 0.95;
      f.root.position.z = -Math.abs(i - (n - 1) / 2) * 0.12;
      st.scene.add(f.root);
      this.fighters.push(f);
    });
    const cam = st.camera;
    if (params.only) {
      cam.position.set(0.35, 1.55, 1.15);
      cam.lookAt(0, 1.45, 0);
    } else {
      cam.position.set(0, 1.7, 7.2);
      cam.lookAt(0, 1.1, 0);
    }
  }

  exit() {
    for (const f of this.fighters) { this.app.stage.scene.remove(f.root); f.dispose(); }
  }

  update(dt) {
    for (const f of this.fighters) {
      f.update(dt, this.pose, { glowColor: '#ff0', sweaty: false });
      f.root.position.x = f.root.position.x; // 포즈의 x는 쓰지 않음
    }
    this.app.stage.arena.update(dt, 0.3, false);
  }

  draw(ctx, view) {
    this.app.stage.render();
    ctx.clearRect(0, 0, view.w, view.h);
  }
}

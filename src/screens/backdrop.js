// 메뉴 화면 뒤에 깔리는 3D 장면: 경기장 + (선택) 상대가 서 있고 카메라가 천천히 돈다.
import * as THREE from 'three';
import { Fighter3D } from '../render3d/fighter.js';
import { OpponentAnimator } from '../render/opponentAnimator.js';

export class Backdrop {
  constructor(app) {
    this.app = app;
    this.fighter = null;
    this.anim = null;
    this.t = 0;
    this.mode = 'orbit';
    this.fakeOpp = { state: 'idle', t: 0, dur: 1e9, guardUp: true, pos: 0, fromPos: 0, hp: 1, maxHp: 1, atk: null, lastHitDir: 0 };
  }

  set({ venue = 'gym', opponent = null, mode = 'orbit', floor = null, state = 'idle' } = {}) {
    const st = this.app.stage;
    st.arena.build(venue, floor);
    st.arena.setPhaseMood('normal');
    this.mode = mode;
    const id = opponent ? opponent.id : null;
    if (this.fighterId !== id) {
      this.clearFighter();
      if (opponent) {
        this.fighter = new Fighter3D(opponent.look);
        this.anim = new OpponentAnimator(opponent);
        st.scene.add(this.fighter.root);
      }
      this.fighterId = id;
    }
    this.fakeOpp.state = state;
    this.fakeOpp.t = 0;
  }

  clearFighter() {
    if (this.fighter) {
      this.app.stage.scene.remove(this.fighter.root);
      this.fighter.dispose();
    }
    this.fighter = null;
    this.anim = null;
    this.fighterId = null;
  }

  update(dt) {
    this.t += dt;
    const st = this.app.stage;
    st.arena.update(dt, 0.35, this.app.settings.reduceFlash);
    const cam = st.camera;
    const reduce = this.app.settings.reduceMotion;
    const tt = reduce ? 0 : this.t / 1000;
    if (this.fighter) {
      this.fakeOpp.t += dt;
      const pose = this.anim.update(dt, this.fakeOpp, 0);
      this.fighter.update(dt, pose, { glowColor: '#fff' });
      this.fighter.root.position.x = 0;
    }
    if (this.mode === 'intro' && this.fighter) {
      // 상대 소개: 상반신을 비스듬히, 천천히 돈다
      const a = 0.45 + Math.sin(tt * 0.35) * 0.25;
      const h = this.fighter.d.hipY + this.fighter.d.T;
      cam.position.set(Math.sin(a) * 2.2, h + 0.15, Math.cos(a) * 2.2);
      cam.lookAt(0, h - 0.05, 0);
    } else {
      const a = tt * 0.08;
      cam.position.set(Math.sin(a) * 6.5, 2.6, Math.cos(a) * 6.5);
      cam.lookAt(0, 0.9, 0);
    }
    cam.fov = st.baseFov;
    cam.updateProjectionMatrix();
  }

  draw(ctx, view) {
    this.app.stage.render();
    ctx.clearRect(0, 0, view.w, view.h);
  }
}

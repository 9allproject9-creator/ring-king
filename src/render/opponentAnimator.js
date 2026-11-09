// 상대 로직 상태 → 포즈. 진행률은 로직 타이머에서 직접 계산해 판정과 그림이 어긋나지 않는다.
import { buildClipSet } from './anims.js';
import { compileClip, sampleClip, makePose, PoseBlender, lerpPose, Spring, EASE } from './rig.js';
import { CHARACTER_ANIMS } from './characters/index.js';

const SNAP_STATES = new Set(['active', 'whiff', 'hurt', 'counterStun', 'guardBroken', 'shoved']);
const POS_X = 190;

export class OpponentAnimator {
  constructor(data) {
    this.data = data;
    const extra = CHARACTER_ANIMS[data.id] || {};
    const set = buildClipSet(extra);
    this.clips = {};
    const base = makePose();
    for (const [k, v] of Object.entries(set)) this.clips[k] = compileClip(v, base);
    this.blender = new PoseBlender();
    this.tmp = makePose();
    this.tmp2 = makePose();
    this.out = makePose();
    this.time = 0;
    this.headSpringX = new Spring(0.35, 0.3);
    this.headSpringY = new Spring(0.35, 0.3);
    this.bodySpring = new Spring(0.25, 0.28);
    this.blockFlash = 0;
    this.x = 0;
    this.lastAnim = 'hookL';
  }

  clip(name) {
    return this.clips[name] || this.clips.idle;
  }

  onEvent(e) {
    if (e.type === 'hit') {
      const dir = e.punch === 'jab' ? -1 : e.punch === 'straight' ? 1 : 0;
      const k = Math.min(3, 0.8 + e.dmg / 6);
      this.headSpringX.kick(-dir * 14 * k);
      if (dir === 0) this.headSpringY.kick(-12 * k);
      this.bodySpring.kick(6 * k);
    } else if (e.type === 'block') {
      this.blockFlash = 260;
    }
  }

  // alpha: 고정 간격 사이 보간 비율
  update(dt, o, alphaMs = 0) {
    this.time += dt;
    if (this.blockFlash > 0) this.blockFlash -= dt;
    const t = o.t + alphaMs;
    const prog = o.dur > 0 ? Math.min(1, t / o.dur) : 0;
    const atk = o.atk;
    const anim = atk ? atk.anim : this.lastAnim;
    if (atk) this.lastAnim = atk.anim;
    let name = 'idle';
    let p = (this.time / 1400) % 1;
    let key = o.state;
    let blend = 90;
    switch (o.state) {
      case 'intro':
        name = 'idle';
        break;
      case 'idle':
      case 'chain':
        name = this.blockFlash > 0 ? 'block' : (o.guardUp || o.state === 'chain' ? (this.data.look.idleClip || 'idle') : 'idleOpen');
        key = name;
        if (this.blockFlash > 0) p = 1 - this.blockFlash / 260;
        else if (name === 'block') p = 1;
        else if (name === 'bounce') p = (this.time / 700) % 1;
        break;
      case 'tell':
        name = `${anim}_tell`;
        p = EASE.linear(prog);
        key = 'tell' + o.tellStartAt;
        blend = 60;
        break;
      case 'active':
        name = `${anim}_hit`;
        p = prog;
        break;
      case 'recover':
        name = `${anim}_hit`;
        p = 1;
        break;
      case 'whiff':
        name = `${anim}_whiff`;
        p = prog;
        break;
      case 'feintEnd':
        name = `${anim}_tell`;
        p = 1 - prog;
        break;
      case 'hurt':
        name = o.lastHitDir < 0 ? 'hurtL' : o.lastHitDir > 0 ? 'hurtR' : 'hurtUp';
        p = prog;
        key = 'hurt' + o.hp;
        break;
      case 'blockStance':
        name = 'block';
        p = 1;
        break;
      case 'step':
        name = o.guardUp ? 'idle' : 'idleOpen';
        break;
      case 'clinch':
        name = 'clinchHold';
        p = (this.time / 500) % 1;
        break;
      case 'taunt':
        name = 'taunt';
        p = (this.time / 900) % 1;
        break;
      case 'tired':
        name = 'tired';
        p = (this.time / 700) % 1;
        break;
      case 'win':
        name = 'win';
        p = (this.time / 600) % 1;
        break;
      case 'down':
        name = 'down';
        p = Math.min(1, t / 900);
        break;
      case 'getup':
      case 'ko':
      case 'phase':
      case 'counterStun':
      case 'guardBroken':
      case 'shoved':
        name = o.state;
        p = o.state === 'ko' ? Math.min(1, t / 1200) : prog;
        break;
      default:
        name = 'idle';
    }
    if (SNAP_STATES.has(o.state)) blend = o.state === 'active' ? 0 : 50;
    const target = sampleClip(this.tmp, this.clip(name), p);

    // 회복: 공격 끝 포즈에서 대기 포즈로 천천히 돌아감 (따라오는 동작)
    if (o.state === 'recover') {
      const idle = sampleClip(this.tmp2, this.clip('idle'), (this.time / 1400) % 1);
      lerpPose(target, target, idle, EASE.inOut(prog));
    }
    // 페인트: 눈 반짝임 없음, 능글맞은 표정
    if (o.state === 'tell' && o.fake) {
      target.glow = 0;
      target.expr = 'sly';
    }
    // 텔 마지막 25%: 부르르 떨림(곧 친다!)
    if (o.state === 'tell' && prog > 0.75 && !o.fake) {
      target.x += Math.sin(this.time / 18) * 2.5;
    }
    // 눈 깜빡임 (대기 중에만, 텔과 헷갈리지 않게)
    this.blinkT = (this.blinkT ?? 2500) - dt;
    if (this.blinkT < 0) this.blinkT = 2200 + Math.random() * 2800;
    if (this.blinkT < 110 && (o.state === 'idle' || o.state === 'intro' || o.state === 'chain') && (target.expr === 'normal' || target.expr === 'focus')) target.expr = 'blink';
    // 공격이 닿는 순간: 몸 전체가 앞으로 늘어남(찌그러짐·늘어남)
    if (o.state === 'active' && prog < 0.5) {
      target.sy *= 1 + 0.05 * Math.sin(prog * Math.PI * 2);
      target.sx *= 1 - 0.03 * Math.sin(prog * Math.PI * 2);
    }
    // 체력 낮음: 지친 표정
    if ((o.state === 'idle' || o.state === 'chain') && o.hp / o.maxHp < 0.3 && target.expr === 'normal') target.expr = 'tired';
    if ((o.state === 'idle' || o.state === 'intro') && target.expr === 'normal' && this.data.look.idleExpr) target.expr = this.data.look.idleExpr;

    const pose = this.blender.apply(key + name, target, dt, blend);
    // 스텝 위치
    let tx = o.pos * POS_X;
    if (o.state === 'step') {
      const k = EASE.inOut(prog);
      tx = (o.fromPos + (o.pos - o.fromPos) * k) * POS_X;
    }
    if (!Number.isFinite(tx)) tx = 0;
    this.x += (tx - this.x) * Math.min(1, dt / 70);
    if (!Number.isFinite(this.x)) this.x = 0;
    const out = this.out;
    for (const k of Object.keys(pose)) out[k] = pose[k];
    out.hx += this.headSpringX.update(dt);
    out.hy += this.headSpringY.update(dt);
    out.y += this.bodySpring.update(dt);
    if (o.state === 'step') out.rot += Math.sin(prog * Math.PI) * 0.08 * Math.sign(o.pos - o.fromPos);
    if (out.shake > 0) {
      out.x += (Math.random() - 0.5) * 8 * out.shake;
      out.y += (Math.random() - 0.5) * 4 * out.shake;
    }
    out.x += this.x;
    return out;
  }
}

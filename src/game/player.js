// 내 선수 상태 머신. 화면·소리와 무관하다.
import { CONFIG } from '../config.js';
import { firstAction, PRESS_MASK, IN } from './inputBits.js';
import { COMBOS } from '../data/combos.js';

const DODGE_OF = { dodgeL: 'L', dodgeR: 'R', duck: 'duck' };
const PUNCHES = new Set(['jab', 'straight', 'upper', 'special']);

export class Player {
  constructor(opts = {}) {
    this.cfg = opts.cfg || CONFIG.player;
    const c = this.cfg;
    this.maxHp = c.maxHp;
    this.hp = c.maxHp;
    this.maxStamina = c.maxStamina;
    this.stamina = c.maxStamina;
    this.maxGuard = c.maxGuard;
    this.guard = c.maxGuard;
    this.stars = 0;
    this.state = 'idle';
    this.t = 0;
    this.dur = 0;
    this.action = null; // 펀치 이름 또는 피하기 종류(L/R/duck)
    this.resolved = false;
    this.extraRecovery = 0;
    this.buffer = null;
    this.guardHeld = false;
    this.history = []; // 최근 펀치 {id, at}
    this.comboName = null;
    this.comboBonus = 0;
    this.monotony = 0;
    this.specialStars = 0;
    this.downsRound = 0;
    this.downsTotal = 0;
    this.mash = 0;
    this.mashRequired = 0;
    this.lastDodgeAt = -1e9;
    this.lastDodgeType = null;
    this.lastHitAt = -1e9;
    this.prevState = 'idle';
  }

  get actionable() {
    return this.state === 'idle' || this.state === 'guard';
  }

  get dodgeType() {
    return this.state === 'dodge' ? this.action : null;
  }

  isInvuln() {
    if (this.state === 'getup' || this.state === 'down') return true;
    if (this.state !== 'dodge') return false;
    const d = this.cfg.dodges[this.action];
    return this.t >= d.invulnStart && this.t < d.invulnEnd;
  }

  // 펀치 단계: 'startup' | 'active' | 'recovery'
  punchPhase() {
    if (this.state !== 'punch') return null;
    const pc = this.cfg.punches[this.action];
    if (this.t < pc.startup) return 'startup';
    if (this.t < pc.startup + pc.active) return 'active';
    return 'recovery';
  }

  enter(state, dur = 0) {
    this.prevState = this.state;
    this.state = state;
    this.t = 0;
    this.dur = dur;
  }

  addStar(fight) {
    const max = CONFIG.combat.starMax;
    if (this.stars < max) {
      this.stars++;
      fight && fight.emit({ type: 'star', stars: this.stars });
    }
  }

  loseStar(fight, all = false) {
    if (this.stars <= 0) return;
    const before = this.stars;
    this.stars = all ? 0 : this.stars - 1;
    fight && fight.emit({ type: 'starLost', stars: this.stars, lost: before - this.stars });
  }

  spendStamina(n) {
    this.stamina = Math.max(0, this.stamina - n);
  }

  // 공격 히트스톱 중 눌린 버튼은 버퍼에 담아 둔다.
  bufferInput(input) {
    const a = firstAction(input & PRESS_MASK);
    if (a) this.buffer = { action: a, age: 0 };
    this.guardHeld = !!(input & IN.GUARD);
  }

  update(dt, input, fight) {
    const c = this.cfg;
    const pressed = firstAction(input & PRESS_MASK);
    this.guardHeld = !!(input & IN.GUARD);
    this.t += dt;

    // 회복량
    const sec = dt / 1000;
    if (this.state === 'idle') this.stamina += c.stamina.regenIdlePerSec * sec;
    else if (this.state === 'guard' || this.state === 'dodge' || this.state === 'guardRelease') this.stamina += c.stamina.regenBusyPerSec * sec;
    else if (this.state === 'winded') this.stamina += (c.stamina.windedRecoverTo / (c.stamina.windedMs / 1000)) * sec;
    if (this.stamina > this.maxStamina) this.stamina = this.maxStamina;
    if (this.state !== 'guard' && this.state !== 'guardBroken') {
      this.guard = Math.min(this.maxGuard, this.guard + c.guard.regenPerSec * sec);
    }

    if (this.buffer) {
      this.buffer.age += dt;
      if (this.buffer.age > c.inputBufferMs) this.buffer = null;
    }

    switch (this.state) {
      case 'idle':
      case 'guard': {
        if (pressed && this.tryStart(pressed, fight)) break;
        if (this.buffer && this.tryStart(this.buffer.action, fight)) { this.buffer = null; break; }
        if (this.guardHeld) {
          if (this.state !== 'guard') this.enter('guard');
        } else if (this.state === 'guard') {
          this.enter('guardRelease', c.guard.releaseMs);
        }
        break;
      }
      case 'guardRelease':
        if (pressed) this.buffer = { action: pressed, age: 0 };
        if (this.t >= this.dur) this.finish(fight);
        break;
      case 'punch': {
        if (pressed) this.buffer = { action: pressed, age: 0 };
        const pc = c.punches[this.action];
        if (!this.resolved && this.t >= pc.startup) {
          this.resolved = true;
          fight.onPlayerPunchActive(this.action);
          if (this.state !== 'punch') break; // 맞아서 끊겼을 수 있음
        }
        if (this.t >= pc.startup + pc.active + pc.recovery + this.extraRecovery) this.finish(fight);
        break;
      }
      case 'dodge': {
        if (pressed) this.buffer = { action: pressed, age: 0 };
        if (this.t >= this.dodgeEnd()) this.finish(fight);
        break;
      }
      case 'hurt':
      case 'guardBroken':
      case 'winded':
      case 'getup':
        if (pressed) this.buffer = { action: pressed, age: 0 };
        if (this.t >= this.dur) {
          if (this.state === 'winded') this.stamina = Math.max(this.stamina, c.stamina.windedRecoverTo);
          if (this.state === 'guardBroken') this.guard = this.maxGuard * 0.5;
          this.finish(fight);
        }
        break;
      default:
        break; // down, clinched 등은 Fight가 처리
    }
  }

  finish(fight) {
    this.action = null;
    this.extraRecovery = 0;
    if (this.stamina <= 0) {
      this.enter('winded', this.cfg.stamina.windedMs);
      this.buffer = null;
      fight && fight.emit({ type: 'winded' });
      return;
    }
    this.enter(this.guardHeld ? 'guard' : 'idle');
    if (this.buffer && this.tryStart(this.buffer.action, fight)) this.buffer = null;
  }

  tryStart(action, fight) {
    const c = this.cfg;
    if (this.stamina <= 0) return false;
    if (DODGE_OF[action]) {
      const type = DODGE_OF[action];
      this.spendStamina(c.dodges[type].stamina);
      this.enter('dodge');
      this.action = type;
      this.dodgeEndAt = null;
      this.lastDodgeAt = fight ? fight.clock : 0;
      this.lastDodgeType = type;
      fight && fight.onPlayerDodgeStart(type);
      return true;
    }
    if (!PUNCHES.has(action)) return false;
    if (action === 'special') {
      if (this.stars <= 0) return false;
      this.specialStars = this.stars;
      this.stars = 0;
    }
    const pc = c.punches[action];
    this.spendStamina(pc.stamina);
    this.enter('punch');
    this.action = action;
    this.resolved = false;
    this.extraRecovery = 0;
    const now = fight ? fight.clock : 0;
    this.registerPunch(action, now);
    fight && fight.emit({ type: 'punchStart', punch: action, combo: this.comboName, stars: action === 'special' ? this.specialStars : 0 });
    return true;
  }

  // 콤보와 단조로움 계산
  registerPunch(id, now) {
    const c = this.cfg;
    const h = this.history;
    // 오래된 기록은 콤보에서 끊긴다
    if (h.length && now - h[h.length - 1].at > c.comboWindowMs) h.length = 0;
    h.push({ id, at: now });
    if (h.length > 8) h.shift();
    const seq = h.map((x) => x.id);
    const m = matchCombo(seq);
    this.comboName = m ? m.name : null;
    this.comboBonus = m ? c.comboBonus : 0;
    // 같은 펀치 연속 횟수 (콤보 창과 무관하게 최근 펀치 기준)
    if (this.lastPunchId === id) this.sameCount++;
    else { this.sameCount = 1; this.lastPunchId = id; }
    this.monotony = this.sameCount >= c.monotonyStart && id !== 'special' ? (this.sameCount - c.monotonyStart + 1) * c.monotonyBlockPerRepeat : 0;
  }

  takeHit(fight, dmg) {
    this.hp = Math.max(0, this.hp - dmg);
    this.buffer = null;
    this.action = null;
    this.resolved = true;
    this.lastHitAt = fight ? fight.clock : 0;
    this.enter('hurt', this.cfg.hurtMs);
    this.loseStar(fight);
  }

  // 피하기 성공: 무적을 끝내고 짧게 돌아온 뒤 바로 반격할 수 있다.
  dodgeEnd() {
    const d = this.cfg.dodges[this.action];
    return this.dodgeEndAt ?? d.invulnEnd + d.recovery;
  }

  onDodgeSuccess(fight) {
    const d = this.cfg.dodges[this.action];
    if (this.t < d.invulnEnd) this.t = d.invulnEnd;
    this.dodgeEndAt = Math.min(d.invulnEnd + d.recovery, this.t + this.cfg.dodgeSuccessReturnMs);
    this.stamina = Math.min(this.maxStamina, this.stamina + this.cfg.stamina.dodgeSuccessBonus);
  }
}

export function matchCombo(seq) {
  let best = null;
  for (const cb of COMBOS) {
    const n = cb.seq.length;
    if (n > seq.length) continue;
    let ok = true;
    for (let i = 0; i < n; i++) if (seq[seq.length - n + i] !== cb.seq[i]) { ok = false; break; }
    if (ok && (!best || n > best.seq.length)) best = cb;
  }
  return best;
}

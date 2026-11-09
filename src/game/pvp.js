// 온라인 1:1 경기 규칙 (서버에서 돌린다 = 판정은 서버가 정함).
// 사람끼리는 펀치가 보이도록 준비 동작(텔)을 길게 하고, 펀치마다 피하는 방향이 정해져 있다.
import { CONFIG, DT } from '../config.js';
import { Player } from './player.js';
import { MASH_MASK } from './inputBits.js';
import { judgeDecision } from './scoring.js';

export const PVP = {
  startup: { jab: 280, straight: 400, upper: 500, special: 640 },
  damage: { jab: 4, straight: 7, upper: 11 },
  // 막는 사람 기준: 상대의 잽(왼손)은 화면 오른쪽에서 → 왼쪽/숙이기, 스트레이트(오른손) → 오른쪽/숙이기
  avoid: { jab: ['L', 'duck'], straight: ['R', 'duck'], upper: ['L', 'R'], special: ['L', 'R'] },
  staggerMs: 700,
  roundMs: 90000,
  rounds: 3,
  introMs: 2000,
  betweenMs: 5000,
  roundOverMs: 2000,
  getupNeed: 14,
};

export function pvpPlayerCfg() {
  const c = JSON.parse(JSON.stringify(CONFIG.player));
  for (const k of Object.keys(PVP.startup)) c.punches[k].startup = PVP.startup[k];
  for (const k of Object.keys(PVP.damage)) c.punches[k].damage = PVP.damage[k];
  return c;
}

export class PvpMatch {
  constructor({ seed = 1 } = {}) {
    this.cfg = pvpPlayerCfg();
    this.f = [new Player({ cfg: this.cfg }), new Player({ cfg: this.cfg })];
    for (const p of this.f) { p.staggered = false; p.staggerFresh = false; p.downs = 0; }
    this.phase = 'intro';
    this.phaseT = 0;
    this.round = 1;
    this.roundTime = PVP.roundMs;
    this.clock = 0;
    this.hitstop = 0;
    this.events = [];
    this.down = null;
    this.result = null;
    this.rounds = [this.newRound()];
    this.stats = [this.newStats(), this.newStats()];
    this.ctx = [0, 1].map((i) => ({
      clock: 0,
      emit: (e) => this.emit({ ...e, who: i }),
      onPlayerPunchActive: (id) => this.resolve(i, id),
      onPlayerDodgeStart: (dir) => this.emit({ type: 'dodgeStart', who: i, dir }),
    }));
  }

  newRound() { return { p: { hits: 0, counters: 0, downs: 0 }, o: { hits: 0, counters: 0, downs: 0 } }; }
  newStats() { return { thrown: 0, landed: 0, counters: 0, dodges: 0, damage: 0 }; }

  emit(e) {
    e.clock = this.clock;
    this.events.push(e);
  }

  get over() { return this.phase === 'over'; }

  // in = [입력A, 입력B] (inputBits.js 형식)
  step(inA = 0, inB = 0) {
    const ins = [inA, inB];
    this.clock += DT;
    for (const c of this.ctx) c.clock = this.clock;
    if (this.hitstop > 0) { this.hitstop -= DT; return; }
    this.phaseT += DT;
    switch (this.phase) {
      case 'intro':
        if (this.phaseT >= PVP.introMs) { this.phase = 'fight'; this.phaseT = 0; this.emit({ type: 'bell', start: true, round: this.round }); }
        break;
      case 'fight':
        this.roundTime -= DT;
        for (let i = 0; i < 2; i++) {
          const p = this.f[i];
          if (p.state === 'hurt' && p.staggered && p.t + DT >= p.dur) { p.staggered = false; p.staggerFresh = false; }
          p.update(DT, ins[i], this.ctx[i]);
          if (this.phase !== 'fight') break;
        }
        if (this.phase === 'fight' && this.roundTime <= 0) {
          this.phase = 'roundOver';
          this.phaseT = 0;
          this.emit({ type: 'bell', start: false, round: this.round });
        }
        break;
      case 'down':
        this.updateDown(ins);
        break;
      case 'roundOver':
        if (this.phaseT >= PVP.roundOverMs) {
          if (this.round >= PVP.rounds) this.decide();
          else { this.phase = 'between'; this.phaseT = 0; this.emit({ type: 'between', round: this.round }); }
        }
        break;
      case 'between':
        if (this.phaseT >= PVP.betweenMs) this.nextRound();
        break;
      case 'ending':
        if (this.phaseT >= 1800) { this.phase = 'over'; this.emit({ type: 'fightEnd', result: this.result }); }
        break;
      default:
        break;
    }
  }

  resolve(att, punchId) {
    const A = this.f[att];
    const D = this.f[1 - att];
    const pc = this.cfg.punches[punchId];
    const st = this.stats[att];
    st.thrown++;
    if (D.state === 'down' || D.state === 'getup') return;
    const base = punchId === 'special' ? pc.damageByStars[A.specialStars] || 0 : pc.damage;
    // 피하기 성공
    if (D.isInvuln() && PVP.avoid[punchId].includes(D.dodgeType)) {
      A.enter('hurt', PVP.staggerMs);
      A.staggered = true;
      A.staggerFresh = true;
      A.action = null;
      A.buffer = null;
      D.onDodgeSuccess(this.ctx[1 - att]);
      this.stats[1 - att].dodges++;
      this.emit({ type: 'dodge', who: 1 - att, dir: D.dodgeType, punch: punchId });
      return;
    }
    if (D.isInvuln()) this.emit({ type: 'wrongDodge', who: 1 - att, dir: D.dodgeType, punch: punchId });
    // 가드
    if (D.state === 'guard' && punchId !== 'special') {
      const chip = base * (1 - CONFIG.player.guard.reduction);
      D.hp = Math.max(0, D.hp - chip);
      D.guard -= base * CONFIG.player.guard.drainMul * (pc.guardDrainMul || 1);
      A.extraRecovery = CONFIG.player.blockStunMs;
      this.hitstop = Math.max(this.hitstop, 30);
      if (D.guard <= 0) {
        D.guard = 0;
        D.enter('guardBroken', CONFIG.player.guardBreakMs);
        this.emit({ type: 'guardBreak', who: 1 - att });
      } else this.emit({ type: 'block', who: att, punch: punchId });
      if (D.hp <= 0) this.knockDown(1 - att, punchId);
      return;
    }
    // 맞음
    let dmg = base * (1 + (A.comboBonus || 0));
    let kind = punchId === 'special' ? 'special' : 'normal';
    if (D.staggered) {
      dmg *= punchId === 'upper' ? 2 : 1.5;
      if (D.staggerFresh) {
        D.staggerFresh = false;
        A.addStar(this.ctx[att]);
        st.counters++;
        this.rounds[this.rounds.length - 1][att === 0 ? 'p' : 'o'].counters++;
        if (kind !== 'special') kind = 'counter';
      } else if (kind !== 'special') kind = 'stagger';
      D.hp = Math.max(0, D.hp - dmg);
      D.loseStar(this.ctx[1 - att]);
    } else {
      D.takeHit(this.ctx[1 - att], dmg);
    }
    dmg = Math.round(dmg * 10) / 10;
    st.landed++;
    st.damage += dmg;
    this.rounds[this.rounds.length - 1][att === 0 ? 'p' : 'o'].hits++;
    this.hitstop = Math.max(this.hitstop, pc.hitstop);
    this.emit({ type: 'hit', who: att, punch: punchId, dmg, kind, combo: A.comboName, hpRatio: D.hp / D.maxHp });
    if (D.hp <= 0) this.knockDown(1 - att, punchId);
  }

  knockDown(i, punchId) {
    const p = this.f[i];
    const o = this.f[1 - i];
    p.hp = 0;
    p.downs++;
    p.downsRound = (p.downsRound || 0) + 1;
    this.rounds[this.rounds.length - 1][i === 0 ? 'o' : 'p'].downs++;
    p.loseStar(this.ctx[i], true);
    p.enter('down');
    p.action = null;
    p.buffer = null;
    p.staggered = false;
    o.enter('idle');
    o.action = null;
    if (p.downsRound >= 3) {
      this.emit({ type: 'down', who: i, tko: true, punch: punchId });
      this.finish(1 - i, 'TKO');
      return;
    }
    this.down = { who: i, t: 0, count: 0, mash: 0, need: PVP.getupNeed + 6 * (p.downs - 1) };
    this.phase = 'down';
    this.phaseT = 0;
    this.emit({ type: 'down', who: i, punch: punchId });
  }

  updateDown(ins) {
    const d = this.down;
    const p = this.f[d.who];
    const F = CONFIG.fight;
    d.t += DT;
    const o = this.f[1 - d.who];
    o.stamina = Math.min(o.maxStamina, o.stamina + 30 * DT / 1000);
    if (d.t < F.downFallMs) return;
    if (ins[d.who] & MASH_MASK) { d.mash += 1; this.emit({ type: 'mash', who: d.who, value: d.mash / d.need }); }
    d.mash = Math.max(0, d.mash - 3 * DT / 1000);
    const count = Math.floor((d.t - F.downFallMs) / F.countIntervalMs) + 1;
    if (count > d.count) {
      d.count = count;
      this.emit({ type: 'count', n: count, who: d.who });
      if (count >= F.koCount) { this.finish(1 - d.who, 'KO'); return; }
    }
    if (d.mash >= d.need) {
      p.hp = [50, 40, 30][Math.min(2, p.downs - 1)];
      p.stamina = Math.max(p.stamina, 60);
      p.guard = p.maxGuard;
      p.enter('getup', F.getupAnimMs);
      this.down = null;
      this.phase = 'fight';
      this.phaseT = 0;
      this.emit({ type: 'getup', who: d.who, count });
    }
  }

  nextRound() {
    for (const p of this.f) {
      p.hp = Math.min(p.maxHp, p.hp + (p.maxHp - p.hp) * 0.3);
      p.stamina = p.maxStamina;
      p.guard = p.maxGuard;
      p.downsRound = 0;
      p.staggered = false;
      p.enter('idle');
      p.action = null;
      p.buffer = null;
    }
    this.round++;
    this.roundTime = PVP.roundMs;
    this.rounds.push(this.newRound());
    this.phase = 'intro';
    this.phaseT = 0;
    this.emit({ type: 'roundStart', round: this.round });
  }

  decide() {
    const d = judgeDecision(this.rounds);
    const w = d.winner === 'player' ? 0 : d.winner === 'opponent' ? 1 : -1;
    this.finish(w, w < 0 ? '무승부' : d.kind, d);
  }

  finish(winner, method, decision = null) {
    this.result = { winner, method, round: this.round, decision, stats: this.stats };
    this.down = null;
    this.phase = 'ending';
    this.phaseT = 0;
    this.emit({ type: 'finish', winner, method });
  }

  // 네트워크로 보낼 상태
  snapshot() {
    const fs = this.f.map((p) => ({
      hp: Math.round(p.hp * 10) / 10, st: Math.round(p.stamina), g: Math.round(p.guard), s: p.stars,
      state: p.state, t: Math.round(p.t), dur: Math.round(p.dur), a: p.action, er: p.extraRecovery,
      de: p.state === 'dodge' ? Math.round(p.dodgeEnd()) : 0, stg: p.staggered ? 1 : 0, dr: p.downsRound || 0, ss: p.specialStars,
    }));
    return {
      ph: this.phase, pt: Math.round(this.phaseT), r: this.round, rt: Math.round(this.roundTime), f: fs,
      d: this.down ? { w: this.down.who, c: this.down.count, t: Math.round(this.down.t), m: Math.round(this.down.mash * 10) / 10, n: this.down.need } : null,
      res: this.result,
    };
  }
}

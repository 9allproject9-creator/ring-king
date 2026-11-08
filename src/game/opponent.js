// 상대 AI: 데이터 기반 상태 머신.
// 대기(idle) → 텔(tell) → 공격(active) → 회복(recover) → (헛방이면 whiff) → 대기
import { CONFIG, mergeDeep } from '../config.js';

const STAGGER_STATES = new Set(['whiff', 'shoved', 'counterStun']);
const OPEN_STATES = new Set(['recover', 'active', 'chain', 'hurt', 'tired', 'taunt', 'guardBroken', 'feintEnd']);
const INVULN_STATES = new Set(['intro', 'phase', 'down', 'getup', 'ko', 'win', 'clinch']);

const ATTACK_DEFAULTS = {
  active: 110,
  recovery: 450,
  whiffMs: 700,
  blockable: true,
  avoid: ['L', 'R'],
  damage: 10,
};

export class Opponent {
  constructor(data, { difficulty = 'normal', variant = 'normal', rng }) {
    this.data = data;
    this.rng = rng;
    this.diff = CONFIG.difficulty[difficulty] || CONFIG.difficulty.normal;
    this.variant = variant;
    this.varCfg = variant === 'defense' ? CONFIG.defenseVariant : { tellScale: 1, hpMul: 1, damageMul: 1 };
    this.p = mergeDeep(CONFIG.opponentDefaults, data.stats || {});
    this.phases = buildPhases(data, variant);
    this.phaseIndex = 0;
    this.ph = this.phases[0];
    this.maxHp = Math.round(this.p.maxHp * (this.p.hpScale ?? 1) * this.varCfg.hpMul);
    this.hp = this.maxHp;
    this.maxGuardGauge = this.p.guardGauge;
    this.guardGauge = this.p.guardGauge;
    this.fatigue = 0;
    this.pos = 0; // -1 왼쪽, 0 가운데, 1 오른쪽 (화면 기준)
    this.fromPos = 0;
    this.memory = { L: 0, R: 0, duck: 0 };
    this.state = 'intro';
    this.t = 0;
    this.dur = 0;
    this.atk = null;
    this.fake = false;
    this.sentence = null;
    this.guardUp = true;
    this.guardTimer = 0;
    this.hitsInRow = 0;
    this.blocks = 0;
    this.downsRound = 0;
    this.downsTotal = 0;
    this.pendingPhase = false;
    this.staggerFresh = false;
    this.tellStartAt = 0;
    this.lastHitDir = 0;
    this.attacksDone = 0;
    this.koFromDown = false;
  }

  enter(state, dur = 0) {
    this.state = state;
    this.t = 0;
    this.dur = dur;
  }

  // 플레이어 펀치 판정용 분류
  hitClass() {
    const s = this.state;
    if (INVULN_STATES.has(s)) return 'invuln';
    if (s === 'step') return 'evade';
    if (STAGGER_STATES.has(s)) return 'stagger';
    if (s === 'tell') return 'tell';
    if (s === 'blockStance') return 'guarded';
    if (s === 'idle') return 'idle';
    if (OPEN_STATES.has(s)) return 'open';
    return 'open';
  }

  isGuarding() {
    return this.state === 'blockStance' || this.state === 'tell' || (this.state === 'idle' && this.guardUp);
  }

  tellScale(fight) {
    let s = (this.ph.tellScale || 1) * (this.p.tellScale ?? 1) * this.diff.tellScale * this.varCfg.tellScale;
    const slow = this.p.slowdown;
    if (slow) {
      const round = fight ? fight.round : 1;
      s *= 1 + (slow.perRound || 0) * (round - 1) + (slow.byHpLost || 0) * (1 - this.hp / this.maxHp);
    }
    return s;
  }

  makeAttack(id, fight, fast = false) {
    const def = this.data.attacks[id];
    if (!def) throw new Error(`상대 ${this.data.id}에 공격 ${id}가 없음`);
    const a = { ...ATTACK_DEFAULTS, ...def, id };
    let tell = def.tell * this.tellScale(fight);
    if (fast) tell = Math.min(tell, Math.max(this.p.minTellMs, 430 * this.diff.tellScale));
    a.tellMs = Math.max(this.p.minTellMs, Math.round(tell));
    a.damage = def.damage * (this.ph.damageMul || 1) * this.p.damageMul * this.varCfg.damageMul;
    return a;
  }

  habit() {
    const m = this.memory;
    const total = m.L + m.R + m.duck;
    if (total < 2) return null;
    let type = 'L';
    if (m.R > m[type]) type = 'R';
    if (m.duck > m[type]) type = 'duck';
    return { type, share: m[type] / total };
  }

  noteDodge(type) {
    const m = this.memory;
    m.L *= 0.88; m.R *= 0.88; m.duck *= 0.88;
    m[type] += 1;
  }

  resolveToken(tok, fight) {
    const v = this.data.variants && this.data.variants[tok];
    if (!v) return tok;
    if (v.byPos) return v.byPos[String(this.pos)];
    if (v.adaptive) {
      const h = this.habit();
      const learn = v.learn ?? 0.85;
      if (h && h.share > 0.4 && this.rng() < learn) {
        // 습관적으로 피하는 방향으로는 피할 수 없는 공격을 고른다
        const opts = v.adaptive.filter((id) => !(this.data.attacks[id].avoid || ATTACK_DEFAULTS.avoid).includes(h.type));
        if (opts.length) {
          fight && fight.emit({ type: 'oppLearn', habit: h.type });
          return this.rng.pick(opts);
        }
      }
      return this.rng.pick(v.adaptive);
    }
    return tok;
  }

  update(dt, fight) {
    this.t += dt;
    const sec = dt / 1000;
    if (this.state !== 'blockStance') {
      this.guardGauge = Math.min(this.maxGuardGauge, this.guardGauge + this.p.guardRegenPerSec * sec);
    }
    switch (this.state) {
      case 'idle':
        this.fatigue = Math.max(0, this.fatigue - this.p.fatigue.recoverPerSec * sec);
        this.guardTimer -= dt;
        if (this.guardTimer <= 0) this.rerollGuard();
        // 멀리 떨어져 있으면 다가올 때까지 공격을 시작하지 않는다
        if (this.t >= this.dur && !(fight.gap > 0.3)) this.decide(fight);
        break;
      case 'tell':
        if (this.t >= this.dur) this.tellEnd(fight);
        break;
      case 'active':
        if (this.t >= this.dur) this.enter('recover', this.atk.recovery);
        break;
      case 'recover':
        if (this.t >= this.dur) this.nextInSentence(fight);
        break;
      case 'chain':
        if (this.t >= this.dur) this.startItem(fight);
        break;
      case 'feintEnd':
        if (this.t >= this.dur) this.afterFeint(fight);
        break;
      case 'step':
        if (this.t >= this.dur) {
          if (this.sentence) this.nextInSentence(fight);
          else this.toIdle(this.p.restAfterHurt);
        }
        break;
      case 'hurt':
        if (this.t >= this.dur) {
          if (this.pendingPhase) this.startPhase(fight);
          else if (this.hitsInRow >= this.p.maxHitsInRow) {
            this.hitsInRow = 0;
            this.enter('blockStance', this.p.blockStanceMs);
          } else this.toIdle(this.p.restAfterHurt);
        }
        break;
      case 'blockStance':
        if (this.t >= this.dur) this.startSentence(fight, this.pickPattern(fight), true);
        break;
      case 'whiff':
      case 'shoved':
      case 'counterStun':
      case 'guardBroken':
      case 'tired':
      case 'taunt':
        if (this.t >= this.dur) {
          if (this.state === 'guardBroken') this.guardGauge = this.maxGuardGauge;
          this.staggerFresh = false;
          if (this.pendingPhase) this.startPhase(fight);
          else this.toIdle(this.p.restAfterHurt);
        }
        break;
      case 'phase':
        if (this.t >= this.dur) this.toIdle([500, 700]);
        break;
      case 'getup':
        if (this.t >= this.dur) this.toIdle([700, 1000]);
        break;
      default:
        break; // intro, down, ko, win, clinch: Fight가 처리
    }
  }

  rerollGuard() {
    const r = this.p.guardReroll;
    this.guardTimer = this.rng.range(r[0], r[1]);
    const ib = this.ph.idleBlock ?? this.p.idleBlock;
    this.guardUp = this.rng() < ib;
  }

  toIdle(range) {
    const r = range || this.ph.rest || this.p.rest;
    this.enter('idle', this.rng.range(r[0], r[1]));
    this.rerollGuard();
  }

  decide(fight) {
    const pl = fight.player;
    if ((pl.state === 'winded' || pl.state === 'guardBroken') && this.data.punish) {
      this.startSentence(fight, { seq: [this.data.punish] }, true);
      return;
    }
    const taunt = this.ph.taunt ?? this.p.taunt;
    if (taunt && this.rng() < taunt.chance) {
      this.enter('taunt', taunt.ms);
      fight.emit({ type: 'oppTaunt' });
      return;
    }
    const step = this.ph.step ?? this.p.step;
    if (step && this.rng() < step.chance) {
      this.doStep(fight);
      return;
    }
    this.startSentence(fight, this.pickPattern(fight));
  }

  pickPattern(fight) {
    const pats = this.ph.patterns;
    const h = this.habit();
    return this.rng.weighted(pats, (pt) => {
      let w = pt.w ?? 1;
      if (pt.learn && h && h.share > 0.45) w *= 1 + 2 * h.share;
      return w;
    });
  }

  startSentence(fight, pat, fast = false) {
    this.sentence = { seq: pat.seq, after: pat.after, idx: 0, fast };
    this.startItem(fight);
  }

  startItem(fight) {
    const s = this.sentence;
    if (!s) return this.toIdle();
    let tok = s.seq[s.idx];
    if (tok === 'step') {
      this.doStep(fight);
      return;
    }
    if (tok === 'taunt') {
      const taunt = this.ph.taunt ?? this.p.taunt ?? { ms: 1200 };
      this.enter('taunt', taunt.ms);
      fight.emit({ type: 'oppTaunt' });
      this.sentence = null;
      return;
    }
    let fake = false;
    if (tok[0] === '~') { fake = true; tok = tok.slice(1); }
    const id = this.resolveToken(tok, fight);
    this.atk = this.makeAttack(id, fight, s.fast && s.idx === 0);
    this.fake = fake;
    this.hitsInRow = 0;
    this.fatigue += this.p.fatigue.perAttack;
    this.tellStartAt = fight.clock;
    this.enter('tell', fake ? Math.round(this.atk.tellMs * 0.9) : this.atk.tellMs);
    fight.emit({ type: 'oppTell', attack: this.atk.id, fake, ms: this.dur, avoid: this.atk.avoid });
  }

  tellEnd(fight) {
    if (this.fake) {
      this.enter('feintEnd', 300);
      fight.emit({ type: 'feint', attack: this.atk.id });
      return;
    }
    this.attacksDone++;
    fight.onOpponentAttackActive(this);
  }

  // combat에서 호출
  onAttackDodged(fight) {
    this.enter('whiff', this.atk.active + this.atk.whiffMs);
    this.staggerFresh = true;
    this.sentence = null;
  }

  onAttackConnected() {
    this.enter('active', this.atk.active);
  }

  afterFeint(fight) {
    const pl = fight.player;
    const fooled = pl.lastDodgeAt >= this.tellStartAt;
    if (fooled && this.data.feintPunish) {
      this.startSentence(fight, { seq: [this.data.feintPunish] }, true);
      fight.emit({ type: 'feintFooled' });
    } else {
      if (!fooled) fight.emit({ type: 'feintRead' });
      this.nextInSentence(fight);
    }
  }

  nextInSentence(fight) {
    const s = this.sentence;
    if (!s) return this.endSentence(fight);
    s.idx++;
    if (s.idx < s.seq.length) {
      const g = this.ph.chainGap || this.p.chainGap;
      this.enter('chain', this.rng.range(g[0], g[1]));
    } else this.endSentence(fight);
  }

  endSentence(fight) {
    const after = this.sentence && this.sentence.after;
    this.sentence = null;
    if (after) {
      this.enter(after.state, after.ms);
      if (after.state === 'tired') fight.emit({ type: 'oppTired' });
      return;
    }
    if (this.fatigue >= this.p.fatigue.threshold) {
      this.fatigue = 0;
      this.enter('tired', this.p.fatigue.tiredMs);
      fight.emit({ type: 'oppTired' });
      return;
    }
    this.toIdle();
  }

  doStep(fight) {
    const choices = [-1, 0, 1].filter((p) => p !== this.pos);
    this.fromPos = this.pos;
    this.pos = this.rng.pick(choices);
    const ms = (this.ph.step || this.p.step || {}).ms || 320;
    this.enter('step', ms);
    fight.emit({ type: 'oppStep', pos: this.pos });
  }

  onHit(fight, dmg, dir) {
    this.hp = Math.max(0, this.hp - dmg);
    this.lastHitDir = dir;
    this.checkPhase();
    if (this.hp <= 0) return;
    if (STAGGER_STATES.has(this.state) || this.state === 'tired' || this.state === 'taunt' || this.state === 'guardBroken') return;
    this.hitsInRow++;
    this.sentence = null;
    this.enter('hurt', this.p.hurtMs);
  }

  onCountered(fight) {
    this.sentence = null;
    this.enter('counterStun', CONFIG.combat.counterStunMs);
    this.staggerFresh = false;
  }

  onBlocked(fight, drain) {
    this.guardGauge -= drain;
    this.blocks++;
    if (this.guardGauge <= 0 && this.state !== 'tell') {
      this.guardGauge = 0;
      this.sentence = null;
      this.enter('guardBroken', 1000);
      fight.emit({ type: 'oppGuardBreak' });
      return;
    }
    const bc = this.p.blockCounter;
    const atk = bc && (bc.attack || this.data.punish);
    if (atk && this.blocks >= bc.after && (this.state === 'idle' || this.state === 'blockStance')) {
      this.blocks = 0;
      this.startSentence(fight, { seq: [atk] }, true);
      fight.emit({ type: 'oppCounter' });
    }
  }

  checkPhase() {
    const next = this.phases[this.phaseIndex + 1];
    if (next && this.hp > 0 && this.hp / this.maxHp <= next.hpBelow) this.pendingPhase = true;
  }

  startPhase(fight) {
    this.pendingPhase = false;
    this.phaseIndex++;
    this.ph = this.phases[this.phaseIndex];
    this.sentence = null;
    this.hitsInRow = 0;
    this.enter('phase', this.p.phaseChangeMs);
    fight.emit({ type: 'phase', index: this.phaseIndex, line: this.ph.line || null });
  }

  roundReset(fight) {
    const lost = this.maxHp - this.hp;
    this.hp = Math.min(this.maxHp, this.hp + lost * this.p.roundHeal);
    this.guardGauge = this.maxGuardGauge;
    this.fatigue = 0;
    this.downsRound = 0;
    this.sentence = null;
    this.pos = 0;
    this.fromPos = 0;
    this.enter('intro');
  }
}

function buildPhases(data, variant) {
  const phases = (data.phases || []).map((ph) => ({ hpBelow: 1, ...ph, patterns: [...ph.patterns] }));
  if (!phases.length) throw new Error(`상대 ${data.id}에 페이즈가 없음`);
  if (variant === 'defense' && data.defense) {
    for (const ph of phases) {
      for (const pat of data.defense.patterns || []) ph.patterns.push(pat);
    }
  }
  return phases;
}

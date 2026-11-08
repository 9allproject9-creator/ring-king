// 경기 진행: 라운드, 다운·카운트, 판정. 화면·DOM·소리 없이 돌아간다.
import { CONFIG, DT } from '../config.js';
import { createRng } from './rng.js';
import { Player } from './player.js';
import { Opponent } from './opponent.js';
import { resolvePlayerStrike, resolveOpponentAttack } from './combat.js';
import { judgeDecision } from './scoring.js';
import { MASH_MASK, PRESS_MASK, IN } from './inputBits.js';

export class Fight {
  constructor({ opponent, difficulty = 'normal', variant = 'normal', seed = 1, rounds, playerHp, startStars = 0, noTimer = false }) {
    this.seed = seed;
    this.rng = createRng(seed);
    this.difficulty = difficulty;
    this.diff = CONFIG.difficulty[difficulty] || CONFIG.difficulty.normal;
    this.variant = variant;
    this.oppData = opponent;
    this.maxRounds = rounds || opponent.rounds || CONFIG.fight.rounds;
    this.player = new Player();
    if (playerHp !== undefined) this.player.hp = Math.max(1, Math.min(this.player.maxHp, playerHp));
    this.player.stars = startStars;
    this.opp = new Opponent(opponent, { difficulty, variant, rng: this.rng });
    this.noTimer = noTimer;
    this.round = 1;
    this.roundTime = CONFIG.fight.roundMs;
    this.phase = 'intro';
    this.phaseT = 0;
    this.clock = 0; // 경기 전체 프레임 시간(ms)
    this.fightTime = 0; // 실제 싸운 시간(ms)
    this.frame = 0;
    this.hitstop = 0;
    this.events = [];
    this.down = null;
    this.clinch = null;
    this.result = null;
    this.lastPlayerHit = null;
    this.stats = {
      thrown: 0, landed: 0, blocked: 0, whiffs: 0, counters: 0, interrupts: 0, dodges: 0,
      guarded: 0, damageTaken: 0, damageDealt: 0, hitsTaken: 0, downsTaken: 0, downsDealt: 0,
      specials: 0, combos: 0, feintsRead: 0, feintsFooled: 0, clinchEscapes: 0,
      minHp: this.player.hp,
    };
    this.rounds = [];
    this.newRoundStats();
  }

  newRoundStats() {
    this.roundStats = { p: { hits: 0, counters: 0, downs: 0 }, o: { hits: 0, counters: 0, downs: 0 } };
    this.rounds.push(this.roundStats);
  }

  emit(e) {
    e.clock = this.clock;
    this.events.push(e);
    if (e.type === 'feintRead') this.stats.feintsRead++;
    if (e.type === 'feintFooled') this.stats.feintsFooled++;
  }

  setHitstop(ms) {
    if (ms > this.hitstop) this.hitstop = ms;
  }

  get over() {
    return this.phase === 'over';
  }

  // 고정 간격 한 번. input = 비트마스크(inputBits.js)
  step(input = 0) {
    this.events.length = 0;
    this.frame++;
    this.clock += DT;
    const p = this.player;
    const o = this.opp;

    if (this.hitstop > 0) {
      this.hitstop -= DT;
      if (input & PRESS_MASK) p.bufferInput(input);
      return;
    }

    this.phaseT += DT;
    switch (this.phase) {
      case 'intro':
        p.guardHeld = !!(input & IN.GUARD);
        if (this.phaseT >= CONFIG.fight.introMs) {
          this.phase = 'fight';
          this.phaseT = 0;
          o.toIdle([600, 900]);
          this.emit({ type: 'bell', start: true, round: this.round });
        }
        break;
      case 'fight':
        this.fightTime += DT;
        if (!this.noTimer) this.roundTime -= DT;
        if (p.state === 'clinched') this.updateClinch(input);
        else p.update(DT, input, this);
        if (this.phase === 'fight') o.update(DT, this);
        if (p.hp < this.stats.minHp) this.stats.minHp = p.hp;
        if (this.phase === 'fight' && this.roundTime <= 0) this.endRound();
        break;
      case 'pdown':
        this.updatePlayerDown(input);
        break;
      case 'odown':
        this.updateOppDown();
        p.stamina = Math.min(p.maxStamina, p.stamina + 30 * DT / 1000);
        p.guard = Math.min(p.maxGuard, p.guard + 20 * DT / 1000);
        break;
      case 'roundOver':
        if (this.phaseT >= CONFIG.fight.roundOverMs) {
          if (this.round >= this.maxRounds) this.decide();
          else {
            this.phase = 'between';
            this.phaseT = 0;
            this.emit({ type: 'between', round: this.round });
          }
        }
        break;
      case 'ending':
        if (this.phaseT >= 1600) {
          this.phase = 'over';
          this.emit({ type: 'fightEnd', result: this.result });
        }
        break;
      default:
        break; // between, over
    }
  }

  onPlayerPunchActive(punchId) {
    resolvePlayerStrike(this, punchId);
  }

  onPlayerDodgeStart(type) {
    this.opp.noteDodge(type);
    this.emit({ type: 'dodgeStart', dir: type });
  }

  onOpponentAttackActive(o) {
    this.emit({ type: 'oppAttack', attack: o.atk.id });
    resolveOpponentAttack(this, o);
  }

  // ---------- 클린치 (붙잡기) ----------
  startClinch(atk) {
    const p = this.player;
    p.enter('clinched');
    p.action = null;
    p.buffer = null;
    this.clinch = {
      need: Math.round(CONFIG.player.clinch.mashRequired * this.diff.mashMul),
      mash: 0,
      t: 0,
      damage: (atk.clinchDamage || 12) * this.diff.dmgTaken,
    };
    this.opp.enter('clinch', CONFIG.player.clinch.timeMs);
    this.emit({ type: 'clinch', need: this.clinch.need });
  }

  updateClinch(input) {
    const p = this.player;
    const c = this.clinch;
    c.t += DT;
    p.stamina = Math.max(0, p.stamina - 8 * DT / 1000);
    if (input & MASH_MASK) {
      c.mash++;
      this.emit({ type: 'mash', value: c.mash / c.need });
    }
    if (c.mash >= c.need) {
      p.enter('idle');
      this.opp.enter('shoved', 950);
      this.opp.staggerFresh = true;
      this.stats.clinchEscapes++;
      this.clinch = null;
      this.emit({ type: 'clinchEscape' });
    } else if (c.t >= CONFIG.player.clinch.timeMs) {
      p.takeHit(this, c.damage);
      this.stats.damageTaken += c.damage;
      this.stats.hitsTaken++;
      this.roundStats.o.hits++;
      this.opp.enter('recover', 600);
      this.clinch = null;
      this.setHitstop(80);
      this.emit({ type: 'playerHit', dmg: c.damage, attack: 'clinchBlow', side: 0, hpRatio: p.hp / p.maxHp });
      if (p.hp <= 0) this.onPlayerDown();
    }
  }

  // ---------- 다운 ----------
  onPlayerDown() {
    const p = this.player;
    if (this.phase !== 'fight') return;
    p.hp = 0;
    p.downsRound++;
    p.downsTotal++;
    this.stats.downsTaken++;
    this.roundStats.o.downs++;
    p.loseStar(this, true);
    p.enter('down');
    p.action = null;
    p.buffer = null;
    this.clinch = null;
    this.opp.sentence = null;
    this.opp.enter('taunt', 99999);
    if (p.downsRound >= CONFIG.fight.tkoDowns) {
      this.emit({ type: 'down', who: 'player', tko: true });
      this.finish('opponent', 'TKO');
      return;
    }
    const g = CONFIG.player.getup;
    this.down = {
      who: 'player', t: 0, count: 0, mash: 0,
      need: Math.round((g.baseRequired + g.perDown * (p.downsTotal - 1)) * this.diff.mashMul),
    };
    this.phase = 'pdown';
    this.phaseT = 0;
    this.emit({ type: 'down', who: 'player' });
  }

  updatePlayerDown(input) {
    const p = this.player;
    const d = this.down;
    const F = CONFIG.fight;
    const g = CONFIG.player.getup;
    d.t += DT;
    if (d.t >= F.downFallMs) {
      if (input & MASH_MASK) {
        d.mash += g.mashValue;
        this.emit({ type: 'mash', value: d.mash / d.need });
      }
      d.mash = Math.max(0, d.mash - g.decayPerSec * DT / 1000);
      const count = Math.floor((d.t - F.downFallMs) / F.countIntervalMs) + 1;
      if (count > d.count) {
        d.count = count;
        this.emit({ type: 'count', n: count, who: 'player' });
        if (count >= F.koCount) {
          this.finish('opponent', 'KO');
          return;
        }
      }
      if (d.mash >= d.need) {
        const heal = g.healByDown[Math.min(p.downsTotal - 1, g.healByDown.length - 1)];
        p.hp = heal;
        p.stamina = Math.max(p.stamina, 60);
        p.guard = p.maxGuard;
        p.enter('getup', F.getupAnimMs);
        this.down = null;
        this.phase = 'fight';
        this.phaseT = 0;
        this.opp.toIdle([F.getupAnimMs + 500, F.getupAnimMs + 900]);
        this.emit({ type: 'getup', who: 'player', count });
      }
    }
  }

  onOpponentDown(punchId, kind) {
    const o = this.opp;
    const p = this.player;
    if (this.phase !== 'fight') return;
    o.downsRound++;
    o.downsTotal++;
    o.pendingPhase = false;
    this.stats.downsDealt++;
    this.roundStats.p.downs++;
    o.sentence = null;
    o.enter('down');
    p.enter('idle');
    p.action = null;
    p.buffer = null;
    this.lastDown = { punch: punchId, kind, clock: this.clock, frame: this.frame };
    if (o.downsRound >= CONFIG.fight.tkoDowns) {
      this.emit({ type: 'down', who: 'opponent', tko: true, punch: punchId, kind });
      this.finish('player', 'TKO');
      return;
    }
    const gu = o.p.getUp;
    const idx = Math.min(o.downsTotal - 1, gu.chance.length - 1);
    let chance = gu.chance[idx];
    if (this.variant === 'defense') chance = Math.min(1, chance + 0.1);
    const willGetUp = this.rng() < chance;
    const at = this.rng.int(gu.countAt[0], gu.countAt[1]);
    this.down = { who: 'opponent', t: 0, count: 0, willGetUp, at, heal: gu.heal[Math.min(idx, gu.heal.length - 1)] };
    this.phase = 'odown';
    this.phaseT = 0;
    this.emit({ type: 'down', who: 'opponent', punch: punchId, kind });
  }

  updateOppDown() {
    const o = this.opp;
    const d = this.down;
    const F = CONFIG.fight;
    d.t += DT;
    if (d.t < F.downFallMs) return;
    const count = Math.floor((d.t - F.downFallMs) / F.countIntervalMs) + 1;
    if (count > d.count) {
      d.count = count;
      if (d.willGetUp && count >= d.at) {
        o.hp = Math.max(1, Math.round(o.maxHp * d.heal));
        o.enter('getup', F.getupAnimMs);
        this.down = null;
        this.phase = 'fight';
        this.phaseT = 0;
        this.emit({ type: 'getup', who: 'opponent', count });
        return;
      }
      this.emit({ type: 'count', n: count, who: 'opponent' });
      if (count >= F.koCount) this.finish('player', 'KO');
    }
  }

  // ---------- 라운드와 판정 ----------
  endRound() {
    this.phase = 'roundOver';
    this.phaseT = 0;
    this.clinch = null;
    const p = this.player;
    if (p.state === 'clinched') p.enter('idle');
    this.emit({ type: 'bell', start: false, round: this.round });
  }

  startNextRound() {
    if (this.phase !== 'between') return false;
    const p = this.player;
    const lost = p.maxHp - p.hp;
    const healed = lost * CONFIG.player.roundHealRatio;
    p.hp = Math.min(p.maxHp, p.hp + healed);
    p.stamina = p.maxStamina;
    p.guard = p.maxGuard;
    p.downsRound = 0;
    p.enter('idle');
    p.action = null;
    p.buffer = null;
    this.opp.roundReset(this);
    this.round++;
    this.roundTime = CONFIG.fight.roundMs;
    this.phase = 'intro';
    this.phaseT = 0;
    this.newRoundStats();
    this.emit({ type: 'roundStart', round: this.round, healed });
    return true;
  }

  roundHealPreview() {
    const p = this.player;
    return (p.maxHp - p.hp) * CONFIG.player.roundHealRatio;
  }

  decide() {
    const d = judgeDecision(this.rounds);
    this.decision = d;
    this.finish(d.winner, d.winner === 'draw' ? '무승부' : d.kind, d);
  }

  finish(winner, method, decision) {
    const p = this.player;
    const o = this.opp;
    this.result = {
      winner,
      method,
      round: this.round,
      fightTime: this.fightTime,
      decision: decision || null,
      hpRatio: p.hp / p.maxHp,
      lastPunch: this.lastDown ? this.lastDown.punch : null,
      lastKind: this.lastDown ? this.lastDown.kind : null,
    };
    if (winner === 'player') { o.enter('ko'); if (p.state !== 'idle') p.enter('idle'); }
    else if (winner === 'opponent') o.enter('win');
    this.down = null;
    this.phase = 'ending';
    this.phaseT = 0;
    this.emit({ type: 'finish', winner, method });
  }
}

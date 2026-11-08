// 피해 계산, 히트 판정, 카운터, 별.
import { CONFIG } from '../config.js';

const DIR = { jab: -1, straight: 1, upper: 0, special: 0 };

export function punchBaseDamage(player, punchId) {
  const pc = CONFIG.player.punches[punchId];
  return punchId === 'special' ? pc.damageByStars[player.specialStars] || 0 : pc.damage;
}

// 내 펀치가 판정 순간(active 첫 프레임)에 닿았을 때
export function resolvePlayerStrike(fight, punchId) {
  const p = fight.player;
  const o = fight.opp;
  const pc = CONFIG.player.punches[punchId];
  const isSpecial = punchId === 'special';
  const base = punchBaseDamage(p, punchId);
  const comboMul = 1 + (p.comboBonus || 0);
  const cls = o.hitClass();
  fight.stats.thrown++;
  if (isSpecial) fight.stats.specials++;

  if (cls === 'invuln' || cls === 'evade') {
    p.spendStamina(pc.stamina * (CONFIG.player.stamina.whiffMul - 1));
    fight.stats.whiffs++;
    fight.emit({ type: 'whiff', punch: punchId });
    return 'whiff';
  }

  if (cls === 'tell') {
    const atk = o.atk;
    const remaining = o.dur - o.t;
    const win = CONFIG.combat.counterWindowMs * fight.diff.counterWindow;
    if (!o.fake && atk.counter && atk.counter.punch === punchId && remaining <= win) {
      const dmg = base * CONFIG.combat.counterDamageMul * comboMul;
      fight.stats.counters++;
      fight.stats.interrupts++;
      p.addStar(fight);
      o.onCountered(fight);
      return landHit(fight, punchId, dmg, 'interrupt', 130);
    }
    if (isSpecial) {
      o.sentence = null;
      return landHit(fight, punchId, base, 'special', pc.hitstop);
    }
    return block(fight, punchId, base, 'tell');
  }

  if (cls === 'stagger') {
    const mul = punchId === 'upper' ? pc.staggerMul : CONFIG.combat.staggerMul;
    const dmg = base * mul * comboMul;
    let kind = isSpecial ? 'special' : 'stagger';
    if (o.staggerFresh) {
      o.staggerFresh = false;
      fight.stats.counters++;
      p.addStar(fight);
      kind = isSpecial ? 'special' : 'counter';
    }
    return landHit(fight, punchId, dmg, kind, pc.hitstop + (kind === 'counter' ? 30 : 0));
  }

  if (isSpecial) return landHit(fight, punchId, base, 'special', pc.hitstop);

  // 스텝으로 펀치를 피하는 상대 (대기 중에만)
  if (cls === 'idle' && o.p.evadeChance && fight.rng() < o.p.evadeChance) {
    o.doStep(fight);
    p.spendStamina(pc.stamina * (CONFIG.player.stamina.whiffMul - 1));
    fight.stats.whiffs++;
    fight.emit({ type: 'whiff', punch: punchId, evaded: true });
    return 'whiff';
  }

  if (cls === 'guarded' || (cls === 'idle' && o.guardUp)) return block(fight, punchId, base, 'guard');

  let blockChance = p.monotony || 0;
  if (cls === 'idle' && punchId === 'upper') blockChance += pc.extraBlock || 0;
  if (blockChance > 0 && fight.rng() < Math.min(0.92, blockChance)) {
    return block(fight, punchId, base, p.monotony ? 'read' : 'guard');
  }

  const openMul = o.state === 'guardBroken' ? 1.25 : 1;
  return landHit(fight, punchId, base * comboMul * openMul, 'normal', pc.hitstop);
}

function landHit(fight, punchId, dmg, kind, hitstop) {
  const p = fight.player;
  const o = fight.opp;
  dmg = Math.round(dmg * 10) / 10;
  fight.stats.landed++;
  fight.stats.damageDealt += dmg;
  fight.roundStats.p.hits++;
  if (kind === 'counter' || kind === 'interrupt') fight.roundStats.p.counters++;
  fight.lastPlayerHit = { punch: punchId, kind, clock: fight.clock };
  if (p.comboName) fight.stats.combos++;
  o.onHit(fight, dmg, DIR[punchId]);
  fight.setHitstop(hitstop);
  fight.emit({ type: 'hit', punch: punchId, dmg, kind, combo: p.comboName, stars: punchId === 'special' ? p.specialStars : 0, hpRatio: o.hp / o.maxHp });
  if (o.hp <= 0) fight.onOpponentDown(punchId, kind);
  return kind;
}

function block(fight, punchId, base, why) {
  const p = fight.player;
  const o = fight.opp;
  const pc = CONFIG.player.punches[punchId];
  const drain = base * 3 * (pc.guardDrainMul || 1);
  fight.stats.blocked++;
  p.extraRecovery = CONFIG.player.blockStunMs;
  fight.setHitstop(30);
  fight.emit({ type: 'block', punch: punchId, why });
  o.onBlocked(fight, drain);
  return 'block';
}

// 상대 공격이 닿는 순간(텔이 끝난 순간)
export function resolveOpponentAttack(fight, o) {
  const p = fight.player;
  const atk = o.atk;
  const dmg = atk.damage * fight.diff.dmgTaken;

  if (p.state === 'getup' || p.state === 'down') {
    o.onAttackDodged(fight);
    return 'none';
  }

  if (p.isInvuln()) {
    if (atk.avoid.includes(p.dodgeType)) {
      o.onAttackDodged(fight);
      p.onDodgeSuccess(fight);
      fight.stats.dodges++;
      fight.emit({ type: 'dodge', dir: p.dodgeType, attack: atk.id });
      return 'dodged';
    }
    fight.emit({ type: 'wrongDodge', dir: p.dodgeType, need: atk.avoid });
  }

  if (p.state === 'guard' && atk.blockable !== false) {
    const chip = dmg * (1 - CONFIG.player.guard.reduction);
    p.hp = Math.max(0, p.hp - chip);
    p.guard -= dmg * CONFIG.player.guard.drainMul;
    fight.stats.damageTaken += chip;
    fight.stats.guarded++;
    o.onAttackConnected();
    fight.setHitstop(40);
    if (p.guard <= 0) {
      p.guard = 0;
      p.enter('guardBroken', CONFIG.player.guardBreakMs);
      fight.emit({ type: 'guardBreak' });
    } else {
      fight.emit({ type: 'playerBlock', dmg: chip, attack: atk.id });
    }
    if (p.hp <= 0) fight.onPlayerDown();
    return 'blocked';
  }

  if (atk.type === 'clinch') {
    o.onAttackConnected();
    fight.startClinch(atk);
    return 'clinch';
  }

  p.takeHit(fight, dmg);
  fight.stats.damageTaken += dmg;
  fight.stats.hitsTaken++;
  fight.roundStats.o.hits++;
  o.onAttackConnected();
  fight.setHitstop(CONFIG.combat.playerHitstopBase + Math.min(60, dmg * 3));
  fight.emit({ type: 'playerHit', dmg, attack: atk.id, side: atk.side || 0, hpRatio: p.hp / p.maxHp });
  if (p.hp <= 0) fight.onPlayerDown();
  return 'hit';
}

import type {
  Player, GameState, Monster, Item, Skill, BattleState, DungeonState,
  Stats, JobClass, StatusEffect, Element, GamePhase, ActiveBuff
} from './types';
import {
  JOB_DATA, SKILLS, ITEMS, MONSTERS, DUNGEON_AREAS, ACHIEVEMENTS, SHOP_STOCK_BY_LEVEL, CRAFT_RECIPES
} from './data';

const SAVE_KEY = 'sim_rpg_save_v1';

// ===== EXP TABLE =====
export function getNextExp(level: number): number {
  return Math.floor(100 * Math.pow(1.25, level - 1));
}

// ===== STAT CALCULATION =====
export function calcTotalStats(player: Player): Stats {
  const base = { ...player.baseStats };
  const equip: Partial<Stats> = {};
  Object.values(player.equipment).forEach(item => {
    if (item?.stats) {
      (Object.entries(item.stats) as [keyof Stats, number][]).forEach(([key, v]) => {
        equip[key] = (equip[key] ?? 0) + (v ?? 0);
      });
    }
  });
  // Apply passive skills
  const passiveBonus: Partial<Stats> = {};
  player.learnedSkills.forEach(sid => {
    const sk = SKILLS[sid];
    if (sk?.passive?.stat) {
      (Object.entries(sk.passive.stat) as [keyof Stats, number][]).forEach(([key, v]) => {
        passiveBonus[key] = (passiveBonus[key] ?? 0) + (v ?? 0);
      });
    }
  });
  // Active buffs (applied in battle, not here)
  return {
    str: base.str + (equip.str ?? 0) + (passiveBonus.str ?? 0),
    dex: base.dex + (equip.dex ?? 0) + (passiveBonus.dex ?? 0),
    int: base.int + (equip.int ?? 0) + (passiveBonus.int ?? 0),
    vit: base.vit + (equip.vit ?? 0) + (passiveBonus.vit ?? 0),
    agi: base.agi + (equip.agi ?? 0) + (passiveBonus.agi ?? 0),
    luk: base.luk + (equip.luk ?? 0) + (passiveBonus.luk ?? 0),
  };
}

export function calcMaxHp(player: Player): number {
  const job = JOB_DATA[player.job];
  const vitBonus = player.stats.vit * 5;
  return job.hpBase + (job.hpGrowth * (player.level - 1)) + vitBonus;
}

export function calcMaxMp(player: Player): number {
  const job = JOB_DATA[player.job];
  const intBonus = player.stats.int * 2;
  return job.mpBase + (job.mpGrowth * (player.level - 1)) + intBonus;
}

// ===== PLAYER CREATION =====
export function createPlayer(name: string, job: JobClass): Player {
  const jobData = JOB_DATA[job];
  const baseStats = { ...jobData.baseStats };
  const player: Player = {
    name, job,
    level: 1, exp: 0, nextExp: getNextExp(1),
    hp: 0, maxHp: 0, mp: 0, maxMp: 0,
    stats: baseStats, baseStats,
    statPoints: 0, skillPoints: 1,
    learnedSkills: ['attack', 'guard'],
    equipment: { weapon: null, body: null, head: null, hand: null, leg: null, accessory1: null, accessory2: null },
    inventory: [
      { ...ITEMS['potion'], quantity: 3 },
      { ...ITEMS['ether'], quantity: 2 },
    ],
    gold: 300,
    status: 'none', statusTurns: 0, buffs: [],
    jobMastery: { warrior: 0, mage: 0, rogue: 0, paladin: 0, archer: 0, necromancer: 0 },
    killCount: {}, dungeonClears: {}, achievements: [],
    totalPlaytime: 0, totalGoldEarned: 300, totalKills: 0, totalBattles: 0,
    createdAt: Date.now(),
  };
  player.stats = calcTotalStats(player);
  player.maxHp = calcMaxHp(player);
  player.maxMp = calcMaxMp(player);
  player.hp = player.maxHp;
  player.mp = player.maxMp;
  // Give starter weapon
  const starterWeapons: Record<JobClass, string> = {
    warrior: 'ironSword', mage: 'woodStaff', rogue: 'dagger',
    paladin: 'ironSword', archer: 'shortBow', necromancer: 'woodStaff',
  };
  const sw = ITEMS[starterWeapons[job]];
  if (sw) player.equipment.weapon = { ...sw };
  // Learn job-specific starter skill
  const starterSkills: Record<JobClass, string> = {
    warrior: 'slash', mage: 'fireball', rogue: 'backstab',
    paladin: 'holyStrike', archer: 'preciseShot', necromancer: 'darkBolt',
  };
  player.learnedSkills.push(starterSkills[job]);
  return player;
}

// ===== INITIAL GAME STATE =====
export function createInitialState(): GameState {
  return {
    phase: 'title',
    player: createPlayer('勇者', 'warrior'),
    dungeon: null,
    battle: null,
    messages: [],
    selectedSkillIndex: 0,
    shopInventory: [],
    craftRecipes: CRAFT_RECIPES,
    settings: { battleSpeed: 'normal', autoSave: true, bgm: true, sfx: true },
    sessionStart: Date.now(),
  };
}

// ===== SAVE / LOAD =====
export function saveGame(state: GameState): void {
  try {
    const data = {
      player: state.player,
      settings: state.settings,
      savedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

export function loadGame(): Partial<GameState> | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return { player: data.player, settings: data.settings, phase: 'town' };
  } catch {
    return null;
  }
}

export function hasSave(): boolean {
  return !!localStorage.getItem(SAVE_KEY);
}

// ===== BATTLE ENGINE =====
function roll(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function applyElementalMultiplier(baseDmg: number, element: Element, weakness: Element[], resistance: Element[], immune: Element[]): { dmg: number; label: string } {
  if (immune.includes(element) && element !== 'none') return { dmg: 0, label: '無効！' };
  if (weakness.includes(element) && element !== 'none') return { dmg: Math.floor(baseDmg * 1.5), label: '弱点！' };
  if (resistance.includes(element) && element !== 'none') return { dmg: Math.floor(baseDmg * 0.5), label: '耐性' };
  return { dmg: baseDmg, label: '' };
}

function calcMonsterDamage(monster: Monster): number {
  const base = monster.stats.str * 2 + roll(-5, 5);
  return Math.max(1, base);
}

function applyStatusDamage(monster: Monster, player: Player, log: string[]): void {
  if (monster.status === 'poison') {
    const dmg = Math.max(1, Math.floor(monster.maxHp * 0.05));
    monster.hp = Math.max(0, monster.hp - dmg);
    log.push(`${monster.name}は毒で${dmg}ダメージ！`);
  }
  if (monster.status === 'burn') {
    const dmg = Math.max(1, Math.floor(monster.maxHp * 0.08));
    monster.hp = Math.max(0, monster.hp - dmg);
    log.push(`${monster.name}は燃焼で${dmg}ダメージ！`);
  }
  if (monster.statusTurns > 0) {
    monster.statusTurns--;
    if (monster.statusTurns === 0) {
      log.push(`${monster.name}の${STATUS_NAME[monster.status]}が解除された。`);
      monster.status = 'none';
    }
  }
}

function applyPlayerStatusDamage(player: Player, log: string[]): void {
  if (player.status === 'poison') {
    const dmg = Math.max(1, Math.floor(player.maxHp * 0.05));
    player.hp = Math.max(0, player.hp - dmg);
    log.push(`${player.name}は毒で${dmg}ダメージ！`);
  }
  if (player.status === 'burn') {
    const dmg = Math.max(1, Math.floor(player.maxHp * 0.08));
    player.hp = Math.max(0, player.hp - dmg);
    log.push(`${player.name}は燃焼で${dmg}ダメージ！`);
  }
  if (player.statusTurns > 0) {
    player.statusTurns--;
    if (player.statusTurns === 0) {
      log.push(`${player.name}の${STATUS_NAME[player.status]}が解除された。`);
      player.status = 'none';
    }
  }
  // Expire buffs
  player.buffs = player.buffs.filter(b => {
    b.turns--;
    if (b.turns <= 0) { log.push(`${b.source}の効果が切れた。`); return false; }
    return true;
  });
}

const STATUS_NAME: Record<string, string> = {
  poison: '毒', burn: '燃焼', paralysis: '麻痺', sleep: '睡眠', confusion: '混乱', blind: '暗闇', none: 'なし',
};

export function getPlayerEffectiveStats(player: Player): Stats {
  const s = { ...player.stats };
  player.buffs.forEach(b => {
    s[b.stat] = Math.floor(s[b.stat] * (1 + b.amount / 100));
  });
  return s;
}

// ===== PLAYER SKILL USE =====
export type SkillResult = {
  newPlayer: Player;
  newEnemies: Monster[];
  log: string[];
  combo: number;
  battleEnd: boolean;
  playerDied: boolean;
  rewards?: BattleState['rewards'];
};

export function usePlayerSkill(
  skillId: string,
  player: Player,
  enemies: Monster[],
  combo: number,
  targetIndex: number = 0
): SkillResult {
  const sk = SKILLS[skillId];
  if (!sk) return { newPlayer: player, newEnemies: enemies, log: ['スキルが見つかりません。'], combo, battleEnd: false, playerDied: false };

  const log: string[] = [];
  let newPlayer = { ...player, buffs: [...player.buffs] };
  let newEnemies = enemies.map(e => ({ ...e }));
  let newCombo = combo;

  // MP check
  if (newPlayer.mp < sk.mpCost) {
    return { newPlayer, newEnemies, log: ['MPが足りない！'], combo, battleEnd: false, playerDied: false };
  }
  newPlayer.mp -= sk.mpCost;

  const effectiveStats = getPlayerEffectiveStats(newPlayer);
  const weapon = newPlayer.equipment.weapon;
  const weaponAtk = weapon?.attackPower ?? 0;
  const weaponMag = weapon?.magicPower ?? 0;

  // Apply self-harm
  if (sk.effect?.selfHarm) {
    const harm = Math.floor(newPlayer.maxHp * sk.effect.selfHarm / 100);
    newPlayer.hp = Math.max(1, newPlayer.hp - harm);
    log.push(`${newPlayer.name}は${harm}のダメージを受けた。`);
  }

  const targets = sk.effect?.allEnemies ? newEnemies.filter(e => e.hp > 0) : [newEnemies[targetIndex]];

  if (sk.type === 'physical' || sk.type === 'magic') {
    newCombo++;
    const comboMult = 1 + (newCombo - 1) * 0.1;

    targets.forEach(target => {
      if (!target || target.hp <= 0) return;
      let baseDmg: number;
      if (sk.type === 'physical') {
        baseDmg = Math.floor((effectiveStats.str + weaponAtk) * (sk.power ?? 1.0));
      } else {
        baseDmg = Math.floor((effectiveStats.int + weaponMag) * (sk.power ?? 1.0));
      }

      // Multi-hit
      const hits = sk.effect?.multiHit ? roll(2, sk.effect.multiHit) : 1;
      let totalDmg = 0;

      for (let h = 0; h < hits; h++) {
        let dmg = Math.floor(baseDmg * (0.9 + Math.random() * 0.2));
        dmg = Math.floor(dmg * comboMult);
        // Crit
        const critChance = 5 + Math.floor(effectiveStats.luk / 3) + Math.floor(effectiveStats.dex / 5);
        const isCrit = roll(1, 100) <= critChance;
        if (isCrit) { dmg = Math.floor(dmg * 1.5); }
        // Element
        const weaponElem = (sk.element !== 'none' ? sk.element : weapon?.element) ?? 'none';
        const { dmg: finalDmg, label } = applyElementalMultiplier(dmg, weaponElem, target.weakness ?? [], target.resistance ?? [], (target.immune ?? []) as Element[]);
        // Defense reduction
        const defense = target.stats.vit * 2;
        const reduced = Math.max(1, finalDmg - defense);
        target.hp = Math.max(0, target.hp - reduced);
        totalDmg += reduced;
        if (h === 0) {
          log.push(`${newPlayer.name}の${sk.name}！${target.name}に${reduced}ダメージ！${isCrit ? ' クリティカル！' : ''}${label}`);
        }
      }
      if (hits > 1) log.push(`合計${totalDmg}ダメージ（${hits}ヒット）！`);

      // Drain
      if (sk.id === 'drainLife' || sk.id === 'soulDrain') {
        const heal = Math.floor(totalDmg * 0.3);
        newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + heal);
        log.push(`${heal}HP吸収！`);
      }

      // Status infliction
      if (sk.effect?.status && sk.effect.statusChance && sk.effect.status !== 'none') {
        const chance = sk.effect.statusChance;
        if (roll(1, 100) <= chance && target.status === 'none') {
          target.status = sk.effect.status;
          target.statusTurns = 3;
          log.push(`${target.name}は${STATUS_NAME[target.status]}状態になった！`);
        }
      }

      // Debuff
      if (sk.effect?.debuff) {
        // Apply debuff as negative buff on enemy (tracked via enemy stat reduction)
        const d = sk.effect.debuff;
        const reduction = Math.floor(target.stats[d.stat] * d.amount / 100);
        target.stats = { ...target.stats, [d.stat]: Math.max(1, target.stats[d.stat] - reduction) };
        log.push(`${target.name}の${d.stat.toUpperCase()}が${d.amount}%低下！`);
      }
    });
  } else if (sk.type === 'heal') {
    let healAmt = 0;
    if (sk.effect?.hp) healAmt = sk.effect.hp + effectiveStats.int * 2;
    if (sk.effect?.hpPercent) healAmt = Math.floor(newPlayer.maxHp * sk.effect.hpPercent / 100);
    newPlayer.hp = Math.min(newPlayer.maxHp, newPlayer.hp + healAmt);
    log.push(`${newPlayer.name}のHP${healAmt}回復！`);
    // Cure status
    if (sk.effect?.cure) { newPlayer.status = 'none'; newPlayer.statusTurns = 0; log.push('状態異常が回復した！'); }
    newCombo = 0;
  } else if (sk.type === 'buff') {
    if (sk.effect?.buff) {
      const b = sk.effect.buff;
      newPlayer.buffs.push({ stat: b.stat, amount: b.amount, turns: b.turns, source: sk.name });
      log.push(`${newPlayer.name}の${b.stat.toUpperCase()}が${b.amount}%上昇！（${b.turns}ターン）`);
    }
    newCombo = 0;
  } else if (sk.type === 'debuff') {
    const target = newEnemies[targetIndex];
    if (target && target.hp > 0) {
      if (sk.effect?.status && sk.effect.statusChance) {
        if (roll(1, 100) <= sk.effect.statusChance && target.status === 'none') {
          target.status = sk.effect.status;
          target.statusTurns = 3;
          log.push(`${target.name}は${STATUS_NAME[target.status]}状態になった！`);
        } else {
          log.push(`${target.name}には効かなかった！`);
        }
      }
    }
    newCombo = 0;
  }

  // Update enemies back
  targets.forEach((t, i) => {
    const idx = sk.effect?.allEnemies
      ? newEnemies.findIndex(e => e.id === t.id)
      : targetIndex;
    if (idx >= 0) newEnemies[idx] = t;
  });

  // Check battle end
  const allDead = newEnemies.every(e => e.hp <= 0);
  let rewards: BattleState['rewards'] | undefined;
  if (allDead) {
    const totalExp = newEnemies.reduce((s, e) => s + e.exp, 0);
    const totalGold = newEnemies.reduce((s, e) => s + e.gold, 0);
    const drops: Item[] = [];
    newEnemies.forEach(e => {
      e.drops.forEach(d => {
        if (roll(1, 100) <= d.chance) {
          const item = ITEMS[d.itemId];
          if (item) drops.push({ ...item, quantity: 1 });
        }
      });
    });
    rewards = { exp: totalExp, gold: totalGold, items: drops };
  }

  return { newPlayer, newEnemies, log, combo: newCombo, battleEnd: allDead, playerDied: false, rewards };
}

// ===== ENEMY TURN =====
export function enemyTurn(player: Player, enemies: Monster[]): { newPlayer: Player; newEnemies: Monster[]; log: string[] } {
  const log: string[] = [];
  let newPlayer = { ...player };
  let newEnemies = enemies.map(e => ({ ...e }));

  // Apply player status effects
  applyPlayerStatusDamage(newPlayer, log);

  newEnemies.filter(e => e.hp > 0).forEach(enemy => {
    // Apply enemy status effects
    applyStatusDamage(enemy, newPlayer, log);
    if (enemy.hp <= 0) return;

    // Check if enemy can act
    if (enemy.status === 'paralysis' || enemy.status === 'sleep') {
      log.push(`${enemy.name}は${STATUS_NAME[enemy.status]}で動けない！`);
      return;
    }
    if (enemy.status === 'confusion') {
      // Might attack itself
      if (roll(1, 100) <= 50) {
        const selfDmg = Math.floor(calcMonsterDamage(enemy) * 0.5);
        enemy.hp = Math.max(0, enemy.hp - selfDmg);
        log.push(`${enemy.name}は混乱して自分を攻撃！${selfDmg}ダメージ！`);
        return;
      }
    }

    // Pick skill
    const availableSkills = enemy.skills.filter(sid => {
      const sk = SKILLS[sid];
      return sk && enemy.mp >= sk.mpCost;
    });
    const skillId = availableSkills.length > 0 ? availableSkills[roll(0, availableSkills.length - 1)] : 'attack';
    const sk = SKILLS[skillId] ?? SKILLS['attack'];

    enemy.mp -= sk.mpCost;

    if (sk.type === 'physical' || sk.type === 'magic') {
      let baseDmg: number;
      if (sk.type === 'physical') {
        baseDmg = Math.floor(enemy.stats.str * (sk.power ?? 1.0) * 2);
      } else {
        baseDmg = Math.floor(enemy.stats.int * (sk.power ?? 1.0) * 2);
      }
      baseDmg = Math.floor(baseDmg * (0.85 + Math.random() * 0.3));

      // Player defense
      const pStats = getPlayerEffectiveStats(newPlayer);
      const defense = pStats.vit * 2;
      // Add armor defense
      const armorDef = (newPlayer.equipment.body?.defense ?? 0)
        + (newPlayer.equipment.head?.defense ?? 0)
        + (newPlayer.equipment.hand?.defense ?? 0)
        + (newPlayer.equipment.leg?.defense ?? 0);

      const finalDmg = Math.max(1, baseDmg - defense - armorDef);

      // Check player evade
      const evadeChance = Math.floor(pStats.agi / 2);
      if (newPlayer.status !== 'blind' && roll(1, 100) <= evadeChance) {
        log.push(`${enemy.name}の${sk.name}！${newPlayer.name}は回避した！`);
        return;
      }

      newPlayer.hp = Math.max(0, newPlayer.hp - finalDmg);
      log.push(`${enemy.name}の${sk.name}！${newPlayer.name}に${finalDmg}ダメージ！`);

      // Status infliction
      if (sk.effect?.status && sk.effect.statusChance && sk.effect.status !== 'none') {
        if (roll(1, 100) <= sk.effect.statusChance && newPlayer.status === 'none') {
          newPlayer.status = sk.effect.status;
          newPlayer.statusTurns = 3;
          log.push(`${newPlayer.name}は${STATUS_NAME[newPlayer.status]}状態になった！`);
        }
      }
    } else if (sk.type === 'heal') {
      const healAmt = Math.floor(enemy.maxHp * 0.15);
      enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmt);
      log.push(`${enemy.name}はHP${healAmt}回復した！`);
    }

    // Update enemy in array
    const idx = newEnemies.findIndex(e => e.id === enemy.id);
    if (idx >= 0) newEnemies[idx] = enemy;
  });

  return { newPlayer, newEnemies, log };
}

// ===== LEVEL UP =====
export function levelUp(player: Player): { player: Player; log: string[] } {
  const log: string[] = [];
  let p = { ...player };
  while (p.exp >= p.nextExp && p.level < 50) {
    p.exp -= p.nextExp;
    p.level++;
    p.nextExp = getNextExp(p.level);
    p.statPoints += 3;
    p.skillPoints += 1;
    const job = JOB_DATA[p.job];
    p.baseStats = {
      str: p.baseStats.str + job.statGrowth.str,
      dex: p.baseStats.dex + job.statGrowth.dex,
      int: p.baseStats.int + job.statGrowth.int,
      vit: p.baseStats.vit + job.statGrowth.vit,
      agi: p.baseStats.agi + job.statGrowth.agi,
      luk: p.baseStats.luk + job.statGrowth.luk,
    };
    p.stats = calcTotalStats(p);
    const oldMaxHp = p.maxHp;
    const oldMaxMp = p.maxMp;
    p.maxHp = calcMaxHp(p);
    p.maxMp = calcMaxMp(p);
    p.hp += p.maxHp - oldMaxHp;
    p.mp += p.maxMp - oldMaxMp;
    log.push(`レベルアップ！ Lv.${p.level}になった！`);
    log.push(`ステータスポイント+3、スキルポイント+1`);
  }
  if (p.level === 50) { p.exp = 0; }
  return { player: p, log };
}

// ===== APPLY BATTLE REWARDS =====
export function applyRewards(player: Player, rewards: BattleState['rewards']): { player: Player; log: string[] } {
  if (!rewards) return { player, log: [] };
  const log: string[] = [];
  let p = { ...player };

  p.exp += rewards.exp;
  p.gold += rewards.gold;
  p.totalGoldEarned += rewards.gold;
  p.totalKills += 1;
  log.push(`${rewards.exp}EXP、${rewards.gold}G獲得！`);

  rewards.items.forEach(item => {
    addToInventory(p, { ...item });
    log.push(`${item.name}を入手！`);
  });

  const { player: leveled, log: lvLog } = levelUp(p);
  return { player: leveled, log: [...log, ...lvLog] };
}

// ===== INVENTORY =====
export function addToInventory(player: Player, item: Item): void {
  // Stack consumables and materials
  if (item.type === 'consumable' || item.type === 'material') {
    const existing = player.inventory.find(i => i.id === item.id);
    if (existing) {
      existing.quantity = (existing.quantity ?? 1) + (item.quantity ?? 1);
      return;
    }
  }
  player.inventory.push({ ...item, quantity: item.quantity ?? 1 });
}

export function removeFromInventory(player: Player, itemId: string, quantity: number = 1): boolean {
  const idx = player.inventory.findIndex(i => i.id === itemId);
  if (idx < 0) return false;
  const item = player.inventory[idx];
  const qty = item.quantity ?? 1;
  if (qty <= quantity) {
    player.inventory.splice(idx, 1);
  } else {
    item.quantity = qty - quantity;
  }
  return true;
}

export function useItem(player: Player, itemId: string): { player: Player; log: string[]; success: boolean } {
  const item = player.inventory.find(i => i.id === itemId);
  if (!item || item.type !== 'consumable') return { player, log: ['使用できないアイテムです。'], success: false };

  let p = { ...player, inventory: player.inventory.map(i => ({ ...i })) };
  const log: string[] = [];

  const eff = item.effect;
  if (eff?.hp) { p.hp = Math.min(p.maxHp, p.hp + eff.hp); log.push(`HP${eff.hp}回復！`); }
  if (eff?.hpPercent) { const h = Math.floor(p.maxHp * eff.hpPercent / 100); p.hp = Math.min(p.maxHp, p.hp + h); log.push(`HP${h}回復！`); }
  if (eff?.mp) { p.mp = Math.min(p.maxMp, p.mp + eff.mp); log.push(`MP${eff.mp}回復！`); }
  if (eff?.mpPercent) { const m = Math.floor(p.maxMp * eff.mpPercent / 100); p.mp = Math.min(p.maxMp, p.mp + m); log.push(`MP${m}回復！`); }
  if (eff?.cure) { p.status = 'none'; p.statusTurns = 0; log.push('状態異常が回復した！'); }

  removeFromInventory(p, itemId);
  return { player: p, log, success: true };
}

// ===== EQUIP ITEM =====
export function equipItem(player: Player, item: Item): { player: Player; log: string[] } {
  const p = { ...player, equipment: { ...player.equipment } };
  const log: string[] = [];
  let slot: keyof typeof p.equipment | null = null;
  switch (item.type) {
    case 'weapon': slot = 'weapon'; break;
    case 'armor_body': slot = 'body'; break;
    case 'armor_head': slot = 'head'; break;
    case 'armor_hand': slot = 'hand'; break;
    case 'armor_leg': slot = 'leg'; break;
    case 'accessory': slot = p.equipment.accessory1 ? 'accessory2' : 'accessory1'; break;
    default: return { player, log: ['装備できないアイテムです。'] };
  }
  const old = p.equipment[slot];
  if (old) {
    addToInventory(p, { ...old });
    log.push(`${old.name}を外した。`);
  }
  p.equipment[slot] = { ...item };
  removeFromInventory(p, item.id);
  p.stats = calcTotalStats(p);
  p.maxHp = calcMaxHp(p);
  p.maxMp = calcMaxMp(p);
  log.push(`${item.name}を装備した！`);
  return { player: p, log };
}

// ===== ENHANCE EQUIPMENT =====
export function enhanceEquipment(player: Player, slot: keyof typeof player.equipment): { player: Player; log: string[]; success: boolean } {
  const p = { ...player, equipment: { ...player.equipment } };
  const item = p.equipment[slot];
  if (!item) return { player, log: ['装備がありません。'], success: false };

  const currentEnh = item.enhancement ?? 0;
  if (currentEnh >= 15) return { player, log: ['これ以上強化できません（最大+15）。'], success: false };

  // Cost calculation: increases exponentially
  const cost = Math.floor(100 * Math.pow(2, currentEnh));
  const materialNeeded = currentEnh < 5 ? 'ironOre' : currentEnh < 10 ? 'silverOre' : 'mythrilOre';
  const materialCount = Math.ceil(currentEnh / 3) + 1;

  if (p.gold < cost) return { player, log: [`G不足！必要金額: ${cost}G`], success: false };

  const hasMaterial = p.inventory.some(i => i.id === materialNeeded && (i.quantity ?? 1) >= materialCount);
  const matItem = ITEMS[materialNeeded];
  if (!hasMaterial) return { player, log: [`${matItem.name}×${materialCount}が必要です。`], success: false };

  // Success rate decreases with level
  const successRate = Math.max(30, 95 - currentEnh * 5);
  const isSuccess = roll(1, 100) <= successRate;

  p.gold -= cost;
  removeFromInventory(p, materialNeeded, materialCount);

  if (isSuccess) {
    const enhItem = { ...item, enhancement: currentEnh + 1 };
    // Boost item stats
    if (enhItem.attackPower) enhItem.attackPower = Math.floor(item.attackPower! * 1.1);
    if (enhItem.magicPower) enhItem.magicPower = Math.floor(item.magicPower! * 1.1);
    if (enhItem.defense) enhItem.defense = Math.floor(item.defense! * 1.1);
    p.equipment[slot] = enhItem;
    p.stats = calcTotalStats(p);
    p.maxHp = calcMaxHp(p);
    p.maxMp = calcMaxMp(p);
    return { player: p, log: [`強化成功！${item.name} +${currentEnh + 1}`], success: true };
  } else {
    return { player: p, log: [`強化失敗... ${cost}Gと${matItem.name}×${materialCount}が消費された。`], success: false };
  }
}

// ===== CRAFT =====
export function craftItem(player: Player, recipeId: string): { player: Player; log: string[]; success: boolean } {
  const recipe = CRAFT_RECIPES.find(r => r.id === recipeId);
  if (!recipe) return { player, log: ['レシピが見つかりません。'], success: false };

  let p = { ...player, inventory: player.inventory.map(i => ({ ...i })) };

  for (const mat of recipe.materials) {
    const inv = p.inventory.find(i => i.id === mat.itemId);
    if (!inv || (inv.quantity ?? 1) < mat.quantity) {
      return { player, log: [`素材が不足しています: ${ITEMS[mat.itemId]?.name ?? mat.itemId}×${mat.quantity}`], success: false };
    }
  }

  for (const mat of recipe.materials) {
    removeFromInventory(p, mat.itemId, mat.quantity);
  }

  const result = ITEMS[recipe.result];
  if (result) {
    addToInventory(p, { ...result, quantity: 1 });
    return { player: p, log: [`${result.name}を作成した！`], success: true };
  }
  return { player, log: ['作成に失敗しました。'], success: false };
}

// ===== LEARN SKILL =====
export function learnSkill(player: Player, skillId: string): { player: Player; log: string[]; success: boolean } {
  const sk = SKILLS[skillId];
  if (!sk) return { player, log: ['スキルが見つかりません。'], success: false };
  if (player.learnedSkills.includes(skillId)) return { player, log: ['すでに習得済みです。'], success: false };
  if (player.skillPoints <= 0) return { player, log: ['スキルポイントが不足しています。'], success: false };
  if (player.level < sk.learnLevel) return { player, log: [`Lv.${sk.learnLevel}以上が必要です。`], success: false };
  if (sk.job !== 'all' && sk.job !== player.job) return { player, log: ['この職業では習得できません。'], success: false };

  const p = { ...player, learnedSkills: [...player.learnedSkills, skillId], skillPoints: player.skillPoints - 1 };
  return { player: p, log: [`${sk.name}を習得した！`], success: true };
}

// ===== ALLOCATE STAT POINT =====
export function allocateStat(player: Player, stat: keyof Stats): { player: Player; log: string[] } {
  if (player.statPoints <= 0) return { player, log: ['ステータスポイントがありません。'] };
  const p = { ...player, baseStats: { ...player.baseStats }, statPoints: player.statPoints - 1 };
  p.baseStats[stat]++;
  p.stats = calcTotalStats(p);
  p.maxHp = calcMaxHp(p);
  p.maxMp = calcMaxMp(p);
  return { player: p, log: [`${stat.toUpperCase()}を1増加させた！`] };
}

// ===== DUNGEON EXPLORATION =====
export function generateEncounter(dungeon: DungeonState, playerLevel: number): Monster[] {
  const area = DUNGEON_AREAS[dungeon.areaId];
  if (!area) return [];

  const isBossFloor = dungeon.floor === area.floors;
  if (isBossFloor) {
    // Boss encounter
    const bossId = area.bosses[Math.floor(Math.random() * area.bosses.length)];
    const baseBoss = MONSTERS[bossId];
    if (!baseBoss) return [];
    const lvDiff = Math.max(0, playerLevel - baseBoss.level);
    const boss: Monster = {
      ...baseBoss,
      hp: baseBoss.maxHp + lvDiff * 50,
      maxHp: baseBoss.maxHp + lvDiff * 50,
      stats: {
        str: baseBoss.stats.str + lvDiff * 2,
        dex: baseBoss.stats.dex + lvDiff,
        int: baseBoss.stats.int + lvDiff * 2,
        vit: baseBoss.stats.vit + lvDiff * 2,
        agi: baseBoss.stats.agi + lvDiff,
        luk: baseBoss.stats.luk,
      },
      exp: baseBoss.exp + lvDiff * 30,
      gold: baseBoss.gold + lvDiff * 20,
      status: 'none', statusTurns: 0,
    };
    return [boss];
  }

  // Random encounter
  const count = roll(1, Math.min(3, 1 + Math.floor(dungeon.floor / 5)));
  const monstersToUse = area.monsters;
  return Array.from({ length: count }, () => {
    const mId = monstersToUse[roll(0, monstersToUse.length - 1)];
    const base = MONSTERS[mId];
    if (!base) return null;
    const lvDiff = Math.max(0, playerLevel - base.level);
    return {
      ...base,
      hp: base.maxHp + lvDiff * 10,
      maxHp: base.maxHp + lvDiff * 10,
      stats: { ...base.stats, str: base.stats.str + lvDiff, int: base.stats.int + lvDiff },
      exp: base.exp + lvDiff * 5,
      gold: base.gold + lvDiff * 3,
      status: 'none', statusTurns: 0,
    };
  }).filter(Boolean) as Monster[];
}

// ===== CHECK ACHIEVEMENTS =====
export function checkAchievements(player: Player): { player: Player; newAchievements: string[] } {
  const newAchievements: string[] = [];
  let p = { ...player };

  ACHIEVEMENTS.forEach(ach => {
    if (p.achievements.includes(ach.id)) return;
    if (ach.check(p)) {
      p.achievements.push(ach.id);
      newAchievements.push(ach.name);
      if (ach.reward?.gold) {
        p.gold += ach.reward.gold;
        p.totalGoldEarned += ach.reward.gold;
      }
      if (ach.reward?.stat) {
        Object.entries(ach.reward.stat).forEach(([k, v]) => {
          const key = k as keyof Stats;
          p.baseStats[key] = (p.baseStats[key] ?? 0) + (v ?? 0);
        });
        p.stats = calcTotalStats(p);
        p.maxHp = calcMaxHp(p);
        p.maxMp = calcMaxMp(p);
      }
    }
  });

  return { player: p, newAchievements };
}

// ===== FLEE =====
export function tryFlee(player: Player, enemies: Monster[]): { success: boolean; log: string[] } {
  const playerAgi = getPlayerEffectiveStats(player).agi;
  const avgEnemyAgi = enemies.reduce((s, e) => s + e.stats.agi, 0) / enemies.length;
  const chance = clamp(50 + playerAgi - avgEnemyAgi, 10, 90);
  const success = roll(1, 100) <= chance;
  return { success, log: [success ? '逃げ切った！' : '逃げられなかった！'] };
}

// ===== GET AVAILABLE SKILLS FOR PLAYER =====
export function getAvailableSkillsToLearn(player: Player): Skill[] {
  return Object.values(SKILLS).filter(sk => {
    if (player.learnedSkills.includes(sk.id)) return false;
    if (sk.job !== 'all' && sk.job !== player.job) return false;
    if (player.level < sk.learnLevel) return false;
    return true;
  });
}

import type {
  GameState, Player, DungeonLevel, Combat, CombatLogEntry,
  Stats, StatusEffect, StatusType, ActiveSkill, SkillDef, Item, Phase, Pos
} from './types';
import { CLASSES, SKILLS, ENEMIES, META_UPGRADES, getRandomItemDrop } from './data';
import { generateDungeon, computeFOV, getTileAt, getEnemyAt, removeEnemy } from './dungeon';

// ===== HELPERS =====
function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

export function calcEffectiveStats(player: Player): Stats {
  const base = { ...player.baseStats };
  for (const slot of ['weapon', 'armor', 'ring'] as const) {
    const item = player.equipment[slot];
    if (item?.statBonus) {
      for (const [k, v] of Object.entries(item.statBonus)) {
        (base as Record<string, number>)[k] = ((base as Record<string, number>)[k] || 0) + (v || 0);
      }
    }
  }
  // Apply status effects
  for (const se of player.statusEffects) {
    if (se.type === 'strengthUp') base.str = Math.floor(base.str * se.power);
    if (se.type === 'defenseUp') base.def = Math.floor(base.def * se.power);
    if (se.type === 'speedUp') base.spd = Math.floor(base.spd * se.power);
  }
  return base;
}

// ===== DAMAGE CALC =====
function calcPhysicalDamage(attackerStr: number, defenderDef: number, power: number, crit: boolean): number {
  const base = attackerStr * power;
  const reduced = Math.max(1, base - defenderDef * 0.6);
  const variance = 0.85 + Math.random() * 0.3;
  const dmg = Math.floor(reduced * variance * (crit ? 1.75 : 1));
  return Math.max(1, dmg);
}

function calcMagicDamage(attackerInt: number, defenderDef: number, power: number, crit: boolean): number {
  const base = attackerInt * power;
  const reduced = Math.max(1, base - defenderDef * 0.25);
  const variance = 0.9 + Math.random() * 0.2;
  const dmg = Math.floor(reduced * variance * (crit ? 1.75 : 1));
  return Math.max(1, dmg);
}

function isCrit(lck: number): boolean {
  return Math.random() < (lck * 0.02);
}

// ===== PLAYER CREATION =====
export function createPlayer(
  name: string,
  classId: string,
  meta: GameState['meta']
): Player {
  const cls = CLASSES[classId as keyof typeof CLASSES];
  const baseStats = { ...cls.baseStats };

  // Apply meta upgrades
  const unlocked = meta.unlocked;
  const ironConst = unlocked['iron_constitution'] || 0;
  const manaRes = unlocked['mana_reservoir'] || 0;
  const ancientKnowledge = unlocked['ancient_knowledge'] || 0;

  baseStats.maxHp += ironConst * 25;
  baseStats.maxMp += manaRes * 20;
  for (const k of ['str', 'def', 'int', 'spd', 'lck'] as const) {
    baseStats[k] += ancientKnowledge * 2;
  }

  const startLevel = 1 + (unlocked['veteran'] || 0);

  // Starting skills
  const skills: ActiveSkill[] = cls.skills
    .filter(s => s.level <= startLevel)
    .map(s => ({ ...SKILLS[s.skillId], currentCooldown: 0 }));

  const player: Player = {
    name, classId: classId as import('./types').ClassId,
    level: startLevel,
    xp: 0,
    xpNext: xpForLevel(startLevel + 1),
    hp: baseStats.maxHp,
    mp: baseStats.maxMp,
    stats: { ...baseStats },
    baseStats,
    statPoints: (startLevel - 1) * 3,
    skills,
    inventory: [],
    equipment: { weapon: null, armor: null, ring: null },
    gold: 0,
    pos: { x: 0, y: 0 },
    totalKills: 0,
    totalDamage: 0,
    statusEffects: [],
  };

  // Lucky Start upgrade
  if (unlocked['lucky_start']) {
    const drop = getRandomItemDrop(1);
    if (drop) player.inventory.push(drop);
  }

  return player;
}

// ===== GAME INITIALIZATION =====
export function initGame(name: string, classId: string, meta: GameState['meta']): GameState {
  const player = createPlayer(name, classId as keyof typeof CLASSES, meta);
  const dungeon = generateDungeon(1);
  player.pos = { ...dungeon.entrancePos };
  computeFOV(dungeon, player.pos);

  return {
    phase: 'dungeon',
    player,
    dungeon,
    combat: null,
    messages: ['ダンジョンへようこそ！WASDまたは矢印キーで移動。', '敵に隣接すると戦闘開始。> で階段を降りる。'],
    meta,
  };
}

// ===== MOVEMENT =====
export function movePlayer(state: GameState, dx: number, dy: number): GameState {
  if (state.phase !== 'dungeon') return state;

  const { player, dungeon } = state;
  const nx = player.pos.x + dx;
  const ny = player.pos.y + dy;
  const tile = getTileAt(dungeon, nx, ny);
  if (!tile || tile.type === 'wall') return state;

  // Check for enemy
  const enemy = getEnemyAt(dungeon, nx, ny);
  if (enemy) {
    // Start combat
    const combat: Combat = {
      enemy: { ...enemy },
      playerTurn: player.stats.spd >= enemy.stats.spd,
      log: [{ text: `${enemy.name}と戦闘開始！`, kind: 'system' }],
      ended: false,
      victory: false,
      fled: false,
      xpGained: 0,
      goldGained: 0,
      itemDrop: null,
    };
    return { ...state, phase: 'combat', combat };
  }

  // Move player
  const newPlayer = { ...player, pos: { x: nx, y: ny } };

  // Tick status effects
  const { player: tickedPlayer, messages: tickMsgs } = tickStatusEffects(newPlayer);

  // Tick skill cooldowns
  const updatedSkills = tickedPlayer.skills.map(s => ({
    ...s,
    currentCooldown: Math.max(0, s.currentCooldown - 1),
  }));
  tickedPlayer.skills = updatedSkills;

  // Pick up item
  const itemKey = `${nx},${ny}`;
  let msgs = [...state.messages, ...tickMsgs];
  let newDungeon = { ...dungeon };

  if (dungeon.items.has(itemKey)) {
    const item = dungeon.items.get(itemKey)!;
    const newItems = new Map(dungeon.items);
    newItems.delete(itemKey);
    newDungeon = { ...dungeon, items: newItems };

    if (tickedPlayer.inventory.length < 20) {
      tickedPlayer.inventory = [...tickedPlayer.inventory, item];
      msgs = [...msgs, `${item.icon} ${item.name}を拾った！`];
    } else {
      msgs = [...msgs, 'インベントリが満杯でアイテムを拾えない！'];
    }
  }

  // Check stairs
  if (tile.type === 'stairsDown') {
    msgs = [...msgs, '> を押して次の階へ進む'];
  }

  // Recompute FOV
  computeFOV(newDungeon, { x: nx, y: ny });
  tickedPlayer.stats = calcEffectiveStats(tickedPlayer);

  return {
    ...state,
    phase: 'dungeon',
    player: tickedPlayer,
    dungeon: newDungeon,
    messages: msgs.slice(-8),
  };
}

// ===== DESCEND STAIRS =====
export function descendStairs(state: GameState): GameState {
  if (state.phase !== 'dungeon') return state;
  const { player, dungeon, meta } = state;
  const tile = getTileAt(dungeon, player.pos.x, player.pos.y);
  if (tile?.type !== 'stairsDown') return state;

  const nextFloor = dungeon.floor + 1;
  if (nextFloor > 10) {
    // Victory!
    const newMeta = {
      ...meta,
      bestFloor: Math.max(meta.bestFloor, dungeon.floor),
      shards: meta.shards + 20, // Bonus for completion
      totalShards: meta.totalShards + 20,
      runs: meta.runs + 1,
    };
    return {
      ...state,
      phase: 'victory',
      meta: newMeta,
      messages: ['龍王を倒し、ダンジョンを制覇した！伝説の勇者として讃えられる！'],
    };
  }

  const newDungeon = generateDungeon(nextFloor);
  const newPlayer = {
    ...player,
    pos: { ...newDungeon.entrancePos },
    // Restore some HP/MP on floor change
    hp: Math.min(player.hp + Math.floor(player.stats.maxHp * 0.2), player.stats.maxHp),
    mp: Math.min(player.mp + Math.floor(player.stats.maxMp * 0.3), player.stats.maxMp),
  };
  computeFOV(newDungeon, newPlayer.pos);

  // Earn shard for floor clear
  const newMeta = {
    ...meta,
    bestFloor: Math.max(meta.bestFloor, nextFloor - 1),
    shards: meta.shards + 1,
    totalShards: meta.totalShards + 1,
  };

  return {
    ...state,
    player: newPlayer,
    dungeon: newDungeon,
    meta: newMeta,
    messages: [`${nextFloor}階に到達した！HPとMPが少し回復した。`],
  };
}

// ===== COMBAT ACTIONS =====

function applyStatusEffect(target: { statusEffects: StatusEffect[] }, effect: { type: StatusType; duration: number; power: number }) {
  // Don't stack same type - refresh instead
  const existing = target.statusEffects.findIndex(s => s.type === effect.type);
  if (existing >= 0) {
    target.statusEffects[existing] = { ...effect };
  } else {
    target.statusEffects = [...target.statusEffects, { ...effect }];
  }
}

function addLog(combat: Combat, text: string, kind: CombatLogEntry['kind']): Combat {
  return {
    ...combat,
    log: [...combat.log, { text, kind }].slice(-20),
  };
}

// Player attacks enemy
export function combatAttack(state: GameState): GameState {
  if (state.phase !== 'combat' || !state.combat || !state.combat.playerTurn) return state;
  const { player, combat } = state;
  const enemy = { ...combat.enemy };

  if (enemy.statusEffects.some(s => s.type === 'stun')) {
    return processEnemyTurn({ ...state, combat: addLog(combat, '敵はスタンしている！', 'system') });
  }

  const crit = isCrit(player.stats.lck);
  const dmg = calcPhysicalDamage(player.stats.str, enemy.stats.def, 1.0, crit);
  enemy.hp = Math.max(0, enemy.hp - dmg);

  let c = addLog(combat, `あなたの攻撃！ ${dmg}ダメージ${crit ? ' 【クリティカル！】' : ''}`, crit ? 'crit' : 'player');
  c = { ...c, enemy };

  if (enemy.hp <= 0) {
    return handleVictory(state, c);
  }

  return processEnemyTurn({ ...state, combat: { ...c, playerTurn: false } });
}

// Player uses skill
export function combatSkill(state: GameState, skillIndex: number): GameState {
  if (state.phase !== 'combat' || !state.combat || !state.combat.playerTurn) return state;
  const { player } = state;
  let combat = { ...state.combat };

  const skill = player.skills[skillIndex];
  if (!skill || skill.currentCooldown > 0 || player.mp < skill.mpCost) {
    const reason = !skill ? 'スキルがない' : skill.currentCooldown > 0 ? 'クールダウン中' : 'MPが足りない';
    return { ...state, combat: addLog(combat, reason, 'system') };
  }

  let newPlayer = { ...player, mp: player.mp - skill.mpCost };
  const updatedSkills = newPlayer.skills.map((s, i) =>
    i === skillIndex ? { ...s, currentCooldown: s.cooldown } : s
  );
  newPlayer.skills = updatedSkills;

  let enemy = { ...combat.enemy };
  let log: CombatLogEntry[] = [];

  if (skill.target === 'self') {
    // Buff or heal
    if (skill.kind === 'heal') {
      const healAmt = Math.floor(player.stats.int * skill.power);
      newPlayer.hp = Math.min(newPlayer.hp + healAmt, newPlayer.stats.maxHp);
      log.push({ text: `${skill.icon} ${skill.name}！ HP+${healAmt}回復`, kind: 'player' });
    } else if (skill.kind === 'buff') {
      if (skill.statusApply) {
        applyStatusEffect(newPlayer, skill.statusApply);
        // Also recalc stats with new status
        newPlayer.stats = calcEffectiveStats(newPlayer);
      }
      log.push({ text: `${skill.icon} ${skill.name}！ バフ発動！`, kind: 'player' });
      // Special: arcane_surge restores MP
      if (skill.id === 'arcane_surge') {
        newPlayer.mp = Math.min(newPlayer.mp + 20, newPlayer.stats.maxMp);
        log.push({ text: 'MP+20回復！', kind: 'player' });
      }
    }
    // Turn doesn't change but enemy now attacks
    let newCombat: Combat = { ...combat, enemy, playerTurn: false };
    for (const l of log) newCombat = addLog(newCombat, l.text, l.kind);
    return processEnemyTurn({ ...state, player: newPlayer, combat: newCombat });
  }

  // Attack skill
  const crit = isCrit(player.stats.lck);
  let dmg = 0;
  if (skill.kind === 'physical') {
    // Backstab uses SPD
    const attackStat = skill.id === 'backstab' ? player.stats.spd : player.stats.str;
    const critBonus = skill.id === 'backstab' ? 0.4 : 0;
    const actualCrit = crit || Math.random() < critBonus;
    dmg = calcPhysicalDamage(attackStat, enemy.stats.def, skill.power, actualCrit);
    if (skill.id === 'whirlwind') {
      // Ignores 50% of defense
      dmg = calcPhysicalDamage(attackStat, Math.floor(enemy.stats.def * 0.5), skill.power, crit);
    }
    log.push({ text: `${skill.icon} ${skill.name}！ ${dmg}ダメージ${actualCrit ? ' 【クリティカル！】' : ''}`, kind: crit ? 'crit' : 'player' });
  } else if (skill.kind === 'magic') {
    dmg = calcMagicDamage(player.stats.int, enemy.stats.def, skill.power, crit);
    log.push({ text: `${skill.icon} ${skill.name}！ ${dmg}魔法ダメージ${crit ? ' 【クリティカル！】' : ''}`, kind: crit ? 'crit' : 'player' });
  }

  enemy.hp = Math.max(0, enemy.hp - dmg);

  // Apply status effect
  if (skill.statusApply && Math.random() < skill.statusApply.chance) {
    applyStatusEffect(enemy, skill.statusApply);
    const statusNames: Record<string, string> = {
      poison: '毒', burn: '燃焼', stun: 'スタン', strengthUp: 'STR上昇', defenseUp: 'DEF上昇', speedUp: 'SPD上昇',
    };
    log.push({ text: `${statusNames[skill.statusApply.type]}を付与！`, kind: 'status' });
  }

  let newCombat: Combat = { ...combat, enemy, playerTurn: false };
  for (const l of log) newCombat = addLog(newCombat, l.text, l.kind);

  const newState = { ...state, player: newPlayer, combat: newCombat };
  if (enemy.hp <= 0) return handleVictory(newState, newCombat);
  return processEnemyTurn(newState);
}

// Player uses item in combat
export function combatUseItem(state: GameState, itemId: string): GameState {
  if (state.phase !== 'combat' || !state.combat || !state.combat.playerTurn) return state;
  let { player, combat } = state;

  const itemIdx = player.inventory.findIndex(i => i.id === itemId);
  if (itemIdx < 0) return state;
  const item = player.inventory[itemIdx];

  let newPlayer = { ...player };
  let msg = '';

  if (item.kind === 'potion' && item.healHp) {
    const heal = item.healHp >= 9999 ? newPlayer.stats.maxHp - newPlayer.hp : item.healHp;
    newPlayer.hp = Math.min(newPlayer.hp + heal, newPlayer.stats.maxHp);
    msg = `${item.icon} ${item.name}使用！ HP+${heal}`;
  } else if (item.kind === 'mpPotion' && item.healMp) {
    const heal = item.healMp >= 9999 ? newPlayer.stats.maxMp - newPlayer.mp : item.healMp;
    newPlayer.mp = Math.min(newPlayer.mp + heal, newPlayer.stats.maxMp);
    msg = `${item.icon} ${item.name}使用！ MP+${heal}`;
  } else {
    return state;
  }

  newPlayer.inventory = newPlayer.inventory.filter((_, i) => i !== itemIdx);

  let newCombat = addLog(combat, msg, 'player');
  return processEnemyTurn({ ...state, player: newPlayer, combat: { ...newCombat, playerTurn: false } });
}

// Player flees
export function combatFlee(state: GameState): GameState {
  if (state.phase !== 'combat' || !state.combat) return state;
  const { player, combat } = state;

  const fleeChance = 0.4 + (player.stats.spd - combat.enemy.stats.spd) * 0.03;
  if (Math.random() < Math.max(0.1, Math.min(0.8, fleeChance))) {
    let c = addLog(combat, '逃げることに成功した！', 'system');
    c = { ...c, ended: true, fled: true };
    return { ...state, phase: 'dungeon', combat: c, messages: [...state.messages, '戦闘から逃走した！'].slice(-8) };
  } else {
    let c = addLog(combat, '逃げられなかった！', 'system');
    return processEnemyTurn({ ...state, combat: { ...c, playerTurn: false } });
  }
}

// Process enemy turn
function processEnemyTurn(state: GameState): GameState {
  if (!state.combat) return state;
  let { player, combat } = state;
  let enemy = { ...combat.enemy };

  // Tick enemy status effects
  let enemyStatusMsgs: string[] = [];
  const statusDmgs = ['poison', 'burn'];
  enemy.statusEffects = enemy.statusEffects
    .map(se => {
      if (statusDmgs.includes(se.type)) {
        enemy.hp = Math.max(0, enemy.hp - se.power);
        enemyStatusMsgs.push(`${se.type === 'poison' ? '毒' : '燃焼'}で${se.power}ダメージ！`);
      }
      return { ...se, duration: se.duration - 1 };
    })
    .filter(se => se.duration > 0);

  let c = { ...combat, enemy };
  for (const msg of enemyStatusMsgs) c = addLog(c, msg, 'status');

  if (enemy.hp <= 0) return handleVictory(state, c);

  // Stun check
  if (enemy.statusEffects.some(s => s.type === 'stun')) {
    c = addLog(c, `${enemy.name}はスタン中！行動できない`, 'status');
    return { ...state, player, combat: { ...c, playerTurn: true } };
  }

  // Enemy action: randomly use skill or normal attack
  let newPlayer = { ...player };
  const useSkill = enemy.skills.length > 0 &&
    Math.random() < 0.35 &&
    enemy.skills.some(s => s.currentCooldown === 0);

  if (useSkill) {
    const available = enemy.skills.filter(s => s.currentCooldown === 0);
    const skill = available[Math.floor(Math.random() * available.length)];
    const skillIdx = enemy.skills.findIndex(s => s.id === skill.id);
    enemy.skills = enemy.skills.map((s, i) =>
      i === skillIdx ? { ...s, currentCooldown: s.cooldown } : s
    );

    if (skill.kind === 'buff' || skill.id === 'boss_roar') {
      applyStatusEffect(enemy, skill.statusApply || { type: 'strengthUp', duration: 2, power: 1.5 });
      c = addLog(c, `${enemy.icon} ${enemy.name}が${skill.name}を使った！`, 'enemy');
    } else if (skill.kind === 'heal') {
      const heal = Math.floor(enemy.maxHp * 0.2);
      enemy.hp = Math.min(enemy.hp + heal, enemy.maxHp);
      c = addLog(c, `${enemy.name}がHP${heal}回復！`, 'enemy');
    } else if (skill.kind === 'magic') {
      const crit = isCrit(enemy.stats.lck);
      const dmg = calcMagicDamage(enemy.stats.int, newPlayer.stats.def, skill.power, crit);
      newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
      c = addLog(c, `${enemy.icon} ${skill.name}！ ${dmg}ダメージ${crit ? ' 【クリティカル！】' : ''}`, crit ? 'crit' : 'enemy');
      // Drain: heal enemy
      if (skill.id === 'drain') {
        enemy.hp = Math.min(enemy.hp + Math.floor(dmg * 0.5), enemy.maxHp);
        c = addLog(c, `${enemy.name}がHP${Math.floor(dmg * 0.5)}吸収！`, 'status');
      }
      if (skill.statusApply && Math.random() < skill.statusApply.chance) {
        applyStatusEffect(newPlayer, skill.statusApply);
        const statusNames: Record<string, string> = { poison: '毒', burn: '燃焼', stun: 'スタン' };
        c = addLog(c, `${statusNames[skill.statusApply.type] || 'デバフ'}を受けた！`, 'status');
      }
    } else {
      const crit = isCrit(enemy.stats.lck);
      const dmg = calcPhysicalDamage(enemy.stats.str, newPlayer.stats.def, skill.power, crit);
      newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
      c = addLog(c, `${enemy.icon} ${skill.name}！ ${dmg}ダメージ${crit ? ' 【クリティカル！】' : ''}`, crit ? 'crit' : 'enemy');
      if (skill.statusApply && Math.random() < skill.statusApply.chance) {
        applyStatusEffect(newPlayer, skill.statusApply);
        const statusNames: Record<string, string> = { poison: '毒', burn: '燃焼', stun: 'スタン' };
        c = addLog(c, `${statusNames[skill.statusApply.type] || 'デバフ'}を受けた！`, 'status');
      }
    }
  } else {
    // Normal attack
    const crit = isCrit(enemy.stats.lck);
    const dmg = calcPhysicalDamage(enemy.stats.str, newPlayer.stats.def, 1.0, crit);
    newPlayer.hp = Math.max(0, newPlayer.hp - dmg);
    c = addLog(c, `${enemy.icon} ${enemy.name}の攻撃！ ${dmg}ダメージ${crit ? ' 【クリティカル！】' : ''}`, crit ? 'crit' : 'enemy');
  }

  // Tick enemy skill cooldowns
  enemy.skills = enemy.skills.map(s => ({ ...s, currentCooldown: Math.max(0, s.currentCooldown - 1) }));

  // Tick player status effects
  let playerStatusMsgs: string[] = [];
  newPlayer.statusEffects = newPlayer.statusEffects
    .map(se => {
      if (statusDmgs.includes(se.type)) {
        newPlayer.hp = Math.max(0, newPlayer.hp - se.power);
        playerStatusMsgs.push(`${se.type === 'poison' ? '毒' : '燃焼'}で${se.power}ダメージを受けた！`);
      }
      return { ...se, duration: se.duration - 1 };
    })
    .filter(se => se.duration > 0);

  for (const msg of playerStatusMsgs) c = addLog(c, msg, 'status');

  // Recalc effective stats after status tick
  newPlayer.stats = calcEffectiveStats(newPlayer);

  c = { ...c, enemy, playerTurn: true };

  if (newPlayer.hp <= 0) {
    return handleDefeat({ ...state, player: newPlayer, combat: c });
  }

  return { ...state, player: newPlayer, combat: c };
}

function handleVictory(state: GameState, combat: Combat): GameState {
  const { player, dungeon, meta } = state;
  const { enemy } = combat;

  let xpGained = enemy.xpReward;
  const scholarBonus = meta.unlocked['scholar'] || 0;
  xpGained = Math.floor(xpGained * (1 + scholarBonus * 0.15));

  const goldGained = enemy.goldReward;
  const treasureHunterBonus = meta.unlocked['treasure_hunter'] || 0;
  const enemyDef = ENEMIES[enemy.defId];
  const dropChance = enemyDef?.dropChance ?? 0.2;
  const actualDropChance = dropChance + treasureHunterBonus * 0.1;

  let itemDrop: Item | null = null;
  if (Math.random() < actualDropChance) {
    itemDrop = getRandomItemDrop(dungeon.floor);
  }

  const goldBonusMultiplier = 1 + (meta.unlocked['gold_digger'] || 0) * 0.2;
  const actualGold = Math.floor(goldGained * goldBonusMultiplier);

  let c = addLog(combat, `${enemy.name}を倒した！ XP+${xpGained} Gold+${actualGold}`, 'system');
  if (itemDrop) c = addLog(c, `${itemDrop.icon} ${itemDrop.name}をドロップ！`, 'system');
  c = { ...c, ended: true, victory: true, xpGained, goldGained: actualGold, itemDrop };

  // Remove enemy from dungeon
  const newDungeon = removeEnemy(dungeon, enemy.uid);

  // Update player
  let newPlayer = {
    ...player,
    xp: player.xp + xpGained,
    gold: player.gold + actualGold,
    totalKills: player.totalKills + 1,
  };

  // Add item to inventory
  if (itemDrop && newPlayer.inventory.length < 20) {
    newPlayer.inventory = [...newPlayer.inventory, itemDrop];
  }

  // Level up check
  let leveledUp = false;
  while (newPlayer.xp >= newPlayer.xpNext) {
    newPlayer = levelUp(newPlayer);
    leveledUp = true;
  }

  const newState = {
    ...state,
    player: newPlayer,
    dungeon: newDungeon,
    combat: c,
    messages: [...state.messages, `${enemy.name}撃破！ XP+${xpGained}`].slice(-8),
  };

  if (leveledUp) {
    return { ...newState, phase: 'levelUp' };
  }

  return { ...newState, phase: 'dungeon' };
}

function handleDefeat(state: GameState): GameState {
  const { player, dungeon, meta } = state;
  const shardsEarned = dungeon.floor + Math.floor(player.totalKills / 5);
  const newMeta = {
    ...meta,
    runs: meta.runs + 1,
    bestFloor: Math.max(meta.bestFloor, dungeon.floor),
    shards: meta.shards + shardsEarned,
    totalShards: meta.totalShards + shardsEarned,
  };
  return {
    ...state,
    phase: 'gameOver',
    meta: newMeta,
    messages: [`${player.name}は力尽きた... ソウルシャード+${shardsEarned}獲得`],
  };
}

// ===== LEVEL UP =====
function levelUp(player: Player): Player {
  const cls = CLASSES[player.classId];
  const newLevel = player.level + 1;
  const newBaseStats = { ...player.baseStats };
  newBaseStats.maxHp += cls.hpPerLevel;
  newBaseStats.maxMp += cls.mpPerLevel;
  // Primary stat gets extra growth
  const primary = cls.primaryStat;
  newBaseStats[primary] = (newBaseStats[primary] || 0) + 2;

  // Learn new skills
  const newSkills = [...player.skills];
  const learnableSkills = cls.skills.filter(s => s.level === newLevel);
  for (const ls of learnableSkills) {
    if (!newSkills.some(sk => sk.id === ls.skillId)) {
      newSkills.push({ ...SKILLS[ls.skillId], currentCooldown: 0 });
    }
  }

  const newXpNext = xpForLevel(newLevel + 1);

  return {
    ...player,
    level: newLevel,
    xpNext: newXpNext,
    baseStats: newBaseStats,
    stats: calcEffectiveStats({ ...player, baseStats: newBaseStats }),
    hp: Math.min(player.hp + cls.hpPerLevel, newBaseStats.maxHp),
    mp: Math.min(player.mp + cls.mpPerLevel, newBaseStats.maxMp),
    statPoints: player.statPoints + 3,
    skills: newSkills,
  };
}

export function allocateStat(state: GameState, statKey: string): GameState {
  if (state.phase !== 'levelUp' || state.player.statPoints <= 0) return state;
  const player = { ...state.player };
  const newBase = { ...player.baseStats };
  (newBase as Record<string, number>)[statKey] = ((newBase as Record<string, number>)[statKey] || 0) + 1;
  player.baseStats = newBase;
  player.statPoints -= 1;
  player.stats = calcEffectiveStats(player);
  // Heal a bit on level up
  if (statKey === 'maxHp') player.hp = Math.min(player.hp + 5, player.stats.maxHp);
  if (statKey === 'maxMp') player.mp = Math.min(player.mp + 5, player.stats.maxMp);

  const phase: Phase = player.statPoints > 0 ? 'levelUp' : 'dungeon';
  return { ...state, player, phase, messages: [...state.messages, `${statKey}に+1割り振り！`].slice(-8) };
}

// ===== INVENTORY =====
export function equipItem(state: GameState, itemId: string): GameState {
  const player = { ...state.player };
  const itemIdx = player.inventory.findIndex(i => i.id === itemId);
  if (itemIdx < 0) return state;
  const item = player.inventory[itemIdx];

  if (!['weapon', 'armor', 'ring'].includes(item.kind)) return state;
  const slot = item.kind as 'weapon' | 'armor' | 'ring';

  const newInventory = [...player.inventory];
  // Unequip current
  const current = player.equipment[slot];
  if (current) newInventory.push(current);
  // Equip new
  newInventory.splice(newInventory.findIndex(i => i.id === item.id), 1);
  player.inventory = newInventory;
  player.equipment = { ...player.equipment, [slot]: item };
  player.stats = calcEffectiveStats(player);

  return {
    ...state,
    player,
    messages: [...state.messages, `${item.icon} ${item.name}を装備した！`].slice(-8),
  };
}

export function unequipItem(state: GameState, slot: 'weapon' | 'armor' | 'ring'): GameState {
  const player = { ...state.player };
  const item = player.equipment[slot];
  if (!item) return state;
  if (player.inventory.length >= 20) {
    return { ...state, messages: [...state.messages, 'インベントリが満杯！'].slice(-8) };
  }
  player.inventory = [...player.inventory, item];
  player.equipment = { ...player.equipment, [slot]: null };
  player.stats = calcEffectiveStats(player);
  return {
    ...state,
    player,
    messages: [...state.messages, `${item.name}を外した`].slice(-8),
  };
}

export function dropItem(state: GameState, itemId: string): GameState {
  const player = { ...state.player };
  player.inventory = player.inventory.filter(i => i.id !== itemId);
  return {
    ...state,
    player,
    messages: [...state.messages, 'アイテムを捨てた'].slice(-8),
  };
}

export function useItem(state: GameState, itemId: string): GameState {
  if (state.phase !== 'dungeon') return state;
  const player = { ...state.player };
  const itemIdx = player.inventory.findIndex(i => i.id === itemId);
  if (itemIdx < 0) return state;
  const item = player.inventory[itemIdx];

  let msg = '';
  if (item.kind === 'potion' && item.healHp) {
    const heal = item.healHp >= 9999 ? player.stats.maxHp - player.hp : item.healHp;
    player.hp = Math.min(player.hp + heal, player.stats.maxHp);
    msg = `${item.icon} ${item.name}使用！ HP+${heal}`;
  } else if (item.kind === 'mpPotion' && item.healMp) {
    const heal = item.healMp >= 9999 ? player.stats.maxMp - player.mp : item.healMp;
    player.mp = Math.min(player.mp + heal, player.stats.maxMp);
    msg = `${item.icon} ${item.name}使用！ MP+${heal}`;
  } else {
    return state;
  }

  player.inventory = player.inventory.filter((_, i) => i !== itemIdx);
  return {
    ...state,
    player,
    messages: [...state.messages, msg].slice(-8),
  };
}

// ===== META UPGRADES =====
export function purchaseUpgrade(state: GameState, upgradeId: string): GameState {
  const upgrade = META_UPGRADES.find(u => u.id === upgradeId);
  if (!upgrade) return state;
  const meta = { ...state.meta };
  const currentLevel = meta.unlocked[upgradeId] || 0;
  if (currentLevel >= upgrade.maxLevel) return state;
  if (meta.shards < upgrade.cost) return state;

  meta.shards -= upgrade.cost;
  meta.unlocked = { ...meta.unlocked, [upgradeId]: currentLevel + 1 };
  return { ...state, meta };
}

// ===== STATUS TICK =====
function tickStatusEffects(player: Player): { player: Player; messages: string[] } {
  const messages: string[] = [];
  const statusDmgs = ['poison', 'burn'];
  const newEffects = player.statusEffects
    .map(se => {
      if (statusDmgs.includes(se.type)) {
        // Deal damage on move
      }
      return { ...se, duration: se.duration - 1 };
    })
    .filter(se => se.duration > 0);

  return { player: { ...player, statusEffects: newEffects }, messages };
}

// ===== SAVE/LOAD META =====
export function loadMeta(): GameState['meta'] {
  if (typeof window === 'undefined') return defaultMeta();
  try {
    const stored = localStorage.getItem('roguelike_meta');
    if (stored) return JSON.parse(stored);
  } catch {}
  return defaultMeta();
}

export function saveMeta(meta: GameState['meta']) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('roguelike_meta', JSON.stringify(meta));
  } catch {}
}

function defaultMeta(): GameState['meta'] {
  return { runs: 0, bestFloor: 0, shards: 0, totalShards: 0, unlocked: {} };
}

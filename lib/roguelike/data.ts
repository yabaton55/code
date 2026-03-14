import type { ClassDef, SkillDef, EnemyDef, Item, MetaUpgrade } from './types';

// ===== SKILL DEFINITIONS =====
export const SKILLS: Record<string, SkillDef> = {
  // --- Warrior ---
  heavy_strike: {
    id: 'heavy_strike', name: '重撃', icon: '⚔️',
    desc: 'STRの2倍のダメージを与える強力な一撃',
    mpCost: 8, cooldown: 2, kind: 'physical', target: 'enemy', power: 2.0,
  },
  battle_shout: {
    id: 'battle_shout', name: '雄叫び', icon: '📣',
    desc: '3ターンの間STRが50%上昇する',
    mpCost: 10, cooldown: 4, kind: 'buff', target: 'self', power: 1.5,
    statusApply: { type: 'strengthUp', chance: 1.0, duration: 3, power: 1.5 },
  },
  whirlwind: {
    id: 'whirlwind', name: '旋風斬', icon: '🌀',
    desc: 'STRの1.8倍のダメージ。防御を無視して50%貫通',
    mpCost: 15, cooldown: 3, kind: 'physical', target: 'enemy', power: 1.8,
  },
  shield_bash: {
    id: 'shield_bash', name: 'シールドバッシュ', icon: '🛡️',
    desc: '敵を1ターンスタンさせる',
    mpCost: 12, cooldown: 3, kind: 'physical', target: 'enemy', power: 1.2,
    statusApply: { type: 'stun', chance: 0.8, duration: 1, power: 1 },
  },
  iron_will: {
    id: 'iron_will', name: '鉄の意志', icon: '💪',
    desc: '3ターンの間DEFが80%上昇する',
    mpCost: 12, cooldown: 4, kind: 'buff', target: 'self', power: 1.0,
    statusApply: { type: 'defenseUp', chance: 1.0, duration: 3, power: 1.8 },
  },
  // --- Mage ---
  fireball: {
    id: 'fireball', name: 'ファイアボール', icon: '🔥',
    desc: 'INTの2.5倍の火魔法ダメージ。燃焼付与の可能性',
    mpCost: 12, cooldown: 2, kind: 'magic', target: 'enemy', power: 2.5,
    statusApply: { type: 'burn', chance: 0.4, duration: 3, power: 8 },
  },
  ice_shard: {
    id: 'ice_shard', name: 'アイスシャード', icon: '❄️',
    desc: 'INTの1.8倍の氷魔法ダメージ。速度低下',
    mpCost: 8, cooldown: 1, kind: 'magic', target: 'enemy', power: 1.8,
  },
  thunder_strike: {
    id: 'thunder_strike', name: 'サンダーストライク', icon: '⚡',
    desc: 'INTの3倍の雷魔法ダメージ。高威力',
    mpCost: 20, cooldown: 3, kind: 'magic', target: 'enemy', power: 3.0,
  },
  arcane_surge: {
    id: 'arcane_surge', name: 'アルカンサージ', icon: '✨',
    desc: 'MPを20回復し、3ターンINTが50%上昇',
    mpCost: 5, cooldown: 5, kind: 'buff', target: 'self', power: 1.0,
    statusApply: { type: 'strengthUp', chance: 1.0, duration: 3, power: 1.5 },
  },
  magic_missile: {
    id: 'magic_missile', name: 'マジックミサイル', icon: '🔮',
    desc: 'INTの1.5倍の確実にヒットする魔法ダメージ',
    mpCost: 6, cooldown: 0, kind: 'magic', target: 'enemy', power: 1.5,
  },
  // --- Rogue ---
  backstab: {
    id: 'backstab', name: 'バックスタブ', icon: '🗡️',
    desc: 'SPDに比例した高ダメージ。クリティカル率+40%',
    mpCost: 10, cooldown: 2, kind: 'physical', target: 'enemy', power: 2.5,
  },
  poison_blade: {
    id: 'poison_blade', name: 'ポイズンブレード', icon: '☠️',
    desc: '毒を付与する攻撃。毎ターンダメージ継続',
    mpCost: 8, cooldown: 2, kind: 'physical', target: 'enemy', power: 1.4,
    statusApply: { type: 'poison', chance: 0.9, duration: 4, power: 10 },
  },
  shadow_step: {
    id: 'shadow_step', name: 'シャドウステップ', icon: '👤',
    desc: '3ターン速度が70%上昇し、回避率も上がる',
    mpCost: 12, cooldown: 4, kind: 'buff', target: 'self', power: 1.0,
    statusApply: { type: 'speedUp', chance: 1.0, duration: 3, power: 1.7 },
  },
  expose_weakness: {
    id: 'expose_weakness', name: '弱点暴露', icon: '🎯',
    desc: '次の攻撃が必ずクリティカルになる',
    mpCost: 8, cooldown: 3, kind: 'buff', target: 'self', power: 1.0,
  },
  // --- Paladin ---
  holy_strike: {
    id: 'holy_strike', name: 'ホーリーストライク', icon: '✝️',
    desc: 'STRとINTの合計に基づく神聖ダメージ',
    mpCost: 10, cooldown: 2, kind: 'physical', target: 'enemy', power: 1.8,
  },
  heal: {
    id: 'heal', name: 'ヒール', icon: '💚',
    desc: 'INTの3倍のHPを回復する',
    mpCost: 15, cooldown: 3, kind: 'heal', target: 'self', power: 3.0,
  },
  divine_shield: {
    id: 'divine_shield', name: 'ディバインシールド', icon: '🌟',
    desc: '2ターンの間DEFが100%上昇する',
    mpCost: 12, cooldown: 4, kind: 'buff', target: 'self', power: 1.0,
    statusApply: { type: 'defenseUp', chance: 1.0, duration: 2, power: 2.0 },
  },
  consecrate: {
    id: 'consecrate', name: 'コンセクレイト', icon: '⚜️',
    desc: 'INTの2.5倍の神聖魔法ダメージ+燃焼',
    mpCost: 18, cooldown: 3, kind: 'magic', target: 'enemy', power: 2.5,
    statusApply: { type: 'burn', chance: 0.6, duration: 2, power: 12 },
  },
  // --- Enemy skills ---
  bite: {
    id: 'bite', name: 'かみつき', icon: '🦷',
    desc: '強力な噛みつき攻撃', mpCost: 0, cooldown: 2, kind: 'physical', target: 'enemy', power: 1.5,
  },
  poison_bite: {
    id: 'poison_bite', name: '毒の牙', icon: '🐍',
    desc: '毒を付与するかみつき', mpCost: 0, cooldown: 3, kind: 'physical', target: 'enemy', power: 1.2,
    statusApply: { type: 'poison', chance: 0.7, duration: 3, power: 8 },
  },
  dark_bolt: {
    id: 'dark_bolt', name: '暗黒魔法', icon: '🌑',
    desc: '闇の魔力を放つ', mpCost: 0, cooldown: 2, kind: 'magic', target: 'enemy', power: 2.0,
  },
  fire_breath: {
    id: 'fire_breath', name: 'ファイアブレス', icon: '🐉',
    desc: '炎のブレスで焼き払う', mpCost: 0, cooldown: 3, kind: 'magic', target: 'enemy', power: 2.8,
    statusApply: { type: 'burn', chance: 0.5, duration: 2, power: 15 },
  },
  boss_roar: {
    id: 'boss_roar', name: '咆哮', icon: '😤',
    desc: 'DEFを下げる咆哮', mpCost: 0, cooldown: 4, kind: 'buff', target: 'self', power: 1.0,
    statusApply: { type: 'strengthUp', chance: 1.0, duration: 2, power: 1.5 },
  },
  drain: {
    id: 'drain', name: '生命力吸収', icon: '💜',
    desc: '相手のHPを吸い取る', mpCost: 0, cooldown: 3, kind: 'magic', target: 'enemy', power: 1.8,
  },
  shadow_bolt: {
    id: 'shadow_bolt', name: 'シャドウボルト', icon: '🖤',
    desc: '影の弾を放つ', mpCost: 0, cooldown: 2, kind: 'magic', target: 'enemy', power: 1.6,
  },
};

// ===== CLASS DEFINITIONS =====
export const CLASSES: Record<string, ClassDef> = {
  warrior: {
    id: 'warrior', name: '戦士', icon: '⚔️',
    desc: '高いHPと攻撃力を持つ前衛職。タフで頼れる存在。',
    flavor: '剣と盾を手に、正面から敵を打ち破る力と耐久力の化身。',
    baseStats: { maxHp: 120, maxMp: 40, str: 15, def: 12, int: 4, spd: 8, lck: 6 },
    hpPerLevel: 18, mpPerLevel: 4, primaryStat: 'str',
    skills: [
      { level: 1, skillId: 'heavy_strike' },
      { level: 3, skillId: 'battle_shout' },
      { level: 5, skillId: 'whirlwind' },
      { level: 7, skillId: 'shield_bash' },
      { level: 9, skillId: 'iron_will' },
    ],
  },
  mage: {
    id: 'mage', name: '魔法使い', icon: '🔮',
    desc: '高い魔法攻撃力を持つ後衛職。HPは低いが火力は最高。',
    flavor: '古の魔法書を読み解き、世界の真理を操る知識の探求者。',
    baseStats: { maxHp: 70, maxMp: 100, str: 5, def: 5, int: 18, spd: 9, lck: 8 },
    hpPerLevel: 10, mpPerLevel: 12, primaryStat: 'int',
    skills: [
      { level: 1, skillId: 'magic_missile' },
      { level: 2, skillId: 'fireball' },
      { level: 4, skillId: 'ice_shard' },
      { level: 6, skillId: 'thunder_strike' },
      { level: 8, skillId: 'arcane_surge' },
    ],
  },
  rogue: {
    id: 'rogue', name: '盗賊', icon: '🗡️',
    desc: '高い速度と幸運を持つ技巧職。クリティカルが命。',
    flavor: '闇に潜み、一瞬の隙を突く。速さこそが最大の防御。',
    baseStats: { maxHp: 85, maxMp: 60, str: 11, def: 7, int: 7, spd: 16, lck: 14 },
    hpPerLevel: 12, mpPerLevel: 7, primaryStat: 'spd',
    skills: [
      { level: 1, skillId: 'backstab' },
      { level: 3, skillId: 'poison_blade' },
      { level: 5, skillId: 'shadow_step' },
      { level: 7, skillId: 'expose_weakness' },
    ],
  },
  paladin: {
    id: 'paladin', name: 'パラディン', icon: '🌟',
    desc: '攻守のバランスが良い神聖職。ヒールで長期戦に強い。',
    flavor: '神の加護を受けし者。聖なる力で仲間を守り、悪を裁く。',
    baseStats: { maxHp: 100, maxMp: 70, str: 12, def: 10, int: 10, spd: 7, lck: 9 },
    hpPerLevel: 15, mpPerLevel: 8, primaryStat: 'str',
    skills: [
      { level: 1, skillId: 'holy_strike' },
      { level: 3, skillId: 'heal' },
      { level: 5, skillId: 'divine_shield' },
      { level: 7, skillId: 'consecrate' },
    ],
  },
};

// ===== ENEMY DEFINITIONS =====
export const ENEMIES: Record<string, EnemyDef> = {
  // Floor 1-3
  slime: {
    id: 'slime', name: 'スライム', icon: '🟢',
    desc: '柔らかい体を持つ基本的なモンスター',
    stats: { maxHp: 20, maxMp: 0, str: 5, def: 2, int: 1, spd: 3, lck: 2 },
    skills: [], xpReward: 12, goldMin: 1, goldMax: 5,
    floorMin: 1, floorMax: 3, isBoss: false, dropChance: 0.1,
  },
  rat: {
    id: 'rat', name: 'ジャイアントラット', icon: '🐀',
    desc: '大型のネズミ。素早く動き回る',
    stats: { maxHp: 18, maxMp: 0, str: 6, def: 2, int: 1, spd: 8, lck: 5 },
    skills: ['bite'], xpReward: 15, goldMin: 1, goldMax: 4,
    floorMin: 1, floorMax: 3, isBoss: false, dropChance: 0.1,
  },
  goblin: {
    id: 'goblin', name: 'ゴブリン', icon: '👺',
    desc: '知恵があり道具を使う小型モンスター',
    stats: { maxHp: 30, maxMp: 10, str: 8, def: 4, int: 4, spd: 7, lck: 6 },
    skills: ['bite'], xpReward: 20, goldMin: 3, goldMax: 10,
    floorMin: 1, floorMax: 4, isBoss: false, dropChance: 0.2,
  },
  green_slime_king: {
    id: 'green_slime_king', name: 'スライムキング', icon: '💚',
    desc: '【BOSS】巨大なスライムの王。分裂攻撃が厄介',
    stats: { maxHp: 120, maxMp: 30, str: 12, def: 6, int: 5, spd: 4, lck: 3 },
    skills: ['bite', 'boss_roar'], xpReward: 100, goldMin: 20, goldMax: 40,
    floorMin: 3, floorMax: 3, isBoss: true, dropChance: 1.0,
  },
  // Floor 4-6
  skeleton: {
    id: 'skeleton', name: 'スケルトン', icon: '💀',
    desc: '魔法で動く骸骨の兵士',
    stats: { maxHp: 45, maxMp: 0, str: 12, def: 8, int: 2, spd: 6, lck: 3 },
    skills: ['bite'], xpReward: 35, goldMin: 5, goldMax: 15,
    floorMin: 4, floorMax: 6, isBoss: false, dropChance: 0.25,
  },
  orc: {
    id: 'orc', name: 'オーク', icon: '👹',
    desc: '力強い緑色の蛮族。攻撃力が高い',
    stats: { maxHp: 60, maxMp: 0, str: 16, def: 8, int: 3, spd: 5, lck: 4 },
    skills: ['bite'], xpReward: 40, goldMin: 8, goldMax: 18,
    floorMin: 4, floorMax: 7, isBoss: false, dropChance: 0.3,
  },
  dark_bat: {
    id: 'dark_bat', name: 'ダークバット', icon: '🦇',
    desc: '暗闇を飛び回る吸血コウモリ',
    stats: { maxHp: 35, maxMp: 20, str: 10, def: 5, int: 8, spd: 14, lck: 8 },
    skills: ['drain'], xpReward: 38, goldMin: 5, goldMax: 12,
    floorMin: 4, floorMax: 6, isBoss: false, dropChance: 0.2,
  },
  zombie: {
    id: 'zombie', name: 'ゾンビ', icon: '🧟',
    desc: '腐敗した体を持つ不死者。毒の危険がある',
    stats: { maxHp: 55, maxMp: 0, str: 11, def: 6, int: 2, spd: 3, lck: 2 },
    skills: ['poison_bite'], xpReward: 32, goldMin: 3, goldMax: 10,
    floorMin: 4, floorMax: 7, isBoss: false, dropChance: 0.2,
  },
  orc_warlord: {
    id: 'orc_warlord', name: 'オーク・ウォーロード', icon: '⚔️',
    desc: '【BOSS】オーク族の英雄。圧倒的な戦闘力を誇る',
    stats: { maxHp: 280, maxMp: 40, str: 22, def: 14, int: 5, spd: 8, lck: 5 },
    skills: ['bite', 'boss_roar', 'bite'], xpReward: 300, goldMin: 50, goldMax: 80,
    floorMin: 6, floorMax: 6, isBoss: true, dropChance: 1.0,
  },
  // Floor 7-9
  vampire: {
    id: 'vampire', name: 'ヴァンパイア', icon: '🧛',
    desc: '古い血族の不死者。HPを吸収する危険な敵',
    stats: { maxHp: 90, maxMp: 50, str: 18, def: 12, int: 14, spd: 12, lck: 10 },
    skills: ['drain', 'dark_bolt'], xpReward: 80, goldMin: 15, goldMax: 30,
    floorMin: 7, floorMax: 9, isBoss: false, dropChance: 0.4,
  },
  werewolf: {
    id: 'werewolf', name: 'ワーウルフ', icon: '🐺',
    desc: '月の力で変身した獣人。素早く攻撃的',
    stats: { maxHp: 85, maxMp: 20, str: 22, def: 10, int: 6, spd: 18, lck: 8 },
    skills: ['bite', 'bite'], xpReward: 85, goldMin: 12, goldMax: 28,
    floorMin: 7, floorMax: 9, isBoss: false, dropChance: 0.35,
  },
  dark_mage: {
    id: 'dark_mage', name: 'ダークメイジ', icon: '🧙',
    desc: '禁断の魔法を操る闇の魔法使い',
    stats: { maxHp: 65, maxMp: 100, str: 8, def: 7, int: 22, spd: 10, lck: 12 },
    skills: ['dark_bolt', 'shadow_bolt', 'fire_breath'], xpReward: 90, goldMin: 18, goldMax: 35,
    floorMin: 7, floorMax: 10, isBoss: false, dropChance: 0.45,
  },
  death_knight: {
    id: 'death_knight', name: 'デスナイト', icon: '🗡️',
    desc: '死霊術で甦った最強の戦士',
    stats: { maxHp: 110, maxMp: 30, str: 24, def: 18, int: 8, spd: 9, lck: 6 },
    skills: ['bite', 'dark_bolt'], xpReward: 95, goldMin: 20, goldMax: 40,
    floorMin: 8, floorMax: 10, isBoss: false, dropChance: 0.4,
  },
  lich: {
    id: 'lich', name: 'リッチ', icon: '💀',
    desc: '【BOSS】不死の魔法王。禁断の力を持つ',
    stats: { maxHp: 380, maxMp: 200, str: 15, def: 16, int: 28, spd: 11, lck: 14 },
    skills: ['dark_bolt', 'shadow_bolt', 'fire_breath', 'boss_roar'], xpReward: 500, goldMin: 80, goldMax: 120,
    floorMin: 9, floorMax: 9, isBoss: true, dropChance: 1.0,
  },
  // Floor 10 - Final Boss
  dragon_lord: {
    id: 'dragon_lord', name: 'ドラゴンロード', icon: '🐉',
    desc: '【最終BOSS】伝説の龍王。その力は全てを超越する',
    stats: { maxHp: 800, maxMp: 300, str: 35, def: 25, int: 30, spd: 14, lck: 15 },
    skills: ['fire_breath', 'bite', 'boss_roar', 'dark_bolt', 'fire_breath'],
    xpReward: 2000, goldMin: 200, goldMax: 500,
    floorMin: 10, floorMax: 10, isBoss: true, dropChance: 1.0,
  },
};

// ===== ITEM POOL =====
export const ITEMS: Item[] = [
  // === WEAPONS ===
  { id: 'rusty_sword', kind: 'weapon', name: '錆びた剣', rarity: 'common', icon: '🗡️',
    desc: '古びた剣。しかし戦える。', statBonus: { str: 3 }, value: 10, minFloor: 1 },
  { id: 'iron_sword', kind: 'weapon', name: '鉄の剣', rarity: 'common', icon: '⚔️',
    desc: '標準的な鉄製の剣。', statBonus: { str: 6 }, value: 30, minFloor: 2 },
  { id: 'dagger', kind: 'weapon', name: '短剣', rarity: 'common', icon: '🔪',
    desc: '素早い攻撃に特化した短剣。', statBonus: { str: 4, spd: 3 }, value: 25, minFloor: 1 },
  { id: 'wooden_staff', kind: 'weapon', name: '木の杖', rarity: 'common', icon: '🪄',
    desc: '魔力を宿した木製の杖。', statBonus: { int: 4 }, value: 15, minFloor: 1 },
  { id: 'mage_staff', kind: 'weapon', name: '魔法使いの杖', rarity: 'uncommon', icon: '✨',
    desc: '魔力を大幅に増幅する杖。', statBonus: { int: 8, maxMp: 15 }, value: 60, minFloor: 3 },
  { id: 'battle_axe', kind: 'weapon', name: 'バトルアックス', rarity: 'uncommon', icon: '🪓',
    desc: '重い斧。攻撃力は高いが速度が落ちる。', statBonus: { str: 10, spd: -2 }, value: 70, minFloor: 4 },
  { id: 'twin_daggers', kind: 'weapon', name: '双剣', rarity: 'uncommon', icon: '⚔️',
    desc: '二刀流の専用武器。速度が大きく上がる。', statBonus: { str: 6, spd: 6 }, value: 80, minFloor: 4 },
  { id: 'elven_bow', kind: 'weapon', name: 'エルフの弓', rarity: 'rare', icon: '🏹',
    desc: '古代エルフが作りし弓。命中率が高い。', statBonus: { str: 8, spd: 4, lck: 5 }, value: 150, minFloor: 5 },
  { id: 'flame_sword', kind: 'weapon', name: '炎の剣', rarity: 'rare', icon: '🔥',
    desc: '炎を纏う魔法の剣。', statBonus: { str: 13, int: 5 }, value: 200, minFloor: 6 },
  { id: 'shadow_blade', kind: 'weapon', name: 'シャドウブレード', rarity: 'rare', icon: '🖤',
    desc: '影から作られた剣。速度と会心率が高い。', statBonus: { str: 10, spd: 8, lck: 8 }, value: 220, minFloor: 7 },
  { id: 'arcane_tome', kind: 'weapon', name: '古代の魔導書', rarity: 'epic', icon: '📖',
    desc: '禁断の知識が詰まった魔導書。', statBonus: { int: 16, maxMp: 30 }, value: 400, minFloor: 7 },
  { id: 'dragon_slayer', kind: 'weapon', name: 'ドラゴンスレイヤー', rarity: 'epic', icon: '⚔️',
    desc: '龍をも倒す伝説の剣。', statBonus: { str: 22, def: 5 }, value: 500, minFloor: 8 },
  { id: 'excalibur', kind: 'weapon', name: 'エクスカリバー', rarity: 'legendary', icon: '✨',
    desc: '伝説の聖剣。全ての力を高める。', statBonus: { str: 28, maxHp: 40, lck: 10 }, value: 1000, minFloor: 9 },
  { id: 'staff_of_eternity', kind: 'weapon', name: '永遠の杖', rarity: 'legendary', icon: '🌟',
    desc: '時空を超えた杖。魔法の頂点。', statBonus: { int: 30, maxMp: 60, spd: 5 }, value: 1200, minFloor: 9 },
  // === ARMOR ===
  { id: 'cloth_robe', kind: 'armor', name: '布のローブ', rarity: 'common', icon: '👘',
    desc: '薄い布でできたローブ。', statBonus: { def: 2 }, value: 12, minFloor: 1 },
  { id: 'leather_armor', kind: 'armor', name: '革鎧', rarity: 'common', icon: '🥋',
    desc: '標準的な革製の鎧。', statBonus: { def: 5 }, value: 30, minFloor: 1 },
  { id: 'chain_mail', kind: 'armor', name: 'チェインメイル', rarity: 'common', icon: '🛡️',
    desc: '鎖帷子。バランスの良い防具。', statBonus: { def: 8 }, value: 60, minFloor: 3 },
  { id: 'magic_robe', kind: 'armor', name: '魔法のローブ', rarity: 'uncommon', icon: '✨',
    desc: '魔力を高めるローブ。', statBonus: { def: 4, int: 5, maxMp: 20 }, value: 80, minFloor: 3 },
  { id: 'plate_armor', kind: 'armor', name: 'プレートアーマー', rarity: 'uncommon', icon: '🛡️',
    desc: '全身を覆う重厚な鎧。', statBonus: { def: 14, maxHp: 20, spd: -2 }, value: 100, minFloor: 5 },
  { id: 'mithril_armor', kind: 'armor', name: 'ミスリル鎧', rarity: 'rare', icon: '💎',
    desc: 'ミスリル製の軽い鎧。防御と速度を両立。', statBonus: { def: 18, spd: 3, maxHp: 30 }, value: 250, minFloor: 6 },
  { id: 'dragon_scale', kind: 'armor', name: 'ドラゴンスケール', rarity: 'epic', icon: '🐉',
    desc: '龍の鱗で作った最強の鎧。', statBonus: { def: 28, maxHp: 50 }, value: 600, minFloor: 8 },
  // === RINGS ===
  { id: 'ring_strength', kind: 'ring', name: '力の指輪', rarity: 'common', icon: '💪',
    desc: 'STRを高める指輪。', statBonus: { str: 4 }, value: 40, minFloor: 2 },
  { id: 'ring_defense', kind: 'ring', name: '守りの指輪', rarity: 'common', icon: '🛡️',
    desc: 'DEFを高める指輪。', statBonus: { def: 4 }, value: 40, minFloor: 2 },
  { id: 'ring_luck', kind: 'ring', name: '幸運の指輪', rarity: 'uncommon', icon: '🍀',
    desc: 'LCKを大きく高める指輪。', statBonus: { lck: 8 }, value: 70, minFloor: 2 },
  { id: 'ring_vitality', kind: 'ring', name: '活力の指輪', rarity: 'uncommon', icon: '❤️',
    desc: 'HPとHPを大幅に増やす。', statBonus: { maxHp: 30, def: 3 }, value: 90, minFloor: 3 },
  { id: 'ring_mana', kind: 'ring', name: '魔力の指輪', rarity: 'uncommon', icon: '💙',
    desc: 'MPとINTを高める指輪。', statBonus: { maxMp: 25, int: 4 }, value: 85, minFloor: 3 },
  { id: 'ring_speed', kind: 'ring', name: '疾風の指輪', rarity: 'rare', icon: '💨',
    desc: '素早さを大幅に高める。', statBonus: { spd: 10, lck: 4 }, value: 150, minFloor: 5 },
  { id: 'ring_dragon', kind: 'ring', name: '竜の指輪', rarity: 'epic', icon: '🐲',
    desc: '竜の力を秘めた指輪。全ての能力を高める。',
    statBonus: { str: 8, def: 8, int: 8, spd: 5, lck: 5, maxHp: 40, maxMp: 30 }, value: 800, minFloor: 8 },
  // === CONSUMABLES ===
  { id: 'small_potion', kind: 'potion', name: '小回復ポーション', rarity: 'common', icon: '🧪',
    desc: 'HPを30回復する。', healHp: 30, value: 15, minFloor: 1 },
  { id: 'potion', kind: 'potion', name: '回復ポーション', rarity: 'common', icon: '🍶',
    desc: 'HPを60回復する。', healHp: 60, value: 25, minFloor: 2 },
  { id: 'large_potion', kind: 'potion', name: '大回復ポーション', rarity: 'uncommon', icon: '🫙',
    desc: 'HPを120回復する。', healHp: 120, value: 50, minFloor: 4 },
  { id: 'elixir', kind: 'potion', name: 'エリクシール', rarity: 'rare', icon: '✨',
    desc: 'HPを完全回復する。', healHp: 9999, value: 200, minFloor: 6 },
  { id: 'mp_potion', kind: 'mpPotion', name: 'MPポーション', rarity: 'common', icon: '💧',
    desc: 'MPを30回復する。', healMp: 30, value: 20, minFloor: 1 },
  { id: 'large_mp_potion', kind: 'mpPotion', name: '大MPポーション', rarity: 'uncommon', icon: '💎',
    desc: 'MPを70回復する。', healMp: 70, value: 45, minFloor: 4 },
  { id: 'full_mp_potion', kind: 'mpPotion', name: 'マナエリクシール', rarity: 'rare', icon: '🌊',
    desc: 'MPを完全回復する。', healMp: 9999, value: 150, minFloor: 7 },
  { id: 'scroll_identify', kind: 'scroll', name: '鑑定の巻物', rarity: 'common', icon: '📜',
    desc: '未知のアイテムを鑑定する。', value: 30, minFloor: 1 },
  { id: 'scroll_teleport', kind: 'scroll', name: 'テレポートの巻物', rarity: 'uncommon', icon: '🌀',
    desc: 'ランダムな場所へ飛ぶ。', value: 60, minFloor: 3 },
];

// ===== META UPGRADES =====
export const META_UPGRADES: MetaUpgrade[] = [
  { id: 'iron_constitution', name: '鉄の体', desc: '開始時の最大HPが+25増加', icon: '❤️', cost: 5, maxLevel: 4 },
  { id: 'mana_reservoir', name: '魔力の泉', desc: '開始時の最大MPが+20増加', icon: '💙', cost: 5, maxLevel: 3 },
  { id: 'scholar', name: '学者', desc: '獲得XPが+15%増加', icon: '📚', cost: 8, maxLevel: 3 },
  { id: 'treasure_hunter', name: '宝探し師', desc: 'アイテムドロップ率が+10%増加', icon: '💰', cost: 8, maxLevel: 3 },
  { id: 'gold_digger', name: '金の亡者', desc: '取得ゴールドが+20%増加', icon: '🏆', cost: 8, maxLevel: 3 },
  { id: 'veteran', name: '歴戦の戦士', desc: '開始レベルが+1になる', icon: '⭐', cost: 15, maxLevel: 3 },
  { id: 'ancient_knowledge', name: '古の知識', desc: '全基本ステータスが+2増加', icon: '🔮', cost: 20, maxLevel: 2 },
  { id: 'lucky_start', name: '幸運の始まり', desc: '開始時にランダムなアイテムを1個持つ', icon: '🍀', cost: 12, maxLevel: 2 },
];

// Helper: get item drop for enemy
export function getRandomItemDrop(floor: number): Item | null {
  const eligible = ITEMS.filter(i =>
    i.minFloor <= floor &&
    ['weapon', 'armor', 'ring', 'potion', 'mpPotion'].includes(i.kind)
  );
  if (eligible.length === 0) return null;
  // Weight by rarity (common more likely)
  const rarityWeights: Record<string, number> = {
    common: 50, uncommon: 30, rare: 15, epic: 4, legendary: 1,
  };
  const weighted = eligible.flatMap(item =>
    Array(rarityWeights[item.rarity] || 1).fill(item)
  );
  return { ...weighted[Math.floor(Math.random() * weighted.length)], id: `${Date.now()}_${Math.random()}` };
}

// Helper: get random shop items
export function getShopItems(floor: number): Item[] {
  const pool = ITEMS.filter(i =>
    i.minFloor <= floor + 1 &&
    ['weapon', 'armor', 'ring', 'potion', 'mpPotion'].includes(i.kind)
  );
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5).map(i => ({ ...i, id: `shop_${Date.now()}_${Math.random()}` }));
}

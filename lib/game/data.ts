import type { Item, Skill, Monster, DungeonArea, Achievement, CraftRecipe, JobClass, Stats, Element } from './types';

// ===== JOB DEFINITIONS =====
export const JOB_DATA: Record<JobClass, {
  name: string;
  emoji: string;
  description: string;
  baseStats: Stats;
  statGrowth: Stats;
  hpBase: number;
  hpGrowth: number;
  mpBase: number;
  mpGrowth: number;
  color: string;
}> = {
  warrior: {
    name: '戦士',
    emoji: '⚔️',
    description: '高い攻撃力とHPを持つ近接戦闘の専門家。物理スキルに優れる。',
    baseStats: { str: 10, dex: 6, int: 3, vit: 8, agi: 5, luk: 4 },
    statGrowth: { str: 3, dex: 1, int: 0, vit: 2, agi: 1, luk: 1 },
    hpBase: 120, hpGrowth: 15, mpBase: 30, mpGrowth: 3,
    color: 'text-red-400',
  },
  mage: {
    name: '魔法使い',
    emoji: '🔮',
    description: '強力な攻撃魔法を操る。MPは豊富だがHPと防御は低い。',
    baseStats: { str: 3, dex: 5, int: 12, vit: 4, agi: 6, luk: 5 },
    statGrowth: { str: 0, dex: 1, int: 4, vit: 1, agi: 1, luk: 1 },
    hpBase: 70, hpGrowth: 7, mpBase: 80, mpGrowth: 12,
    color: 'text-blue-400',
  },
  rogue: {
    name: '盗賊',
    emoji: '🗡️',
    description: '素早く致命的な一撃を与える。盗みやトラップ解除も得意。',
    baseStats: { str: 7, dex: 11, int: 4, vit: 5, agi: 9, luk: 8 },
    statGrowth: { str: 1, dex: 3, int: 0, vit: 1, agi: 2, luk: 2 },
    hpBase: 85, hpGrowth: 9, mpBase: 40, mpGrowth: 5,
    color: 'text-green-400',
  },
  paladin: {
    name: '聖騎士',
    emoji: '🛡️',
    description: '攻撃と回復を兼ね備えたバランス型。聖属性魔法を使える。',
    baseStats: { str: 8, dex: 5, int: 6, vit: 9, agi: 4, luk: 6 },
    statGrowth: { str: 2, dex: 1, int: 1, vit: 3, agi: 1, luk: 1 },
    hpBase: 110, hpGrowth: 13, mpBase: 50, mpGrowth: 7,
    color: 'text-yellow-400',
  },
  archer: {
    name: '弓使い',
    emoji: '🏹',
    description: '遠距離から正確な矢を放つ。回避率が高く状態異常付与が得意。',
    baseStats: { str: 6, dex: 12, int: 5, vit: 5, agi: 8, luk: 8 },
    statGrowth: { str: 1, dex: 3, int: 1, vit: 1, agi: 2, luk: 2 },
    hpBase: 80, hpGrowth: 10, mpBase: 45, mpGrowth: 6,
    color: 'text-emerald-400',
  },
  necromancer: {
    name: '死霊術師',
    emoji: '💀',
    description: '闇の力を操り敵を弱体化させる。自らのHPを消費して強力な魔法を使う。',
    baseStats: { str: 4, dex: 5, int: 11, vit: 5, agi: 5, luk: 7 },
    statGrowth: { str: 0, dex: 1, int: 4, vit: 1, agi: 1, luk: 2 },
    hpBase: 75, hpGrowth: 8, mpBase: 90, mpGrowth: 13,
    color: 'text-purple-400',
  },
};

// ===== SKILLS =====
export const SKILLS: Record<string, Skill> = {
  // ---- WARRIOR ----
  slash: { id: 'slash', name: '斬撃', type: 'physical', element: 'none', mpCost: 4, description: '力強い一撃を放つ。STRの1.5倍のダメージ。', power: 1.5, learnLevel: 1, job: 'warrior' },
  whirlwind: { id: 'whirlwind', name: '旋風斬', type: 'physical', element: 'wind', mpCost: 8, description: '風をまとった回転斬り。全体攻撃。', power: 1.2, effect: { allEnemies: true }, learnLevel: 5, job: 'warrior' },
  berserk: { id: 'berserk', name: 'バーサーク', type: 'buff', element: 'none', mpCost: 12, description: '怒り狂い攻撃力+50%、防御力-30%（3ターン）', effect: { buff: { stat: 'str', amount: 50, turns: 3 } }, learnLevel: 10, job: 'warrior' },
  crossSlash: { id: 'crossSlash', name: 'クロス斬り', type: 'physical', element: 'none', mpCost: 15, description: 'X字に斬り込む。STRの2.5倍のダメージ。', power: 2.5, learnLevel: 15, job: 'warrior' },
  battleCry: { id: 'battleCry', name: '鬨の声', type: 'buff', element: 'none', mpCost: 20, description: '雄叫びを上げ全ステータス+20%（5ターン）', effect: { buff: { stat: 'str', amount: 20, turns: 5 } }, learnLevel: 20, job: 'warrior' },
  titanSlash: { id: 'titanSlash', name: 'タイタンスラッシュ', type: 'physical', element: 'none', mpCost: 25, description: '究極の剣技。STRの4倍のダメージ。低確率でスタン。', power: 4.0, effect: { status: 'paralysis', statusChance: 30 }, learnLevel: 30, job: 'warrior' },

  // ---- MAGE ----
  fireball: { id: 'fireball', name: 'ファイアボール', type: 'magic', element: 'fire', mpCost: 8, description: '炎の球を放つ。INTの1.8倍の火属性ダメージ。', power: 1.8, learnLevel: 1, job: 'mage' },
  blizzard: { id: 'blizzard', name: 'ブリザード', type: 'magic', element: 'ice', mpCost: 10, description: '氷の嵐。INTの1.6倍の氷属性ダメージ + 低速化', power: 1.6, effect: { debuff: { stat: 'agi', amount: 20, turns: 2 } }, learnLevel: 5, job: 'mage' },
  thunder: { id: 'thunder', name: 'サンダー', type: 'magic', element: 'thunder', mpCost: 12, description: '落雷。INTの2倍の雷属性ダメージ。麻痺の可能性。', power: 2.0, effect: { status: 'paralysis', statusChance: 25 }, learnLevel: 8, job: 'mage' },
  meteor: { id: 'meteor', name: 'メテオ', type: 'magic', element: 'none', mpCost: 30, description: '隕石を降らせる。INTの3.5倍のダメージ。全体攻撃。', power: 3.5, effect: { allEnemies: true }, learnLevel: 20, job: 'mage' },
  timeStop: { id: 'timeStop', name: 'タイムストップ', type: 'debuff', element: 'none', mpCost: 20, description: '時を止める。敵を麻痺させる（80%成功率）', effect: { status: 'paralysis', statusChance: 80 }, learnLevel: 25, job: 'mage' },
  arcane: { id: 'arcane', name: 'アルカナブラスト', type: 'magic', element: 'none', mpCost: 40, description: '魔力の爆発。INTの5倍のダメージ。MP半分消費。', power: 5.0, learnLevel: 35, job: 'mage' },

  // ---- ROGUE ----
  backstab: { id: 'backstab', name: 'バックスタブ', type: 'physical', element: 'none', mpCost: 6, description: '急所を刺す。DEXの2倍のダメージ。クリティカル率UP。', power: 2.0, learnLevel: 1, job: 'rogue' },
  steal: { id: 'steal', name: '盗む', type: 'physical', element: 'none', mpCost: 5, description: '敵からアイテムを盗む。DEXの0.5倍ダメージ。', power: 0.5, learnLevel: 3, job: 'rogue' },
  poisonBlade: { id: 'poisonBlade', name: 'ポイズンブレード', type: 'physical', element: 'none', mpCost: 8, description: '毒を塗った刃で攻撃。DEXの1.2倍ダメージ+毒状態。', power: 1.2, effect: { status: 'poison', statusChance: 70 }, learnLevel: 6, job: 'rogue' },
  shadowStep: { id: 'shadowStep', name: 'シャドウステップ', type: 'buff', element: 'dark', mpCost: 10, description: '影に溶け込む。回避率+50%（3ターン）', effect: { buff: { stat: 'agi', amount: 50, turns: 3 } }, learnLevel: 12, job: 'rogue' },
  multiStab: { id: 'multiStab', name: 'マルチスタブ', type: 'physical', element: 'none', mpCost: 18, description: '超高速の連続刺突。3〜5回のDEX×0.8倍ダメージ。', power: 0.8, effect: { multiHit: 4 }, learnLevel: 18, job: 'rogue' },
  deathBlow: { id: 'deathBlow', name: 'デスブロウ', type: 'physical', element: 'dark', mpCost: 25, description: '必殺の一撃。DEXの4倍のダメージ。低確率で即死。', power: 4.0, learnLevel: 28, job: 'rogue' },

  // ---- PALADIN ----
  holyStrike: { id: 'holyStrike', name: 'ホーリーストライク', type: 'physical', element: 'holy', mpCost: 8, description: '聖なる力をまとった一撃。STR+INTの1.2倍のダメージ。', power: 1.2, learnLevel: 1, job: 'paladin' },
  cure: { id: 'cure', name: 'ケアル', type: 'heal', element: 'holy', mpCost: 10, description: 'HPを回復する。INTの2倍のHP回復。', effect: { hpPercent: 30 }, learnLevel: 3, job: 'paladin' },
  divineShield: { id: 'divineShield', name: 'ディバインシールド', type: 'buff', element: 'holy', mpCost: 15, description: '神聖な盾を展開。VIT+40%（4ターン）、状態異常無効。', effect: { buff: { stat: 'vit', amount: 40, turns: 4 } }, learnLevel: 8, job: 'paladin' },
  holyLight: { id: 'holyLight', name: 'ホーリーライト', type: 'magic', element: 'holy', mpCost: 20, description: '聖なる光の柱。INTの2.5倍の聖属性ダメージ。アンデッドに特効。', power: 2.5, learnLevel: 15, job: 'paladin' },
  resurrection: { id: 'resurrection', name: 'リザレクション', type: 'heal', element: 'holy', mpCost: 30, description: '全状態異常を治癒し、HPを50%回復。', effect: { hpPercent: 50, cure: 'poison' }, learnLevel: 20, job: 'paladin' },
  divineWrath: { id: 'divineWrath', name: 'ディバインラース', type: 'magic', element: 'holy', mpCost: 35, description: '神の怒り。STR+INTの3倍の聖属性ダメージ。全体攻撃。', power: 3.0, effect: { allEnemies: true }, learnLevel: 30, job: 'paladin' },

  // ---- ARCHER ----
  preciseShot: { id: 'preciseShot', name: '精密射撃', type: 'physical', element: 'none', mpCost: 5, description: '急所を狙う。DEXの1.6倍のダメージ。ミスなし。', power: 1.6, learnLevel: 1, job: 'archer' },
  piercingArrow: { id: 'piercingArrow', name: '貫通矢', type: 'physical', element: 'none', mpCost: 10, description: '防御を無視して貫く。DEXの2倍のダメージ。防御力無視。', power: 2.0, learnLevel: 5, job: 'archer' },
  sleepArrow: { id: 'sleepArrow', name: '眠り矢', type: 'debuff', element: 'none', mpCost: 8, description: '眠りの矢。70%の確率で眠り状態にする。', effect: { status: 'sleep', statusChance: 70 }, learnLevel: 8, job: 'archer' },
  rainOfArrows: { id: 'rainOfArrows', name: '矢の雨', type: 'physical', element: 'none', mpCost: 20, description: '天から矢を降らせる。全体にDEXの1.4倍のダメージ。', power: 1.4, effect: { allEnemies: true }, learnLevel: 15, job: 'archer' },
  windArrow: { id: 'windArrow', name: '疾風矢', type: 'physical', element: 'wind', mpCost: 15, description: '風をまとった矢。DEXの2.5倍の風属性ダメージ。速度低下付与。', power: 2.5, effect: { debuff: { stat: 'agi', amount: 30, turns: 3 } }, learnLevel: 20, job: 'archer' },
  ultimateArrow: { id: 'ultimateArrow', name: 'アルティメットアロー', type: 'physical', element: 'none', mpCost: 35, description: '全力を込めた矢。DEXの5倍のダメージ。LUKに応じてクリティカル。', power: 5.0, learnLevel: 32, job: 'archer' },

  // ---- NECROMANCER ----
  darkBolt: { id: 'darkBolt', name: 'ダークボルト', type: 'magic', element: 'dark', mpCost: 6, description: '闇の稲妻。INTの1.5倍の闇属性ダメージ。', power: 1.5, learnLevel: 1, job: 'necromancer' },
  drainLife: { id: 'drainLife', name: 'ドレインライフ', type: 'magic', element: 'dark', mpCost: 12, description: '生命力を吸収。INTの1.8倍のダメージ、その30%をHP回復。', power: 1.8, learnLevel: 5, job: 'necromancer' },
  cursed: { id: 'cursed', name: 'カース', type: 'debuff', element: 'dark', mpCost: 10, description: '呪いをかける。敵のSTRとINTを30%低下（4ターン）', effect: { debuff: { stat: 'str', amount: 30, turns: 4 } }, learnLevel: 8, job: 'necromancer' },
  deathRay: { id: 'deathRay', name: 'デスレイ', type: 'magic', element: 'dark', mpCost: 25, description: '死の光線。INTの3倍のダメージ。40%で即死付与を試みる。', power: 3.0, effect: { status: 'confusion', statusChance: 40 }, learnLevel: 15, job: 'necromancer' },
  soulDrain: { id: 'soulDrain', name: 'ソウルドレイン', type: 'magic', element: 'dark', mpCost: 20, description: '魂を吸収。INTの2倍のダメージ、MPも30%回復。', power: 2.0, learnLevel: 20, job: 'necromancer' },
  apocalypse: { id: 'apocalypse', name: 'アポカリプス', type: 'magic', element: 'dark', mpCost: 40, description: '終末の呪文。自HPの20%を消費し、INTの5倍の全体ダメージ。', power: 5.0, effect: { allEnemies: true, selfHarm: 20 }, learnLevel: 35, job: 'necromancer' },

  // ---- ALL JOBS ----
  attack: { id: 'attack', name: '通常攻撃', type: 'physical', element: 'none', mpCost: 0, description: '通常攻撃を行う。', power: 1.0, learnLevel: 1, job: 'all' },
  guard: { id: 'guard', name: 'ガード', type: 'buff', element: 'none', mpCost: 0, description: 'このターン防御力を2倍にする。', effect: { buff: { stat: 'vit', amount: 100, turns: 1 } }, learnLevel: 1, job: 'all' },
  potion: { id: 'potion', name: 'ポーション使用', type: 'heal', element: 'none', mpCost: 0, description: 'ポーションを使ってHPを回復する。', effect: { hp: 100 }, learnLevel: 1, job: 'all' },
};

// ===== ITEMS =====
export const ITEMS: Record<string, Item> = {
  // Consumables
  potion: { id: 'potion', name: 'ポーション', type: 'consumable', rarity: 'common', description: 'HPを100回復する。', value: 50, effect: { hp: 100 } },
  hiPotion: { id: 'hiPotion', name: 'ハイポーション', type: 'consumable', rarity: 'uncommon', description: 'HPを300回復する。', value: 150, effect: { hp: 300 } },
  megaPotion: { id: 'megaPotion', name: 'メガポーション', type: 'consumable', rarity: 'rare', description: 'HPを50%回復する。', value: 400, effect: { hpPercent: 50 } },
  elixir: { id: 'elixir', name: 'エリクサー', type: 'consumable', rarity: 'epic', description: 'HPとMPを100%回復する。', value: 2000, effect: { hpPercent: 100, mpPercent: 100 } },
  ether: { id: 'ether', name: 'エーテル', type: 'consumable', rarity: 'common', description: 'MPを50回復する。', value: 80, effect: { mp: 50 } },
  hiEther: { id: 'hiEther', name: 'ハイエーテル', type: 'consumable', rarity: 'uncommon', description: 'MPを150回復する。', value: 250, effect: { mp: 150 } },
  antidote: { id: 'antidote', name: '毒消し', type: 'consumable', rarity: 'common', description: '毒・燃焼状態を治癒する。', value: 30, effect: { cure: 'poison' } },
  awakeningHerb: { id: 'awakeningHerb', name: '覚醒の草', type: 'consumable', rarity: 'uncommon', description: '睡眠・混乱状態を治癒する。', value: 80, effect: { cure: 'sleep' } },
  energyDrink: { id: 'energyDrink', name: 'エナジードリンク', type: 'consumable', rarity: 'common', description: '麻痺状態を治癒する。', value: 60, effect: { cure: 'paralysis' } },
  fullRestore: { id: 'fullRestore', name: 'フルリストア', type: 'consumable', rarity: 'legendary', description: '全状態異常を治癒してHP/MPを100%回復。', value: 5000, effect: { hpPercent: 100, mpPercent: 100, cure: 'none' } },
  reviveStone: { id: 'reviveStone', name: '蘇生石', type: 'consumable', rarity: 'rare', description: '戦闘不能から復活し、HP25%回復。', value: 1000, effect: { revive: true, hpPercent: 25 } },

  // Weapons - Common
  ironSword: { id: 'ironSword', name: '鉄の剣', type: 'weapon', rarity: 'common', description: '普通の鉄製の剣。', value: 200, attackPower: 20, stats: { str: 5 }, weaponType: 'sword', enhancement: 0 },
  woodStaff: { id: 'woodStaff', name: '木の杖', type: 'weapon', rarity: 'common', description: '魔法使いの基本的な杖。', value: 180, magicPower: 18, stats: { int: 5 }, weaponType: 'staff', enhancement: 0 },
  dagger: { id: 'dagger', name: '短剣', type: 'weapon', rarity: 'common', description: '素早い攻撃が得意な短剣。', value: 160, attackPower: 15, stats: { dex: 5, agi: 3 }, weaponType: 'dagger', enhancement: 0 },
  shortBow: { id: 'shortBow', name: '短弓', type: 'weapon', rarity: 'common', description: '基本的な弓。', value: 190, attackPower: 16, stats: { dex: 6 }, weaponType: 'bow', enhancement: 0 },

  // Weapons - Uncommon
  steelSword: { id: 'steelSword', name: '鋼の剣', type: 'weapon', rarity: 'uncommon', description: '高品質な鋼の剣。', value: 600, attackPower: 40, stats: { str: 10, vit: 3 }, weaponType: 'sword', enhancement: 0 },
  crystalStaff: { id: 'crystalStaff', name: 'クリスタルの杖', type: 'weapon', rarity: 'uncommon', description: '水晶でできた魔法の杖。MPが増加する。', value: 700, magicPower: 38, stats: { int: 12 }, weaponType: 'staff', enhancement: 0 },
  poisonDagger: { id: 'poisonDagger', name: '毒の短剣', type: 'weapon', rarity: 'uncommon', description: '毒が塗られた短剣。', value: 550, attackPower: 30, stats: { dex: 8, luk: 5 }, element: 'dark', weaponType: 'dagger', enhancement: 0 },
  windBow: { id: 'windBow', name: '疾風の弓', type: 'weapon', rarity: 'uncommon', description: '風をまとった弓。', value: 650, attackPower: 35, stats: { dex: 10, agi: 8 }, element: 'wind', weaponType: 'bow', enhancement: 0 },
  darkRod: { id: 'darkRod', name: '闇の魔杖', type: 'weapon', rarity: 'uncommon', description: '闇の力を秘めた杖。', value: 700, magicPower: 42, stats: { int: 10, luk: 5 }, element: 'dark', weaponType: 'rod', enhancement: 0 },

  // Weapons - Rare
  flameSword: { id: 'flameSword', name: '炎の剣', type: 'weapon', rarity: 'rare', description: '炎属性の強力な剣。', value: 2000, attackPower: 70, stats: { str: 18, int: 8 }, element: 'fire', weaponType: 'sword', enhancement: 0 },
  iceStaff: { id: 'iceStaff', name: '氷結の杖', type: 'weapon', rarity: 'rare', description: '氷属性の魔法を強化する杖。', value: 2200, magicPower: 65, stats: { int: 20, dex: 5 }, element: 'ice', weaponType: 'staff', enhancement: 0 },
  shadowDagger: { id: 'shadowDagger', name: '影斬りの短剣', type: 'weapon', rarity: 'rare', description: '影を操る神秘の短剣。', value: 1800, attackPower: 55, stats: { dex: 18, agi: 15 }, element: 'dark', weaponType: 'dagger', enhancement: 0 },
  holySpear: { id: 'holySpear', name: '聖なる槍', type: 'weapon', rarity: 'rare', description: '聖属性の力が宿る槍。', value: 2100, attackPower: 65, stats: { str: 15, int: 12, vit: 5 }, element: 'holy', weaponType: 'spear', enhancement: 0 },

  // Weapons - Epic
  dragonSlayer: { id: 'dragonSlayer', name: 'ドラゴンスレイヤー', type: 'weapon', rarity: 'epic', description: 'ドラゴンを倒すための伝説の剣。', value: 8000, attackPower: 120, stats: { str: 30, vit: 15 }, weaponType: 'sword', enhancement: 0 },
  soulScepter: { id: 'soulScepter', name: '魂の笏', type: 'weapon', rarity: 'epic', description: '魂のエネルギーで攻撃力を高める。', value: 9000, magicPower: 110, stats: { int: 35, luk: 10 }, element: 'dark', weaponType: 'rod', enhancement: 0 },

  // Weapons - Legendary
  excalibur: { id: 'excalibur', name: 'エクスカリバー', type: 'weapon', rarity: 'legendary', description: '伝説の聖剣。全能力が大幅に上昇する。', value: 50000, attackPower: 200, stats: { str: 50, dex: 20, vit: 20 }, element: 'holy', weaponType: 'sword', setId: 'holy_set', enhancement: 0 },
  ragnarok: { id: 'ragnarok', name: 'ラグナロク', type: 'weapon', rarity: 'legendary', description: '世界を終わらせる魔法の大杖。MP大幅増加。', value: 50000, magicPower: 200, stats: { int: 60 }, element: 'dark', weaponType: 'rod', setId: 'dark_set', enhancement: 0 },

  // Armor - Common
  leatherArmor: { id: 'leatherArmor', name: '革の鎧', type: 'armor_body', rarity: 'common', description: '軽くて動きやすい革鎧。', value: 150, defense: 15, stats: { vit: 3 }, enhancement: 0 },
  clothRobe: { id: 'clothRobe', name: '魔法の布ローブ', type: 'armor_body', rarity: 'common', description: '魔法使い用の軽いローブ。', value: 140, defense: 8, magicDefense: 15, stats: { int: 3 }, enhancement: 0 },
  ironHelm: { id: 'ironHelm', name: '鉄の兜', type: 'armor_head', rarity: 'common', description: '基本的な鉄の兜。', value: 120, defense: 10, stats: { vit: 2 }, enhancement: 0 },
  ironGloves: { id: 'ironGloves', name: '鉄の手袋', type: 'armor_hand', rarity: 'common', description: '鉄製の手袋。', value: 100, defense: 8, stats: { str: 2 }, enhancement: 0 },
  ironBoots: { id: 'ironBoots', name: '鉄の靴', type: 'armor_leg', rarity: 'common', description: '鉄製のブーツ。', value: 100, defense: 8, stats: { agi: 2 }, enhancement: 0 },

  // Armor - Uncommon
  chainMail: { id: 'chainMail', name: 'チェインメイル', type: 'armor_body', rarity: 'uncommon', description: '鎖帷子。バランスのとれた防御。', value: 500, defense: 30, stats: { vit: 8, str: 3 }, enhancement: 0 },
  arcaneRobe: { id: 'arcaneRobe', name: 'アルケインローブ', type: 'armor_body', rarity: 'uncommon', description: '魔力を高める神秘のローブ。MPが大幅増加。', value: 600, defense: 15, magicDefense: 30, stats: { int: 10 }, enhancement: 0 },
  steelHelm: { id: 'steelHelm', name: '鋼鉄の兜', type: 'armor_head', rarity: 'uncommon', description: '頑丈な鋼鉄製の兜。', value: 400, defense: 20, stats: { vit: 6 }, enhancement: 0 },

  // Armor - Rare
  dragonScale: { id: 'dragonScale', name: 'ドラゴンスケール鎧', type: 'armor_body', rarity: 'rare', description: 'ドラゴンの鱗で作られた鎧。', value: 3000, defense: 55, stats: { vit: 20, str: 10 }, enhancement: 0 },
  mageRobe: { id: 'mageRobe', name: '大魔道士のローブ', type: 'armor_body', rarity: 'rare', description: '最高位の魔法師が纏うローブ。MP大幅増加。', value: 3500, defense: 25, magicDefense: 55, stats: { int: 25 }, enhancement: 0 },

  // Accessories
  speedRing: { id: 'speedRing', name: '疾風の指輪', type: 'accessory', rarity: 'common', description: '素早さが上がる指輪。', value: 200, stats: { agi: 8 }, enhancement: 0 },
  powerAmulet: { id: 'powerAmulet', name: 'パワーアミュレット', type: 'accessory', rarity: 'common', description: '攻撃力が上がるお守り。', value: 200, stats: { str: 8 }, enhancement: 0 },
  manaGem: { id: 'manaGem', name: 'マナの宝石', type: 'accessory', rarity: 'uncommon', description: 'MP最大値が増加する。', value: 600, stats: { int: 5 }, enhancement: 0 },
  luckyClover: { id: 'luckyClover', name: '幸運の四葉', type: 'accessory', rarity: 'uncommon', description: '運が大幅に上がる。', value: 500, stats: { luk: 15 }, enhancement: 0 },
  dragonEye: { id: 'dragonEye', name: 'ドラゴンの瞳', type: 'accessory', rarity: 'rare', description: '全ステータスが上昇する。', value: 5000, stats: { str: 10, dex: 10, int: 10, vit: 10, agi: 10, luk: 10 }, enhancement: 0 },

  // Materials
  ironOre: { id: 'ironOre', name: '鉄鉱石', type: 'material', rarity: 'common', description: '鉄製品の素材。', value: 20, materialType: 'metal', quantity: 1 },
  silverOre: { id: 'silverOre', name: '銀鉱石', type: 'material', rarity: 'uncommon', description: '銀製品の素材。', value: 80, materialType: 'metal', quantity: 1 },
  dragonScale_mat: { id: 'dragonScale_mat', name: 'ドラゴンの鱗', type: 'material', rarity: 'rare', description: '防具強化の素材。', value: 500, materialType: 'scale', quantity: 1 },
  mythrilOre: { id: 'mythrilOre', name: 'ミスリル鉱石', type: 'material', rarity: 'epic', description: '最高品質の金属素材。', value: 2000, materialType: 'metal', quantity: 1 },
  magicCrystal: { id: 'magicCrystal', name: '魔法の結晶', type: 'material', rarity: 'rare', description: '魔法アイテム強化の素材。', value: 300, materialType: 'crystal', quantity: 1 },
  dragonHeart: { id: 'dragonHeart', name: 'ドラゴンの心臓', type: 'material', rarity: 'legendary', description: 'ドラゴンから採れる非常に希少な素材。', value: 10000, materialType: 'legendary', quantity: 1 },
};

// ===== MONSTERS =====
export const MONSTERS: Record<string, Monster> = {
  // --- Beginner Dungeon ---
  slime: {
    id: 'slime', name: 'スライム', level: 1, hp: 30, maxHp: 30, mp: 0, maxMp: 0,
    stats: { str: 5, dex: 3, int: 2, vit: 4, agi: 2, luk: 2 },
    exp: 15, gold: 8, element: 'none', weakness: ['thunder', 'fire'], resistance: [], immune: [],
    skills: ['attack'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'potion', chance: 30 }, { itemId: 'ironOre', chance: 20 }],
    sprite: '🟢', description: 'ゼリー状の謎の生物。',
  },
  goblin: {
    id: 'goblin', name: 'ゴブリン', level: 2, hp: 50, maxHp: 50, mp: 10, maxMp: 10,
    stats: { str: 8, dex: 6, int: 3, vit: 5, agi: 5, luk: 3 },
    exp: 25, gold: 15, element: 'none', weakness: ['holy'], resistance: [], immune: [],
    skills: ['attack', 'slash'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'potion', chance: 25 }, { itemId: 'dagger', chance: 5 }],
    sprite: '👺', description: 'やんちゃな小鬼。',
  },
  bat: {
    id: 'bat', name: 'コウモリ', level: 2, hp: 40, maxHp: 40, mp: 0, maxMp: 0,
    stats: { str: 6, dex: 10, int: 2, vit: 3, agi: 12, luk: 5 },
    exp: 20, gold: 10, element: 'dark', weakness: ['holy', 'thunder'], resistance: ['dark'], immune: [],
    skills: ['attack'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'antidote', chance: 30 }],
    sprite: '🦇', description: '暗い洞窟に住むコウモリ。',
  },
  skeleton: {
    id: 'skeleton', name: 'スケルトン', level: 3, hp: 60, maxHp: 60, mp: 0, maxMp: 0,
    stats: { str: 10, dex: 5, int: 2, vit: 8, agi: 4, luk: 2 },
    exp: 35, gold: 20, element: 'dark', weakness: ['holy', 'fire'], resistance: ['ice', 'dark'], immune: ['poison'],
    skills: ['attack', 'slash'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'ironOre', chance: 40 }, { itemId: 'ether', chance: 15 }],
    sprite: '💀', description: '動く骸骨。聖属性に弱い。',
  },
  goblinChief: {
    id: 'goblinChief', name: 'ゴブリン族長', level: 5, hp: 200, maxHp: 200, mp: 30, maxMp: 30,
    stats: { str: 18, dex: 10, int: 5, vit: 15, agi: 8, luk: 5 },
    exp: 120, gold: 100, element: 'none', weakness: ['holy', 'fire'], resistance: [], immune: [],
    skills: ['attack', 'slash', 'whirlwind'], status: 'none', statusTurns: 0, isBoss: true,
    drops: [{ itemId: 'steelSword', chance: 30 }, { itemId: 'hiPotion', chance: 60 }],
    sprite: '👿', description: '洞窟のボス。強力な体術で攻撃する。',
  },

  // --- Forest Area ---
  wolf: {
    id: 'wolf', name: 'フォレストウルフ', level: 6, hp: 90, maxHp: 90, mp: 0, maxMp: 0,
    stats: { str: 14, dex: 12, int: 3, vit: 8, agi: 15, luk: 5 },
    exp: 50, gold: 30, element: 'none', weakness: ['fire'], resistance: ['ice'], immune: [],
    skills: ['attack', 'slash'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'potion', chance: 25 }, { itemId: 'silverOre', chance: 15 }],
    sprite: '🐺', description: '森の狼。素早い攻撃が特徴。',
  },
  treant: {
    id: 'treant', name: 'トレント', level: 8, hp: 150, maxHp: 150, mp: 20, maxMp: 20,
    stats: { str: 18, dex: 4, int: 8, vit: 20, agi: 2, luk: 3 },
    exp: 70, gold: 40, element: 'none', weakness: ['fire', 'wind'], resistance: ['ice', 'thunder'], immune: ['poison'],
    skills: ['attack', 'slash'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'hiPotion', chance: 20 }, { itemId: 'ironOre', chance: 30 }],
    sprite: '🌳', description: '意思を持つ古木。動きは遅いが硬い。',
  },
  darkElf: {
    id: 'darkElf', name: 'ダークエルフ', level: 10, hp: 120, maxHp: 120, mp: 60, maxMp: 60,
    stats: { str: 12, dex: 16, int: 14, vit: 8, agi: 14, luk: 10 },
    exp: 90, gold: 60, element: 'dark', weakness: ['holy'], resistance: ['dark'], immune: [],
    skills: ['attack', 'darkBolt', 'poisonBlade'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'darkRod', chance: 10 }, { itemId: 'magicCrystal', chance: 20 }],
    sprite: '🧝', description: '闇の魔法を使う邪悪なエルフ。',
  },
  ancientDruid: {
    id: 'ancientDruid', name: '古代ドルイド', level: 12, hp: 400, maxHp: 400, mp: 150, maxMp: 150,
    stats: { str: 16, dex: 12, int: 22, vit: 18, agi: 10, luk: 8 },
    exp: 280, gold: 250, element: 'none', weakness: ['fire', 'dark'], resistance: ['ice', 'wind', 'thunder'], immune: [],
    skills: ['attack', 'blizzard', 'thunder', 'cursed'], status: 'none', statusTurns: 0, isBoss: true,
    drops: [{ itemId: 'crystalStaff', chance: 25 }, { itemId: 'arcaneRobe', chance: 25 }],
    sprite: '🧙', description: '森の主。強力な自然魔法を操る。',
  },

  // --- Volcano Area ---
  fireDrake: {
    id: 'fireDrake', name: 'ファイアドレイク', level: 15, hp: 200, maxHp: 200, mp: 40, maxMp: 40,
    stats: { str: 22, dex: 10, int: 15, vit: 18, agi: 12, luk: 5 },
    exp: 130, gold: 80, element: 'fire', weakness: ['ice'], resistance: ['fire'], immune: [],
    skills: ['attack', 'fireball', 'slash'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'dragonScale_mat', chance: 20 }, { itemId: 'flameSword', chance: 5 }],
    sprite: '🦎', description: '炎を吐く小型のドラゴン。',
  },
  lavaTroll: {
    id: 'lavaTroll', name: 'ラバトロール', level: 17, hp: 300, maxHp: 300, mp: 0, maxMp: 0,
    stats: { str: 28, dex: 6, int: 4, vit: 25, agi: 5, luk: 3 },
    exp: 150, gold: 90, element: 'fire', weakness: ['ice', 'thunder'], resistance: ['fire'], immune: [],
    skills: ['attack', 'slash'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'ironOre', chance: 50 }, { itemId: 'hiPotion', chance: 20 }],
    sprite: '👹', description: '溶岩に住む巨大なトロール。',
  },
  infernoPhoenix: {
    id: 'infernoPhoenix', name: 'インフェルノフェニックス', level: 20, hp: 800, maxHp: 800, mp: 200, maxMp: 200,
    stats: { str: 28, dex: 20, int: 30, vit: 25, agi: 25, luk: 15 },
    exp: 600, gold: 500, element: 'fire', weakness: ['ice'], resistance: ['fire', 'wind'], immune: [],
    skills: ['attack', 'fireball', 'meteor', 'slash'], status: 'none', statusTurns: 0, isBoss: true,
    drops: [{ itemId: 'dragonScale', chance: 30 }, { itemId: 'dragonScale_mat', chance: 50 }],
    sprite: '🦅', description: '炎の不死鳥。一度倒しても蘇る。',
  },

  // --- Abyss Tower ---
  demon: {
    id: 'demon', name: 'デーモン', level: 22, hp: 300, maxHp: 300, mp: 80, maxMp: 80,
    stats: { str: 30, dex: 15, int: 25, vit: 20, agi: 18, luk: 8 },
    exp: 180, gold: 120, element: 'dark', weakness: ['holy'], resistance: ['dark', 'fire'], immune: [],
    skills: ['attack', 'darkBolt', 'drainLife'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'darkRod', chance: 8 }, { itemId: 'magicCrystal', chance: 25 }],
    sprite: '😈', description: '地獄から召喚された悪魔。',
  },
  abyssalKnight: {
    id: 'abyssalKnight', name: '奈落の騎士', level: 25, hp: 400, maxHp: 400, mp: 60, maxMp: 60,
    stats: { str: 35, dex: 18, int: 10, vit: 30, agi: 15, luk: 5 },
    exp: 220, gold: 150, element: 'dark', weakness: ['holy', 'fire'], resistance: ['ice', 'dark'], immune: [],
    skills: ['attack', 'slash', 'crossSlash'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'dragonSlayer', chance: 5 }, { itemId: 'chainMail', chance: 15 }],
    sprite: '🛡️', description: '闇に染まった元聖騎士。',
  },
  abyssDragon: {
    id: 'abyssDragon', name: '奈落竜王', level: 30, hp: 2000, maxHp: 2000, mp: 300, maxMp: 300,
    stats: { str: 50, dex: 25, int: 40, vit: 45, agi: 20, luk: 10 },
    exp: 2000, gold: 2000, element: 'dark', weakness: ['holy'], resistance: ['dark', 'fire', 'ice', 'thunder'], immune: [],
    skills: ['attack', 'darkBolt', 'meteor', 'deathRay', 'slash'], status: 'none', statusTurns: 0, isBoss: true,
    drops: [{ itemId: 'dragonHeart', chance: 50 }, { itemId: 'soulScepter', chance: 20 }],
    sprite: '🐉', description: '奈落の底を支配する闇のドラゴン。',
  },

  // --- Chaos Dimension (Final) ---
  voidEntity: {
    id: 'voidEntity', name: 'ヴォイドエンティティ', level: 35, hp: 500, maxHp: 500, mp: 150, maxMp: 150,
    stats: { str: 40, dex: 30, int: 40, vit: 35, agi: 30, luk: 15 },
    exp: 350, gold: 200, element: 'none', weakness: ['holy'], resistance: ['dark'], immune: ['poison', 'paralysis'],
    skills: ['attack', 'darkBolt', 'meteor'], status: 'none', statusTurns: 0,
    drops: [{ itemId: 'mythrilOre', chance: 20 }, { itemId: 'magicCrystal', chance: 30 }],
    sprite: '🌀', description: '虚無から生まれた謎の存在。',
  },
  chaosLord: {
    id: 'chaosLord', name: '混沌の覇王', level: 50, hp: 8000, maxHp: 8000, mp: 800, maxMp: 800,
    stats: { str: 80, dex: 60, int: 80, vit: 70, agi: 50, luk: 30 },
    exp: 10000, gold: 10000, element: 'none', weakness: [], resistance: ['fire', 'ice', 'thunder', 'wind', 'dark'], immune: ['poison', 'sleep', 'paralysis', 'confusion'],
    skills: ['attack', 'meteor', 'apocalypse', 'deathRay', 'slash', 'fireball'], status: 'none', statusTurns: 0, isBoss: true,
    drops: [{ itemId: 'excalibur', chance: 30 }, { itemId: 'ragnarok', chance: 30 }, { itemId: 'dragonEye', chance: 60 }],
    sprite: '👑', description: '混沌次元を支配する究極の存在。全能力が最高峰。',
  },
};

// ===== DUNGEON AREAS =====
export const DUNGEON_AREAS: Record<string, DungeonArea> = {
  cave: {
    id: 'cave', name: '迷宮の洞窟', floors: 10, minLevel: 1,
    description: '初心者向けの洞窟ダンジョン。スライムやゴブリンが出没する。',
    bgColor: 'from-stone-900 to-stone-800',
    monsters: ['slime', 'goblin', 'bat', 'skeleton'],
    bosses: ['goblinChief'],
    treasureTable: [
      { itemId: 'potion', chance: 50, floor: 1 },
      { itemId: 'ironSword', chance: 20, floor: 3 },
      { itemId: 'ironHelm', chance: 20, floor: 5 },
      { itemId: 'hiPotion', chance: 30, floor: 7 },
      { itemId: 'steelSword', chance: 15, floor: 10 },
    ],
  },
  forest: {
    id: 'forest', name: '魔の森', floors: 15, minLevel: 8,
    description: '古代の呪いがかかった森。強力な魔法生物が潜む。',
    bgColor: 'from-green-900 to-green-800',
    monsters: ['wolf', 'treant', 'darkElf'],
    bosses: ['ancientDruid'],
    treasureTable: [
      { itemId: 'hiPotion', chance: 40, floor: 1 },
      { itemId: 'crystalStaff', chance: 15, floor: 5 },
      { itemId: 'windBow', chance: 15, floor: 8 },
      { itemId: 'arcaneRobe', chance: 15, floor: 12 },
      { itemId: 'magicCrystal', chance: 30, floor: 15 },
    ],
  },
  volcano: {
    id: 'volcano', name: '炎の山', floors: 20, minLevel: 15,
    description: '活火山の内部。炎属性の強敵が多数生息する。',
    bgColor: 'from-red-900 to-orange-800',
    monsters: ['fireDrake', 'lavaTroll'],
    bosses: ['infernoPhoenix'],
    treasureTable: [
      { itemId: 'flameSword', chance: 20, floor: 5 },
      { itemId: 'dragonScale', chance: 10, floor: 10 },
      { itemId: 'dragonScale_mat', chance: 40, floor: 1 },
      { itemId: 'megaPotion', chance: 25, floor: 15 },
      { itemId: 'dragonSlayer', chance: 5, floor: 20 },
    ],
  },
  abyss: {
    id: 'abyss', name: '深淵の塔', floors: 30, minLevel: 22,
    description: '奈落へと続く高層の塔。上層階ほど凶悪な魔物が待ち構える。',
    bgColor: 'from-purple-900 to-indigo-900',
    monsters: ['demon', 'abyssalKnight'],
    bosses: ['abyssDragon'],
    treasureTable: [
      { itemId: 'hiEther', chance: 35, floor: 1 },
      { itemId: 'soulScepter', chance: 8, floor: 10 },
      { itemId: 'holySpear', chance: 10, floor: 15 },
      { itemId: 'mythrilOre', chance: 20, floor: 20 },
      { itemId: 'elixir', chance: 15, floor: 25 },
    ],
  },
  chaos: {
    id: 'chaos', name: '混沌の次元', floors: 50, minLevel: 40,
    description: '最終ダンジョン。現実を超えた混沌空間。最強の敵が待つ。',
    bgColor: 'from-black to-violet-950',
    monsters: ['voidEntity', 'demon', 'abyssalKnight'],
    bosses: ['chaosLord'],
    treasureTable: [
      { itemId: 'elixir', chance: 20, floor: 10 },
      { itemId: 'excalibur', chance: 3, floor: 25 },
      { itemId: 'ragnarok', chance: 3, floor: 25 },
      { itemId: 'dragonEye', chance: 8, floor: 30 },
      { itemId: 'dragonHeart', chance: 15, floor: 40 },
    ],
  },
};

// ===== ACHIEVEMENTS =====
export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_kill', name: '初陣', description: '初めて敵を倒した。', icon: '⚔️', check: p => p.totalKills >= 1 },
  { id: 'kills_100', name: '百戦錬磨', description: '合計100体倒した。', icon: '💯', reward: { gold: 500 }, check: p => p.totalKills >= 100 },
  { id: 'kills_500', name: '戦場の覇者', description: '合計500体倒した。', icon: '🏆', reward: { gold: 2000 }, check: p => p.totalKills >= 500 },
  { id: 'kills_1000', name: '伝説の戦士', description: '合計1000体倒した。', icon: '👑', reward: { stat: { str: 10, int: 10 } }, check: p => p.totalKills >= 1000 },
  { id: 'level_10', name: '冒険者', description: 'レベル10に到達した。', icon: '🌟', reward: { gold: 300 }, check: p => p.level >= 10 },
  { id: 'level_25', name: '熟練の戦士', description: 'レベル25に到達した。', icon: '⭐', reward: { gold: 1000 }, check: p => p.level >= 25 },
  { id: 'level_50', name: '最強', description: 'レベル50に到達した。', icon: '🌠', reward: { stat: { str: 20, int: 20, vit: 20 } }, check: p => p.level >= 50 },
  { id: 'cave_clear', name: '洞窟探索者', description: '迷宮の洞窟をクリアした。', icon: '🪨', reward: { gold: 200 }, check: p => (p.dungeonClears['cave'] ?? 0) >= 1 },
  { id: 'forest_clear', name: '森の克服者', description: '魔の森をクリアした。', icon: '🌲', reward: { gold: 500 }, check: p => (p.dungeonClears['forest'] ?? 0) >= 1 },
  { id: 'volcano_clear', name: '炎の制覇者', description: '炎の山をクリアした。', icon: '🌋', reward: { gold: 1000 }, check: p => (p.dungeonClears['volcano'] ?? 0) >= 1 },
  { id: 'abyss_clear', name: '深淵の征服者', description: '深淵の塔をクリアした。', icon: '🗼', reward: { gold: 3000 }, check: p => (p.dungeonClears['abyss'] ?? 0) >= 1 },
  { id: 'chaos_clear', name: '混沌の覇者', description: '混沌の次元をクリアした。', icon: '🌀', reward: { stat: { str: 30, int: 30, vit: 30, dex: 30 } }, check: p => (p.dungeonClears['chaos'] ?? 0) >= 1 },
  { id: 'gold_1000', name: '小金持ち', description: '所持金1000Gを超えた。', icon: '💰', check: p => p.totalGoldEarned >= 1000 },
  { id: 'gold_50000', name: '大富豪', description: '累計50000G稼いだ。', icon: '💎', reward: { gold: 5000 }, check: p => p.totalGoldEarned >= 50000 },
  { id: 'legendary_item', name: 'レジェンダリーコレクター', description: 'レジェンダリー装備を手に入れた。', icon: '✨', reward: { gold: 2000 }, check: p => Object.values(p.equipment).some(item => item && item.rarity === 'legendary') },
  { id: 'full_equip', name: '完全武装', description: '全スロットに装備を装着した。', icon: '🔰', reward: { gold: 500 }, check: p => Object.values(p.equipment).every(item => item !== null) },
  { id: 'enhance_5', name: '鍛冶師', description: '装備を+5以上に強化した。', icon: '🔨', check: p => Object.values(p.equipment).some(item => item && (item.enhancement ?? 0) >= 5) },
  { id: 'enhance_10', name: '名工', description: '装備を+10以上に強化した。', icon: '⚒️', reward: { stat: { str: 5, int: 5 } }, check: p => Object.values(p.equipment).some(item => item && (item.enhancement ?? 0) >= 10) },
  { id: 'status_immune', name: '状態異常マスター', description: '状態異常耐性を持つ。', icon: '🛡️', check: p => p.level >= 20 },
  { id: 'pacifist_10', name: '逃亡者', description: '10回逃げた。', icon: '🏃', check: p => p.totalBattles >= 10 },
  { id: 'skill_master', name: 'スキルマスター', description: '5つ以上のスキルを習得した。', icon: '📚', check: p => p.learnedSkills.length >= 5 },
  { id: 'boss_slayer', name: 'ボスハンター', description: '全ダンジョンのボスを倒した。', icon: '🎯', check: p => Object.keys(DUNGEON_AREAS).every(id => (p.dungeonClears[id] ?? 0) >= 1) },
];

// ===== CRAFT RECIPES =====
export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'recipe_hiPotion', name: 'ハイポーション作成', result: 'hiPotion',
    materials: [{ itemId: 'potion', quantity: 3 }, { itemId: 'magicCrystal', quantity: 1 }],
    description: 'ポーション3つと魔法の結晶からハイポーションを作る。',
  },
  {
    id: 'recipe_steelSword', name: '鋼の剣作成', result: 'steelSword',
    materials: [{ itemId: 'ironOre', quantity: 5 }, { itemId: 'ironSword', quantity: 1 }],
    description: '鉄鉱石5つと鉄の剣から鋼の剣を作る。',
  },
  {
    id: 'recipe_dragonArmor', name: 'ドラゴン鎧作成', result: 'dragonScale',
    materials: [{ itemId: 'dragonScale_mat', quantity: 3 }, { itemId: 'silverOre', quantity: 5 }],
    description: 'ドラゴンの鱗と銀鉱石からドラゴンスケール鎧を作る。',
  },
  {
    id: 'recipe_elixir', name: 'エリクサー作成', result: 'elixir',
    materials: [{ itemId: 'megaPotion', quantity: 2 }, { itemId: 'magicCrystal', quantity: 3 }, { itemId: 'dragonScale_mat', quantity: 1 }],
    description: '希少素材を組み合わせてエリクサーを作る。',
  },
];

// ===== SHOP STOCK =====
export const SHOP_STOCK_BY_LEVEL = (level: number): Item[] => {
  const items: Item[] = [
    ITEMS['potion'], ITEMS['ether'], ITEMS['antidote'], ITEMS['awakeningHerb'], ITEMS['energyDrink'],
  ];
  if (level >= 5) items.push(ITEMS['hiPotion'], ITEMS['hiEther'], ITEMS['ironSword'], ITEMS['woodStaff'], ITEMS['dagger'], ITEMS['shortBow']);
  if (level >= 10) items.push(ITEMS['megaPotion'], ITEMS['steelSword'], ITEMS['crystalStaff'], ITEMS['poisonDagger'], ITEMS['leatherArmor'], ITEMS['clothRobe']);
  if (level >= 15) items.push(ITEMS['chainMail'], ITEMS['arcaneRobe'], ITEMS['windBow'], ITEMS['darkRod'], ITEMS['speedRing'], ITEMS['powerAmulet']);
  if (level >= 20) items.push(ITEMS['flameSword'], ITEMS['iceStaff'], ITEMS['manaGem'], ITEMS['luckyClover'], ITEMS['steelHelm']);
  if (level >= 30) items.push(ITEMS['holySpear'], ITEMS['shadowDagger'], ITEMS['dragonScale'], ITEMS['mageRobe'], ITEMS['reviveStone']);
  if (level >= 40) items.push(ITEMS['dragonSlayer'], ITEMS['soulScepter'], ITEMS['dragonEye'], ITEMS['elixir']);
  return items.map(i => ({ ...i }));
};

// ===== ELEMENT COLORS =====
export const ELEMENT_COLOR: Record<string, string> = {
  fire: 'text-red-400', ice: 'text-blue-400', thunder: 'text-yellow-400',
  wind: 'text-green-400', holy: 'text-yellow-200', dark: 'text-purple-400', none: 'text-gray-400',
};

export const RARITY_COLOR: Record<string, string> = {
  common: 'text-gray-300', uncommon: 'text-green-400', rare: 'text-blue-400',
  epic: 'text-purple-400', legendary: 'text-yellow-400',
};

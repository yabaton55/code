// ===== Core Types =====

export type Element = 'fire' | 'ice' | 'thunder' | 'wind' | 'holy' | 'dark' | 'none';
export type StatusEffect = 'poison' | 'burn' | 'paralysis' | 'sleep' | 'confusion' | 'blind' | 'none';
export type JobClass = 'warrior' | 'mage' | 'rogue' | 'paladin' | 'archer' | 'necromancer';
export type ItemType = 'consumable' | 'weapon' | 'armor_body' | 'armor_head' | 'armor_hand' | 'armor_leg' | 'accessory' | 'material' | 'key';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
export type SkillType = 'physical' | 'magic' | 'buff' | 'heal' | 'debuff' | 'passive';
export type GamePhase = 'title' | 'charCreate' | 'town' | 'dungeon' | 'battle' | 'shop' | 'skillTree' | 'achievements' | 'gameOver' | 'victory' | 'equipMenu' | 'craftMenu' | 'statusMenu' | 'inventory';

export interface Stats {
  str: number; // 攻撃力
  dex: number; // 命中・回避
  int: number; // 魔法攻撃
  vit: number; // 防御・HP
  agi: number; // 素早さ
  luk: number; // 運
}

export interface EquipmentSlot {
  weapon: Item | null;
  body: Item | null;
  head: Item | null;
  hand: Item | null;
  leg: Item | null;
  accessory1: Item | null;
  accessory2: Item | null;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: Rarity;
  description: string;
  value: number;
  // For equipment
  stats?: Partial<Stats>;
  element?: Element;
  setId?: string;
  enhancement?: number; // +0 to +15
  enchant?: { stat: keyof Stats; bonus: number };
  // For consumables
  effect?: {
    hp?: number;
    mp?: number;
    hpPercent?: number;
    mpPercent?: number;
    cure?: StatusEffect;
    buff?: { stat: keyof Stats; amount: number; turns: number };
    revive?: boolean;
  };
  // For materials
  materialType?: string;
  // For weapons
  weaponType?: 'sword' | 'staff' | 'dagger' | 'bow' | 'axe' | 'rod' | 'spear' | 'hammer';
  attackPower?: number;
  magicPower?: number;
  // For armor
  defense?: number;
  magicDefense?: number;
  quantity?: number;
}

export interface Skill {
  id: string;
  name: string;
  type: SkillType;
  element: Element;
  mpCost: number;
  description: string;
  power?: number; // multiplier for damage
  effect?: {
    hp?: number;
    hpPercent?: number;
    mp?: number;
    mpPercent?: number;
    cure?: StatusEffect | 'none';
    status?: StatusEffect;
    statusChance?: number;
    buff?: { stat: keyof Stats; amount: number; turns: number };
    debuff?: { stat: keyof Stats; amount: number; turns: number };
    comboBonus?: number;
    selfHarm?: number;
    multiHit?: number;
    allEnemies?: boolean;
  };
  learnLevel: number;
  job: JobClass | 'all';
  passive?: {
    stat?: Partial<Stats>;
    hpBonus?: number;
    mpBonus?: number;
    critRate?: number;
    elementResist?: Partial<Record<Element, number>>;
  };
}

export interface Monster {
  id: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: Stats;
  exp: number;
  gold: number;
  element?: Element;
  weakness?: Element[];
  resistance?: Element[];
  immune?: (Element | StatusEffect)[];
  skills: string[]; // skill ids
  status: StatusEffect;
  statusTurns: number;
  drops: Array<{ itemId: string; chance: number }>;
  isBoss?: boolean;
  sprite?: string; // emoji
  description?: string;
}

export interface DungeonArea {
  id: string;
  name: string;
  floors: number;
  minLevel: number;
  description: string;
  element?: Element;
  bgColor: string;
  monsters: string[];
  bosses: string[];
  treasureTable: Array<{ itemId: string; chance: number; floor: number }>;
}

export interface DungeonState {
  areaId: string;
  floor: number;
  steps: number;
  encounterRate: number;
  chests: Record<string, boolean>;
  explored: number;
}

export interface BattleState {
  enemies: Monster[];
  turn: number;
  playerTurn: boolean;
  combo: number;
  log: string[];
  fled: boolean;
  rewards?: { exp: number; gold: number; items: Item[] };
}

export interface ActiveBuff {
  stat: keyof Stats;
  amount: number;
  turns: number;
  source: string;
}

export interface Player {
  name: string;
  job: JobClass;
  level: number;
  exp: number;
  nextExp: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  stats: Stats;
  baseStats: Stats;
  statPoints: number;
  skillPoints: number;
  learnedSkills: string[];
  equipment: EquipmentSlot;
  inventory: Item[];
  gold: number;
  status: StatusEffect;
  statusTurns: number;
  buffs: ActiveBuff[];
  jobMastery: Record<JobClass, number>;
  killCount: Record<string, number>;
  dungeonClears: Record<string, number>;
  achievements: string[];
  totalPlaytime: number;
  totalGoldEarned: number;
  totalKills: number;
  totalBattles: number;
  createdAt: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  reward?: { gold?: number; item?: string; stat?: Partial<Stats> };
  check: (p: Player) => boolean;
}

export interface GameState {
  phase: GamePhase;
  player: Player;
  dungeon: DungeonState | null;
  battle: BattleState | null;
  messages: string[];
  selectedSkillIndex: number;
  shopInventory: Item[];
  craftRecipes: CraftRecipe[];
  settings: GameSettings;
  sessionStart: number;
}

export interface CraftRecipe {
  id: string;
  name: string;
  result: string; // item id
  materials: Array<{ itemId: string; quantity: number }>;
  description: string;
}

export interface GameSettings {
  battleSpeed: 'slow' | 'normal' | 'fast';
  autoSave: boolean;
  bgm: boolean;
  sfx: boolean;
}

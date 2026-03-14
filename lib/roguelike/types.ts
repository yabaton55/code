// ===== Core types for the Roguelike RPG =====

export interface Pos {
  x: number;
  y: number;
}

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type TileType = 'wall' | 'floor' | 'door' | 'stairsDown' | 'stairsUp';

export interface Tile {
  type: TileType;
  visible: boolean;
  explored: boolean;
}

// ===== Stats =====
export type StatKey = 'maxHp' | 'maxMp' | 'str' | 'def' | 'int' | 'spd' | 'lck';
export type Stats = Record<StatKey, number>;

// ===== Items =====
export type ItemKind = 'weapon' | 'armor' | 'ring' | 'potion' | 'mpPotion' | 'scroll' | 'gold';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Item {
  id: string;
  kind: ItemKind;
  name: string;
  rarity: Rarity;
  icon: string;
  desc: string;
  statBonus?: Partial<Stats>;
  healHp?: number;
  healMp?: number;
  value: number;
  minFloor: number;
}

// ===== Skills =====
export type SkillKind = 'physical' | 'magic' | 'heal' | 'buff';

export interface StatusApply {
  type: StatusType;
  chance: number;
  duration: number;
  power: number;
}

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  mpCost: number;
  cooldown: number;
  kind: SkillKind;
  target: 'enemy' | 'self';
  power: number;
  statusApply?: StatusApply;
}

export interface ActiveSkill extends SkillDef {
  currentCooldown: number;
}

// ===== Character Classes =====
export type ClassId = 'warrior' | 'mage' | 'rogue' | 'paladin';

export interface ClassDef {
  id: ClassId;
  name: string;
  icon: string;
  desc: string;
  flavor: string;
  baseStats: Stats;
  hpPerLevel: number;
  mpPerLevel: number;
  primaryStat: StatKey;
  skills: { level: number; skillId: string }[];
}

// ===== Status Effects =====
export type StatusType = 'poison' | 'burn' | 'stun' | 'strengthUp' | 'defenseUp' | 'speedUp';

export interface StatusEffect {
  type: StatusType;
  duration: number;
  power: number;
}

// ===== Enemies =====
export interface EnemyDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  stats: Stats;
  skills: string[];
  xpReward: number;
  goldMin: number;
  goldMax: number;
  floorMin: number;
  floorMax: number;
  isBoss: boolean;
  dropChance: number;
}

export interface EnemyInst {
  uid: string;
  defId: string;
  name: string;
  icon: string;
  pos: Pos;
  hp: number;
  maxHp: number;
  level: number;
  stats: Stats;
  skills: ActiveSkill[];
  xpReward: number;
  goldReward: number;
  isBoss: boolean;
  statusEffects: StatusEffect[];
}

// ===== Player =====
export interface Player {
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  xpNext: number;
  hp: number;
  mp: number;
  stats: Stats;       // effective stats (base + equip bonuses)
  baseStats: Stats;   // character's own stats (without equipment)
  statPoints: number;
  skills: ActiveSkill[];
  inventory: Item[];
  equipment: { weapon: Item | null; armor: Item | null; ring: Item | null };
  gold: number;
  pos: Pos;
  totalKills: number;
  totalDamage: number;
  statusEffects: StatusEffect[];
}

// ===== Dungeon Level =====
export interface DungeonLevel {
  floor: number;
  tiles: Tile[][];
  W: number;
  H: number;
  rooms: Room[];
  enemies: EnemyInst[];
  items: Map<string, Item>;
  stairsPos: Pos;
  entrancePos: Pos;
}

// ===== Combat =====
export interface CombatLogEntry {
  text: string;
  kind: 'player' | 'enemy' | 'system' | 'crit' | 'miss' | 'status';
}

export interface Combat {
  enemy: EnemyInst;
  playerTurn: boolean;
  log: CombatLogEntry[];
  ended: boolean;
  victory: boolean;
  fled: boolean;
  xpGained: number;
  goldGained: number;
  itemDrop: Item | null;
}

// ===== Game Phases =====
export type Phase =
  | 'title'
  | 'charCreate'
  | 'dungeon'
  | 'combat'
  | 'levelUp'
  | 'inventory'
  | 'gameOver'
  | 'victory'
  | 'upgrades';

// ===== Meta-Progression =====
export interface MetaUpgrade {
  id: string;
  name: string;
  desc: string;
  icon: string;
  cost: number;
  maxLevel: number;
}

export interface MetaProgress {
  runs: number;
  bestFloor: number;
  shards: number;
  totalShards: number;
  unlocked: Record<string, number>; // upgradeId -> level
}

// ===== Full Game State =====
export interface GameState {
  phase: Phase;
  player: Player;
  dungeon: DungeonLevel;
  combat: Combat | null;
  messages: string[];
  meta: MetaProgress;
}

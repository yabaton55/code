import type { DungeonLevel, Pos, Room, Tile, TileType, EnemyInst, ActiveSkill, Item } from './types';
import { ENEMIES, SKILLS, ITEMS, getRandomItemDrop } from './data';

const W = 60;
const H = 40;
const MAX_ROOMS = 12;
const MIN_ROOMS = 7;
const MIN_ROOM_W = 5;
const MAX_ROOM_W = 12;
const MIN_ROOM_H = 4;
const MAX_ROOM_H = 8;

function rng(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTile(type: TileType = 'wall'): Tile {
  return { type, visible: false, explored: false };
}

function roomsOverlap(a: Room, b: Room): boolean {
  return (
    a.x - 1 <= b.x + b.w &&
    a.x + a.w + 1 >= b.x &&
    a.y - 1 <= b.y + b.h &&
    a.y + a.h + 1 >= b.y
  );
}

function roomCenter(r: Room): Pos {
  return { x: Math.floor(r.x + r.w / 2), y: Math.floor(r.y + r.h / 2) };
}

function carveRoom(tiles: Tile[][], room: Room) {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (y > 0 && y < H - 1 && x > 0 && x < W - 1) {
        tiles[y][x] = createTile('floor');
      }
    }
  }
}

function carveCorridor(tiles: Tile[][], from: Pos, to: Pos) {
  const hFirst = Math.random() < 0.5;
  if (hFirst) {
    const step = from.x < to.x ? 1 : -1;
    for (let x = from.x; x !== to.x + step; x += step) {
      if (x > 0 && x < W - 1 && from.y > 0 && from.y < H - 1) {
        tiles[from.y][x] = createTile('floor');
      }
    }
    const step2 = from.y < to.y ? 1 : -1;
    for (let y = from.y; y !== to.y + step2; y += step2) {
      if (to.x > 0 && to.x < W - 1 && y > 0 && y < H - 1) {
        tiles[y][to.x] = createTile('floor');
      }
    }
  } else {
    const step = from.y < to.y ? 1 : -1;
    for (let y = from.y; y !== to.y + step; y += step) {
      if (from.x > 0 && from.x < W - 1 && y > 0 && y < H - 1) {
        tiles[y][from.x] = createTile('floor');
      }
    }
    const step2 = from.x < to.x ? 1 : -1;
    for (let x = from.x; x !== to.x + step2; x += step2) {
      if (x > 0 && x < W - 1 && to.y > 0 && to.y < H - 1) {
        tiles[to.y][x] = createTile('floor');
      }
    }
  }
}

function spawnEnemy(floor: number, pos: Pos, uid: string): EnemyInst {
  // Filter enemies that appear on this floor
  const eligible = Object.values(ENEMIES).filter(
    e => !e.isBoss && floor >= e.floorMin && floor <= e.floorMax
  );
  const def = eligible[Math.floor(Math.random() * eligible.length)];

  // Scale stats with floor
  const levelBonus = Math.max(0, floor - def.floorMin);
  const levelScale = 1 + levelBonus * 0.15;
  const stats = {
    maxHp: Math.floor(def.stats.maxHp * levelScale),
    maxMp: def.stats.maxMp,
    str: Math.floor(def.stats.str * (1 + levelBonus * 0.1)),
    def: Math.floor(def.stats.def * (1 + levelBonus * 0.1)),
    int: Math.floor(def.stats.int * (1 + levelBonus * 0.1)),
    spd: def.stats.spd,
    lck: def.stats.lck,
  };

  const skills: ActiveSkill[] = def.skills.map(sid => ({
    ...SKILLS[sid],
    currentCooldown: 0,
  })).filter(Boolean);

  return {
    uid,
    defId: def.id,
    name: def.name,
    icon: def.icon,
    pos: { ...pos },
    hp: stats.maxHp,
    maxHp: stats.maxHp,
    level: floor + levelBonus,
    stats,
    skills,
    xpReward: Math.floor(def.xpReward * levelScale),
    goldReward: rng(def.goldMin, def.goldMax),
    isBoss: false,
    statusEffects: [],
  };
}

function spawnBoss(floor: number, pos: Pos, uid: string): EnemyInst {
  const bossMap: Record<number, string> = { 3: 'green_slime_king', 6: 'orc_warlord', 9: 'lich', 10: 'dragon_lord' };
  const defId = bossMap[floor] || 'dragon_lord';
  const def = ENEMIES[defId];
  const skills: ActiveSkill[] = def.skills.map(sid => ({
    ...SKILLS[sid],
    currentCooldown: 0,
  })).filter(Boolean);

  return {
    uid,
    defId: def.id,
    name: def.name,
    icon: def.icon,
    pos: { ...pos },
    hp: def.stats.maxHp,
    maxHp: def.stats.maxHp,
    level: floor + 2,
    stats: { ...def.stats },
    skills,
    xpReward: def.xpReward,
    goldReward: rng(def.goldMin, def.goldMax),
    isBoss: true,
    statusEffects: [],
  };
}

export function generateDungeon(floor: number, hasExtraItems: boolean = false): DungeonLevel {
  // Initialize grid with walls
  const tiles: Tile[][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => createTile('wall'))
  );

  // Place rooms
  const rooms: Room[] = [];
  let attempts = 0;
  while (rooms.length < MAX_ROOMS && attempts < 200) {
    attempts++;
    const w = rng(MIN_ROOM_W, MAX_ROOM_W);
    const h = rng(MIN_ROOM_H, MAX_ROOM_H);
    const x = rng(1, W - w - 2);
    const y = rng(1, H - h - 2);
    const room: Room = { x, y, w, h };
    if (!rooms.some(r => roomsOverlap(r, room))) {
      rooms.push(room);
      carveRoom(tiles, room);
    }
  }

  if (rooms.length < MIN_ROOMS) {
    // Fallback: generate simple dungeon
    for (let i = 0; i < 8; i++) {
      const w = rng(5, 8); const h = rng(4, 6);
      const x = rng(2, W - w - 3); const y = rng(2, H - h - 3);
      const room: Room = { x, y, w, h };
      rooms.push(room);
      carveRoom(tiles, room);
    }
  }

  // Connect rooms with corridors
  for (let i = 1; i < rooms.length; i++) {
    carveCorridor(tiles, roomCenter(rooms[i - 1]), roomCenter(rooms[i]));
  }
  // Add some extra connections for loops
  for (let i = 0; i < rooms.length; i++) {
    if (Math.random() < 0.25 && rooms.length > 2) {
      const j = Math.floor(Math.random() * rooms.length);
      if (j !== i) {
        carveCorridor(tiles, roomCenter(rooms[i]), roomCenter(rooms[j]));
      }
    }
  }

  // Player starts in first room center
  const entrancePos = roomCenter(rooms[0]);

  // Stairs in last room
  const stairsRoom = rooms[rooms.length - 1];
  const stairsPos = roomCenter(stairsRoom);
  tiles[stairsPos.y][stairsPos.x] = createTile('stairsDown');

  // Place enemies
  const enemies: EnemyInst[] = [];
  let uidCounter = 0;

  // Boss floor
  const isBossFloor = [3, 6, 9, 10].includes(floor);
  if (isBossFloor) {
    // Boss in second-to-last room or last room before stairs
    const bossRoom = rooms[rooms.length - 2] || rooms[rooms.length - 1];
    const bossPos = roomCenter(bossRoom);
    // Don't put boss on stairs
    const bx = bossPos.x === stairsPos.x && bossPos.y === stairsPos.y ? bossPos.x + 1 : bossPos.x;
    enemies.push(spawnBoss(floor, { x: bx, y: bossPos.y }, `e_${uidCounter++}`));
  }

  // Regular enemies in rooms (skip first room with entrance and last with stairs)
  const spawnRooms = rooms.slice(1, isBossFloor ? -2 : -1);
  const enemyCount = Math.min(2 + Math.floor(floor / 2), 4);
  for (const room of spawnRooms) {
    const numEnemies = rng(1, enemyCount);
    for (let i = 0; i < numEnemies; i++) {
      const ex = rng(room.x + 1, room.x + room.w - 2);
      const ey = rng(room.y + 1, room.y + room.h - 2);
      const pos = { x: ex, y: ey };
      // Don't overlap with other enemies or stairs
      const occupied = enemies.some(e => e.pos.x === pos.x && e.pos.y === pos.y)
        || (pos.x === stairsPos.x && pos.y === stairsPos.y)
        || (pos.x === entrancePos.x && pos.y === entrancePos.y);
      if (!occupied) {
        enemies.push(spawnEnemy(floor, pos, `e_${uidCounter++}`));
      }
    }
  }

  // Place items (1-2 per room, skip entrance)
  const items = new Map<string, Item>();

  for (const room of rooms.slice(1)) {
    const chance = hasExtraItems ? 0.5 : 0.3;
    if (Math.random() < chance) {
      const pos = {
        x: rng(room.x + 1, room.x + room.w - 2),
        y: rng(room.y + 1, room.y + room.h - 2),
      };
      const key = `${pos.x},${pos.y}`;
      const itemInTile = items.has(key);
      const enemyInTile = enemies.some(e => e.pos.x === pos.x && e.pos.y === pos.y);
      const isStairs = pos.x === stairsPos.x && pos.y === stairsPos.y;
      if (!itemInTile && !enemyInTile && !isStairs) {
        const drop = getRandomItemDrop(floor);
        if (drop) {
          items.set(key, { ...drop, id: `item_${Date.now()}_${Math.random()}` });
        }
      }
    }
  }

  return {
    floor,
    tiles,
    W,
    H,
    rooms,
    enemies,
    items,
    stairsPos,
    entrancePos,
  };
}

// ===== Field-of-View (Recursive Shadowcasting) =====
function isBlocking(tiles: Tile[][], x: number, y: number, W: number, H: number): boolean {
  if (x < 0 || x >= W || y < 0 || y >= H) return true;
  return tiles[y][x].type === 'wall';
}

function castLight(
  tiles: Tile[][], W: number, H: number,
  cx: number, cy: number,
  row: number, start: number, end: number,
  radius: number,
  xx: number, xy: number, yx: number, yy: number
) {
  if (start < end) return;
  const radiusSq = radius * radius;
  let newStart = 0;
  let blocked = false;

  for (let distance = row; distance <= radius && !blocked; distance++) {
    const dy = -distance;
    for (let dx = -distance; dx <= 0; dx++) {
      const currentX = cx + dx * xx + dy * xy;
      const currentY = cy + dx * yx + dy * yy;
      const leftSlope = (dx - 0.5) / (dy + 0.5);
      const rightSlope = (dx + 0.5) / (dy - 0.5);

      if (start < rightSlope) continue;
      if (end > leftSlope) break;

      if (dx * dx + dy * dy < radiusSq) {
        if (currentX >= 0 && currentX < W && currentY >= 0 && currentY < H) {
          tiles[currentY][currentX].visible = true;
          tiles[currentY][currentX].explored = true;
        }
      }

      if (blocked) {
        if (isBlocking(tiles, currentX, currentY, W, H)) {
          newStart = rightSlope;
        } else {
          blocked = false;
          start = newStart;
        }
      } else {
        if (isBlocking(tiles, currentX, currentY, W, H) && distance < radius) {
          blocked = true;
          castLight(tiles, W, H, cx, cy, distance + 1, start, leftSlope, radius, xx, xy, yx, yy);
          newStart = rightSlope;
        }
      }
    }
  }
}

export function computeFOV(dungeon: DungeonLevel, pos: Pos, radius: number = 8) {
  // Reset visibility
  for (let y = 0; y < dungeon.H; y++) {
    for (let x = 0; x < dungeon.W; x++) {
      dungeon.tiles[y][x].visible = false;
    }
  }
  // Player's own tile is always visible
  if (pos.y >= 0 && pos.y < dungeon.H && pos.x >= 0 && pos.x < dungeon.W) {
    dungeon.tiles[pos.y][pos.x].visible = true;
    dungeon.tiles[pos.y][pos.x].explored = true;
  }

  const multipliers = [
    [1, 0, 0, -1, -1, 0, 0, 1],
    [0, 1, -1, 0, 0, -1, 1, 0],
    [0, 1, 1, 0, 0, -1, -1, 0],
    [1, 0, 0, 1, -1, 0, 0, -1],
  ];

  for (let i = 0; i < 8; i++) {
    castLight(
      dungeon.tiles, dungeon.W, dungeon.H,
      pos.x, pos.y, 1, 1.0, 0.0, radius,
      multipliers[0][i], multipliers[1][i],
      multipliers[2][i], multipliers[3][i]
    );
  }
}

export function getTileAt(dungeon: DungeonLevel, x: number, y: number): Tile | null {
  if (x < 0 || x >= dungeon.W || y < 0 || y >= dungeon.H) return null;
  return dungeon.tiles[y][x];
}

export function getEnemyAt(dungeon: DungeonLevel, x: number, y: number): EnemyInst | undefined {
  return dungeon.enemies.find(e => e.pos.x === x && e.pos.y === y);
}

export function removeEnemy(dungeon: DungeonLevel, uid: string): DungeonLevel {
  return { ...dungeon, enemies: dungeon.enemies.filter(e => e.uid !== uid) };
}

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, Item, Phase, DungeonLevel, Player, Combat, Pos, Rarity, StatKey } from '@/lib/roguelike/types';
import { CLASSES, META_UPGRADES } from '@/lib/roguelike/data';
import {
  initGame, movePlayer, descendStairs, combatAttack, combatSkill,
  combatUseItem, combatFlee, allocateStat, equipItem, unequipItem,
  dropItem, useItem, purchaseUpgrade, loadMeta, saveMeta, calcEffectiveStats,
} from '@/lib/roguelike/engine';

// ===== CONSTANTS =====
const VIEWPORT_W = 21;
const VIEWPORT_H = 17;
const TILE_W = 24;
const TILE_H = 24;

const RARITY_COLORS: Record<Rarity, string> = {
  common: '#aaaaaa',
  uncommon: '#44dd44',
  rare: '#4488ff',
  epic: '#cc44ff',
  legendary: '#ffaa00',
};

const RARITY_NAMES: Record<Rarity, string> = {
  common: 'コモン', uncommon: 'アンコモン', rare: 'レア', epic: 'エピック', legendary: 'レジェンダリー',
};

const STAT_LABELS: Record<StatKey, string> = {
  maxHp: '最大HP', maxMp: '最大MP', str: 'STR', def: 'DEF', int: 'INT', spd: 'SPD', lck: 'LCK',
};

// ===== TILE RENDERER =====
interface TileRender { char: string; color: string; bg: string; bold?: boolean; pulse?: boolean }

function getTileRender(dungeon: DungeonLevel, playerPos: Pos, tx: number, ty: number): TileRender {
  const dark = { char: ' ', color: '#000', bg: '#0a0a14' };
  if (tx < 0 || tx >= dungeon.W || ty < 0 || ty >= dungeon.H) return dark;

  const tile = dungeon.tiles[ty][tx];
  if (!tile.explored) return dark;

  const vis = tile.visible;

  // Player
  if (tx === playerPos.x && ty === playerPos.y) {
    return { char: '@', color: '#ffd700', bg: '#1a1a2e', bold: true };
  }

  // Enemy
  const enemy = dungeon.enemies.find(e => e.pos.x === tx && e.pos.y === ty);
  if (enemy && vis) {
    return {
      char: enemy.icon,
      color: enemy.isBoss ? '#ff2222' : '#ff6644',
      bg: '#1a0a0a',
      bold: true,
      pulse: enemy.isBoss,
    };
  }

  // Item
  const item = dungeon.items.get(`${tx},${ty}`);
  if (item && vis) {
    const itemColor = RARITY_COLORS[item.rarity];
    return { char: item.icon, color: itemColor, bg: '#0a1a0a', bold: item.rarity !== 'common' };
  }

  // Stairs
  if (tile.type === 'stairsDown') {
    return { char: '>', color: vis ? '#44ccff' : '#115566', bg: vis ? '#0a1a2a' : '#0a0a14' };
  }
  if (tile.type === 'stairsUp') {
    return { char: '<', color: vis ? '#44ccff' : '#115566', bg: vis ? '#0a1a2a' : '#0a0a14' };
  }
  if (tile.type === 'door') {
    return { char: '+', color: vis ? '#cc8844' : '#443322', bg: vis ? '#1a1208' : '#0a0a14' };
  }

  // Wall
  if (tile.type === 'wall') {
    return { char: '▓', color: vis ? '#556677' : '#2a3040', bg: vis ? '#111820' : '#0a0a14' };
  }

  // Floor
  return { char: '·', color: vis ? '#445566' : '#1e2a36', bg: vis ? '#0e141e' : '#0a0a14' };
}

// ===== COMPONENTS =====

function ProgressBar({ value, max, color, height = 'h-3' }: { value: number; max: number; color: string; height?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={`w-full ${height} bg-gray-800 rounded overflow-hidden`}>
      <div
        className={`${height} transition-all duration-200`}
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

function DungeonMap({ state }: { state: GameState }) {
  const { player, dungeon } = state;
  const pos = player.pos;

  const startX = Math.max(0, Math.min(pos.x - Math.floor(VIEWPORT_W / 2), dungeon.W - VIEWPORT_W));
  const startY = Math.max(0, Math.min(pos.y - Math.floor(VIEWPORT_H / 2), dungeon.H - VIEWPORT_H));

  return (
    <div
      className="relative border border-gray-700 overflow-hidden flex-shrink-0"
      style={{
        width: VIEWPORT_W * TILE_W,
        height: VIEWPORT_H * TILE_H,
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      {Array.from({ length: VIEWPORT_H }, (_, dy) =>
        Array.from({ length: VIEWPORT_W }, (_, dx) => {
          const tx = startX + dx;
          const ty = startY + dy;
          const cell = getTileRender(dungeon, pos, tx, ty);
          return (
            <div
              key={`${dx}-${dy}`}
              className="absolute flex items-center justify-center"
              style={{
                left: dx * TILE_W,
                top: dy * TILE_H,
                width: TILE_W,
                height: TILE_H,
                backgroundColor: cell.bg,
                color: cell.color,
                fontSize: '14px',
                fontWeight: cell.bold ? 'bold' : 'normal',
                animation: cell.pulse ? 'pulse 1s infinite' : undefined,
              }}
            >
              {cell.char}
            </div>
          );
        })
      )}
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs mb-0.5">
        <span className="text-gray-400">{label}</span>
        <span style={{ color }}>{value}/{max}</span>
      </div>
      <ProgressBar value={value} max={max} color={color} />
    </div>
  );
}

function PlayerPanel({ player }: { player: Player }) {
  const cls = CLASSES[player.classId];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{cls.icon}</span>
        <div>
          <div className="font-bold text-yellow-300">{player.name}</div>
          <div className="text-gray-400 text-xs">{cls.name} Lv.{player.level}</div>
        </div>
      </div>
      <StatBar label="HP" value={player.hp} max={player.stats.maxHp} color="#ff4444" />
      <StatBar label="MP" value={player.mp} max={player.stats.maxMp} color="#4488ff" />
      <div className="mb-1">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-gray-400">XP</span>
          <span className="text-yellow-500">{player.xp}/{player.xpNext}</span>
        </div>
        <ProgressBar value={player.xp} max={player.xpNext} color="#ffaa00" />
      </div>

      {player.statusEffects.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {player.statusEffects.map((se, i) => {
            const labels: Record<string, string> = {
              poison: '🤢毒', burn: '🔥燃焼', stun: '💫スタン',
              strengthUp: '💪強化', defenseUp: '🛡️防御強化', speedUp: '💨速度強化',
            };
            const colors: Record<string, string> = {
              poison: 'bg-green-900 text-green-300', burn: 'bg-red-900 text-red-300',
              stun: 'bg-yellow-900 text-yellow-300', strengthUp: 'bg-orange-900 text-orange-300',
              defenseUp: 'bg-blue-900 text-blue-300', speedUp: 'bg-cyan-900 text-cyan-300',
            };
            return (
              <span key={i} className={`text-xs px-1 rounded ${colors[se.type] || 'bg-gray-800 text-gray-300'}`}>
                {labels[se.type] || se.type}({se.duration})
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatsPanel({ player }: { player: Player }) {
  const stats = player.stats;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm">
      <div className="text-gray-400 text-xs font-bold mb-2">ステータス</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {(['str', 'def', 'int', 'spd', 'lck'] as StatKey[]).map(k => (
          <div key={k} className="flex justify-between">
            <span className="text-gray-500">{STAT_LABELS[k]}</span>
            <span className="text-white font-bold">{stats[k]}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span className="text-gray-500">Gold</span>
          <span className="text-yellow-400 font-bold">💰{player.gold}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">討伐数</span>
          <span className="text-red-400">{player.totalKills}</span>
        </div>
      </div>
    </div>
  );
}

function EquipmentPanel({ player }: { player: Player }) {
  const eq = player.equipment;
  const slots = [
    { key: 'weapon' as const, label: '武器', icon: '⚔️' },
    { key: 'armor' as const, label: '防具', icon: '🛡️' },
    { key: 'ring' as const, label: '指輪', icon: '💍' },
  ];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm">
      <div className="text-gray-400 text-xs font-bold mb-2">装備</div>
      {slots.map(({ key, label, icon }) => (
        <div key={key} className="flex items-center gap-2 mb-1">
          <span className="text-gray-600 w-5 text-center">{icon}</span>
          {eq[key] ? (
            <span style={{ color: RARITY_COLORS[eq[key]!.rarity] }} className="text-xs truncate">
              {eq[key]!.icon} {eq[key]!.name}
            </span>
          ) : (
            <span className="text-gray-700 text-xs">— なし</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SkillsPanel({ player, onUseSkill, inCombat }: {
  player: Player;
  onUseSkill: (i: number) => void;
  inCombat: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded p-3 text-sm">
      <div className="text-gray-400 text-xs font-bold mb-2">スキル</div>
      <div className="space-y-1">
        {player.skills.map((skill, i) => {
          const canUse = inCombat && player.mp >= skill.mpCost && skill.currentCooldown === 0;
          const cd = skill.currentCooldown;
          return (
            <button
              key={skill.id}
              onClick={() => inCombat && onUseSkill(i)}
              disabled={!canUse}
              className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between gap-1
                ${canUse ? 'bg-indigo-900 hover:bg-indigo-700 text-indigo-200 cursor-pointer' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
              title={skill.desc}
            >
              <span>{skill.icon} [{i + 1}] {skill.name}</span>
              <span className="text-right">
                {cd > 0 ? (
                  <span className="text-orange-400">CD:{cd}</span>
                ) : (
                  <span className="text-blue-400">{skill.mpCost}MP</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MessageLog({ messages }: { messages: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);

  return (
    <div ref={ref} className="bg-gray-950 border border-gray-700 rounded p-2 h-28 overflow-y-auto">
      {messages.map((msg, i) => (
        <div key={i} className="text-xs text-gray-300 leading-relaxed">{msg}</div>
      ))}
    </div>
  );
}

// ===== COMBAT SCREEN =====
function CombatScreen({
  state,
  onAttack,
  onSkill,
  onItem,
  onFlee,
}: {
  state: GameState;
  onAttack: () => void;
  onSkill: (i: number) => void;
  onItem: (id: string) => void;
  onFlee: () => void;
}) {
  const { player, combat } = state;
  if (!combat) return null;
  const enemy = combat.enemy;
  const [showItems, setShowItems] = useState(false);

  const consumables = player.inventory.filter(i =>
    i.kind === 'potion' || i.kind === 'mpPotion'
  );

  return (
    <div className="flex flex-col gap-3 p-4 bg-gray-950 rounded border border-red-900 min-h-full">
      {/* Enemy */}
      <div className="bg-gray-900 border border-gray-700 rounded p-3">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-4xl">{enemy.icon}</span>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-bold ${enemy.isBoss ? 'text-red-400 text-lg' : 'text-orange-300'}`}>
                {enemy.name}
              </span>
              {enemy.isBoss && <span className="bg-red-900 text-red-300 text-xs px-1 rounded">BOSS</span>}
              <span className="text-gray-500 text-xs">Lv.{enemy.level}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>HP</span>
              <span className="text-red-400">{enemy.hp}/{enemy.maxHp}</span>
            </div>
            <ProgressBar value={enemy.hp} max={enemy.maxHp} color={enemy.isBoss ? '#ff0000' : '#ff6644'} height="h-4" />
          </div>
        </div>
        {enemy.statusEffects.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {enemy.statusEffects.map((se, i) => {
              const labels: Record<string, string> = { poison: '🤢毒', burn: '🔥燃焼', stun: '💫スタン', strengthUp: '💪強化' };
              return (
                <span key={i} className="text-xs bg-purple-900 text-purple-300 px-1 rounded">
                  {labels[se.type] || se.type}({se.duration})
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Combat Log */}
      <div className="bg-gray-950 border border-gray-700 rounded p-2 h-40 overflow-y-auto flex flex-col-reverse">
        <div>
          {[...combat.log].reverse().map((entry, i) => {
            const colorMap = {
              player: 'text-blue-300', enemy: 'text-red-300', system: 'text-yellow-300',
              crit: 'text-orange-300 font-bold', miss: 'text-gray-400', status: 'text-purple-300',
            };
            return (
              <div key={i} className={`text-xs leading-5 ${colorMap[entry.kind] || 'text-gray-300'}`}>
                {entry.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      {combat.playerTurn && !combat.ended && (
        <div className="space-y-2">
          {/* Attack & Flee row */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onAttack}
              className="bg-red-800 hover:bg-red-600 text-white py-2 rounded font-bold text-sm"
            >
              ⚔️ 攻撃
            </button>
            <button
              onClick={onFlee}
              className="bg-gray-700 hover:bg-gray-600 text-gray-300 py-2 rounded font-bold text-sm"
            >
              🏃 逃げる
            </button>
          </div>

          {/* Skills */}
          <div className="grid grid-cols-2 gap-1">
            {player.skills.map((skill, i) => {
              const canUse = player.mp >= skill.mpCost && skill.currentCooldown === 0;
              return (
                <button
                  key={skill.id}
                  onClick={() => canUse && onSkill(i)}
                  disabled={!canUse}
                  className={`text-xs py-1.5 px-2 rounded text-left flex justify-between items-center
                    ${canUse ? 'bg-indigo-800 hover:bg-indigo-600 text-indigo-100' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
                >
                  <span>{skill.icon} {skill.name}</span>
                  <span className={skill.currentCooldown > 0 ? 'text-orange-400' : 'text-blue-400'}>
                    {skill.currentCooldown > 0 ? `CD${skill.currentCooldown}` : `${skill.mpCost}MP`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Items */}
          <div>
            <button
              onClick={() => setShowItems(!showItems)}
              className="w-full text-xs bg-green-900 hover:bg-green-700 text-green-200 py-1.5 rounded"
            >
              🎒 アイテム使用 ({consumables.length})
            </button>
            {showItems && (
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {consumables.length === 0 ? (
                  <div className="text-xs text-gray-500 text-center py-2">使用可能なアイテムなし</div>
                ) : (
                  consumables.map(item => (
                    <button
                      key={item.id}
                      onClick={() => { onItem(item.id); setShowItems(false); }}
                      className="w-full text-xs bg-gray-800 hover:bg-gray-700 text-left px-2 py-1 rounded"
                    >
                      {item.icon} {item.name}
                      <span className="text-gray-500 ml-1">
                        {item.healHp ? `+${item.healHp === 9999 ? '全' : item.healHp}HP` : `+${item.healMp === 9999 ? '全' : item.healMp}MP`}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!combat.playerTurn && !combat.ended && (
        <div className="text-center text-orange-300 text-sm animate-pulse py-2">
          {combat.enemy.name}のターン...
        </div>
      )}
    </div>
  );
}

// ===== INVENTORY SCREEN =====
function InventoryScreen({
  state,
  onEquip,
  onUnequip,
  onDrop,
  onUse,
  onClose,
}: {
  state: GameState;
  onEquip: (id: string) => void;
  onUnequip: (slot: 'weapon' | 'armor' | 'ring') => void;
  onDrop: (id: string) => void;
  onUse: (id: string) => void;
  onClose: () => void;
}) {
  const { player } = state;
  const [selected, setSelected] = useState<string | null>(null);

  const selectedItem = player.inventory.find(i => i.id === selected);

  return (
    <div className="bg-gray-950 border border-gray-700 rounded p-4 text-sm">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-yellow-300 font-bold text-base">🎒 インベントリ ({player.inventory.length}/20)</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">✕</button>
      </div>

      {/* Equipment slots */}
      <div className="mb-4 bg-gray-900 rounded p-3">
        <div className="text-gray-400 text-xs font-bold mb-2">装備中</div>
        <div className="grid grid-cols-3 gap-2">
          {(['weapon', 'armor', 'ring'] as const).map(slot => {
            const item = player.equipment[slot];
            return (
              <div key={slot} className="bg-gray-800 rounded p-2">
                <div className="text-gray-500 text-xs mb-1">
                  {slot === 'weapon' ? '⚔️武器' : slot === 'armor' ? '🛡️防具' : '💍指輪'}
                </div>
                {item ? (
                  <>
                    <div style={{ color: RARITY_COLORS[item.rarity] }} className="text-xs font-bold">
                      {item.icon} {item.name}
                    </div>
                    <button
                      onClick={() => onUnequip(slot)}
                      className="mt-1 text-xs text-gray-500 hover:text-red-400"
                    >外す</button>
                  </>
                ) : (
                  <div className="text-gray-700 text-xs">— なし</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Inventory grid */}
      <div className="grid grid-cols-1 gap-1 max-h-56 overflow-y-auto mb-3">
        {player.inventory.length === 0 ? (
          <div className="text-gray-500 text-center py-4">アイテムなし</div>
        ) : (
          player.inventory.map(item => (
            <button
              key={item.id}
              onClick={() => setSelected(selected === item.id ? null : item.id)}
              className={`text-left px-3 py-2 rounded flex items-center gap-2 transition-colors
                ${selected === item.id ? 'bg-indigo-900 border border-indigo-500' : 'bg-gray-800 hover:bg-gray-700'}`}
            >
              <span>{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div style={{ color: RARITY_COLORS[item.rarity] }} className="text-xs font-bold truncate">
                  {item.name}
                </div>
                <div className="text-gray-500 text-xs">{RARITY_NAMES[item.rarity]} · {item.desc}</div>
              </div>
              {item.statBonus && (
                <div className="text-xs text-right text-gray-400 flex-shrink-0">
                  {Object.entries(item.statBonus).map(([k, v]) => (
                    <div key={k}>{STAT_LABELS[k as StatKey]}{v > 0 ? '+' : ''}{v}</div>
                  ))}
                </div>
              )}
            </button>
          ))
        )}
      </div>

      {/* Selected item actions */}
      {selectedItem && (
        <div className="bg-gray-900 rounded p-3 border border-gray-700">
          <div style={{ color: RARITY_COLORS[selectedItem.rarity] }} className="font-bold mb-2">
            {selectedItem.icon} {selectedItem.name}
          </div>
          <div className="text-gray-400 text-xs mb-2">{selectedItem.desc}</div>
          <div className="flex gap-2 flex-wrap">
            {['weapon', 'armor', 'ring'].includes(selectedItem.kind) && (
              <button
                onClick={() => { onEquip(selectedItem.id); setSelected(null); }}
                className="bg-indigo-700 hover:bg-indigo-600 text-white text-xs px-3 py-1.5 rounded"
              >
                装備する
              </button>
            )}
            {(selectedItem.kind === 'potion' || selectedItem.kind === 'mpPotion') && (
              <button
                onClick={() => { onUse(selectedItem.id); setSelected(null); }}
                className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded"
              >
                使用する
              </button>
            )}
            <button
              onClick={() => { onDrop(selectedItem.id); setSelected(null); }}
              className="bg-gray-700 hover:bg-red-800 text-gray-300 text-xs px-3 py-1.5 rounded"
            >
              捨てる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== LEVEL UP SCREEN =====
function LevelUpScreen({ state, onAllocate }: { state: GameState; onAllocate: (stat: StatKey) => void }) {
  const { player } = state;
  const allocatable: StatKey[] = ['maxHp', 'maxMp', 'str', 'def', 'int', 'spd', 'lck'];
  const statIcons: Record<StatKey, string> = {
    maxHp: '❤️', maxMp: '💙', str: '⚔️', def: '🛡️', int: '🔮', spd: '💨', lck: '🍀',
  };
  const statDescs: Record<StatKey, string> = {
    maxHp: '最大HPが増加', maxMp: '最大MPが増加', str: '物理攻撃力が増加',
    def: '物理防御力が増加', int: '魔法攻撃/回復力増加', spd: '素早さ/回避率増加',
    lck: 'クリティカル/ドロップ率増加',
  };

  return (
    <div className="bg-gray-950 border-2 border-yellow-600 rounded p-6 text-center">
      <div className="text-4xl mb-2">⭐</div>
      <h2 className="text-yellow-300 font-bold text-xl mb-1">レベルアップ！</h2>
      <div className="text-gray-400 mb-1">Lv.{player.level - 1} → <span className="text-yellow-300">Lv.{player.level}</span></div>
      <div className="text-gray-300 mb-4">残りポイント: <span className="text-yellow-300 font-bold">{player.statPoints}</span></div>

      {/* New skills */}
      {player.skills.filter(s => s.id).length > 0 && (
        <div className="mb-4 bg-indigo-950 rounded p-2 border border-indigo-700">
          <div className="text-indigo-300 text-xs mb-1">習得済みスキル</div>
          <div className="flex flex-wrap gap-1 justify-center">
            {player.skills.map(s => (
              <span key={s.id} className="text-xs bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded">
                {s.icon} {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-left">
        {allocatable.map(stat => (
          <button
            key={stat}
            onClick={() => onAllocate(stat)}
            disabled={player.statPoints === 0}
            className={`p-3 rounded border transition-colors text-left
              ${player.statPoints > 0 ? 'bg-gray-800 hover:bg-gray-700 border-gray-600 hover:border-yellow-600 cursor-pointer' : 'bg-gray-900 border-gray-700 cursor-not-allowed opacity-50'}`}
          >
            <div className="flex items-center gap-2">
              <span>{statIcons[stat]}</span>
              <div>
                <div className="text-white text-xs font-bold">{STAT_LABELS[stat]}</div>
                <div className="text-gray-500 text-xs">{statDescs[stat]}</div>
              </div>
              <div className="ml-auto text-yellow-300 font-bold">{player.stats[stat]}</div>
            </div>
          </button>
        ))}
      </div>

      {player.statPoints === 0 && (
        <div className="mt-4 text-green-400 text-sm">全ポイントを割り振りました！</div>
      )}
    </div>
  );
}

// ===== TITLE SCREEN =====
function TitleScreen({ meta, onStart, onUpgrades }: {
  meta: GameState['meta'];
  onStart: () => void;
  onUpgrades: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="text-6xl mb-4">🏰</div>
        <h1 className="text-4xl font-bold text-yellow-300 mb-2">ダンジョン・クエスト</h1>
        <p className="text-gray-400 mb-8">本格派ローグライクRPG — 10階層の危険なダンジョンを踏破せよ</p>

        <div className="bg-gray-900 rounded p-4 mb-6 text-left">
          <div className="text-gray-300 text-sm font-bold mb-2">📊 記録</div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{meta.runs}</div>
              <div className="text-gray-500 text-xs">冒険回数</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-300">{meta.bestFloor}</div>
              <div className="text-gray-500 text-xs">最高到達階</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-300">{meta.shards}</div>
              <div className="text-gray-500 text-xs">ソウルシャード</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onStart}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-4 rounded-lg text-lg transition-colors"
          >
            ⚔️ 冒険を始める
          </button>
          <button
            onClick={onUpgrades}
            className="w-full bg-purple-800 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
          >
            ✨ 永続強化 ({meta.shards} シャード)
          </button>
        </div>

        <div className="mt-6 text-gray-600 text-xs">
          WASD/矢印キー: 移動 | Enterまたは&gt;: 階段を降りる | I: インベントリ | 1-4: スキル
        </div>
      </div>
    </div>
  );
}

// ===== CHARACTER CREATION =====
function CharCreateScreen({ meta, onCreate }: { meta: GameState['meta']; onCreate: (name: string, cls: string) => void }) {
  const [name, setName] = useState('勇者');
  const [selectedClass, setSelectedClass] = useState('warrior');

  const cls = CLASSES[selectedClass];

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <h2 className="text-2xl font-bold text-yellow-300 text-center mb-6">キャラクター作成</h2>

        {/* Name */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">名前</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded px-3 py-2 focus:outline-none focus:border-yellow-500"
            maxLength={12}
          />
        </div>

        {/* Class selection */}
        <div className="mb-6">
          <label className="block text-gray-400 text-sm mb-2">職業</label>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(CLASSES).map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={`p-3 rounded border text-left transition-colors
                  ${selectedClass === c.id ? 'bg-indigo-900 border-indigo-400' : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{c.icon}</span>
                  <span className="font-bold text-white">{c.name}</span>
                </div>
                <div className="text-gray-400 text-xs">{c.desc}</div>
                <div className="mt-2 text-xs text-gray-500">{c.flavor}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected class stats preview */}
        {cls && (
          <div className="mb-6 bg-gray-900 rounded p-3">
            <div className="text-gray-400 text-xs mb-2">基本ステータス</div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {(['maxHp', 'str', 'def', 'int', 'spd', 'lck', 'maxMp'] as StatKey[]).map(k => (
                <div key={k} className="bg-gray-800 rounded p-1">
                  <div className="text-gray-500">{STAT_LABELS[k]}</div>
                  <div className="text-white font-bold">{cls.baseStats[k]}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-gray-500 text-xs">
              初期スキル: {cls.skills.filter(s => s.level <= 1).map(s => {
                const sd = require('@/lib/roguelike/data').SKILLS[s.skillId];
                return sd ? `${sd.icon}${sd.name}` : s.skillId;
              }).join(', ')}
            </div>
          </div>
        )}

        <button
          onClick={() => name.trim() && onCreate(name.trim(), selectedClass)}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg text-lg"
        >
          冒険を開始！
        </button>
      </div>
    </div>
  );
}

// ===== META UPGRADES SCREEN =====
function MetaUpgradesScreen({ meta, onPurchase, onClose }: {
  meta: GameState['meta'];
  onPurchase: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-purple-300">✨ 永続強化</h2>
          <div className="flex items-center gap-4">
            <span className="text-purple-300 font-bold">💎 {meta.shards} シャード</span>
            <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded">
              戻る
            </button>
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-4">ソウルシャードを使って全ての冒険に有効な永続強化を解放する</p>

        <div className="grid grid-cols-2 gap-3">
          {META_UPGRADES.map(upgrade => {
            const currentLevel = meta.unlocked[upgrade.id] || 0;
            const maxed = currentLevel >= upgrade.maxLevel;
            const canAfford = meta.shards >= upgrade.cost;
            const nextCost = upgrade.cost * (currentLevel + 1);
            const canBuy = !maxed && meta.shards >= nextCost;

            return (
              <div
                key={upgrade.id}
                className={`bg-gray-900 border rounded p-4 transition-colors
                  ${maxed ? 'border-yellow-600' : currentLevel > 0 ? 'border-purple-700' : 'border-gray-700'}`}
              >
                <div className="flex items-start gap-3 mb-2">
                  <span className="text-2xl">{upgrade.icon}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <span className={`font-bold ${maxed ? 'text-yellow-300' : 'text-white'}`}>{upgrade.name}</span>
                      <span className="text-xs text-gray-500">Lv.{currentLevel}/{upgrade.maxLevel}</span>
                    </div>
                    <div className="text-gray-400 text-xs">{upgrade.desc}</div>
                  </div>
                </div>

                {/* Level progress */}
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: upgrade.maxLevel }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 rounded ${i < currentLevel ? 'bg-purple-500' : 'bg-gray-700'}`}
                    />
                  ))}
                </div>

                <button
                  onClick={() => canBuy && onPurchase(upgrade.id)}
                  disabled={!canBuy}
                  className={`w-full text-xs py-1.5 rounded font-bold transition-colors
                    ${maxed ? 'bg-yellow-900 text-yellow-300 cursor-not-allowed'
                      : canBuy ? 'bg-purple-700 hover:bg-purple-600 text-white cursor-pointer'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  {maxed ? '✅ MAX' : `💎 ${nextCost} シャード`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== GAME OVER SCREEN =====
function GameOverScreen({ state, onRestart, onTitle }: {
  state: GameState;
  onRestart: () => void;
  onTitle: () => void;
}) {
  const { player, dungeon, meta } = state;
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4">💀</div>
        <h2 className="text-3xl font-bold text-red-400 mb-2">GAME OVER</h2>
        <p className="text-gray-400 mb-6">{player.name}は{dungeon.floor}階で力尽きた...</p>

        <div className="bg-gray-900 rounded p-4 mb-6 text-left">
          <div className="text-gray-300 font-bold mb-3">冒険の記録</div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-800 rounded p-3 text-center">
              <div className="text-2xl font-bold text-yellow-300">{dungeon.floor}</div>
              <div className="text-gray-500 text-xs">到達階層</div>
            </div>
            <div className="bg-gray-800 rounded p-3 text-center">
              <div className="text-2xl font-bold text-red-400">{player.totalKills}</div>
              <div className="text-gray-500 text-xs">討伐数</div>
            </div>
            <div className="bg-gray-800 rounded p-3 text-center">
              <div className="text-2xl font-bold text-blue-400">Lv.{player.level}</div>
              <div className="text-gray-500 text-xs">最終レベル</div>
            </div>
            <div className="bg-gray-800 rounded p-3 text-center">
              <div className="text-2xl font-bold text-purple-400">+{meta.shards - (meta.totalShards - (dungeon.floor + Math.floor(player.totalKills / 5)))}</div>
              <div className="text-gray-500 text-xs">獲得シャード</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg"
          >
            ⚔️ もう一度挑戦
          </button>
          <button
            onClick={onTitle}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg"
          >
            タイトルへ
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== VICTORY SCREEN =====
function VictoryScreen({ state, onTitle }: { state: GameState; onTitle: () => void }) {
  const { player, meta } = state;
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4 animate-bounce">🏆</div>
        <h2 className="text-3xl font-bold text-yellow-300 mb-2">VICTORY!</h2>
        <p className="text-gray-300 mb-2">ドラゴンロードを討伐し、ダンジョンを制覇した！</p>
        <p className="text-purple-300 font-bold mb-6">💎 +20 ソウルシャード獲得！</p>

        <div className="bg-gray-900 rounded p-4 mb-6">
          <div className="text-yellow-300 font-bold mb-3">🎖️ 伝説の勇者 {player.name}</div>
          <div className="grid grid-cols-3 gap-3 text-sm text-center">
            <div><div className="text-2xl font-bold text-blue-400">Lv.{player.level}</div><div className="text-gray-500 text-xs">最終レベル</div></div>
            <div><div className="text-2xl font-bold text-red-400">{player.totalKills}</div><div className="text-gray-500 text-xs">討伐数</div></div>
            <div><div className="text-2xl font-bold text-yellow-400">💰{player.gold}</div><div className="text-gray-500 text-xs">所持金</div></div>
          </div>
        </div>

        <button
          onClick={onTitle}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-black font-bold py-3 rounded-lg text-lg"
        >
          タイトルへ戻る
        </button>
      </div>
    </div>
  );
}

// ===== MAIN GAME COMPONENT =====
export default function RoguelikeGame() {
  const [meta, setMeta] = useState(() => loadMeta());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [uiPhase, setUiPhase] = useState<'title' | 'charCreate' | 'upgrades'>('title');
  const [showInventory, setShowInventory] = useState(false);

  // Save meta whenever it changes
  useEffect(() => {
    saveMeta(meta);
  }, [meta]);

  const handleStart = useCallback(() => setUiPhase('charCreate'), []);
  const handleUpgrades = useCallback(() => setUiPhase('upgrades'), []);
  const handleTitleBack = useCallback(() => setUiPhase('title'), []);

  const handleCreate = useCallback((name: string, classId: string) => {
    const state = initGame(name, classId, meta);
    setGameState(state);
  }, [meta]);

  const handlePurchaseUpgrade = useCallback((upgradeId: string) => {
    setMeta(prev => {
      const upgrade = META_UPGRADES.find(u => u.id === upgradeId);
      if (!upgrade) return prev;
      const currentLevel = prev.unlocked[upgradeId] || 0;
      if (currentLevel >= upgrade.maxLevel) return prev;
      const cost = upgrade.cost * (currentLevel + 1);
      if (prev.shards < cost) return prev;
      return {
        ...prev,
        shards: prev.shards - cost,
        unlocked: { ...prev.unlocked, [upgradeId]: currentLevel + 1 },
      };
    });
  }, []);

  // Update meta from game state when needed
  const updateState = useCallback((newState: GameState) => {
    setGameState(newState);
    if (newState.meta !== gameState?.meta) {
      setMeta(newState.meta);
    }
  }, [gameState?.meta]);

  // Keyboard handler
  useEffect(() => {
    if (!gameState) return;

    const handleKey = (e: KeyboardEvent) => {
      const phase = gameState.phase;

      // Inventory toggle
      if (e.key === 'i' || e.key === 'I') {
        if (phase === 'dungeon') { setShowInventory(v => !v); return; }
      }

      if (phase === 'dungeon') {
        if (showInventory) return;
        const moves: Record<string, [number, number]> = {
          ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
          w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
          W: [0, -1], S: [0, 1], A: [-1, 0], D: [1, 0],
        };
        if (moves[e.key]) {
          e.preventDefault();
          const [dx, dy] = moves[e.key];
          updateState(movePlayer(gameState, dx, dy));
        }
        if (e.key === '>' || e.key === 'Enter') {
          e.preventDefault();
          updateState(descendStairs(gameState));
        }
      }

      if (phase === 'combat' && gameState.combat?.playerTurn) {
        if (e.key === 'a' || e.key === 'A' || e.key === ' ') {
          e.preventDefault();
          updateState(combatAttack(gameState));
        }
        if (e.key === 'f' || e.key === 'F') {
          e.preventDefault();
          updateState(combatFlee(gameState));
        }
        if (['1', '2', '3', '4', '5'].includes(e.key)) {
          e.preventDefault();
          updateState(combatSkill(gameState, parseInt(e.key) - 1));
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [gameState, showInventory, updateState]);

  // No game state - show title/create/upgrades
  if (!gameState) {
    if (uiPhase === 'charCreate') {
      return <CharCreateScreen meta={meta} onCreate={handleCreate} />;
    }
    if (uiPhase === 'upgrades') {
      return (
        <MetaUpgradesScreen
          meta={meta}
          onPurchase={handlePurchaseUpgrade}
          onClose={handleTitleBack}
        />
      );
    }
    return <TitleScreen meta={meta} onStart={handleStart} onUpgrades={handleUpgrades} />;
  }

  const { phase, player, dungeon } = gameState;

  // Game over
  if (phase === 'gameOver') {
    return (
      <GameOverScreen
        state={gameState}
        onRestart={() => { setGameState(null); setUiPhase('charCreate'); }}
        onTitle={() => { setGameState(null); setUiPhase('title'); }}
      />
    );
  }

  // Victory
  if (phase === 'victory') {
    return <VictoryScreen state={gameState} onTitle={() => { setGameState(null); setUiPhase('title'); }} />;
  }

  // Level up
  if (phase === 'levelUp') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <LevelUpScreen
            state={gameState}
            onAllocate={(stat) => updateState(allocateStat(gameState, stat))}
          />
        </div>
      </div>
    );
  }

  // Main game UI (dungeon + combat)
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-yellow-300 font-bold text-lg">🏰 ダンジョン・クエスト</span>
          <span className="text-gray-500 text-sm">B{dungeon.floor}F</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowInventory(v => !v)}
            className={`text-sm px-3 py-1 rounded transition-colors ${showInventory ? 'bg-indigo-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
          >
            🎒 インベントリ [I]
          </button>
          <button
            onClick={() => { updateState({ ...gameState, meta: { ...gameState.meta, runs: gameState.meta.runs + 1, bestFloor: Math.max(gameState.meta.bestFloor, dungeon.floor) } }); setGameState(null); setUiPhase('title'); }}
            className="text-sm px-3 py-1 bg-gray-700 hover:bg-red-900 text-gray-400 rounded transition-colors"
          >
            退場
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Map or Combat */}
        <div className="flex-shrink-0 p-3 flex flex-col gap-2">
          {phase === 'combat' && gameState.combat ? (
            <div style={{ width: VIEWPORT_W * TILE_W }}>
              <CombatScreen
                state={gameState}
                onAttack={() => updateState(combatAttack(gameState))}
                onSkill={(i) => updateState(combatSkill(gameState, i))}
                onItem={(id) => updateState(combatUseItem(gameState, id))}
                onFlee={() => updateState(combatFlee(gameState))}
              />
            </div>
          ) : showInventory ? (
            <div style={{ width: VIEWPORT_W * TILE_W }}>
              <InventoryScreen
                state={gameState}
                onEquip={(id) => updateState(equipItem(gameState, id))}
                onUnequip={(slot) => updateState(unequipItem(gameState, slot))}
                onDrop={(id) => updateState(dropItem(gameState, id))}
                onUse={(id) => updateState(useItem(gameState, id))}
                onClose={() => setShowInventory(false)}
              />
            </div>
          ) : (
            <DungeonMap state={gameState} />
          )}

          {/* Message log */}
          <div style={{ width: VIEWPORT_W * TILE_W }}>
            <MessageLog messages={gameState.messages} />
          </div>

          {/* Controls hint */}
          {phase === 'dungeon' && !showInventory && (
            <div className="text-gray-600 text-xs" style={{ width: VIEWPORT_W * TILE_W }}>
              移動: WASD/矢印 | 階段: &gt;/Enter | スキル: 1-4 | インベントリ: I
            </div>
          )}
        </div>

        {/* Right: Player info */}
        <div className="flex-1 p-3 flex flex-col gap-2 min-w-0 overflow-y-auto" style={{ maxWidth: 280 }}>
          <PlayerPanel player={player} />
          <EquipmentPanel player={player} />
          <StatsPanel player={player} />
          {phase !== 'combat' && (
            <SkillsPanel
              player={player}
              onUseSkill={() => {}}
              inCombat={false}
            />
          )}

          {/* Floor info */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs">
            <div className="text-gray-400 font-bold mb-1">📍 B{dungeon.floor}F 情報</div>
            <div className="text-gray-500">敵: {dungeon.enemies.length}体</div>
            <div className="text-gray-500">アイテム: {dungeon.items.size}個</div>
            {[3, 6, 9, 10].includes(dungeon.floor) && (
              <div className="text-red-400 mt-1 font-bold">⚠️ ボスフロア</div>
            )}
          </div>

          {/* Meta info */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs">
            <div className="text-gray-400 font-bold mb-1">💎 ソウルシャード</div>
            <div className="text-purple-300 font-bold">{meta.shards}</div>
            <div className="text-gray-600 mt-1">死亡時: 階層数+討伐ボーナス</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}

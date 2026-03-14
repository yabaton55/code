'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { GameState, Player, Monster, Item, Skill, JobClass, Stats, GamePhase } from '@/lib/game/types';
import {
  createInitialState, saveGame, loadGame, hasSave,
  usePlayerSkill, enemyTurn, applyRewards, equipItem, useItem,
  enhanceEquipment, craftItem, learnSkill, allocateStat,
  generateEncounter, checkAchievements, tryFlee, getAvailableSkillsToLearn,
  calcTotalStats, calcMaxHp, calcMaxMp, createPlayer,
} from '@/lib/game/engine';
import {
  JOB_DATA, SKILLS, ITEMS, DUNGEON_AREAS, ACHIEVEMENTS, SHOP_STOCK_BY_LEVEL, RARITY_COLOR, ELEMENT_COLOR,
} from '@/lib/game/data';

// ===== HELPER COMPONENTS =====

function Tooltip({ text }: { text: string }) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 border border-gray-600 text-xs text-gray-200 rounded whitespace-pre-wrap max-w-48 text-center pointer-events-none">
      {text}
    </div>
  );
}

function StatBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-gray-400 w-8">{label}</span>
      <div className="flex-1 bg-gray-800 rounded-full h-2 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-gray-300 w-20 text-right">{value}/{max}</span>
    </div>
  );
}

function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    common: 'bg-gray-700 text-gray-300', uncommon: 'bg-green-900 text-green-300',
    rare: 'bg-blue-900 text-blue-300', epic: 'bg-purple-900 text-purple-300',
    legendary: 'bg-yellow-900 text-yellow-300',
  };
  const labels: Record<string, string> = {
    common: 'コモン', uncommon: 'アンコモン', rare: 'レア', epic: 'エピック', legendary: 'レジェンダリー',
  };
  return <span className={`text-xs px-1 rounded ${colors[rarity] ?? ''}`}>{labels[rarity] ?? rarity}</span>;
}

function ItemCard({ item, onClick, selected, showEquipBtn, onEquip }: {
  item: Item; onClick?: () => void; selected?: boolean;
  showEquipBtn?: boolean; onEquip?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const enhLabel = (item.enhancement ?? 0) > 0 ? ` +${item.enhancement}` : '';
  return (
    <div
      className={`relative p-2 rounded border cursor-pointer transition-all
        ${selected ? 'border-yellow-500 bg-yellow-950' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hovered && (
        <Tooltip text={`${item.description}\n価値: ${item.value}G${item.effect?.hp ? `\nHP+${item.effect.hp}` : ''}${item.attackPower ? `\n攻撃力: ${item.attackPower}${enhLabel}` : ''}${item.defense ? `\n防御力: ${item.defense}${enhLabel}` : ''}`} />
      )}
      <div className="flex items-center gap-2">
        <div className="text-lg">{getItemEmoji(item)}</div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-semibold truncate ${RARITY_COLOR[item.rarity]}`}>
            {item.name}{enhLabel}
          </div>
          <RarityBadge rarity={item.rarity} />
        </div>
        {(item.quantity ?? 1) > 1 && <span className="text-gray-400 text-xs">×{item.quantity}</span>}
      </div>
      {showEquipBtn && onEquip && (
        <button onClick={e => { e.stopPropagation(); onEquip(); }}
          className="mt-1 w-full text-xs bg-blue-800 hover:bg-blue-700 text-white rounded px-2 py-0.5">
          装備
        </button>
      )}
    </div>
  );
}

function getItemEmoji(item: Item): string {
  const map: Record<string, string> = {
    weapon: '⚔️', armor_body: '🛡️', armor_head: '⛑️', armor_hand: '🧤', armor_leg: '👢',
    accessory: '💍', consumable: '🧪', material: '🪨', key: '🗝️',
  };
  if (item.type === 'consumable') {
    if (item.id.includes('Potion') || item.id === 'potion') return '🧪';
    if (item.id.includes('Ether') || item.id === 'ether') return '✨';
    if (item.id === 'elixir') return '💊';
    if (item.id === 'reviveStone') return '💎';
  }
  return map[item.type] ?? '📦';
}

function MessageLog({ messages }: { messages: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [messages]);
  return (
    <div ref={ref} className="bg-gray-950 border border-gray-700 rounded p-2 h-32 overflow-y-auto text-xs space-y-0.5">
      {messages.slice(-30).map((m, i) => (
        <div key={i} className={`text-gray-300 ${m.includes('レベルアップ') || m.includes('実績') ? 'text-yellow-400 font-bold' : ''}
          ${m.includes('ダメージ') && m.includes(m.split('の')[0]) ? '' : ''}
          ${m.includes('回復') ? 'text-green-400' : ''}
          ${m.includes('失敗') || m.includes('死') ? 'text-red-400' : ''}
          ${m.includes('クリティカル') ? 'text-orange-400' : ''}
          ${m.includes('弱点') ? 'text-yellow-300' : ''}`}>
          {m}
        </div>
      ))}
    </div>
  );
}

// ===== MAIN COMPONENT =====
export default function SimRPG() {
  const [gs, setGs] = useState<GameState>(createInitialState);
  const [inputName, setInputName] = useState('勇者');
  const [selectedJob, setSelectedJob] = useState<JobClass>('warrior');
  const [selectedTarget, setSelectedTarget] = useState(0);
  const [selectedSkillId, setSelectedSkillId] = useState('attack');
  const [battlePhase, setBattlePhase] = useState<'player' | 'enemy' | 'result'>('player');
  const [pendingRewards, setPendingRewards] = useState<{ exp: number; gold: number; items: Item[] } | null>(null);
  const [activeTab, setActiveTab] = useState<'inventory' | 'equip' | 'status' | 'skills'>('status');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [selectedEnhSlot, setSelectedEnhSlot] = useState<keyof Player['equipment'] | null>(null);
  const [shopTab, setShopTab] = useState<'buy' | 'sell' | 'craft'>('buy');
  const [newAchievements, setNewAchievements] = useState<string[]>([]);
  const [prevPhase, setPrevPhase] = useState<GamePhase>('town');

  const addMessages = useCallback((msgs: string[]) => {
    setGs(g => ({ ...g, messages: [...g.messages, ...msgs].slice(-100) }));
  }, []);

  const setPhase = useCallback((phase: GamePhase) => {
    setGs(g => ({ ...g, phase }));
  }, []);

  // Auto-save
  useEffect(() => {
    if (gs.phase !== 'title' && gs.phase !== 'charCreate' && gs.settings.autoSave) {
      const timer = setTimeout(() => saveGame(gs), 2000);
      return () => clearTimeout(timer);
    }
  }, [gs]);

  // Achievement check
  useEffect(() => {
    if (gs.phase === 'town' || gs.phase === 'battle') {
      const { player: p2, newAchievements: na } = checkAchievements(gs.player);
      if (na.length > 0) {
        setGs(g => ({ ...g, player: p2 }));
        setNewAchievements(prev => [...prev, ...na]);
        addMessages(na.map(n => `🏆 実績解除: ${n}！`));
      }
    }
  }, [gs.player.level, gs.player.totalKills, gs.player.gold, gs.player.dungeonClears, gs.phase]);

  // Achievement notification auto-dismiss
  useEffect(() => {
    if (newAchievements.length > 0) {
      const t = setTimeout(() => setNewAchievements([]), 4000);
      return () => clearTimeout(t);
    }
  }, [newAchievements]);

  // ===== HANDLERS =====

  function handleNewGame() {
    const p = createPlayer(inputName || '勇者', selectedJob);
    setGs({ ...createInitialState(), player: p, phase: 'town', messages: [`${p.name}の冒険が始まった！`] });
  }

  function handleLoadGame() {
    const saved = loadGame();
    if (saved) {
      setGs(g => ({
        ...g,
        ...saved,
        messages: ['セーブデータを読み込みました。'],
        shopInventory: SHOP_STOCK_BY_LEVEL(saved.player?.level ?? 1),
      }));
    }
  }

  function enterDungeon(areaId: string) {
    const area = DUNGEON_AREAS[areaId];
    if (!area) return;
    if (gs.player.level < area.minLevel) {
      addMessages([`このダンジョンはLv.${area.minLevel}以上が必要です。`]);
      return;
    }
    const dungeon: import('@/lib/game/types').DungeonState = {
      areaId, floor: 1, steps: 0, encounterRate: 0.3, chests: {}, explored: 0,
    };
    setGs(g => ({
      ...g, dungeon, phase: 'dungeon',
      messages: [...g.messages, `${area.name}に入った！`, `${area.description}`, 'ダンジョンを進もう。'],
    }));
  }

  function moveForward() {
    if (!gs.dungeon) return;
    const dungeon = { ...gs.dungeon, steps: gs.dungeon.steps + 1 };

    // Check for chest
    const chestKey = `${dungeon.areaId}_${dungeon.floor}_${dungeon.steps}`;
    if (!dungeon.chests[chestKey] && Math.random() < 0.15) {
      dungeon.chests[chestKey] = true;
      const area = DUNGEON_AREAS[dungeon.areaId];
      const tbl = area.treasureTable.filter(t => dungeon.floor >= t.floor);
      if (tbl.length > 0) {
        const entry = tbl[Math.floor(Math.random() * tbl.length)];
        if (Math.random() * 100 < entry.chance) {
          const item = ITEMS[entry.itemId];
          if (item) {
            const p = { ...gs.player, inventory: [...gs.player.inventory] };
            const { player: newP } = { player: { ...p } };
            import('@/lib/game/engine').then(({ addToInventory }) => {
              const pl = { ...gs.player, inventory: [...gs.player.inventory] };
              addToInventory(pl, { ...item, quantity: 1 });
              setGs(g => ({
                ...g, player: pl, dungeon,
                messages: [...g.messages, `宝箱発見！✨ ${item.name}を入手！`],
              }));
            });
            return;
          }
        }
      }
    }

    // Check for encounter
    const encounterChance = dungeon.floor === DUNGEON_AREAS[dungeon.areaId].floors ? 1.0 : dungeon.encounterRate;
    if (Math.random() < encounterChance) {
      const enemies = generateEncounter(dungeon, gs.player.level);
      if (enemies.length > 0) {
        const battle: import('@/lib/game/types').BattleState = {
          enemies, turn: 1, playerTurn: true, combo: 0,
          log: [`エンカウント！ ${enemies.map(e => e.name).join('、')}が現れた！`],
          fled: false,
        };
        setGs(g => ({
          ...g, dungeon, battle, phase: 'battle',
          messages: [...g.messages, ...battle.log],
        }));
        setBattlePhase('player');
        setSelectedTarget(0);
        return;
      }
    }

    setGs(g => ({
      ...g, dungeon,
      messages: [...g.messages, getExploreMessage(dungeon.floor)],
    }));
  }

  function getExploreMessage(floor: number): string {
    const msgs = [
      '慎重に前に進む...', '薄暗い通路を歩く。', '遠くから奇妙な音が聞こえる。',
      '足元に何か光るものがある...いや、ただの石だ。', '空気が重くなってきた。',
      `第${floor}層を探索中...`, '警戒しながら進む。', '静寂が続く...',
    ];
    return msgs[Math.floor(Math.random() * msgs.length)];
  }

  function goNextFloor() {
    if (!gs.dungeon) return;
    const area = DUNGEON_AREAS[gs.dungeon.areaId];
    if (gs.dungeon.floor >= area.floors) {
      // Dungeon cleared!
      const p = { ...gs.player };
      p.dungeonClears[gs.dungeon.areaId] = (p.dungeonClears[gs.dungeon.areaId] ?? 0) + 1;
      setGs(g => ({
        ...g, player: p, dungeon: null, phase: 'victory',
        messages: [...g.messages, `🎉 ${area.name}クリア！`, '街に戻った！'],
      }));
    } else {
      const newDungeon = { ...gs.dungeon, floor: gs.dungeon.floor + 1, steps: 0 };
      setGs(g => ({
        ...g, dungeon: newDungeon,
        messages: [...g.messages, `第${newDungeon.floor}層に進んだ！`],
      }));
    }
  }

  function handleBattleAction(action: 'skill' | 'item' | 'flee') {
    if (!gs.battle || battlePhase !== 'player') return;
    const battle = { ...gs.battle, enemies: gs.battle.enemies.map(e => ({ ...e })) };
    let player = { ...gs.player, buffs: [...gs.player.buffs] };

    if (action === 'flee') {
      const { success, log } = tryFlee(player, battle.enemies);
      if (success) {
        addMessages(log);
        setGs(g => ({ ...g, phase: gs.dungeon ? 'dungeon' : 'town', battle: null }));
      } else {
        addMessages(log);
        doEnemyTurn(player, battle);
      }
      return;
    }

    if (action === 'skill') {
      const result = usePlayerSkill(selectedSkillId, player, battle.enemies, battle.combo, selectedTarget);
      const newLog = [...battle.log, ...result.log];
      addMessages(result.log);

      if (result.battleEnd && result.rewards) {
        setPendingRewards(result.rewards);
        setBattlePhase('result');
        setGs(g => ({
          ...g,
          battle: { ...battle, enemies: result.newEnemies, log: newLog, playerTurn: false },
          player: result.newPlayer,
        }));
        return;
      }

      player = result.newPlayer;
      if (player.hp <= 0) {
        addMessages(['💀 戦闘不能！ゲームオーバー...']);
        setGs(g => ({ ...g, player, phase: 'gameOver', battle: null }));
        return;
      }

      doEnemyTurn(result.newPlayer, { ...battle, enemies: result.newEnemies, combo: result.combo, log: newLog });
    }

    if (action === 'item') {
      if (!selectedItem) { addMessages(['アイテムを選択してください。']); return; }
      const { player: p2, log, success } = useItem(player, selectedItem.id);
      addMessages(log);
      if (!success) return;
      doEnemyTurn(p2, battle);
    }
  }

  function doEnemyTurn(player: Player, battle: import('@/lib/game/types').BattleState) {
    setBattlePhase('enemy');
    setTimeout(() => {
      const { newPlayer, newEnemies, log } = enemyTurn(player, battle.enemies);
      addMessages(log);

      if (newPlayer.hp <= 0) {
        addMessages(['💀 戦闘不能！ゲームオーバー...']);
        setGs(g => ({ ...g, player: newPlayer, phase: 'gameOver', battle: null }));
        setBattlePhase('player');
        return;
      }

      const newBattle = {
        ...battle,
        enemies: newEnemies,
        turn: battle.turn + 1,
        playerTurn: true,
        log: [...battle.log, ...log],
      };
      setGs(g => ({ ...g, player: newPlayer, battle: newBattle }));
      setBattlePhase('player');
    }, gs.settings.battleSpeed === 'fast' ? 300 : gs.settings.battleSpeed === 'slow' ? 1200 : 700);
  }

  function collectRewards() {
    if (!pendingRewards) return;
    const { player, log } = applyRewards(gs.player, pendingRewards);
    addMessages(log);
    const isBossFloor = gs.dungeon && gs.dungeon.floor === DUNGEON_AREAS[gs.dungeon.areaId].floors;
    setPendingRewards(null);
    setBattlePhase('player');

    if (isBossFloor && gs.dungeon) {
      const area = DUNGEON_AREAS[gs.dungeon.areaId];
      const p2 = { ...player };
      p2.dungeonClears[gs.dungeon.areaId] = (p2.dungeonClears[gs.dungeon.areaId] ?? 0) + 1;
      setGs(g => ({ ...g, player: p2, phase: 'victory', battle: null, dungeon: null, messages: [...g.messages, `🎉 ${area.name}クリア！`] }));
    } else {
      setGs(g => ({
        ...g, player,
        phase: gs.dungeon ? 'dungeon' : 'town',
        battle: null,
      }));
    }
  }

  function openShop() {
    const inventory = SHOP_STOCK_BY_LEVEL(gs.player.level);
    setGs(g => ({ ...g, phase: 'shop', shopInventory: inventory }));
  }

  function buyItem(item: Item) {
    if (gs.player.gold < item.value) { addMessages(['Gが足りません！']); return; }
    const p = { ...gs.player, inventory: [...gs.player.inventory], gold: gs.player.gold - item.value };
    import('@/lib/game/engine').then(({ addToInventory }) => {
      addToInventory(p, { ...item, quantity: 1 });
      setGs(g => ({ ...g, player: p }));
      addMessages([`${item.name}を${item.value}Gで購入した！`]);
    });
  }

  function sellItem(item: Item) {
    const sellPrice = Math.floor(item.value / 2);
    const p = { ...gs.player, inventory: [...gs.player.inventory], gold: gs.player.gold + sellPrice };
    import('@/lib/game/engine').then(({ removeFromInventory }) => {
      removeFromInventory(p, item.id);
      setGs(g => ({ ...g, player: p }));
      addMessages([`${item.name}を${sellPrice}Gで売却した！`]);
    });
  }

  function handleEquip(item: Item) {
    const { player, log } = equipItem(gs.player, item);
    setGs(g => ({ ...g, player }));
    addMessages(log);
  }

  function handleEnhance(slot: keyof Player['equipment']) {
    const { player, log } = enhanceEquipment(gs.player, slot);
    setGs(g => ({ ...g, player }));
    addMessages(log);
  }

  function handleCraft(recipeId: string) {
    const { player, log } = craftItem(gs.player, recipeId);
    setGs(g => ({ ...g, player }));
    addMessages(log);
  }

  function handleLearnSkill(skillId: string) {
    const { player, log, success } = learnSkill(gs.player, skillId);
    setGs(g => ({ ...g, player }));
    addMessages(log);
  }

  function handleAllocateStat(stat: keyof Stats) {
    const { player, log } = allocateStat(gs.player, stat);
    setGs(g => ({ ...g, player }));
    addMessages(log);
  }

  function handleRestHeal() {
    const p = { ...gs.player };
    const cost = Math.floor(p.maxHp * 0.1 + p.maxMp * 0.05);
    if (p.gold < cost) { addMessages([`休息には${cost}Gが必要です。`]); return; }
    p.hp = p.maxHp;
    p.mp = p.maxMp;
    p.status = 'none';
    p.statusTurns = 0;
    p.gold -= cost;
    setGs(g => ({ ...g, player: p }));
    addMessages([`宿屋で休息した。HP・MPが全快！（${cost}G）`]);
  }

  // ===== RENDER =====
  const p = gs.player;
  const job = JOB_DATA[p.job];

  // ===== TITLE SCREEN =====
  if (gs.phase === 'title') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-indigo-950 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">⚔️🏰✨</div>
          <h1 className="text-4xl font-bold text-yellow-400 drop-shadow-lg mb-2">深淵の英雄譚</h1>
          <p className="text-gray-400 text-sm">〜やり込み要素満載のシミュレーションRPG〜</p>
          <div className="mt-2 flex justify-center gap-4 text-xs text-gray-500">
            <span>6職業</span><span>•</span><span>50レベル</span><span>•</span>
            <span>5ダンジョン</span><span>•</span><span>30+実績</span>
          </div>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => setPhase('charCreate')}
            className="py-3 px-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-lg text-lg transition-all">
            ⚔️ 新しいゲーム
          </button>
          {hasSave() && (
            <button onClick={handleLoadGame}
              className="py-3 px-6 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white font-bold rounded-lg text-lg transition-all">
              💾 続きから
            </button>
          )}
        </div>
        <div className="mt-8 text-xs text-gray-600">
          攻略のヒント: 弱点属性を突いてコンボを稼ごう！
        </div>
      </div>
    );
  }

  // ===== CHARACTER CREATION =====
  if (gs.phase === 'charCreate') {
    const preview = JOB_DATA[selectedJob];
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-indigo-950 p-4">
        <h2 className="text-2xl font-bold text-yellow-400 text-center mb-4">キャラクター作成</h2>
        <div className="max-w-lg mx-auto space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">名前</label>
            <input value={inputName} onChange={e => setInputName(e.target.value)} maxLength={12}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-yellow-500"
              placeholder="勇者の名前を入力" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">職業を選択</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(JOB_DATA) as JobClass[]).map(j => {
                const jd = JOB_DATA[j];
                return (
                  <button key={j} onClick={() => setSelectedJob(j)}
                    className={`p-3 rounded-lg border text-left transition-all
                      ${selectedJob === j ? 'border-yellow-500 bg-yellow-950' : 'border-gray-700 bg-gray-900 hover:border-gray-500'}`}>
                    <div className={`text-xl ${jd.color}`}>{jd.emoji} <span className="text-base font-bold">{jd.name}</span></div>
                    <div className="text-xs text-gray-400 mt-1">{jd.description}</div>
                  </button>
                );
              })}
            </div>
          </div>
          {/* Preview stats */}
          <div className="bg-gray-900 border border-gray-700 rounded p-3">
            <h3 className="text-yellow-400 text-sm font-bold mb-2">{preview.emoji} {preview.name} の基本能力</h3>
            <div className="grid grid-cols-3 gap-1 text-xs">
              {Object.entries(preview.baseStats).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-gray-400 uppercase">{k}</span>
                  <span className="text-white font-bold">{v}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-400">
              <span>HP: {preview.hpBase}</span> | <span>MP: {preview.mpBase}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPhase('title')}
              className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-all">
              戻る
            </button>
            <button onClick={handleNewGame}
              className="flex-1 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-lg transition-all">
              冒険開始！
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== VICTORY SCREEN =====
  if (gs.phase === 'victory') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-yellow-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-yellow-400 mb-2">ダンジョン攻略！</h1>
        <p className="text-gray-300 mb-6">素晴らしい戦いだった！</p>
        <div className="bg-gray-900 rounded-lg p-4 mb-6 w-full max-w-sm">
          <p className="text-gray-400 text-sm">Lv.{p.level} {job.name} {p.name}</p>
          <p className="text-yellow-300">所持金: {p.gold}G</p>
          <p className="text-blue-300">実績: {p.achievements.length}/{ACHIEVEMENTS.length}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setPhase('town')}
            className="py-2 px-6 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg">
            街に戻る
          </button>
        </div>
      </div>
    );
  }

  // ===== GAME OVER =====
  if (gs.phase === 'gameOver') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-red-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">💀</div>
        <h1 className="text-3xl font-bold text-red-400 mb-2">ゲームオーバー</h1>
        <p className="text-gray-300 mb-6">{p.name}は倒れた...</p>
        <div className="flex gap-3">
          <button onClick={() => setPhase('title')}
            className="py-2 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            タイトルへ
          </button>
          {hasSave() && (
            <button onClick={handleLoadGame}
              className="py-2 px-6 bg-blue-700 hover:bg-blue-600 text-white rounded-lg">
              ロードする
            </button>
          )}
        </div>
      </div>
    );
  }

  // ===== BATTLE SCREEN =====
  if (gs.phase === 'battle' && gs.battle) {
    const battle = gs.battle;
    const aliveEnemies = battle.enemies.filter(e => e.hp > 0);
    const playerSkills = p.learnedSkills.map(sid => SKILLS[sid]).filter(Boolean) as Skill[];

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-red-950 p-3 flex flex-col gap-3">
        {/* Achievement popup */}
        {newAchievements.length > 0 && (
          <div className="fixed top-4 right-4 z-50 bg-yellow-900 border border-yellow-500 rounded-lg p-3 max-w-xs">
            {newAchievements.map(n => <div key={n} className="text-yellow-300 text-sm">🏆 実績解除: {n}</div>)}
          </div>
        )}

        {/* Enemy area */}
        <div className="flex gap-2 flex-wrap justify-center">
          {battle.enemies.map((enemy, i) => (
            <div key={i}
              onClick={() => { if (enemy.hp > 0) setSelectedTarget(i); }}
              className={`p-3 rounded-lg border cursor-pointer transition-all flex-1 min-w-32 max-w-48
                ${selectedTarget === i && enemy.hp > 0 ? 'border-red-400 bg-red-950' : 'border-gray-700 bg-gray-900'}
                ${enemy.hp <= 0 ? 'opacity-30' : 'hover:border-red-500'}`}>
              <div className="text-3xl text-center mb-1">{enemy.sprite}</div>
              <div className={`text-sm font-bold text-center ${enemy.isBoss ? 'text-yellow-400' : 'text-white'}`}>
                {enemy.name}{enemy.isBoss ? ' 👑' : ''}
              </div>
              <StatBar label="HP" value={enemy.hp} max={enemy.maxHp} color="bg-red-500" />
              {enemy.status !== 'none' && (
                <div className="text-xs text-center text-purple-400 mt-1">
                  {enemy.status === 'poison' ? '🟣毒' : enemy.status === 'burn' ? '🔥燃焼' :
                    enemy.status === 'paralysis' ? '⚡麻痺' : enemy.status === 'sleep' ? '💤眠り' :
                      enemy.status === 'confusion' ? '🌀混乱' : '😵暗闇'}
                </div>
              )}
              <div className="text-xs text-center text-gray-500 mt-1">Lv.{enemy.level}</div>
            </div>
          ))}
        </div>

        {/* Player status */}
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
          <div className="flex justify-between items-center mb-2">
            <span className={`font-bold ${job.color}`}>{job.emoji} {p.name}</span>
            <div className="flex gap-2 text-xs">
              {p.buffs.length > 0 && <span className="text-green-400">🔼バフ×{p.buffs.length}</span>}
              {p.status !== 'none' && <span className="text-purple-400">⚠️{p.status}</span>}
              <span className="text-yellow-400">💥コンボ×{battle.combo}</span>
            </div>
          </div>
          <StatBar label="HP" value={p.hp} max={p.maxHp} color={p.hp / p.maxHp < 0.3 ? 'bg-red-500' : 'bg-green-500'} />
          <StatBar label="MP" value={p.mp} max={p.maxMp} color="bg-blue-500" />
        </div>

        {/* Battle log */}
        <MessageLog messages={gs.messages} />

        {/* Battle actions */}
        {battlePhase === 'result' && pendingRewards ? (
          <div className="bg-gray-900 border border-yellow-700 rounded-lg p-4 text-center">
            <div className="text-yellow-400 font-bold text-lg mb-2">🎊 勝利！</div>
            <div className="text-gray-300 text-sm mb-1">EXP +{pendingRewards.exp} / Gold +{pendingRewards.gold}G</div>
            {pendingRewards.items.map((item, i) => (
              <div key={i} className={`text-sm ${RARITY_COLOR[item.rarity]}`}>📦 {item.name} を入手！</div>
            ))}
            <button onClick={collectRewards}
              className="mt-3 px-6 py-2 bg-yellow-600 hover:bg-yellow-500 text-black font-bold rounded-lg w-full">
              続ける
            </button>
          </div>
        ) : battlePhase === 'enemy' ? (
          <div className="bg-gray-900 border border-red-800 rounded-lg p-4 text-center text-gray-400">
            敵のターン...
          </div>
        ) : (
          <div className="space-y-2">
            {/* Skill selection */}
            <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto">
              {playerSkills.map(sk => (
                <button key={sk.id} onClick={() => setSelectedSkillId(sk.id)}
                  disabled={p.mp < sk.mpCost}
                  className={`p-2 rounded text-xs text-left border transition-all
                    ${selectedSkillId === sk.id ? 'border-yellow-500 bg-yellow-950' : 'border-gray-700 bg-gray-900'}
                    ${p.mp < sk.mpCost ? 'opacity-40 cursor-not-allowed' : 'hover:border-gray-500'}`}>
                  <div className="font-semibold truncate">{sk.name}</div>
                  <div className={`text-xs ${ELEMENT_COLOR[sk.element]}`}>
                    {sk.element !== 'none' ? sk.element : sk.type} | MP:{sk.mpCost}
                  </div>
                </button>
              ))}
            </div>
            {/* Action buttons */}
            <div className="grid grid-cols-4 gap-2">
              <button onClick={() => handleBattleAction('skill')}
                className="col-span-2 py-2 bg-red-700 hover:bg-red-600 text-white font-bold rounded-lg">
                ⚔️ スキル使用
              </button>
              <button onClick={() => {
                const pot = p.inventory.find(i => i.type === 'consumable');
                if (pot) { setSelectedItem(pot); handleBattleAction('item'); }
                else addMessages(['使えるアイテムがありません。']);
              }}
                className="py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg">
                🧪 アイテム
              </button>
              <button onClick={() => handleBattleAction('flee')}
                className="py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg">
                🏃 逃げる
              </button>
            </div>
            {/* Item quick select */}
            {p.inventory.filter(i => i.type === 'consumable').length > 0 && (
              <div className="flex gap-1 overflow-x-auto">
                {p.inventory.filter(i => i.type === 'consumable').slice(0, 6).map((item, i) => (
                  <button key={i} onClick={() => setSelectedItem(item)}
                    className={`flex-shrink-0 px-2 py-1 text-xs rounded border transition-all
                      ${selectedItem?.id === item.id ? 'border-green-500 bg-green-950' : 'border-gray-700 bg-gray-900'}`}>
                    {item.name} ×{item.quantity ?? 1}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ===== DUNGEON EXPLORATION =====
  if (gs.phase === 'dungeon' && gs.dungeon) {
    const area = DUNGEON_AREAS[gs.dungeon.areaId];
    const isBossFloor = gs.dungeon.floor === area.floors;

    return (
      <div className={`min-h-screen bg-gradient-to-b ${area.bgColor} p-3 flex flex-col gap-3`}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-yellow-400 font-bold">{area.name}</h2>
            <p className="text-gray-400 text-xs">第{gs.dungeon.floor}層 / {area.floors}層{isBossFloor ? ' ⚠️ボスフロア！' : ''}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-300 text-sm">{job.emoji} Lv.{p.level} {p.name}</p>
            <p className={`text-xs ${p.hp / p.maxHp < 0.3 ? 'text-red-400' : 'text-green-400'}`}>HP: {p.hp}/{p.maxHp}</p>
          </div>
        </div>

        {/* HP/MP quick display */}
        <div className="bg-black bg-opacity-40 rounded p-2 space-y-1">
          <StatBar label="HP" value={p.hp} max={p.maxHp} color={p.hp / p.maxHp < 0.3 ? 'bg-red-500' : 'bg-green-500'} />
          <StatBar label="MP" value={p.mp} max={p.maxMp} color="bg-blue-500" />
          {p.status !== 'none' && <p className="text-purple-400 text-xs">状態異常: {p.status}</p>}
        </div>

        {/* Message log */}
        <MessageLog messages={gs.messages} />

        {/* Actions */}
        <div className="space-y-2">
          <button onClick={moveForward}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-yellow-500 text-white font-bold rounded-lg transition-all">
            {isBossFloor ? '⚠️ ボスに挑む！' : '▶ 前に進む'}
          </button>

          {gs.dungeon.floor > 1 && (
            <button onClick={() => {
              setGs(g => ({
                ...g,
                dungeon: { ...g.dungeon!, floor: g.dungeon!.floor - 1, steps: 0 },
                messages: [...g.messages, '一つ上の階に戻った。'],
              }));
            }}
              className="w-full py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-300 rounded-lg text-sm">
              ▲ 前の階へ戻る
            </button>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => { setPrevPhase('dungeon'); setActiveTab('inventory'); setPhase('inventory'); }}
              className="py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white text-sm rounded-lg">
              🎒 アイテム
            </button>
            <button onClick={() => { saveGame(gs); setPhase('town'); }}
              className="py-2 bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 text-sm rounded-lg">
              🏠 撤退
            </button>
          </div>
        </div>

        {/* Quick item use */}
        {p.inventory.filter(i => i.type === 'consumable').length > 0 && (
          <div>
            <p className="text-xs text-gray-500 mb-1">クイックアイテム</p>
            <div className="flex gap-1 overflow-x-auto">
              {p.inventory.filter(i => i.type === 'consumable').slice(0, 5).map((item, i) => (
                <button key={i} onClick={() => {
                  const { player, log } = useItem(gs.player, item.id);
                  if (log.some(l => !l.includes('使用できない'))) {
                    setGs(g => ({ ...g, player }));
                    addMessages(log);
                  }
                }}
                  className="flex-shrink-0 px-2 py-1 text-xs bg-gray-900 border border-gray-700 rounded hover:border-green-500">
                  {item.name}×{item.quantity ?? 1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===== SHOP =====
  if (gs.phase === 'shop') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-amber-950 p-3 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-yellow-400 font-bold text-xl">🏪 街の商店</h2>
          <span className="text-yellow-300 font-bold">💰 {p.gold}G</span>
        </div>

        <div className="flex gap-1">
          {(['buy', 'sell', 'craft'] as const).map(tab => (
            <button key={tab} onClick={() => setShopTab(tab)}
              className={`flex-1 py-1 text-sm rounded border transition-all
                ${shopTab === tab ? 'border-yellow-500 bg-yellow-950 text-yellow-400' : 'border-gray-700 bg-gray-900 text-gray-400'}`}>
              {tab === 'buy' ? '購入' : tab === 'sell' ? '売却' : '錬金'}
            </button>
          ))}
        </div>

        {shopTab === 'buy' && (
          <div className="flex-1 overflow-y-auto space-y-2">
            {gs.shopInventory.map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-900 border border-gray-700 rounded-lg">
                <div className="text-xl">{getItemEmoji(item)}</div>
                <div className="flex-1">
                  <div className={`text-sm font-semibold ${RARITY_COLOR[item.rarity]}`}>{item.name}</div>
                  <div className="text-xs text-gray-400">{item.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 text-sm">{item.value}G</div>
                  <button onClick={() => buyItem(item)}
                    disabled={p.gold < item.value}
                    className="text-xs bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white px-2 py-0.5 rounded">
                    購入
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {shopTab === 'sell' && (
          <div className="flex-1 overflow-y-auto space-y-2">
            {p.inventory.filter(i => i.type !== 'key').map((item, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-900 border border-gray-700 rounded-lg">
                <div className="text-xl">{getItemEmoji(item)}</div>
                <div className="flex-1">
                  <div className={`text-sm ${RARITY_COLOR[item.rarity]}`}>{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-yellow-400 text-sm">{Math.floor(item.value / 2)}G</div>
                  <button onClick={() => sellItem(item)}
                    className="text-xs bg-red-800 hover:bg-red-700 text-white px-2 py-0.5 rounded">
                    売却
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {shopTab === 'craft' && (
          <div className="flex-1 overflow-y-auto space-y-3">
            {gs.craftRecipes.map(recipe => {
              const canCraft = recipe.materials.every(m => {
                const inv = p.inventory.find(i => i.id === m.itemId);
                return inv && (inv.quantity ?? 1) >= m.quantity;
              });
              return (
                <div key={recipe.id} className={`p-3 rounded-lg border ${canCraft ? 'border-green-700 bg-green-950' : 'border-gray-700 bg-gray-900'}`}>
                  <div className="font-semibold text-white text-sm">{recipe.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{recipe.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {recipe.materials.map(m => {
                      const inv = p.inventory.find(i => i.id === m.itemId);
                      const have = inv?.quantity ?? 0;
                      return (
                        <span key={m.itemId} className={`text-xs px-1 rounded ${have >= m.quantity ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {ITEMS[m.itemId]?.name ?? m.itemId} {have}/{m.quantity}
                        </span>
                      );
                    })}
                  </div>
                  <button onClick={() => handleCraft(recipe.id)} disabled={!canCraft}
                    className="mt-2 w-full text-xs py-1 bg-yellow-700 hover:bg-yellow-600 disabled:opacity-40 text-white rounded">
                    作成する
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <MessageLog messages={gs.messages} />
        <button onClick={() => setPhase('town')} className="py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          ← 街に戻る
        </button>
      </div>
    );
  }

  // ===== SKILL TREE =====
  if (gs.phase === 'skillTree') {
    const availableToLearn = getAvailableSkillsToLearn(p);
    const learnedSkills = p.learnedSkills.map(sid => SKILLS[sid]).filter(Boolean) as Skill[];

    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-purple-950 p-3 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-purple-400 font-bold text-xl">📚 スキルツリー</h2>
          <span className="text-purple-300">スキルPT: {p.skillPoints}</span>
        </div>

        <div>
          <h3 className="text-gray-400 text-sm mb-2">習得済みスキル</h3>
          <div className="grid grid-cols-2 gap-2">
            {learnedSkills.map(sk => (
              <div key={sk.id} className="p-2 bg-gray-900 border border-purple-800 rounded text-xs">
                <div className={`font-bold ${ELEMENT_COLOR[sk.element]}`}>{sk.name}</div>
                <div className="text-gray-400">{sk.description}</div>
                <div className="text-gray-500">MP: {sk.mpCost} | {sk.type}</div>
              </div>
            ))}
          </div>
        </div>

        {availableToLearn.length > 0 && (
          <div>
            <h3 className="text-gray-400 text-sm mb-2">習得可能なスキル</h3>
            <div className="space-y-2">
              {availableToLearn.map(sk => (
                <div key={sk.id} className="p-3 bg-gray-900 border border-gray-600 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className={`font-bold text-sm ${ELEMENT_COLOR[sk.element]}`}>{sk.name}</div>
                      <div className="text-xs text-gray-400">{sk.description}</div>
                      <div className="text-xs text-gray-500">MP: {sk.mpCost} | Lv.{sk.learnLevel}〜</div>
                    </div>
                    <button onClick={() => handleLearnSkill(sk.id)}
                      disabled={p.skillPoints <= 0}
                      className="ml-2 px-3 py-1 bg-purple-700 hover:bg-purple-600 disabled:opacity-40 text-white text-xs rounded">
                      習得
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <MessageLog messages={gs.messages} />
        <button onClick={() => setPhase('town')} className="py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          ← 街に戻る
        </button>
      </div>
    );
  }

  // ===== ACHIEVEMENTS =====
  if (gs.phase === 'achievements') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-yellow-950 p-3 flex flex-col gap-3">
        <h2 className="text-yellow-400 font-bold text-xl text-center">🏆 実績一覧</h2>
        <p className="text-center text-gray-400 text-sm">{p.achievements.length} / {ACHIEVEMENTS.length} 解除</p>
        <div className="flex-1 overflow-y-auto space-y-2">
          {ACHIEVEMENTS.map(ach => {
            const unlocked = p.achievements.includes(ach.id);
            return (
              <div key={ach.id} className={`p-3 rounded-lg border ${unlocked ? 'border-yellow-600 bg-yellow-950' : 'border-gray-700 bg-gray-900 opacity-60'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl">{unlocked ? ach.icon : '🔒'}</span>
                  <div>
                    <div className={`font-bold text-sm ${unlocked ? 'text-yellow-400' : 'text-gray-500'}`}>{ach.name}</div>
                    <div className="text-xs text-gray-400">{ach.description}</div>
                    {ach.reward && (
                      <div className="text-xs text-green-400">
                        報酬: {ach.reward.gold ? `${ach.reward.gold}G` : ''}{ach.reward.stat ? 'ステータスUP' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={() => setPhase('town')} className="py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          ← 街に戻る
        </button>
      </div>
    );
  }

  // ===== INVENTORY / EQUIP MENU =====
  if (gs.phase === 'inventory' || gs.phase === 'equipMenu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-3 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-bold text-lg">🎒 装備・アイテム</h2>
          <span className="text-yellow-400">{p.gold}G</span>
        </div>

        <div className="flex gap-1">
          {(['status', 'skills', 'inventory', 'equip'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1 text-xs rounded border transition-all
                ${activeTab === tab ? 'border-yellow-500 bg-yellow-950 text-yellow-400' : 'border-gray-700 bg-gray-900 text-gray-400'}`}>
              {tab === 'status' ? 'ステータス' : tab === 'skills' ? 'スキル' : tab === 'inventory' ? 'バッグ' : '装備強化'}
            </button>
          ))}
        </div>

        {activeTab === 'status' && (
          <div className="space-y-3">
            <div className="bg-gray-900 border border-gray-700 rounded p-3">
              <div className={`text-lg font-bold ${job.color}`}>{job.emoji} {p.name}</div>
              <div className="text-gray-400 text-sm">{job.name} / Lv.{p.level}</div>
              <div className="text-xs text-gray-500">EXP: {p.exp}/{p.nextExp}</div>
            </div>
            <StatBar label="HP" value={p.hp} max={p.maxHp} color="bg-green-500" />
            <StatBar label="MP" value={p.mp} max={p.maxMp} color="bg-blue-500" />
            <div className="bg-gray-900 border border-gray-700 rounded p-3">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400 text-sm">ステータス</span>
                {p.statPoints > 0 && <span className="text-yellow-400 text-xs">割振り可能: {p.statPoints}PT</span>}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {(Object.entries(p.stats) as [keyof Stats, number][]).map(([stat, val]) => (
                  <div key={stat} className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs uppercase">{stat}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-white text-sm font-bold">{val}</span>
                      {p.statPoints > 0 && (
                        <button onClick={() => handleAllocateStat(stat)}
                          className="text-xs text-yellow-400 hover:text-yellow-300 bg-yellow-900 rounded px-1">+</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-400">
              <div className="grid grid-cols-2 gap-1">
                <span>総撃破数: <span className="text-white">{p.totalKills}</span></span>
                <span>総戦闘数: <span className="text-white">{p.totalBattles}</span></span>
                <span>稼得金額: <span className="text-yellow-400">{p.totalGoldEarned}G</span></span>
                <span>実績: <span className="text-yellow-400">{p.achievements.length}/{ACHIEVEMENTS.length}</span></span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'skills' && (
          <div className="space-y-2 overflow-y-auto">
            {p.learnedSkills.map(sid => {
              const sk = SKILLS[sid];
              if (!sk) return null;
              return (
                <div key={sid} className="p-2 bg-gray-900 border border-gray-700 rounded">
                  <div className={`font-bold text-sm ${ELEMENT_COLOR[sk.element]}`}>{sk.name}</div>
                  <div className="text-xs text-gray-400">{sk.description}</div>
                  <div className="text-xs text-gray-500">MP: {sk.mpCost} | 種類: {sk.type}</div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="grid grid-cols-2 gap-2 overflow-y-auto">
            {p.inventory.length === 0 && <p className="text-gray-500 text-sm col-span-2 text-center">アイテムがありません</p>}
            {p.inventory.map((item, i) => (
              <ItemCard key={i} item={item}
                showEquipBtn={['weapon', 'armor_body', 'armor_head', 'armor_hand', 'armor_leg', 'accessory'].includes(item.type)}
                onEquip={() => handleEquip(item)}
                onClick={() => {
                  if (item.type === 'consumable') {
                    const { player, log } = useItem(gs.player, item.id);
                    setGs(g => ({ ...g, player }));
                    addMessages(log);
                  }
                }}
              />
            ))}
          </div>
        )}

        {activeTab === 'equip' && (
          <div className="space-y-2 overflow-y-auto">
            <p className="text-xs text-gray-500">装備をタップして強化できます</p>
            {(Object.entries(p.equipment) as [keyof Player['equipment'], Item | null][]).map(([slot, item]) => {
              const slotNames: Record<string, string> = {
                weapon: '武器', body: '防具(胴)', head: '防具(頭)', hand: '防具(手)',
                leg: '防具(足)', accessory1: 'アクセ1', accessory2: 'アクセ2',
              };
              const enhCost = item ? Math.floor(100 * Math.pow(2, item.enhancement ?? 0)) : 0;
              const matNeeded = item ? ((item.enhancement ?? 0) < 5 ? 'ironOre' : (item.enhancement ?? 0) < 10 ? 'silverOre' : 'mythrilOre') : '';
              const matCount = item ? Math.ceil((item.enhancement ?? 0) / 3) + 1 : 0;
              return (
                <div key={slot} className="p-3 bg-gray-900 border border-gray-700 rounded-lg">
                  <div className="text-xs text-gray-500 mb-1">{slotNames[slot] ?? slot}</div>
                  {item ? (
                    <div>
                      <div className={`font-semibold text-sm ${RARITY_COLOR[item.rarity]}`}>
                        {item.name} {(item.enhancement ?? 0) > 0 ? `+${item.enhancement}` : ''}
                      </div>
                      {item.attackPower && <div className="text-xs text-orange-400">攻撃力: {item.attackPower}</div>}
                      {item.magicPower && <div className="text-xs text-blue-400">魔法力: {item.magicPower}</div>}
                      {item.defense && <div className="text-xs text-green-400">防御力: {item.defense}</div>}
                      {item.stats && (
                        <div className="text-xs text-gray-400">
                          {Object.entries(item.stats).map(([k, v]) => `${k.toUpperCase()}+${v}`).join(', ')}
                        </div>
                      )}
                      {(item.enhancement ?? 0) < 15 && (
                        <button onClick={() => handleEnhance(slot)}
                          className="mt-2 w-full text-xs py-1 bg-orange-800 hover:bg-orange-700 text-white rounded">
                          強化 (+{(item.enhancement ?? 0) + 1}) | {enhCost}G + {ITEMS[matNeeded]?.name ?? ''}×{matCount}
                          | 成功率{Math.max(30, 95 - (item.enhancement ?? 0) * 5)}%
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-600 text-xs">— 未装備 —</div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <MessageLog messages={gs.messages} />
        <button onClick={() => setPhase(prevPhase === 'dungeon' && gs.dungeon ? 'dungeon' : 'town')}
          className="py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          ← 戻る
        </button>
      </div>
    );
  }

  // ===== TOWN (MAIN HUB) =====
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-indigo-950 p-3 flex flex-col gap-3">
      {/* Achievement notification */}
      {newAchievements.length > 0 && (
        <div className="fixed top-4 right-4 z-50 bg-yellow-900 border border-yellow-500 rounded-lg p-3">
          {newAchievements.map(n => <div key={n} className="text-yellow-300 text-sm">🏆 実績解除: {n}！</div>)}
        </div>
      )}

      {/* Player HUD */}
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
        <div className="flex justify-between items-start mb-2">
          <div>
            <div className={`text-lg font-bold ${job.color}`}>{job.emoji} {p.name}</div>
            <div className="text-gray-400 text-sm">{job.name} Lv.{p.level}</div>
          </div>
          <div className="text-right">
            <div className="text-yellow-400 font-bold">💰 {p.gold}G</div>
            <div className="text-xs text-gray-400">EXP: {p.exp}/{p.nextExp}</div>
          </div>
        </div>
        <StatBar label="HP" value={p.hp} max={p.maxHp} color={p.hp / p.maxHp < 0.3 ? 'bg-red-500' : 'bg-green-500'} />
        <StatBar label="MP" value={p.mp} max={p.maxMp} color="bg-blue-500" />
        {p.statPoints > 0 && <p className="text-yellow-400 text-xs mt-1">⭐ スタポイント{p.statPoints}PT未割振り</p>}
        {p.skillPoints > 0 && <p className="text-purple-400 text-xs">📚 スキルポイント{p.skillPoints}PT未使用</p>}
      </div>

      {/* Message log */}
      <MessageLog messages={gs.messages} />

      {/* Dungeon Selection */}
      <div>
        <h3 className="text-gray-400 text-sm mb-2">⚔️ ダンジョン</h3>
        <div className="grid grid-cols-1 gap-2">
          {Object.values(DUNGEON_AREAS).map(area => {
            const clears = p.dungeonClears[area.id] ?? 0;
            const locked = p.level < area.minLevel;
            return (
              <button key={area.id} onClick={() => enterDungeon(area.id)} disabled={locked}
                className={`p-3 rounded-lg border text-left transition-all
                  ${locked ? 'border-gray-800 bg-gray-950 opacity-50 cursor-not-allowed' : `bg-gradient-to-r ${area.bgColor} bg-opacity-50 border-gray-600 hover:border-yellow-500`}`}>
                <div className="flex justify-between">
                  <span className="font-bold text-white text-sm">{area.name}</span>
                  <span className="text-xs text-gray-400">
                    {locked ? `🔒 Lv.${area.minLevel}〜` : clears > 0 ? `✅ ×${clears}` : '未攻略'}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{area.description}</div>
                <div className="text-xs text-gray-500">{area.floors}層 | 推奨Lv.{area.minLevel}〜</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Town actions */}
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => { setPrevPhase('town'); setActiveTab('status'); setPhase('inventory'); }}
          className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 text-white rounded-lg text-sm">
          👤 ステータス
        </button>
        <button onClick={() => setPhase('skillTree')}
          className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 text-white rounded-lg text-sm">
          📚 スキルツリー
        </button>
        <button onClick={openShop}
          className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-yellow-500 text-white rounded-lg text-sm">
          🏪 ショップ
        </button>
        <button onClick={handleRestHeal}
          className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-green-500 text-white rounded-lg text-sm">
          🏨 宿屋 ({Math.floor(p.maxHp * 0.1 + p.maxMp * 0.05)}G)
        </button>
        <button onClick={() => setPhase('achievements')}
          className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-yellow-400 text-white rounded-lg text-sm">
          🏆 実績
        </button>
        <button onClick={() => { saveGame(gs); addMessages(['ゲームをセーブしました。']); }}
          className="py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-400 text-gray-300 rounded-lg text-sm">
          💾 セーブ
        </button>
      </div>
    </div>
  );
}

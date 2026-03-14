"use client";
import { useState, useCallback, useEffect } from "react";

// ============================================================
// DATA
// ============================================================

type SquareType = "go" | "property" | "chance" | "tax" | "jail" | "free" | "goto_jail" | "station" | "utility";
type ColorGroup = "purple" | "lightblue" | "pink" | "orange" | "red" | "yellow" | "green" | "darkblue" | null;

interface Square {
  id: number;
  name: string;
  emoji: string;
  type: SquareType;
  color?: ColorGroup;
  price?: number;
  rent?: number[];   // rent[0]=base, rent[1]=1house ... rent[5]=hotel
  mortgageValue?: number;
}

const SQUARES: Square[] = [
  { id: 0,  name: "出発！",           emoji: "🚀", type: "go" },
  { id: 1,  name: "おばあちゃんの縁側",  emoji: "👘", type: "property", color: "purple",   price: 60,  rent: [2,10,30,90,160,250] },
  { id: 2,  name: "コミュニティチェスト", emoji: "📦", type: "chance" },
  { id: 3,  name: "駄菓子屋のくじ",      emoji: "🍬", type: "property", color: "purple",   price: 60,  rent: [4,20,60,180,320,450] },
  { id: 4,  name: "消費税10%",          emoji: "🧾", type: "tax" },
  { id: 5,  name: "最寄り駅",           emoji: "🚉", type: "station",   price: 200, rent: [25,50,100,200] },
  { id: 6,  name: "コンビニのトイレ",    emoji: "🚽", type: "property", color: "lightblue", price: 100, rent: [6,30,90,270,400,550] },
  { id: 7,  name: "チャンス！",          emoji: "🎰", type: "chance" },
  { id: 8,  name: "公衆浴場",           emoji: "♨️",  type: "property", color: "lightblue", price: 100, rent: [6,30,90,270,400,550] },
  { id: 9,  name: "迷い猫のナワバリ",    emoji: "🐱", type: "property", color: "lightblue", price: 120, rent: [8,40,100,300,450,600] },
  { id: 10, name: "留置所見学",          emoji: "🚔", type: "jail" },
  { id: 11, name: "商店街の肉屋",        emoji: "🥩", type: "property", color: "pink",      price: 140, rent: [10,50,150,450,625,750] },
  { id: 12, name: "電気代（また値上がり）",emoji: "💡", type: "utility",  price: 150, rent: [4,10] },
  { id: 13, name: "商店街の福引き",      emoji: "🎁", type: "property", color: "pink",      price: 140, rent: [10,50,150,450,625,750] },
  { id: 14, name: "公民館カラオケ",      emoji: "🎤", type: "property", color: "pink",      price: 160, rent: [12,60,180,500,700,900] },
  { id: 15, name: "急行！特急！新幹線！", emoji: "🚅", type: "station",  price: 200, rent: [25,50,100,200] },
  { id: 16, name: "怪しいラーメン屋",    emoji: "🍜", type: "property", color: "orange",    price: 180, rent: [14,70,200,550,750,950] },
  { id: 17, name: "コミュニティチェスト", emoji: "📦", type: "chance" },
  { id: 18, name: "立ち食いそば屋",      emoji: "🍱", type: "property", color: "orange",    price: 180, rent: [14,70,200,550,750,950] },
  { id: 19, name: "深夜の屋台",          emoji: "🏮", type: "property", color: "orange",    price: 200, rent: [16,80,220,600,800,1000] },
  { id: 20, name: "無料駐車場",          emoji: "🅿️",  type: "free" },
  { id: 21, name: "秘伝のたれの焼き鳥",  emoji: "🍡", type: "property", color: "red",       price: 220, rent: [18,90,250,700,875,1050] },
  { id: 22, name: "チャンス！",          emoji: "🎰", type: "chance" },
  { id: 23, name: "地元の祭り",          emoji: "🎆", type: "property", color: "red",       price: 220, rent: [18,90,250,700,875,1050] },
  { id: 24, name: "温泉旅館",            emoji: "🛁", type: "property", color: "red",       price: 240, rent: [20,100,300,750,925,1100] },
  { id: 25, name: "幻の終着駅",          emoji: "🚂", type: "station",  price: 200, rent: [25,50,100,200] },
  { id: 26, name: "高級スーパー銭湯",    emoji: "🧖", type: "property", color: "yellow",    price: 260, rent: [22,110,330,800,975,1150] },
  { id: 27, name: "うわさのガチャ台",    emoji: "🎮", type: "property", color: "yellow",    price: 260, rent: [22,110,330,800,975,1150] },
  { id: 28, name: "水道代（詰まり込み）", emoji: "🚿", type: "utility",  price: 150, rent: [4,10] },
  { id: 29, name: "デパ地下スイーツ街",  emoji: "🎂", type: "property", color: "yellow",    price: 280, rent: [24,120,360,850,1025,1200] },
  { id: 30, name: "強制送還！",          emoji: "👮", type: "goto_jail" },
  { id: 31, name: "高級焼肉食べ放題",    emoji: "🥓", type: "property", color: "green",     price: 300, rent: [26,130,390,900,1100,1275] },
  { id: 32, name: "老舗和菓子屋",        emoji: "🍡", type: "property", color: "green",     price: 300, rent: [26,130,390,900,1100,1275] },
  { id: 33, name: "コミュニティチェスト", emoji: "📦", type: "chance" },
  { id: 34, name: "懐石料理の名店",      emoji: "🍣", type: "property", color: "green",     price: 320, rent: [28,150,450,1000,1200,1400] },
  { id: 35, name: "特急リゾート号",      emoji: "🚄", type: "station",  price: 200, rent: [25,50,100,200] },
  { id: 36, name: "チャンス！",          emoji: "🎰", type: "chance" },
  { id: 37, name: "東京の高級タワマン",   emoji: "🏙️", type: "property", color: "darkblue",  price: 350, rent: [35,175,500,1100,1300,1500] },
  { id: 38, name: "超高額固定資産税",    emoji: "📑", type: "tax" },
  { id: 39, name: "宇宙ステーション別荘", emoji: "🛸", type: "property", color: "darkblue",  price: 400, rent: [50,200,600,1400,1700,2000] },
];

const CHANCE_CARDS = [
  { text: "💸 お年玉を受け取った！¥200ゲット！", money: 200 },
  { text: "🐕 散歩中の犬に財布をとられた！¥150失う", money: -150 },
  { text: "🎊 誕生日おめでとう！全プレイヤーから¥50もらう", money: 50, fromAll: true },
  { text: "🚑 謎の食あたりで入院。¥100医療費", money: -100 },
  { text: "🏆 なぞなぞ大会優勝！¥150ゲット！", money: 150 },
  { text: "📱 スマホを水没させた。修理代¥120失う", money: -120 },
  { text: "🍀 道端で¥500玉を拾った！（でも後ろめたい）", money: 500 },
  { text: "🔥 天ぷら油が爆発！キッチンリフォーム代¥200失う", money: -200 },
  { text: "🎁 神様から贈り物！¥300ゲット！", money: 300 },
  { text: "😴 昼寝しすぎて仕事遅刻。罰金¥80失う", money: -80 },
  { text: "🐟 釣り大会でマグロ一本釣り！¥250ゲット！", money: 250 },
  { text: "📦 Amazonで誤爆ポチり。¥170失う", money: -170 },
  { text: "🎵 路上ライブで話題に！投げ銭¥100ゲット！", money: 100 },
  { text: "🦟 夏の蚊に100箇所刺される。痒み代¥0（でも心が折れた）", money: 0, goToJail: false, message: "心は折れたが財布は無事" },
  { text: "🚀 スタートへGO！¥200受け取る！", money: 200, goToStart: true },
  { text: "👮 無賃乗車がバレた！留置所へ直行！", money: 0, goToJail: true },
];

const COLOR_STYLES: Record<string, string> = {
  purple:   "bg-purple-500",
  lightblue:"bg-sky-400",
  pink:     "bg-pink-400",
  orange:   "bg-orange-400",
  red:      "bg-red-500",
  yellow:   "bg-yellow-400",
  green:    "bg-green-500",
  darkblue: "bg-blue-700",
};

const COLOR_BORDER: Record<string, string> = {
  purple:   "border-purple-500",
  lightblue:"border-sky-400",
  pink:     "border-pink-400",
  orange:   "border-orange-400",
  red:      "border-red-500",
  yellow:   "border-yellow-400",
  green:    "border-green-500",
  darkblue: "border-blue-700",
};

// ============================================================
// TYPES
// ============================================================

interface Player {
  id: number;
  name: string;
  emoji: string;
  money: number;
  position: number;
  properties: number[]; // square ids
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
}

interface GameLog {
  text: string;
  type: "info" | "buy" | "rent" | "chance" | "tax" | "jail" | "win";
}

// ============================================================
// HELPERS
// ============================================================

function rollDice(): [number, number] {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
}

function getRent(sq: Square, owners: Player[], currentPlayer: Player, dice: number): number {
  if (sq.type === "station") {
    const stationIds = SQUARES.filter(s => s.type === "station").map(s => s.id);
    const ownerStations = owners.flatMap(p => p.properties).filter(id => stationIds.includes(id));
    const ownedByOne = owners.find(p => p.properties.includes(sq.id));
    if (!ownedByOne) return 0;
    const count = ownedByOne.properties.filter(id => stationIds.includes(id)).length;
    return sq.rent![count - 1] ?? sq.rent![0];
  }
  if (sq.type === "utility") {
    const utilIds = SQUARES.filter(s => s.type === "utility").map(s => s.id);
    const owner = owners.find(p => p.properties.includes(sq.id));
    if (!owner) return 0;
    const bothOwned = utilIds.every(id => owner.properties.includes(id));
    return dice * (bothOwned ? 10 : 4);
  }
  return sq.rent?.[0] ?? 0;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MonopolyPage() {
  const TOTAL = 40;
  const JAIL_POS = 10;
  const GOTO_JAIL_POS = 30;
  const START_MONEY = 1500;
  const GO_BONUS = 200;

  const initPlayers = (): Player[] => [
    { id: 0, name: "あなた",     emoji: "😎", money: START_MONEY, position: 0, properties: [], inJail: false, jailTurns: 0, bankrupt: false },
    { id: 1, name: "ライバルA",  emoji: "🤖", money: START_MONEY, position: 0, properties: [], inJail: false, jailTurns: 0, bankrupt: false },
    { id: 2, name: "ライバルB",  emoji: "👾", money: START_MONEY, position: 0, properties: [], inJail: false, jailTurns: 0, bankrupt: false },
  ];

  const [players, setPlayers] = useState<Player[]>(initPlayers());
  const [currentTurn, setCurrentTurn] = useState(0);
  const [dice, setDice] = useState<[number, number]>([1, 1]);
  const [log, setLog] = useState<GameLog[]>([{ text: "🎲 コミカルモノポリーへようこそ！まずはサイコロを振ってください。", type: "info" }]);
  const [phase, setPhase] = useState<"roll" | "buy" | "end">("roll");
  const [pendingBuy, setPendingBuy] = useState<Square | null>(null);
  const [rolling, setRolling] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [animPos, setAnimPos] = useState<number[]>([0, 0, 0]);

  const addLog = useCallback((text: string, type: GameLog["type"] = "info") => {
    setLog(prev => [...prev.slice(-40), { text, type }]);
  }, []);

  const currentPlayer = players[currentTurn];

  // CPU auto-turn effect
  useEffect(() => {
    if (phase === "roll" && currentTurn > 0 && !winner) {
      const t = setTimeout(() => executeTurn(), 1200);
      return () => clearTimeout(t);
    }
    if (phase === "buy" && currentTurn > 0 && pendingBuy) {
      const t = setTimeout(() => {
        // CPU buys if affordable
        const cpu = players[currentTurn];
        if (pendingBuy.price && cpu.money >= pendingBuy.price) {
          handleBuy(true);
        } else {
          addLog(`${cpu.emoji} ${cpu.name} は購入をパスした`, "info");
          advanceTurn();
        }
      }, 900);
      return () => clearTimeout(t);
    }
  });

  function executeTurn() {
    if (rolling) return;
    setRolling(true);
    const [d1, d2] = rollDice();
    setDice([d1, d2]);
    const total = d1 + d2;

    setPlayers(prev => {
      const next = prev.map((p, i) => {
        if (i !== currentTurn) return p;
        let newPos: number;
        let newMoney = p.money;
        let newJail = p.inJail;
        let newJailTurns = p.jailTurns;

        if (p.inJail) {
          newJailTurns++;
          if (d1 === d2 || newJailTurns >= 3) {
            addLog(`${p.emoji} ${p.name} が釈放された！（${d1}=${d2}のゾロ目 or 3ターン経過）`, "jail");
            newJail = false;
            newJailTurns = 0;
            newPos = (JAIL_POS + total) % TOTAL;
            if (newPos < JAIL_POS) newMoney += GO_BONUS;
          } else {
            addLog(`${p.emoji} ${p.name} は留置所でくつろいでいる（${newJailTurns}ターン目）🔒`, "jail");
            return { ...p, jailTurns: newJailTurns };
          }
        } else {
          newPos = (p.position + total) % TOTAL;
          if (newPos < p.position || (p.position + total >= TOTAL)) {
            newMoney += GO_BONUS;
            addLog(`${p.emoji} ${p.name} がスタートを通過！¥${GO_BONUS}ゲット！🚀`, "info");
          }
        }

        addLog(`${p.emoji} ${p.name}：🎲 ${d1}+${d2}=${total} → 「${SQUARES[newPos].emoji}${SQUARES[newPos].name}」へ`, "info");
        return { ...p, position: newPos!, money: newMoney, inJail: newJail, jailTurns: newJailTurns };
      });
      return next;
    });

    setTimeout(() => processSquare(total), 300);
    setRolling(false);
  }

  function processSquare(diceTotal: number) {
    setPlayers(prev => {
      const p = prev[currentTurn];
      const sq = SQUARES[p.position];

      if (sq.type === "goto_jail") {
        addLog(`${p.emoji} ${p.name} が強制送還！留置所へ直行だ！🚨`, "jail");
        const updated = prev.map((pl, i) => i === currentTurn ? { ...pl, position: JAIL_POS, inJail: true, jailTurns: 0 } : pl);
        setTimeout(advanceTurn, 600);
        return updated;
      }

      if (sq.type === "tax") {
        const tax = sq.id === 4 ? 100 : 200;
        addLog(`${p.emoji} ${p.name} に税金！¥${tax}支払い 😭`, "tax");
        const updated = prev.map((pl, i) => i === currentTurn ? { ...pl, money: pl.money - tax } : pl);
        const bankruptCheck = checkBankrupt(updated, currentTurn);
        setTimeout(advanceTurn, 600);
        return bankruptCheck;
      }

      if (sq.type === "chance") {
        const card = CHANCE_CARDS[Math.floor(Math.random() * CHANCE_CARDS.length)];
        addLog(`${p.emoji} ${p.name}：${card.text}`, "chance");
        let updated = [...prev];
        if (card.goToJail) {
          updated = updated.map((pl, i) => i === currentTurn ? { ...pl, position: JAIL_POS, inJail: true, jailTurns: 0 } : pl);
        } else if (card.goToStart) {
          updated = updated.map((pl, i) => i === currentTurn ? { ...pl, position: 0, money: pl.money + GO_BONUS } : pl);
        } else if (card.fromAll) {
          // collect from all others
          let total = 0;
          updated = updated.map((pl, i) => {
            if (i === currentTurn) return pl;
            total += card.money;
            return { ...pl, money: pl.money - card.money };
          });
          updated = updated.map((pl, i) => i === currentTurn ? { ...pl, money: pl.money + total } : pl);
        } else {
          updated = updated.map((pl, i) => i === currentTurn ? { ...pl, money: pl.money + card.money } : pl);
        }
        const bankruptCheck = checkBankrupt(updated, currentTurn);
        setTimeout(advanceTurn, 700);
        return bankruptCheck;
      }

      if (sq.type === "property" || sq.type === "station" || sq.type === "utility") {
        // check if owned by another player
        const owner = prev.find((pl, i) => i !== currentTurn && pl.properties.includes(sq.id));
        if (owner) {
          const rent = getRent(sq, prev, p, diceTotal);
          addLog(`${p.emoji} ${p.name} が ${owner.emoji}${owner.name} の「${sq.emoji}${sq.name}」に家賃¥${rent}払う！😱`, "rent");
          const updated = prev.map((pl, i) => {
            if (i === currentTurn) return { ...pl, money: pl.money - rent };
            if (pl.id === owner.id) return { ...pl, money: pl.money + rent };
            return pl;
          });
          const bankruptCheck = checkBankrupt(updated, currentTurn);
          setTimeout(advanceTurn, 600);
          return bankruptCheck;
        }
        // owned by current player
        if (p.properties.includes(sq.id)) {
          addLog(`${p.emoji} ${p.name} の土地！ゆっくりしていってね 😏`, "info");
          setTimeout(advanceTurn, 600);
          return prev;
        }
        // unowned – offer to buy
        if (sq.price && p.money >= sq.price) {
          setTimeout(() => {
            setPendingBuy(sq);
            setPhase("buy");
          }, 200);
          return prev;
        } else {
          addLog(`${p.emoji} ${p.name} はお金が足りなくて買えない！😢`, "info");
          setTimeout(advanceTurn, 600);
          return prev;
        }
      }

      // go / jail-visit / free
      setTimeout(advanceTurn, 600);
      return prev;
    });
  }

  function checkBankrupt(ps: Player[], idx: number): Player[] {
    return ps.map((p, i) => {
      if (i === idx && p.money < 0 && !p.bankrupt) {
        addLog(`${p.emoji} ${p.name} が破産！！ゲームから退場🪦`, "jail");
        return { ...p, bankrupt: true };
      }
      return p;
    });
  }

  function handleBuy(autoBuy = false) {
    if (!pendingBuy) return;
    setPlayers(prev => {
      const p = prev[currentTurn];
      if (!pendingBuy.price || p.money < pendingBuy.price) return prev;
      addLog(`${p.emoji} ${p.name} が「${pendingBuy.emoji}${pendingBuy.name}」を¥${pendingBuy.price}で購入！🏠`, "buy");
      return prev.map((pl, i) => i === currentTurn
        ? { ...pl, money: pl.money - pendingBuy.price!, properties: [...pl.properties, pendingBuy.id] }
        : pl
      );
    });
    setPendingBuy(null);
    setPhase("roll");
    setTimeout(advanceTurn, 300);
  }

  function handleSkipBuy() {
    addLog(`${currentPlayer.emoji} ${currentPlayer.name} は購入をパスした`, "info");
    setPendingBuy(null);
    setPhase("roll");
    advanceTurn();
  }

  function advanceTurn() {
    setPlayers(prev => {
      const active = prev.filter(p => !p.bankrupt);
      if (active.length === 1) {
        setWinner(active[0]);
        return prev;
      }
      // check winner by net worth
      const richest = [...prev].sort((a, b) => (b.money + b.properties.reduce((s, id) => s + (SQUARES[id].price ?? 0), 0))
        - (a.money + a.properties.reduce((s, id) => s + (SQUARES[id].price ?? 0), 0)))[0];
      setCurrentTurn(t => {
        let next = (t + 1) % prev.length;
        while (prev[next].bankrupt) next = (next + 1) % prev.length;
        return next;
      });
      setPhase("roll");
      return prev;
    });
  }

  function resetGame() {
    setPlayers(initPlayers());
    setCurrentTurn(0);
    setDice([1, 1]);
    setLog([{ text: "🎲 新しいゲーム開始！頑張って！", type: "info" }]);
    setPhase("roll");
    setPendingBuy(null);
    setWinner(null);
    setRolling(false);
  }

  // ============================================================
  // BOARD LAYOUT
  // ============================================================

  // Arrange 40 squares around the perimeter:
  // bottom row (left to right):  ids 0..10  (11 squares)
  // right col (bottom to top):   ids 11..19 (9 squares)
  // top row (right to left):     ids 20..30 (11 squares)
  // left col (top to bottom):    ids 31..39 (9 squares)

  const logRef = useCallback((el: HTMLDivElement | null) => {
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  const squareSize = "w-14 h-14";

  function SquareCell({ sq }: { sq: Square }) {
    const playersHere = players.filter(p => p.position === sq.id && !p.bankrupt);
    const owner = players.find(p => p.properties.includes(sq.id));
    const isJail = sq.type === "jail";
    const isCurrent = players[currentTurn].position === sq.id;

    return (
      <div className={`relative flex flex-col items-center justify-between p-0.5 border border-gray-300 bg-white text-center overflow-hidden
        ${squareSize}
        ${isCurrent ? "ring-2 ring-yellow-400" : ""}
        ${sq.type === "go" ? "bg-yellow-50" : ""}
        ${sq.type === "goto_jail" ? "bg-red-50" : ""}
        ${sq.type === "free" ? "bg-green-50" : ""}
        ${isJail ? "bg-blue-50" : ""}
      `}>
        {/* Color strip for property */}
        {sq.color && (
          <div className={`w-full h-2 rounded-sm ${COLOR_STYLES[sq.color]}`} />
        )}
        {/* Owner indicator */}
        {owner && (
          <div className={`absolute top-0 right-0 text-xs leading-none px-0.5 py-0.5 rounded-bl font-bold
            ${sq.color ? `${COLOR_BORDER[sq.color]} border-l border-b` : "border-l border-b border-gray-300"}
            bg-white text-gray-700`}
          >
            {owner.emoji}
          </div>
        )}
        <div className="text-lg leading-none">{sq.emoji}</div>
        <div className="text-gray-700 leading-tight" style={{ fontSize: "0.45rem" }}>{sq.name}</div>
        {sq.price && <div className="text-gray-400" style={{ fontSize: "0.4rem" }}>¥{sq.price}</div>}
        {/* Players */}
        <div className="flex flex-wrap justify-center gap-px">
          {playersHere.map(p => (
            <span key={p.id} className="text-xs">{p.emoji}</span>
          ))}
        </div>
      </div>
    );
  }

  // Build board rows
  const bottom = SQUARES.slice(0, 11);           // 0→10  left→right
  const right  = SQUARES.slice(11, 20);          // 11→19 bottom→top
  const top    = SQUARES.slice(20, 31).reverse(); // 30→20 left→right (reversed)
  const left   = SQUARES.slice(31, 40).reverse(); // 39→31 top→bottom

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-800 to-green-900 p-4 overflow-auto">
      <h1 className="text-center text-white text-2xl font-extrabold mb-3 drop-shadow">
        🎲 コミカルモノポリー 🎲
      </h1>

      <div className="flex flex-col xl:flex-row gap-4 items-start justify-center">
        {/* BOARD */}
        <div className="bg-green-600 p-2 rounded-xl shadow-2xl border-4 border-yellow-400">
          {/* Top row */}
          <div className="flex">
            <div className={`${squareSize} flex-shrink-0`} />
            {top.map(sq => <SquareCell key={sq.id} sq={sq} />)}
            <div className={`${squareSize} flex-shrink-0`} />
          </div>
          {/* Middle rows */}
          <div className="flex">
            {/* Left column */}
            <div className="flex flex-col">
              {left.map(sq => <SquareCell key={sq.id} sq={sq} />)}
            </div>
            {/* Center */}
            <div className="flex-1 flex flex-col items-center justify-center bg-green-700 rounded-lg m-1 min-w-48 min-h-48 p-3 gap-2">
              <div className="text-yellow-300 text-5xl">🎲</div>
              <div className="text-white text-sm font-bold text-center">
                {currentPlayer.emoji} {currentPlayer.name} のターン
              </div>
              <div className="flex gap-3 text-4xl">
                <span className={`${rolling ? "animate-bounce" : ""}`}>{["","⚀","⚁","⚂","⚃","⚄","⚅"][dice[0]]}</span>
                <span className={`${rolling ? "animate-bounce" : ""}`}>{["","⚀","⚁","⚂","⚃","⚄","⚅"][dice[1]]}</span>
              </div>
              <div className="text-yellow-200 text-xs">合計: {dice[0]+dice[1]}</div>

              {phase === "roll" && currentTurn === 0 && !winner && (
                <button
                  onClick={executeTurn}
                  disabled={rolling}
                  className="bg-yellow-400 hover:bg-yellow-300 text-green-900 font-bold px-4 py-2 rounded-lg shadow transition text-sm"
                >
                  🎲 サイコロを振る！
                </button>
              )}
              {phase === "buy" && currentTurn === 0 && pendingBuy && (
                <div className="flex flex-col items-center gap-1 w-full">
                  <div className="text-white text-xs text-center font-bold">
                    {pendingBuy.emoji}「{pendingBuy.name}」を<br/>¥{pendingBuy.price}で買う？
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleBuy()} className="bg-green-400 hover:bg-green-300 text-white font-bold px-3 py-1 rounded text-xs">買う！</button>
                    <button onClick={handleSkipBuy} className="bg-gray-400 hover:bg-gray-300 text-white font-bold px-3 py-1 rounded text-xs">パス</button>
                  </div>
                </div>
              )}
              {winner && (
                <div className="text-center">
                  <div className="text-yellow-300 text-2xl font-extrabold">{winner.emoji} 優勝！</div>
                  <div className="text-white text-sm">{winner.name} の完全勝利！</div>
                  <button onClick={resetGame} className="mt-2 bg-yellow-400 text-green-900 font-bold px-3 py-1 rounded text-xs">もう一度</button>
                </div>
              )}
            </div>
            {/* Right column */}
            <div className="flex flex-col">
              {right.map(sq => <SquareCell key={sq.id} sq={sq} />)}
            </div>
          </div>
          {/* Bottom row */}
          <div className="flex">
            <div className={`${squareSize} flex-shrink-0`} />
            {bottom.map(sq => <SquareCell key={sq.id} sq={sq} />)}
            <div className={`${squareSize} flex-shrink-0`} />
          </div>
        </div>

        {/* SIDEBAR */}
        <div className="flex flex-col gap-3 w-72">
          {/* Players */}
          <div className="bg-white rounded-xl shadow p-3">
            <h2 className="font-bold text-gray-700 mb-2 text-sm">👥 プレイヤー</h2>
            {players.map(p => (
              <div key={p.id} className={`flex items-center gap-2 p-2 rounded-lg mb-1 text-sm
                ${p.bankrupt ? "opacity-40 line-through" : ""}
                ${currentTurn === p.id && !p.bankrupt ? "bg-yellow-50 border border-yellow-300" : "bg-gray-50"}
              `}>
                <span className="text-xl">{p.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800">{p.name}</div>
                  <div className="text-xs text-gray-500">
                    ¥{p.money.toLocaleString()}
                    {p.inJail && " 🔒留置所"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400">{p.properties.length}件所有</div>
                  <div className="text-xs font-bold text-green-600">
                    ¥{(p.money + p.properties.reduce((s, id) => s + (SQUARES[id].price ?? 0), 0)).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Log */}
          <div className="bg-white rounded-xl shadow p-3">
            <h2 className="font-bold text-gray-700 mb-2 text-sm">📜 ゲームログ</h2>
            <div ref={logRef} className="h-64 overflow-y-auto flex flex-col gap-1 text-xs">
              {log.map((l, i) => (
                <div key={i} className={`rounded px-2 py-1 leading-snug
                  ${l.type === "buy"    ? "bg-green-50 text-green-800" : ""}
                  ${l.type === "rent"   ? "bg-red-50 text-red-800" : ""}
                  ${l.type === "chance" ? "bg-purple-50 text-purple-800" : ""}
                  ${l.type === "tax"    ? "bg-orange-50 text-orange-800" : ""}
                  ${l.type === "jail"   ? "bg-blue-50 text-blue-800" : ""}
                  ${l.type === "win"    ? "bg-yellow-50 text-yellow-800 font-bold" : ""}
                  ${l.type === "info"   ? "bg-gray-50 text-gray-700" : ""}
                `}>{l.text}</div>
              ))}
            </div>
          </div>

          {/* Properties */}
          <div className="bg-white rounded-xl shadow p-3">
            <h2 className="font-bold text-gray-700 mb-2 text-sm">🏠 所有物件</h2>
            <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
              {players.filter(p => !p.bankrupt && p.properties.length > 0).map(p => (
                <div key={p.id}>
                  <div className="text-xs font-semibold text-gray-600">{p.emoji} {p.name}</div>
                  <div className="flex flex-wrap gap-1 ml-2">
                    {p.properties.map(id => {
                      const sq = SQUARES[id];
                      return (
                        <span key={id} className={`text-xs px-1.5 py-0.5 rounded-full text-white ${sq.color ? COLOR_STYLES[sq.color] : "bg-gray-400"}`}>
                          {sq.emoji}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
              {players.every(p => p.properties.length === 0) && (
                <div className="text-xs text-gray-400">まだ誰も物件を持っていません</div>
              )}
            </div>
          </div>

          <button onClick={resetGame} className="bg-red-500 hover:bg-red-400 text-white font-bold py-2 rounded-xl shadow text-sm transition">
            🔄 ゲームをリセット
          </button>
        </div>
      </div>
    </div>
  );
}

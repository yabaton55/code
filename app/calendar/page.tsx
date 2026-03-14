"use client";
import { useEffect, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Catalyst } from "@/lib/types";
import { IMPORTANCE_COLOR } from "@/lib/types";
import Modal from "@/components/Modal";
import CatalystForm from "@/components/CatalystForm";

const CAT_COLOR: Record<string, string> = {
  High: "bg-red-500",
  Medium: "bg-yellow-400",
  Low: "bg-blue-400",
};

export default function CalendarPage() {
  const [current, setCurrent] = useState(new Date());
  const [catalysts, setCatalysts] = useState<Catalyst[]>([]);
  const [selected, setSelected] = useState<Catalyst | null>(null);
  const [editing, setEditing] = useState<Catalyst | null>(null);

  const load = async () => {
    const res = await fetch("/api/catalysts");
    setCatalysts(await res.json());
  };

  useEffect(() => { load(); }, []);

  const days = eachDayOfInterval({ start: startOfMonth(current), end: endOfMonth(current) });

  // Pad to start on Sunday
  const firstDow = startOfMonth(current).getDay();
  const padded = Array(firstDow).fill(null).concat(days);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const catalystsForDay = (day: Date) =>
    catalysts.filter((c) => c.scheduledDate && isSameDay(parseISO(c.scheduledDate), day));

  const updateCatalyst = async (data: Partial<Catalyst>) => {
    await fetch(`/api/catalysts/${editing!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setEditing(null);
    setSelected(null);
    load();
  };

  const quickStatus = async (c: Catalyst, status: string) => {
    await fetch(`/api/catalysts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, status }),
    });
    setSelected(null);
    load();
  };

  const today = new Date();

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">カレンダー</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
          <span className="text-base font-semibold text-gray-800 w-32 text-center">
            {format(current, "yyyy年M月", { locale: ja })}
          </span>
          <button onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
          <button onClick={() => setCurrent(new Date())} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">今月</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
            <div key={d} className={`py-2 text-center text-xs font-medium ${i === 0 ? "text-red-500" : i === 6 ? "text-blue-500" : "text-gray-500"}`}>{d}</div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-gray-50 last:border-b-0">
            {week.map((day, di) => {
              if (!day) return <div key={di} className="min-h-24 bg-gray-50/50 border-r border-gray-50 last:border-r-0" />;
              const isToday = isSameDay(day, today);
              const cats = catalystsForDay(day);
              const isCurrentMonth = isSameMonth(day, current);
              return (
                <div key={di} className={`min-h-24 p-1.5 border-r border-gray-50 last:border-r-0 ${!isCurrentMonth ? "bg-gray-50/50" : ""}`}>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 ${
                    isToday ? "bg-blue-600 text-white font-bold" :
                    di === 0 ? "text-red-400" : di === 6 ? "text-blue-400" : "text-gray-700"
                  } ${!isCurrentMonth ? "opacity-40" : ""}`}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-0.5">
                    {cats.slice(0, 3).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelected(c)}
                        className={`w-full text-left text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 ${
                          c.status !== "pending" ? "opacity-40" : ""
                        }`}
                        style={{ background: c.importance === "High" ? "#fee2e2" : c.importance === "Medium" ? "#fef9c3" : "#dbeafe" }}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${CAT_COLOR[c.importance]}`} />
                        <span className="truncate">{c.stock?.ticker} {c.title}</span>
                      </button>
                    ))}
                    {cats.length > 3 && (
                      <div className="text-xs text-gray-400 pl-1">+{cats.length - 3}件</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        {(["High", "Medium", "Low"] as const).map((imp) => (
          <div key={imp} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${CAT_COLOR[imp]}`} />
            {imp}
          </div>
        ))}
      </div>

      {/* Catalyst detail modal */}
      {selected && !editing && (
        <Modal title="カタリスト詳細" onClose={() => setSelected(null)}>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-400 mb-0.5">銘柄</p>
              <p className="font-semibold">{selected.stock?.ticker} {selected.stock?.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-0.5">カタリスト</p>
              <p className="font-medium">{selected.title}</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">カテゴリ</p>
                <p className="text-sm">{selected.category}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">重要度</p>
                <p className="text-sm">{selected.importance}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">日付</p>
                <p className="text-sm">{selected.scheduledDate ? format(parseISO(selected.scheduledDate), "M月d日", { locale: ja }) : "—"}</p>
              </div>
            </div>
            {selected.memo && <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">{selected.memo}</div>}
            <div className="flex gap-2 pt-1">
              {selected.status === "pending" && (
                <>
                  <button onClick={() => quickStatus(selected, "realized")} className="flex-1 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">顕在化済みにする</button>
                  <button onClick={() => quickStatus(selected, "expired")} className="flex-1 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">消滅にする</button>
                </>
              )}
              <button onClick={() => setEditing(selected)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">編集</button>
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title="カタリストを編集" onClose={() => setEditing(null)}>
          <CatalystForm stockId={editing.stockId} initial={editing} onSave={updateCatalyst} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}

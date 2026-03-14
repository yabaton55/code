"use client";
import { useState } from "react";
import type { Catalyst } from "@/lib/types";
import { CATEGORIES, IMPORTANCES, STATUSES } from "@/lib/types";

interface Props {
  stockId: string;
  initial?: Partial<Catalyst>;
  onSave: (data: Partial<Catalyst>) => void;
  onCancel: () => void;
}

export default function CatalystForm({ stockId, initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    category: initial?.category || "その他",
    scheduledDate: initial?.scheduledDate ? initial.scheduledDate.slice(0, 10) : "",
    scheduledQ: initial?.scheduledQ || "",
    importance: initial?.importance || "Medium",
    status: initial?.status || "pending",
    sourceType: initial?.sourceType || "manual",
    sourceUrl: initial?.sourceUrl || "",
    memo: initial?.memo || "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">カタリスト名 *</label>
        <input
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="例: 2Q決算発表"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">カテゴリ</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.category} onChange={(e) => set("category", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">重要度</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.importance} onChange={(e) => set("importance", e.target.value)}>
            {IMPORTANCES.map((i) => <option key={i}>{i}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">予定日</label>
          <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.scheduledDate} onChange={(e) => set("scheduledDate", e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">期（例: 2025Q2）</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.scheduledQ} onChange={(e) => set("scheduledQ", e.target.value)} placeholder="2025Q2" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ステータス</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.status} onChange={(e) => set("status", e.target.value)}>
            {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ソース</label>
          <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.sourceType} onChange={(e) => set("sourceType", e.target.value)}>
            <option value="manual">手動</option>
            <option value="slack">Slack</option>
            <option value="x">X</option>
            <option value="excel">Excel</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} placeholder="https://..." />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
        <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={2} value={form.memo} onChange={(e) => set("memo", e.target.value)} />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
        <button
          onClick={() => onSave({ ...form, stockId, scheduledDate: form.scheduledDate || null, scheduledQ: form.scheduledQ || null, sourceUrl: form.sourceUrl || null, memo: form.memo || null })}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          disabled={!form.title}
        >
          保存
        </button>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import type { Stock } from "@/lib/types";

interface Props {
  initial?: Partial<Stock>;
  onSave: (data: Partial<Stock> & { tags: string[] }) => void;
  onCancel: () => void;
}

export default function StockForm({ initial, onSave, onCancel }: Props) {
  const [form, setForm] = useState({
    ticker: initial?.ticker || "",
    name: initial?.name || "",
    market: initial?.market || "",
    sector: initial?.sector || "",
    memo: initial?.memo || "",
    tagsStr: initial?.tags ? JSON.parse(initial.tags).join(", ") : "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ティッカー / 銘柄コード *</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.ticker} onChange={(e) => set("ticker", e.target.value.toUpperCase())} placeholder="例: 7203 / AAPL" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">銘柄名 *</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="例: トヨタ自動車" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">市場</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.market} onChange={(e) => set("market", e.target.value)} placeholder="東証プライム / NASDAQ" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">セクター</label>
          <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.sector} onChange={(e) => set("sector", e.target.value)} placeholder="自動車 / テクノロジー" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">タグ（カンマ区切り）</label>
        <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={form.tagsStr} onChange={(e) => set("tagsStr", e.target.value)} placeholder="成長株, 高配当, 割安" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">メモ</label>
        <textarea className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" rows={3} value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="投資テーマ、ポジション状況など" />
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">キャンセル</button>
        <button
          onClick={() => onSave({ ...form, tags: form.tagsStr.split(",").map((t: string) => t.trim()).filter(Boolean) })}
          className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          disabled={!form.ticker || !form.name}
        >
          保存
        </button>
      </div>
    </div>
  );
}

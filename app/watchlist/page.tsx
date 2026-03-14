"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Search, Archive, ChevronRight } from "lucide-react";
import type { Stock, Catalyst } from "@/lib/types";
import Modal from "@/components/Modal";
import StockForm from "@/components/StockForm";
import { ImportanceBadge, StatusBadge } from "@/components/Badge";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export default function WatchlistPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [q, setQ] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/stocks?archived=${showArchived}&q=${encodeURIComponent(q)}`);
    setStocks(await res.json());
    setLoading(false);
  }, [q, showArchived]);

  useEffect(() => { load(); }, [load]);

  const addStock = async (data: Partial<Stock> & { tags: string[] }) => {
    await fetch("/api/stocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setShowAddModal(false);
    load();
  };

  const nextCatalyst = (catalysts: Catalyst[]) =>
    catalysts.filter((c) => c.status === "pending" && c.scheduledDate)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())[0];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">ウォッチリスト</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stocks.length} 銘柄</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus size={16} /> 銘柄追加
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ティッカー・名前で検索"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowArchived(!showArchived)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${showArchived ? "bg-gray-800 text-white border-gray-800" : "border-gray-300 text-gray-600 hover:bg-gray-50"}`}
        >
          <Archive size={14} /> アーカイブ
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">読み込み中...</div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">銘柄がありません。「銘柄追加」から追加してください。</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">銘柄</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">市場 / セクター</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">直近カタリスト</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">カタリスト数</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stocks.map((stock) => {
                const next = nextCatalyst(stock.catalysts);
                const pending = stock.catalysts.filter((c) => c.status === "pending").length;
                return (
                  <tr key={stock.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{stock.ticker}</div>
                      <div className="text-gray-500 text-xs">{stock.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-700">{stock.market || "—"}</div>
                      <div className="text-gray-400 text-xs">{stock.sector || "—"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {next ? (
                        <div>
                          <div className="text-gray-800">{next.title}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-400">
                              {format(parseISO(next.scheduledDate!), "M月d日", { locale: ja })}
                            </span>
                            <ImportanceBadge value={next.importance} />
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-gray-700">{pending} 件待機中</span>
                      <div className="text-xs text-gray-400">{stock.catalysts.length} 件合計</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/watchlist/${stock.id}`} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-xs">
                        詳細 <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <Modal title="銘柄を追加" onClose={() => setShowAddModal(false)}>
          <StockForm onSave={addStock} onCancel={() => setShowAddModal(false)} />
        </Modal>
      )}
    </div>
  );
}

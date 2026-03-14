"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, Archive } from "lucide-react";
import type { Stock, Catalyst } from "@/lib/types";
import Modal from "@/components/Modal";
import CatalystForm from "@/components/CatalystForm";
import StockForm from "@/components/StockForm";
import { ImportanceBadge, StatusBadge } from "@/components/Badge";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";

export default function StockDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [stock, setStock] = useState<Stock | null>(null);
  const [modal, setModal] = useState<"addCatalyst" | "editCatalyst" | "editStock" | null>(null);
  const [editingCatalyst, setEditingCatalyst] = useState<Catalyst | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/stocks/${id}`);
    if (!res.ok) { router.push("/watchlist"); return; }
    setStock(await res.json());
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const addCatalyst = async (data: Partial<Catalyst>) => {
    await fetch("/api/catalysts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, stockId: id }),
    });
    setModal(null);
    load();
  };

  const updateCatalyst = async (data: Partial<Catalyst>) => {
    await fetch(`/api/catalysts/${editingCatalyst!.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setModal(null);
    setEditingCatalyst(null);
    load();
  };

  const deleteCatalyst = async (cid: string) => {
    if (!confirm("このカタリストを削除しますか？")) return;
    await fetch(`/api/catalysts/${cid}`, { method: "DELETE" });
    load();
  };

  const updateStock = async (data: Partial<Stock> & { tags: string[] }) => {
    await fetch(`/api/stocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setModal(null);
    load();
  };

  const archiveStock = async () => {
    if (!confirm("この銘柄をアーカイブしますか？")) return;
    await fetch(`/api/stocks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !stock?.archived }),
    });
    load();
  };

  const deleteStock = async () => {
    if (!confirm("この銘柄を削除しますか？カタリストもすべて削除されます。")) return;
    await fetch(`/api/stocks/${id}`, { method: "DELETE" });
    router.push("/watchlist");
  };

  const quickStatus = async (c: Catalyst, status: string) => {
    await fetch(`/api/catalysts/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...c, status }),
    });
    load();
  };

  if (!stock) return <div className="p-6 text-gray-400 text-sm">読み込み中...</div>;

  const tags: string[] = JSON.parse(stock.tags);
  const pending = stock.catalysts.filter((c) => c.status === "pending");
  const others = stock.catalysts.filter((c) => c.status !== "pending");

  const CatalystRow = ({ c }: { c: Catalyst }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${c.status !== "pending" ? "opacity-50 bg-gray-50" : "bg-white border-gray-200"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-gray-900 text-sm">{c.title}</span>
          <ImportanceBadge value={c.importance} />
          <StatusBadge value={c.status} />
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{c.category}</span>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
          {c.scheduledDate && <span>{format(parseISO(c.scheduledDate), "yyyy年M月d日", { locale: ja })}</span>}
          {c.scheduledQ && <span>{c.scheduledQ}</span>}
          {c.sourceType && <span className="capitalize">{c.sourceType}</span>}
        </div>
        {c.memo && <p className="mt-1 text-xs text-gray-500 line-clamp-2">{c.memo}</p>}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {c.status === "pending" && (
          <>
            <button onClick={() => quickStatus(c, "realized")} className="px-2 py-1 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100">顕在化</button>
            <button onClick={() => quickStatus(c, "expired")} className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200">消滅</button>
          </>
        )}
        <button onClick={() => { setEditingCatalyst(c); setModal("editCatalyst"); }} className="p-1.5 text-gray-400 hover:text-gray-700 rounded"><Edit size={14} /></button>
        <button onClick={() => deleteCatalyst(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-3xl">
      <button onClick={() => router.push("/watchlist")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-5">
        <ArrowLeft size={14} /> ウォッチリストへ戻る
      </button>

      {/* Stock Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{stock.ticker}</h1>
              {stock.archived && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">アーカイブ済</span>}
            </div>
            <p className="text-gray-600 mt-0.5">{stock.name}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
              {stock.market && <span>{stock.market}</span>}
              {stock.sector && <><span>·</span><span>{stock.sector}</span></>}
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => <span key={t} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{t}</span>)}
              </div>
            )}
            {stock.memo && <p className="mt-3 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{stock.memo}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setModal("editStock")} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><Edit size={16} /></button>
            <button onClick={archiveStock} className="p-2 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><Archive size={16} /></button>
            <button onClick={deleteStock} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"><Trash2 size={16} /></button>
          </div>
        </div>
      </div>

      {/* Catalysts */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">カタリスト <span className="text-gray-400 text-sm font-normal">({stock.catalysts.length}件)</span></h2>
        <button
          onClick={() => setModal("addCatalyst")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus size={12} /> 追加
        </button>
      </div>

      {stock.catalysts.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">カタリストがありません</div>
      ) : (
        <div className="space-y-2">
          {pending.map((c) => <CatalystRow key={c.id} c={c} />)}
          {others.length > 0 && pending.length > 0 && <div className="border-t border-gray-200 my-3" />}
          {others.map((c) => <CatalystRow key={c.id} c={c} />)}
        </div>
      )}

      {modal === "addCatalyst" && (
        <Modal title="カタリストを追加" onClose={() => setModal(null)}>
          <CatalystForm stockId={id} onSave={addCatalyst} onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === "editCatalyst" && editingCatalyst && (
        <Modal title="カタリストを編集" onClose={() => { setModal(null); setEditingCatalyst(null); }}>
          <CatalystForm stockId={id} initial={editingCatalyst} onSave={updateCatalyst} onCancel={() => { setModal(null); setEditingCatalyst(null); }} />
        </Modal>
      )}
      {modal === "editStock" && (
        <Modal title="銘柄を編集" onClose={() => setModal(null)}>
          <StockForm initial={stock} onSave={updateStock} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}

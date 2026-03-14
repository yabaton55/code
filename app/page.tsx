"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { format, parseISO, differenceInDays } from "date-fns";
import { ja } from "date-fns/locale";
import { TrendingUp, Clock, CheckCircle, XCircle, ChevronRight, Calendar } from "lucide-react";
import type { Catalyst, Stock } from "@/lib/types";
import { ImportanceBadge } from "@/components/Badge";

interface Summary {
  totalStocks: number;
  pendingCatalysts: number;
  realizedCatalysts: number;
  expiredCatalysts: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [upcoming, setUpcoming] = useState<Catalyst[]>([]);
  const [overdue, setOverdue] = useState<Catalyst[]>([]);

  useEffect(() => {
    const load = async () => {
      const [stocksRes, catRes] = await Promise.all([
        fetch("/api/stocks"),
        fetch("/api/catalysts"),
      ]);
      const stocks: Stock[] = await stocksRes.json();
      const cats: Catalyst[] = await catRes.json();

      const now = new Date();
      const up = cats
        .filter((c) => c.status === "pending" && c.scheduledDate && new Date(c.scheduledDate) >= now)
        .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime())
        .slice(0, 10);
      const ov = cats
        .filter((c) => c.status === "pending" && c.scheduledDate && new Date(c.scheduledDate) < now)
        .sort((a, b) => new Date(b.scheduledDate!).getTime() - new Date(a.scheduledDate!).getTime());

      setUpcoming(up);
      setOverdue(ov);
      setSummary({
        totalStocks: stocks.filter((s) => !s.archived).length,
        pendingCatalysts: cats.filter((c) => c.status === "pending").length,
        realizedCatalysts: cats.filter((c) => c.status === "realized").length,
        expiredCatalysts: cats.filter((c) => c.status === "expired").length,
      });
    };
    load();
  }, []);

  const daysUntil = (d: string) => differenceInDays(new Date(d), new Date());

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-0.5">{format(new Date(), "yyyy年M月d日（E）", { locale: ja })}</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "ウォッチ銘柄", value: summary.totalStocks, icon: TrendingUp, color: "text-blue-600 bg-blue-50" },
            { label: "待機中カタリスト", value: summary.pendingCatalysts, icon: Clock, color: "text-yellow-600 bg-yellow-50" },
            { label: "顕在化済み", value: summary.realizedCatalysts, icon: CheckCircle, color: "text-green-600 bg-green-50" },
            { label: "消滅", value: summary.expiredCatalysts, icon: XCircle, color: "text-gray-500 bg-gray-100" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Upcoming Catalysts */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              <h2 className="font-semibold text-gray-800 text-sm">直近のカタリスト</h2>
            </div>
            <Link href="/calendar" className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-0.5">
              カレンダー <ChevronRight size={12} />
            </Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">予定されたカタリストはありません</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcoming.map((c) => {
                const days = daysUntil(c.scheduledDate!);
                return (
                  <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex flex-col items-center justify-center flex-shrink-0 text-center ${
                      days === 0 ? "bg-red-50 text-red-600" :
                      days <= 7 ? "bg-orange-50 text-orange-600" :
                      "bg-blue-50 text-blue-600"
                    }`}>
                      <span className="text-lg font-bold leading-none">{days}</span>
                      <span className="text-xs leading-none">日後</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{c.stock?.ticker}</span>
                        <span className="text-sm text-gray-800 truncate">{c.title}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">
                          {format(parseISO(c.scheduledDate!), "M月d日（E）", { locale: ja })}
                        </span>
                        <ImportanceBadge value={c.importance} />
                      </div>
                    </div>
                    <Link href={`/watchlist/${c.stockId}`} className="text-gray-300 hover:text-gray-600 flex-shrink-0">
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100">
            <Clock size={16} className="text-red-400" />
            <h2 className="font-semibold text-gray-800 text-sm">要確認（日付超過）</h2>
            {overdue.length > 0 && (
              <span className="ml-auto text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{overdue.length}</span>
            )}
          </div>
          {overdue.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">超過したカタリストはありません</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {overdue.map((c) => (
                <div key={c.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700">{c.stock?.ticker}</span>
                      <span className="text-sm text-gray-800 truncate">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-red-400">
                        {format(parseISO(c.scheduledDate!), "M月d日", { locale: ja })} 超過
                      </span>
                      <ImportanceBadge value={c.importance} />
                    </div>
                  </div>
                  <Link href={`/watchlist/${c.stockId}`} className="text-gray-300 hover:text-gray-600 flex-shrink-0">
                    <ChevronRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, Calendar, Upload, Sword } from "lucide-react";

const nav = [
  { href: "/", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/watchlist", label: "ウォッチリスト", icon: List },
  { href: "/calendar", label: "カレンダー", icon: Calendar },
  { href: "/import", label: "インポート", icon: Upload },
  { href: "/roguelike", label: "ダンジョンRPG", icon: Sword },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-5 py-4 border-b border-gray-200">
        <h1 className="text-base font-bold text-gray-800">銘柄ウォッチ</h1>
        <p className="text-xs text-gray-400 mt-0.5">カタリスト管理</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

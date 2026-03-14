export type Importance = "High" | "Medium" | "Low";
export type CatalystStatus = "pending" | "realized" | "expired";
export type SourceType = "slack" | "x" | "excel" | "manual";

export interface Catalyst {
  id: string;
  stockId: string;
  title: string;
  category: string;
  scheduledDate: string | null;
  scheduledQ: string | null;
  importance: Importance;
  status: CatalystStatus;
  sourceType: SourceType | null;
  sourceUrl: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
  stock?: { ticker: string; name: string };
}

export interface Stock {
  id: string;
  ticker: string;
  name: string;
  market: string | null;
  sector: string | null;
  memo: string | null;
  tags: string; // JSON string
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  catalysts: Catalyst[];
}

export const CATEGORIES = ["決算", "IR", "規制", "マクロ", "需給", "その他"] as const;
export const IMPORTANCES: Importance[] = ["High", "Medium", "Low"];
export const STATUSES: { value: CatalystStatus; label: string }[] = [
  { value: "pending", label: "待機中" },
  { value: "realized", label: "顕在化済" },
  { value: "expired", label: "消滅" },
];
export const IMPORTANCE_COLOR: Record<Importance, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-yellow-100 text-yellow-700",
  Low: "bg-blue-100 text-blue-700",
};
export const STATUS_COLOR: Record<CatalystStatus, string> = {
  pending: "bg-green-100 text-green-700",
  realized: "bg-gray-100 text-gray-500",
  expired: "bg-gray-100 text-gray-400 line-through",
};

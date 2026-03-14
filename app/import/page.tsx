"use client";
import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle, Zap } from "lucide-react";

type FieldKey =
  | "ticker" | "name" | "market" | "sector" | "evaluation"
  | "earningsMonth" | "catalyst" | "date" | "scheduledQ"
  | "category" | "importance" | "comment" | "stockMemo";

const COLUMN_FIELDS: { key: FieldKey; label: string; required?: boolean }[] = [
  { key: "name",          label: "銘柄名",                   required: true },
  { key: "ticker",        label: "ティッカー / 銘柄コード" },
  { key: "date",          label: "次回決算等（予定日）" },
  { key: "scheduledQ",    label: "次回決算期" },
  { key: "earningsMonth", label: "決算月" },
  { key: "evaluation",    label: "評価" },
  { key: "comment",       label: "コメント" },
  { key: "stockMemo",     label: "備考" },
  { key: "catalyst",      label: "カタリスト名" },
  { key: "category",      label: "カテゴリ" },
  { key: "importance",    label: "重要度" },
  { key: "market",        label: "市場" },
  { key: "sector",        label: "セクター" },
];

/** 列名の自動マッピングルール（部分一致） */
const AUTO_RULES: { key: FieldKey; patterns: string[] }[] = [
  { key: "name",          patterns: ["銘柄名", "銘柄", "会社名", "name"] },
  { key: "ticker",        patterns: ["コード", "ticker", "ティッカー", "symbol"] },
  { key: "date",          patterns: ["次回決算等", "決算日", "予定日", "date"] },
  { key: "scheduledQ",    patterns: ["次回決算期", "決算期", "quarter"] },
  { key: "earningsMonth", patterns: ["決算月"] },
  { key: "evaluation",    patterns: ["評価", "rating"] },
  { key: "comment",       patterns: ["コメント", "comment", "メモ"] },
  { key: "stockMemo",     patterns: ["備考", "note", "remarks"] },
  { key: "catalyst",      patterns: ["カタリスト", "catalyst", "イベント"] },
  { key: "category",      patterns: ["カテゴリ", "category", "分類"] },
  { key: "importance",    patterns: ["重要度", "importance", "priority"] },
  { key: "market",        patterns: ["市場", "market"] },
  { key: "sector",        patterns: ["セクター", "sector", "業種"] },
];

function autoDetect(headers: string[]): Partial<Record<FieldKey, string>> {
  const result: Partial<Record<FieldKey, string>> = {};
  for (const { key, patterns } of AUTO_RULES) {
    for (const h of headers) {
      const hl = h.toLowerCase();
      if (patterns.some((p) => hl.includes(p.toLowerCase()))) {
        result[key] = h;
        break;
      }
    }
  }
  return result;
}

/** ヘッダー行を自動探索（既知の列名が最も多くマッチする行） */
async function findBestHeaderRow(f: File): Promise<{ row: number; headers: string[] }> {
  const { read, utils } = await import("xlsx");
  const buf = await f.arrayBuffer();
  const wb = read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const allRows = utils.sheet_to_json<unknown[][]>(ws, { header: 1 });

  let bestRow = 1;
  let bestScore = -1;
  let bestHeaders: string[] = [];

  const knownWords = AUTO_RULES.flatMap((r) => r.patterns.map((p) => p.toLowerCase()));

  for (let i = 0; i < Math.min(6, allRows.length); i++) {
    const cells = (allRows[i] as unknown[] || []).map((v) => String(v ?? "").trim()).filter(Boolean);
    const score = cells.filter((c) =>
      knownWords.some((w) => c.toLowerCase().includes(w))
    ).length;
    if (score > bestScore) {
      bestScore = score;
      bestRow = i + 1;
      bestHeaders = cells;
    }
  }
  return { row: bestRow, headers: bestHeaders };
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [autoDetected, setAutoDetected] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMapping, setShowMapping] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (f: File) => {
    setFile(f);
    setResult(null);
    const { row, headers: hs } = await findBestHeaderRow(f);
    setHeaderRow(row);
    setHeaders(hs);
    const detected = autoDetect(hs);
    setMapping(detected);
    setAutoDetected(Object.keys(detected).length > 0);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const doImport = async () => {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("mapping", JSON.stringify(mapping));
    fd.append("headerRow", String(headerRow));
    const res = await fetch("/api/import", { method: "POST", body: fd });
    setResult(await res.json());
    setLoading(false);
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Excelインポート</h1>
        <p className="text-sm text-gray-500 mt-0.5">Excelをアップロードすると列を自動検出します</p>
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors mb-4"
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        {file ? (
          <div className="flex flex-col items-center gap-2">
            <FileSpreadsheet size={36} className="text-green-500" />
            <p className="font-medium text-gray-800">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-gray-400">
            <Upload size={36} />
            <p className="text-sm font-medium">ファイルをドラッグ＆ドロップ</p>
            <p className="text-xs">または クリックして選択（.xlsx / .xls / .csv）</p>
          </div>
        )}
      </div>

      {/* Auto-detect result */}
      {file && headers.length > 0 && (
        <div className={`rounded-xl p-4 mb-4 border ${autoDetected ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className={autoDetected ? "text-green-600" : "text-yellow-600"} />
            <span className="font-medium text-sm">
              {autoDetected
                ? `列を自動検出しました（${mappedCount}列マッピング済・${headerRow}行目をヘッダーとして使用）`
                : "列を自動検出できませんでした。手動で設定してください"}
            </span>
          </div>

          {/* Detected mappings summary */}
          {autoDetected && (
            <div className="flex flex-wrap gap-2 mb-2">
              {COLUMN_FIELDS.filter(f => mapping[f.key]).map(({ key, label }) => (
                <span key={key} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {label} → {mapping[key]}
                </span>
              ))}
            </div>
          )}

          <button
            onClick={() => setShowMapping(!showMapping)}
            className="text-xs text-blue-600 underline"
          >
            {showMapping ? "▲ マッピングを閉じる" : "▼ マッピングを確認・修正する"}
          </button>
        </div>
      )}

      {/* Column Mapping (collapsible) */}
      {showMapping && headers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-1">列のマッピング設定</h2>
          <p className="text-xs text-gray-400 mb-3">ヘッダー行: {headerRow}行目 ／ 検出列: {headers.join(", ")}</p>
          <div className="space-y-3">
            {COLUMN_FIELDS.map(({ key, label, required }) => (
              <div key={key} className="flex items-center gap-3">
                <label className="w-44 text-sm text-gray-700 flex-shrink-0">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                <select
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={mapping[key] || ""}
                  onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value || undefined }))}
                >
                  <option value="">— 対応なし —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={doImport}
        disabled={!file || !mapping.name || loading}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? "インポート中..." : "インポート実行"}
      </button>

      {/* Result */}
      {result && (
        <div className={`mt-5 rounded-xl p-4 ${result.errors.length === 0 ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
          <div className="flex items-center gap-2 mb-2">
            {result.errors.length === 0
              ? <CheckCircle size={18} className="text-green-600" />
              : <AlertCircle size={18} className="text-yellow-600" />}
            <span className="font-medium text-sm">インポート完了</span>
          </div>
          <p className="text-sm text-gray-700">新規作成: {result.created} 銘柄 / スキップ: {result.skipped} 件</p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-600 mb-1">エラー ({result.errors.length}件):</p>
              <ul className="text-xs text-red-500 space-y-0.5 max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => <li key={i}>・{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from "lucide-react";

type FieldKey =
  | "ticker"
  | "name"
  | "market"
  | "sector"
  | "evaluation"
  | "earningsMonth"
  | "catalyst"
  | "date"
  | "scheduledQ"
  | "category"
  | "importance"
  | "comment"
  | "stockMemo";

const COLUMN_FIELDS: { key: FieldKey; label: string; required?: boolean; hint?: string }[] = [
  { key: "name",         label: "銘柄名",                    required: true,  hint: "銘柄" },
  { key: "ticker",       label: "ティッカー / 銘柄コード",               hint: "未指定時は銘柄名をコードとして使用" },
  { key: "date",         label: "次回決算等（予定日）",                  hint: "次回決算等" },
  { key: "scheduledQ",   label: "次回決算期（例: 4Q, 1Q）",             hint: "次回決算期" },
  { key: "earningsMonth",label: "決算月",                              hint: "決算月" },
  { key: "evaluation",   label: "評価",                               hint: "評価 → タグに保存" },
  { key: "catalyst",     label: "カタリスト名（省略時: 決算発表）" },
  { key: "category",     label: "カテゴリ" },
  { key: "importance",   label: "重要度" },
  { key: "comment",      label: "コメント",                           hint: "コメント → カタリストメモに保存" },
  { key: "stockMemo",    label: "備考",                               hint: "備考 → 銘柄メモに保存" },
  { key: "market",       label: "市場" },
  { key: "sector",       label: "セクター" },
];

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerRow, setHeaderRow] = useState(1);
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({});
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadHeaders = async (f: File, row: number) => {
    const { read, utils } = await import("xlsx");
    const buf = await f.arrayBuffer();
    const wb = read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json<unknown[][]>(ws, { header: 1 });
    const headerIdx = row - 1;
    if (rows[headerIdx]) {
      setHeaders((rows[headerIdx] as unknown[]).map((v) => String(v ?? "").trim()).filter(Boolean));
    }
  };

  const handleFile = async (f: File) => {
    setFile(f);
    setResult(null);
    await loadHeaders(f, headerRow);
  };

  const handleHeaderRowChange = async (row: number) => {
    setHeaderRow(row);
    if (file) await loadHeaders(file, row);
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

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Excelインポート</h1>
        <p className="text-sm text-gray-500 mt-0.5">既存のExcel / CSVファイルから銘柄・カタリストを一括取り込み</p>
      </div>

      {/* File Drop Zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors mb-4"
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
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

      {/* Header Row Selector */}
      {file && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-center gap-3">
          <label className="text-sm text-gray-700 font-medium flex-shrink-0">ヘッダー行番号</label>
          <select
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={headerRow}
            onChange={(e) => handleHeaderRowChange(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n}行目</option>
            ))}
          </select>
          <p className="text-xs text-gray-400">Excelの何行目が列名（ヘッダー）か指定してください</p>
        </div>
      )}

      {/* Column Mapping */}
      {headers.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-5">
          <h2 className="font-semibold text-gray-800 mb-4">列のマッピング設定</h2>
          <p className="text-xs text-gray-500 mb-4">Excelの列名と、アプリのフィールドを対応付けてください</p>
          <div className="space-y-3">
            {COLUMN_FIELDS.map(({ key, label, required, hint }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-52 flex-shrink-0">
                  <label className="text-sm text-gray-700">
                    {label} {required && <span className="text-red-500">*</span>}
                  </label>
                  {hint && <p className="text-xs text-gray-400">{hint}</p>}
                </div>
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

      {/* Sample Format */}
      <div className="bg-gray-50 rounded-xl p-4 mb-5 text-xs text-gray-500">
        <p className="font-medium text-gray-700 mb-2">対応Excelフォーマット（列名の例）</p>
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-gray-200">
                {["銘柄", "次回決算等", "次回決算期", "決算月", "評価", "コメント", "備考"].map((h) => (
                  <th key={h} className="border border-gray-300 px-2 py-1 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {["GA Technologies", "26/12/15", "4Q", "10月", "A", "強気ガイダンスで...", "分析シート参照"].map((v, i) => (
                  <td key={i} className="border border-gray-300 px-2 py-1 text-gray-600">{v}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

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
            {result.errors.length === 0 ? <CheckCircle size={18} className="text-green-600" /> : <AlertCircle size={18} className="text-yellow-600" />}
            <span className="font-medium text-sm">インポート完了</span>
          </div>
          <p className="text-sm text-gray-700">新規作成: {result.created} 銘柄 / スキップ: {result.skipped} 件</p>
          {result.errors.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-600 mb-1">エラー ({result.errors.length}件):</p>
              <ul className="text-xs text-red-500 space-y-0.5">
                {result.errors.map((e, i) => <li key={i}>・{e}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

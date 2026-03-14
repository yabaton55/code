import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

/** YY/MM/DD や YY/M/D 形式を 20YY-MM-DD として解析 */
function parseJapaneseDate(raw: unknown): Date | null {
  if (raw instanceof Date) return isNaN(raw.getTime()) ? null : raw;
  if (!raw) return null;
  const s = String(raw).trim();
  // "26/12/15" or "26/2/12" -> 2026-12-15
  const m = s.match(/^(\d{2})\/(\d{1,2})\/(\d{1,2})/);
  if (m) {
    const d = new Date(`20${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
    if (!isNaN(d.getTime())) return d;
  }
  // ISO / standard format fallback
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/** 文字列をティッカーとして使えるように正規化 */
function toTicker(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "")
    .slice(0, 20);
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const mapping = JSON.parse(formData.get("mapping") as string || "{}");
  const headerRow = parseInt(String(formData.get("headerRow") || "1"), 10);

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  // headerRow は 1-indexed, XLSX range は 0-indexed
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: "",
    range: headerRow - 1,
  });

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const rawName = String(row[mapping.name] || "").trim();
    const rawTicker = String(row[mapping.ticker] || "").trim();

    // 銘柄名が空ならスキップ
    if (!rawName) { results.skipped++; continue; }

    // ticker は明示指定 > 銘柄名から生成
    const ticker = rawTicker ? toTicker(rawTicker) : toTicker(rawName);
    if (!ticker) { results.skipped++; continue; }

    const name = rawName || ticker;
    const market = String(row[mapping.market] || "").trim() || null;
    const sector = String(row[mapping.sector] || "").trim() || null;
    const stockMemo = String(row[mapping.stockMemo] || "").trim() || null;
    const evaluation = String(row[mapping.evaluation] || "").trim();
    const tags = evaluation ? JSON.stringify([evaluation]) : "[]";

    const catalystTitle = String(row[mapping.catalyst] || "").trim();
    const rawDate = row[mapping.date];
    const rawQ = String(row[mapping.scheduledQ] || "").trim();
    const rawMonth = String(row[mapping.earningsMonth] || "").trim();
    const comment = String(row[mapping.comment] || "").trim() || null;
    const category = String(row[mapping.category] || "決算").trim();
    const importance = String(row[mapping.importance] || "Medium").trim();

    // 決算期の組み立て: "4Q" + 決算月 "10月" -> "4Q(10月)" で補足情報として付加
    const scheduledQ = rawQ
      ? rawMonth ? `${rawQ}(${rawMonth})` : rawQ
      : rawMonth || null;

    const scheduledDate = parseJapaneseDate(rawDate);

    // カタリストを作るか判定: 日付・期・コメントのいずれかがあれば作成
    const has催yst = catalystTitle || scheduledDate || scheduledQ || comment;

    try {
      let stock = await prisma.stock.findUnique({ where: { ticker } });
      if (!stock) {
        stock = await prisma.stock.create({
          data: { ticker, name, market, sector, memo: stockMemo, tags },
        });
        results.created++;
      } else if (stockMemo && !stock.memo) {
        // 既存銘柄のメモを補完
        await prisma.stock.update({ where: { id: stock.id }, data: { memo: stockMemo } });
      }

      if (has催yst) {
        const title = catalystTitle || "決算発表";
        await prisma.catalyst.create({
          data: {
            stockId: stock.id,
            title,
            category,
            scheduledDate,
            scheduledQ,
            importance,
            memo: comment,
            sourceType: "excel",
          },
        });
      }
    } catch (e) {
      results.errors.push(`${name}: ${String(e)}`);
    }
  }

  return NextResponse.json(results);
}

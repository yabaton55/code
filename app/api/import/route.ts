import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const mapping = JSON.parse(formData.get("mapping") as string || "{}");

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const results = { created: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const ticker = String(row[mapping.ticker] || "").trim().toUpperCase();
    const name = String(row[mapping.name] || ticker).trim();
    const catalystTitle = String(row[mapping.catalyst] || "").trim();
    const rawDate = row[mapping.date];

    if (!ticker) { results.skipped++; continue; }

    try {
      let stock = await prisma.stock.findUnique({ where: { ticker } });
      if (!stock) {
        stock = await prisma.stock.create({
          data: {
            ticker,
            name: name || ticker,
            market: String(row[mapping.market] || "").trim() || null,
            sector: String(row[mapping.sector] || "").trim() || null,
          },
        });
        results.created++;
      }

      if (catalystTitle) {
        let scheduledDate: Date | null = null;
        if (rawDate instanceof Date) {
          scheduledDate = rawDate;
        } else if (rawDate) {
          const parsed = new Date(String(rawDate));
          if (!isNaN(parsed.getTime())) scheduledDate = parsed;
        }

        await prisma.catalyst.create({
          data: {
            stockId: stock.id,
            title: catalystTitle,
            category: String(row[mapping.category] || "その他").trim(),
            scheduledDate,
            scheduledQ: String(row[mapping.scheduledQ] || "").trim() || null,
            importance: String(row[mapping.importance] || "Medium").trim(),
            sourceType: "excel",
          },
        });
      }
    } catch (e) {
      results.errors.push(`${ticker}: ${String(e)}`);
    }
  }

  return NextResponse.json(results);
}

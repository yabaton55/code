import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const archived = searchParams.get("archived") === "true";
  const q = searchParams.get("q") || "";

  const stocks = await prisma.stock.findMany({
    where: {
      archived,
      OR: q
        ? [
            { ticker: { contains: q } },
            { name: { contains: q } },
            { sector: { contains: q } },
          ]
        : undefined,
    },
    include: { catalysts: { orderBy: { scheduledDate: "asc" } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(stocks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const stock = await prisma.stock.create({
    data: {
      ticker: body.ticker,
      name: body.name,
      market: body.market || null,
      sector: body.sector || null,
      memo: body.memo || null,
      tags: JSON.stringify(body.tags || []),
    },
    include: { catalysts: true },
  });
  return NextResponse.json(stock, { status: 201 });
}

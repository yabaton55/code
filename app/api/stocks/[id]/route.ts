import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stock = await prisma.stock.findUnique({
    where: { id },
    include: { catalysts: { orderBy: { scheduledDate: "asc" } } },
  });
  if (!stock) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(stock);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const stock = await prisma.stock.update({
    where: { id },
    data: {
      ticker: body.ticker,
      name: body.name,
      market: body.market,
      sector: body.sector,
      memo: body.memo,
      tags: body.tags !== undefined ? JSON.stringify(body.tags) : undefined,
      archived: body.archived,
    },
    include: { catalysts: true },
  });
  return NextResponse.json(stock);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.stock.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

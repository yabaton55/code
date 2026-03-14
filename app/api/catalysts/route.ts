import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const stockId = searchParams.get("stockId");
  const status = searchParams.get("status");
  const days = searchParams.get("days");

  const where: Record<string, unknown> = {};
  if (stockId) where.stockId = stockId;
  if (status) where.status = status;
  if (days) {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + parseInt(days));
    where.scheduledDate = { gte: from, lte: to };
  }

  const catalysts = await prisma.catalyst.findMany({
    where,
    include: { stock: { select: { ticker: true, name: true } } },
    orderBy: { scheduledDate: "asc" },
  });
  return NextResponse.json(catalysts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const catalyst = await prisma.catalyst.create({
    data: {
      stockId: body.stockId,
      title: body.title,
      category: body.category || "その他",
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      scheduledQ: body.scheduledQ || null,
      importance: body.importance || "Medium",
      status: body.status || "pending",
      sourceType: body.sourceType || "manual",
      sourceUrl: body.sourceUrl || null,
      memo: body.memo || null,
    },
    include: { stock: { select: { ticker: true, name: true } } },
  });
  return NextResponse.json(catalyst, { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const catalyst = await prisma.catalyst.update({
    where: { id },
    data: {
      title: body.title,
      category: body.category,
      scheduledDate: body.scheduledDate ? new Date(body.scheduledDate) : null,
      scheduledQ: body.scheduledQ,
      importance: body.importance,
      status: body.status,
      sourceType: body.sourceType,
      sourceUrl: body.sourceUrl,
      memo: body.memo,
    },
    include: { stock: { select: { ticker: true, name: true } } },
  });
  return NextResponse.json(catalyst);
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.catalyst.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

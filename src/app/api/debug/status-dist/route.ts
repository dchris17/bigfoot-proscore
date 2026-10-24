import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const year = 2026, mon = 10;
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 1);

  const totalCount = await prisma.appointment.count();
  const allAppts = await prisma.appointment.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    select: { status: true, productionValue: true },
  });
  if (allAppts.length === 0) {
    return NextResponse.json({ totalCount, monthCount: 0, monthStart, monthEnd, error: "no appointments in range" });
  }

  const statusMap = new Map<number, number>();
  const prodMap = new Map<string, number>();
  for (const a of allAppts) {
    statusMap.set(a.status, (statusMap.get(a.status) ?? 0) + 1);
    if (a.status === 1) {
      const pv = a.productionValue?.toString() ?? "null";
      prodMap.set(pv, (prodMap.get(pv) ?? 0) + 1);
    }
  }
  const statuses = [...statusMap.entries()].map(([status, cnt]) => ({ status, cnt })).sort((a, b) => b.cnt - a.cnt);
  const prodDist = [...prodMap.entries()].map(([productionValue, cnt]) => ({ productionValue, cnt })).sort((a, b) => b.cnt - a.cnt).slice(0, 10);

  return NextResponse.json({ statusDist: statuses, topProdValues: prodDist });
}

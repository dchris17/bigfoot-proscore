import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const year = 2026, mon = 10;
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd   = new Date(year, mon, 1);

  const GENERAL_TYPE_IDS = [9, 6, 15, 242, 1, 2, 151, 11, 7, 14, 236, 26, 237];

  const [monthAppts, techs] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: monthStart, lt: monthEnd }, status: 1 },
      select: {
        id: true, assignedEmployeeId: true, servicedByEmployeeId: true,
        isReservice: true, rawJson: true, customerId: true,
      },
    }),
    db.tech.findMany({
      where: { included: true, active: true },
      select: { id: true, name: true, fieldroutesEmployeeId: true },
    }) as Promise<{ id: string; name: string; fieldroutesEmployeeId: number }[]>,
  ]);

  const reserviceAppts = monthAppts.filter((a: { isReservice: boolean }) => a.isReservice);
  const regularAppts   = monthAppts.filter((a: { isReservice: boolean }) => !a.isReservice);

  // Count by type for context
  const typeCounts: Record<string, { count: number; isReservice: boolean }> = {};
  for (const a of monthAppts) {
    const raw = a.rawJson as Record<string, unknown>;
    const t = (raw.type as string) ?? "?";
    if (!typeCounts[t]) typeCounts[t] = { count: 0, isReservice: a.isReservice };
    typeCounts[t].count++;
  }

  // Build customer→tech map
  const customerIds = [...new Set(
    reserviceAppts
      .map((a: { rawJson: unknown }) => { const raw = a.rawJson as Record<string, unknown>; return raw.customerID ? parseInt(raw.customerID as string) : null; })
      .filter(Boolean) as number[]
  )];

  const customerToTech = new Map<number, number>();
  if (customerIds.length > 0) {
    const lookbackStart = new Date(year, mon - 7, 1);
    const priorRegular = await prisma.appointment.findMany({
      where: {
        date: { gte: lookbackStart, lt: monthStart },
        status: 1,
        isReservice: false,
        customerId: { in: customerIds },
      },
      select: { customerId: true, assignedEmployeeId: true, servicedByEmployeeId: true, rawJson: true },
      orderBy: { date: "desc" },
    });
    for (const a of priorRegular) {
      if (!a.customerId || customerToTech.has(a.customerId)) continue;
      const raw = a.rawJson as Record<string, unknown>;
      const typeId = raw.type ? parseInt(raw.type as string) : 0;
      if (!GENERAL_TYPE_IDS.includes(typeId)) continue;
      customerToTech.set(a.customerId, a.servicedByEmployeeId ?? a.assignedEmployeeId);
    }
  }

  const unmatchedCids = customerIds.filter(cid => !customerToTech.has(cid));

  const perTech = techs.map((tech: { id: string; name: string; fieldroutesEmployeeId: number }) => {
    const frId = tech.fieldroutesEmployeeId;
    const myRegular = regularAppts.filter(
      (a: { servicedByEmployeeId: number | null; assignedEmployeeId: number }) =>
        (a.servicedByEmployeeId ?? a.assignedEmployeeId) === frId
    );
    const myReservices = reserviceAppts.filter((a: { rawJson: unknown }) => {
      const raw = a.rawJson as Record<string, unknown>;
      const cid = raw.customerID ? parseInt(raw.customerID as string) : null;
      if (!cid) return false;
      return customerToTech.get(cid) === frId;
    });
    return {
      name: tech.name,
      frId,
      regularStops: myRegular.length,
      attributedReservices: myReservices.length,
      ratePct: myRegular.length > 0
        ? Math.round((myReservices.length / myRegular.length) * 1000) / 10
        : null,
    };
  });

  return NextResponse.json({
    totalOctAppts: monthAppts.length,
    totalReservices: reserviceAppts.length,
    totalRegular: regularAppts.length,
    reserviceCustomers: customerIds.length,
    unmatchedCustomers: unmatchedCids.length,
    unmatchedCids: unmatchedCids.slice(0, 10),
    typeCounts,
    perTech,
  });
}

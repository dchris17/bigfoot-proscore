import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const year = 2026, mon = 10;
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 1);

  const cancelled = await prisma.appointment.findMany({
    where: { date: { gte: monthStart, lt: monthEnd }, status: 2, isReservice: false },
    select: { id: true, assignedEmployeeId: true, servicedByEmployeeId: true, rawJson: true },
  });

  // Count by assignedEmployeeId
  const assignedCounts = new Map<number, number>();
  for (const a of cancelled) {
    const eid = a.assignedEmployeeId;
    if (eid) assignedCounts.set(eid, (assignedCounts.get(eid) ?? 0) + 1);
  }

  // All techs
  const techs = await db.tech.findMany({
    select: { name: true, fieldroutesEmployeeId: true, included: true, active: true },
  }) as { name: string; fieldroutesEmployeeId: number; included: boolean; active: boolean }[];
  const techMap = new Map(techs.map(t => [t.fieldroutesEmployeeId, t]));

  const breakdown = [...assignedCounts.entries()].map(([eid, cnt]) => {
    const tech = techMap.get(eid);
    return {
      assignedEmployeeId: eid,
      count: cnt,
      techName: tech?.name ?? "NOT IN TECH TABLE",
      included: tech?.included ?? false,
    };
  }).sort((a, b) => b.count - a.count);

  // Sample a cancelled appt to see what's in rawJson
  const sample = cancelled[0];
  const rawKeys = sample ? Object.keys(sample.rawJson as object) : [];
  // Show the tech-relevant fields on first 5 cancelled appts
  const rawSamples = cancelled.slice(0, 5).map(a => {
    const r = a.rawJson as Record<string, unknown>;
    return {
      id: a.id,
      employeeID: r.employeeID,
      servicedBy: r.servicedBy,
      assignedTech: r.assignedTech,
      subscriptionPreferredTech: r.subscriptionPreferredTech,
      cancelledBy: r.cancelledBy,
      completedBy: r.completedBy,
    };
  });

  return NextResponse.json({ totalCancelled: cancelled.length, breakdown, rawSamples });
}

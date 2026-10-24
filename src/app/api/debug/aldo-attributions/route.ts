import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const year = 2026, mon = 10;
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd   = new Date(year, mon, 1);
  const lookbackStart = new Date(year, mon - 7, 1);

  const GENERAL_TYPE_IDS = [9, 6, 15, 242, 1, 2, 151, 11, 7, 14, 236, 26, 237];

  // Get Aldo's frId
  const aldo = await db.tech.findFirst({ where: { name: { contains: "Aldo" } }, select: { fieldroutesEmployeeId: true, name: true } });
  if (!aldo) return NextResponse.json({ error: "Aldo not found" });
  const aldoFrId: number = aldo.fieldroutesEmployeeId;

  // October reservices
  const reserviceAppts = await prisma.appointment.findMany({
    where: { date: { gte: monthStart, lt: monthEnd }, status: 1, isReservice: true },
    select: { id: true, date: true, checkIn: true, rawJson: true, assignedEmployeeId: true, servicedByEmployeeId: true },
  });

  // Build reservice date map
  const customerToResrviceDate = new Map<number, Date>();
  for (const ra of reserviceAppts) {
    const raw = ra.rawJson as Record<string, unknown>;
    const cid = raw.customerID ? parseInt(raw.customerID as string) : null;
    if (cid) {
      const raDate = ra.checkIn ?? ra.date;
      const existing = customerToResrviceDate.get(cid);
      if (!existing || raDate < existing) customerToResrviceDate.set(cid, raDate);
    }
  }
  const customerIds = [...customerToResrviceDate.keys()];

  // All prior regular services for these customers
  const priorRegular = await prisma.appointment.findMany({
    where: {
      date: { gte: lookbackStart, lt: monthEnd },
      status: 1,
      isReservice: false,
      customerId: { in: customerIds },
    },
    select: { customerId: true, id: true, date: true, checkIn: true, assignedEmployeeId: true, servicedByEmployeeId: true, rawJson: true },
    orderBy: { date: "desc" },
  });

  // Build attribution map — same logic as page.tsx
  const customerToTech = new Map<number, number>();
  for (const a of priorRegular) {
    if (!a.customerId || customerToTech.has(a.customerId)) continue;
    const raw = a.rawJson as Record<string, unknown>;
    const typeId = raw.type ? parseInt(raw.type as string) : 0;
    if (!GENERAL_TYPE_IDS.includes(typeId)) continue;
    const rsDate = customerToResrviceDate.get(a.customerId);
    const svcDate = a.checkIn ?? a.date;
    if (rsDate && svcDate >= rsDate) continue;
    customerToTech.set(a.customerId, a.servicedByEmployeeId ?? a.assignedEmployeeId);
  }

  // Find customers attributed to Aldo
  const aldoCustomers = [...customerToTech.entries()]
    .filter(([, techId]) => techId === aldoFrId)
    .map(([cid]) => cid);

  // Get details for each attributed customer
  const details = await Promise.all(aldoCustomers.map(async (cid) => {
    // The reservice(s) for this customer
    const rs = reserviceAppts.filter(ra => {
      const raw = ra.rawJson as Record<string, unknown>;
      return raw.customerID ? parseInt(raw.customerID as string) === cid : false;
    });
    // The prior services for this customer (ordered by date desc)
    const prior = priorRegular
      .filter(a => a.customerId === cid)
      .slice(0, 5)
      .map(a => {
        const raw = a.rawJson as Record<string, unknown>;
        return {
          apptId: a.id,
          date: a.date,
          checkIn: a.checkIn,
          type: raw.type,
          servicedBy: a.servicedByEmployeeId,
          assigned: a.assignedEmployeeId,
        };
      });
    return { customerId: cid, reservices: rs.map(r => ({ id: r.id, date: r.date, checkIn: r.checkIn })), priorServices: prior };
  }));

  return NextResponse.json({ aldoFrId, aldoCustomers, details, totalAttributed: aldoCustomers.length });
}

import { prisma } from "@/lib/prisma";

/**
 * Driven-style reservice attribution. Checked against Driven's drill-downs for
 * September and October 2026: 9 of 10 techs exact in both months.
 *
 * - A reservice is a completed appointment whose FieldRoutes service type has the
 *   reservice flag (Reservice, Gopher Bait Check, Clover Mite Check, ...).
 * - It is charged to whoever did the customer's most recent earlier completed
 *   appointment in the same service category (GENERAL / SPECIALTY / MOSQUITO).
 *   That earlier visit can itself be a reservice (gopher bait checks chain), and
 *   there is no time limit.
 * - The rate divides by every appointment scheduled for the tech that month, in any
 *   status. Completed visits count for the tech who serviced them; pending,
 *   cancelled, rescheduled and no-show visits count for the route's tech
 *   (assignedEmployeeId).
 *
 * Needs the ServiceType table and all appointment statuses synced from FieldRoutes.
 */

export interface ReserviceCharge {
  customerId: number;
  reserviceDate: Date;
  reservicedById: number;
  originalDate: Date;
  category: string;
}

export interface ReserviceResult {
  /** FieldRoutes employee ID → reservices charged to them this month */
  charges: Map<number, ReserviceCharge[]>;
  /** FieldRoutes employee ID → appointments scheduled for them this month, any status */
  scheduled: Map<number, number>;
}

export type ApptRow = {
  status: number;
  date: Date;
  customerId: number | null;
  serviceTypeId: number | null;
  assignedEmployeeId: number;
  servicedByEmployeeId: number | null;
  rawJson: unknown;
};

const SELECT = {
  status: true, date: true, customerId: true, serviceTypeId: true,
  assignedEmployeeId: true, servicedByEmployeeId: true, rawJson: true,
} as const;

function typeOf(a: ApptRow): number {
  if (a.serviceTypeId) return a.serviceTypeId;
  const raw = a.rawJson as Record<string, unknown>;
  return raw.type ? parseInt(raw.type as string) : 0;
}

function customerOf(a: ApptRow): number | null {
  if (a.customerId) return a.customerId;
  const raw = a.rawJson as Record<string, unknown>;
  return raw.customerID ? parseInt(raw.customerID as string) : null;
}

function techOf(a: ApptRow): number {
  return a.status === 1 ? (a.servicedByEmployeeId ?? a.assignedEmployeeId) : a.assignedEmployeeId;
}

/** Returns null when service types haven't been synced, so the KPI shows no data instead of 0%. */
export async function computeReservices(monthStart: Date, monthEnd: Date): Promise<ReserviceResult | null> {
  const types: { id: number; category: string; isReservice: boolean }[] =
    await prisma.serviceType.findMany({ select: { id: true, category: true, isReservice: true } });
  if (types.length === 0) return null;
  const typeById = new Map(types.map(t => [t.id, t]));

  const monthAppts: ApptRow[] = await prisma.appointment.findMany({
    where: { date: { gte: monthStart, lt: monthEnd } },
    select: SELECT,
  });

  const reservices = monthAppts.filter(a => a.status === 1 && typeById.get(typeOf(a))?.isReservice);
  const customerIds = [...new Set(reservices.map(customerOf).filter((c): c is number => c !== null))];
  const history: ApptRow[] = customerIds.length > 0
    ? await prisma.appointment.findMany({
        where: { status: 1, customerId: { in: customerIds }, date: { lt: monthEnd } },
        select: SELECT,
      })
    : [];

  return attributeReservices(types, monthAppts, history);
}

/**
 * Pure attribution step. `monthAppts` is every appointment in the month (any status);
 * `history` is completed appointments for the reservice customers, any date before month end.
 */
export function attributeReservices(
  types: { id: number; category: string; isReservice: boolean }[],
  monthAppts: ApptRow[],
  history: ApptRow[],
): ReserviceResult {
  const typeById = new Map(types.map(t => [t.id, t]));
  const scheduled = new Map<number, number>();
  for (const a of monthAppts) {
    const tech = techOf(a);
    scheduled.set(tech, (scheduled.get(tech) ?? 0) + 1);
  }

  const reservices = monthAppts.filter(a => a.status === 1 && typeById.get(typeOf(a))?.isReservice);
  const historyByCustomer = new Map<number, ApptRow[]>();
  for (const a of history) {
    if (a.status !== 1) continue;
    const c = customerOf(a);
    if (c === null) continue;
    if (!historyByCustomer.has(c)) historyByCustomer.set(c, []);
    historyByCustomer.get(c)!.push(a);
  }
  for (const list of historyByCustomer.values()) list.sort((x, y) => y.date.getTime() - x.date.getTime());

  const charges = new Map<number, ReserviceCharge[]>();
  for (const r of reservices) {
    const customerId = customerOf(r);
    const category = typeById.get(typeOf(r))?.category;
    if (customerId === null || !category) continue;
    const prior = historyByCustomer.get(customerId)?.find(
      a => a.date < r.date && typeById.get(typeOf(a))?.category === category
    );
    if (!prior) continue;
    const tech = techOf(prior);
    if (!charges.has(tech)) charges.set(tech, []);
    charges.get(tech)!.push({
      customerId,
      reserviceDate: r.date,
      reservicedById: techOf(r),
      originalDate: prior.date,
      category,
    });
  }

  return { charges, scheduled };
}

/** Reservice % for one tech, or null when there's nothing to measure. */
export function reservicePctFor(result: ReserviceResult | null, frId: number): { pct: number | null; count: number; scheduled: number } {
  if (!result) return { pct: null, count: 0, scheduled: 0 };
  const count = result.charges.get(frId)?.length ?? 0;
  const scheduled = result.scheduled.get(frId) ?? 0;
  return { pct: scheduled > 0 ? (count / scheduled) * 100 : null, count, scheduled };
}

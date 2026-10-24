/**
 * Driven-style production per hour. Checked against Driven's October 2026 drill-downs
 * (Marc $11,682.75 ÷ 90:09 = $129.59, David $7,933.55 ÷ 95:03 = $83.47, both exact)
 * and its leaderboard: 7 of 7 techs live for Oct, 9 of 10 for its Oct 1–13 export.
 *
 * - Production is the ticket's: FieldRoutes' productionValue when it's set (prepaid and
 *   monthly-billing plans, or a custom 0), otherwise the ticket subTotal after discounts.
 *   Not the service charge. The sync stores this on Appointment.productionValue.
 * - Work time is counted per tech per day from FieldRoutes timeIn/timeOut: each visit's
 *   on-site time plus the drive gap before the next visit. Overlapping visits (two units
 *   at one stop) both count in full, since a gap is never negative.
 * - The month's work time is cut to whole minutes before dividing, like Driven's h:mm.
 * - Only completed visits count, credited to the tech who serviced them.
 */

export type ProdHrAppt = {
  status: number;
  date: Date;
  assignedEmployeeId: number;
  servicedByEmployeeId: number | null;
  productionValue: { toString(): string } | number | null;
  rawJson: unknown;
};

export interface ProdHrTotals {
  production: number;
  /** Whole minutes of work time */
  workMinutes: number;
  /** null when there's no work time to divide by */
  prodHr: number | null;
}

/** The production FieldRoutes (and Driven) credit for a ticket. -1 means "use the ticket amount". */
export function ticketProduction(t: { productionValue?: string | null; subTotal?: string | null }): number | null {
  const pv = parseFloat(t.productionValue ?? "");
  if (Number.isFinite(pv) && pv !== -1) return pv;
  const sub = parseFloat(t.subTotal ?? "");
  return Number.isFinite(sub) ? sub : null;
}

/** FieldRoutes "YYYY-MM-DD HH:MM:SS" → ms. The zone doesn't matter, only differences within a day are used. */
function frTime(v: unknown): number | null {
  if (typeof v !== "string" || !v || v.startsWith("0000")) return null;
  const ms = Date.parse(v.replace(" ", "T") + "Z");
  return Number.isNaN(ms) ? null : ms;
}

/** Work time for one tech-day, in ms: on-site time plus the positive gaps between visits. */
export function dayWorkMs(visits: [number, number][]): number {
  const sorted = [...visits].sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let ms = 0;
  sorted.forEach(([start, end], i) => {
    ms += end - start;
    if (i > 0) ms += Math.max(0, start - sorted[i - 1][1]);
  });
  return ms;
}

/** FieldRoutes employee ID → production, work time and $/hr for the appointments given (one month). */
export function computeProdHr(appts: ProdHrAppt[]): Map<number, ProdHrTotals> {
  const production = new Map<number, number>();
  const visitsByDay = new Map<string, { tech: number; visits: [number, number][] }>();

  for (const a of appts) {
    if (a.status !== 1) continue;
    const tech = a.servicedByEmployeeId ?? a.assignedEmployeeId;
    production.set(tech, (production.get(tech) ?? 0) + (a.productionValue === null ? 0 : Number(a.productionValue)));

    const raw = a.rawJson as Record<string, unknown>;
    const start = frTime(raw.timeIn), end = frTime(raw.timeOut);
    if (start === null || end === null || end < start) continue;
    const key = `${tech}|${a.date.toISOString().slice(0, 10)}`;
    if (!visitsByDay.has(key)) visitsByDay.set(key, { tech, visits: [] });
    visitsByDay.get(key)!.visits.push([start, end]);
  }

  const workMs = new Map<number, number>();
  for (const { tech, visits } of visitsByDay.values()) {
    workMs.set(tech, (workMs.get(tech) ?? 0) + dayWorkMs(visits));
  }

  const result = new Map<number, ProdHrTotals>();
  for (const [tech, prod] of production) {
    const workMinutes = Math.floor((workMs.get(tech) ?? 0) / 60000);
    result.set(tech, { production: prod, workMinutes, prodHr: workMinutes > 0 ? prod / (workMinutes / 60) : null });
  }
  return result;
}

export function prodHrFor(result: Map<number, ProdHrTotals>, frId: number): ProdHrTotals {
  return result.get(frId) ?? { production: 0, workMinutes: 0, prodHr: null };
}

/** "90:09" */
export function formatWorkTime(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export const PROD_HR_SELECT = {
  status: true, date: true, assignedEmployeeId: true, servicedByEmployeeId: true,
  productionValue: true, rawJson: true,
} as const;

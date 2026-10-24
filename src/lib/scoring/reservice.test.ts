import { describe, it, expect } from "vitest";
import { attributeReservices, reservicePctFor, type ApptRow } from "./reservice";

// FieldRoutes service types (subset): 7 Quarterly GENERAL, 3 Reservice GENERAL,
// 16 Mosquito MOSQUITO, 25 Rodent 3x SPECIALTY, 369 Gopher Bait Check SPECIALTY (reservice flag)
const TYPES = [
  { id: 7, category: "GENERAL", isReservice: false },
  { id: 3, category: "GENERAL", isReservice: true },
  { id: 16, category: "MOSQUITO", isReservice: false },
  { id: 25, category: "SPECIALTY", isReservice: false },
  { id: 369, category: "SPECIALTY", isReservice: true },
];

const JOHN = 1, FRED = 2, SAM = 3;
const d = (s: string) => new Date(`${s}T00:00:00Z`);
function appt(p: Partial<ApptRow> & { date: string; type: number; tech: number; customer: number; status?: number }): ApptRow {
  const status = p.status ?? 1;
  return {
    status,
    date: d(p.date),
    customerId: p.customer,
    serviceTypeId: p.type,
    // Non-completed visits carry the route's tech in assignedEmployeeId
    assignedEmployeeId: status === 1 ? 999 : p.tech,
    servicedByEmployeeId: status === 1 ? p.tech : null,
    rawJson: {},
  };
}

describe("attributeReservices", () => {
  it("charges the last same-category service, not the reservicing tech or other categories", () => {
    // Driven's own example: John's quarterly, Fred's mosquito, Sam does the reservice -> John
    const history = [
      appt({ date: "2026-10-01", type: 7, tech: JOHN, customer: 100 }),
      appt({ date: "2026-10-08", type: 16, tech: FRED, customer: 100 }),
    ];
    const month = [appt({ date: "2026-10-22", type: 3, tech: SAM, customer: 100 })];
    const r = attributeReservices(TYPES, month, history);
    expect(r.charges.get(JOHN)?.length).toBe(1);
    expect(r.charges.get(SAM)).toBeUndefined();
    expect(r.charges.get(FRED)).toBeUndefined();
  });

  it("has no time limit (Cadence Casterline: Aug 3 service, Oct 13 reservice)", () => {
    const history = [appt({ date: "2026-08-03", type: 7, tech: JOHN, customer: 200 })];
    const month = [appt({ date: "2026-10-13", type: 3, tech: SAM, customer: 200 })];
    expect(attributeReservices(TYPES, month, history).charges.get(JOHN)?.length).toBe(1);
  });

  it("chains gopher bait checks to whoever did the previous bait check", () => {
    const history = [
      appt({ date: "2026-09-01", type: 25, tech: FRED, customer: 300 }),
      appt({ date: "2026-10-02", type: 369, tech: JOHN, customer: 300 }),
      appt({ date: "2026-10-21", type: 369, tech: JOHN, customer: 300 }),
    ];
    const month = history.filter(a => a.date >= d("2026-10-01"));
    const r = attributeReservices(TYPES, month, history);
    // Oct 2 check -> Fred's rodent service; Oct 21 check -> John's Oct 2 check
    expect(r.charges.get(FRED)?.length).toBe(1);
    expect(r.charges.get(JOHN)?.length).toBe(1);
  });

  it("ignores same-day visits and customers with no earlier same-category service", () => {
    const history = [
      appt({ date: "2026-10-05", type: 7, tech: JOHN, customer: 400 }),
      appt({ date: "2026-09-01", type: 16, tech: FRED, customer: 500 }),
    ];
    const month = [
      appt({ date: "2026-10-05", type: 3, tech: SAM, customer: 400 }),
      appt({ date: "2026-10-10", type: 3, tech: SAM, customer: 500 }),
    ];
    expect(attributeReservices(TYPES, month, history).charges.size).toBe(0);
  });

  it("divides by every scheduled appointment, crediting non-completed ones to the route's tech", () => {
    // Arturo, October 2026: 12 reservices / 202 scheduled (132 completed + 70 other) = 5.9%
    const month: ApptRow[] = [];
    for (let i = 0; i < 132; i++) month.push(appt({ date: "2026-10-01", type: 7, tech: JOHN, customer: 1000 + i }));
    for (const [status, n] of [[0, 38], [-1, 13], [-2, 12], [2, 7]] as const)
      for (let i = 0; i < n; i++) month.push(appt({ date: "2026-10-28", type: 7, tech: JOHN, customer: 2000 + i, status }));
    const history: ApptRow[] = [];
    for (let i = 0; i < 12; i++) {
      history.push(appt({ date: "2026-09-15", type: 7, tech: JOHN, customer: 3000 + i }));
      month.push(appt({ date: "2026-10-20", type: 3, tech: SAM, customer: 3000 + i }));
    }
    const r = attributeReservices(TYPES, month, history);
    const john = reservicePctFor(r, JOHN);
    expect(john.count).toBe(12);
    expect(john.scheduled).toBe(202);
    expect(Math.round(john.pct! * 10) / 10).toBe(5.9);
  });

  it("returns no data when service types haven't been synced", () => {
    expect(reservicePctFor(null, JOHN).pct).toBeNull();
  });
});

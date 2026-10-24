import { describe, it, expect } from "vitest";
import { computeProdHr, dayWorkMs, formatWorkTime, prodHrFor, ticketProduction, type ProdHrAppt } from "./prodHr";

const MARC = 10148, DAVID = 10360;
function appt(p: { tech: number; date: string; prod: number | null; in?: string; out?: string; status?: number }): ProdHrAppt {
  return {
    status: p.status ?? 1,
    date: new Date(`${p.date}T00:00:00Z`),
    assignedEmployeeId: p.tech,
    servicedByEmployeeId: p.status === undefined || p.status === 1 ? p.tech : null,
    productionValue: p.prod,
    rawJson: {
      timeIn: p.in ? `${p.date} ${p.in}` : "0000-00-00 00:00:00",
      timeOut: p.out ? `${p.date} ${p.out}` : "0000-00-00 00:00:00",
    },
  };
}
const ms = (h: number, m: number, s = 0) => ((h * 60 + m) * 60 + s) * 1000;

describe("ticketProduction", () => {
  it("uses a set productionValue, even 0, over the ticket amount", () => {
    // Driven credits Marc's Cockroach ticket $2,000, not its $2,149 charge; Rodent Monthly $0, not $125
    expect(ticketProduction({ productionValue: "2000.00", subTotal: "2149.00" })).toBe(2000);
    expect(ticketProduction({ productionValue: "0.00", subTotal: "125.00" })).toBe(0);
  });

  it("falls back to subTotal (after discounts) when productionValue is -1", () => {
    // Initial: $199 service charge, -$132 initial discount -> $67
    expect(ticketProduction({ productionValue: "-1.00", subTotal: "67.00" })).toBe(67);
    expect(ticketProduction({ productionValue: null, subTotal: null })).toBeNull();
  });
});

describe("dayWorkMs", () => {
  it("is first time-in to last time-out when visits don't overlap", () => {
    expect(dayWorkMs([[ms(8, 0), ms(9, 0)], [ms(9, 30), ms(10, 0)], [ms(13, 0), ms(14, 0)]])).toBe(ms(6, 0));
  });

  it("counts overlapping visits in full (David, Oct 12: two units at one stop)", () => {
    const a: [number, number] = [ms(8, 11, 13), ms(10, 39, 35)];
    const b: [number, number] = [ms(8, 11, 13), ms(10, 39, 58)];
    const c: [number, number] = [ms(11, 5, 5), ms(12, 4, 10)];
    const span = c[1] - a[0];
    expect(dayWorkMs([c, b, a])).toBe(span + (a[1] - a[0]));
  });
});

describe("computeProdHr", () => {
  it("sums production and per-day work time, cut to whole minutes", () => {
    const r = computeProdHr([
      appt({ tech: MARC, date: "2026-10-01", prod: 300, in: "08:00:00", out: "09:00:40" }),
      appt({ tech: MARC, date: "2026-10-01", prod: 0, in: "09:30:00", out: "10:00:00" }), // reservice: $0 but its time counts
      appt({ tech: MARC, date: "2026-10-02", prod: 150, in: "13:00:00", out: "14:00:00" }),
      appt({ tech: MARC, date: "2026-10-02", prod: 50 }), // no times: production still counts
    ]);
    expect(prodHrFor(r, MARC)).toEqual({ production: 500, workMinutes: 180, prodHr: 500 / 3 });
  });

  it("ignores visits that weren't completed, and credits whoever serviced it", () => {
    const noShow = appt({ tech: DAVID, date: "2026-10-16", prod: null, in: "16:01:39", out: "16:13:16", status: 2 });
    const helped = { ...appt({ tech: MARC, date: "2026-10-16", prod: 100, in: "08:00:00", out: "09:00:00" }), assignedEmployeeId: DAVID };
    const r = computeProdHr([noShow, helped]);
    expect(prodHrFor(r, DAVID).prodHr).toBeNull();
    expect(prodHrFor(r, MARC).prodHr).toBe(100);
  });

  it("has no rate without work time", () => {
    const r = computeProdHr([appt({ tech: MARC, date: "2026-10-01", prod: 100 })]);
    expect(prodHrFor(r, MARC)).toEqual({ production: 100, workMinutes: 0, prodHr: null });
  });
});

describe("formatWorkTime", () => {
  it("formats as h:mm like Driven", () => {
    expect(formatWorkTime(5409)).toBe("90:09");
    expect(formatWorkTime(5703)).toBe("95:03");
  });
});

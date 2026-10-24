import { describe, it, expect } from "vitest";
import { computeDrivingScore, dayScore, tripDay, type DrivingTrip } from "./driving";

const BOISE = { timeZone: "-0600" };
function trip(p: { start: string; seconds: number; hb?: number; ha?: number; tz?: string }): DrivingTrip {
  const startedAt = new Date(p.start);
  return {
    startedAt,
    endedAt: new Date(startedAt.getTime() + p.seconds * 1000),
    hardBrakes: p.hb ?? 0,
    hardAccels: p.ha ?? 0,
    rawJson: p.tz ? { timeZone: p.tz } : BOISE,
  };
}

/** One trip per day carrying that day's total trip seconds and events; the score only depends on day totals. */
function month(days: [string, number, number, number][]): DrivingTrip[] {
  return days.map(([dd, seconds, hb, ha]) => trip({ start: `2026-10-${dd}T15:00:00Z`, seconds, hb, ha }));
}

// Bouncie, Oct 1–23 2026: [day, trip seconds, hard brakes, hard accels]
const MARC: [string, number, number, number][] = [
  ["01", 18817, 2, 0], ["02", 11065, 1, 0], ["05", 16374, 1, 0], ["07", 7262, 0, 1], ["08", 7564, 1, 0],
  ["09", 18728, 1, 0], ["12", 14393, 0, 0], ["13", 13563, 1, 0], ["14", 19200, 3, 0], ["15", 9964, 0, 0],
  ["16", 14311, 0, 0], ["19", 14625, 0, 1], ["20", 15569, 1, 0], ["21", 14783, 1, 0], ["22", 14043, 0, 0],
  ["23", 11582, 0, 0],
];
const TROY: [string, number, number, number][] = [
  ["01", 10929, 2, 0], ["02", 10625, 1, 1], ["05", 12893, 1, 1], ["06", 17613, 0, 0], ["07", 18184, 2, 0],
  ["12", 15065, 1, 0], ["13", 10427, 1, 1], ["14", 21692, 0, 0], ["15", 15344, 1, 0], ["16", 15782, 0, 1],
  ["19", 14593, 1, 0], ["20", 11111, 0, 0], ["21", 13987, 1, 0], ["22", 15650, 0, 0], ["23", 10501, 0, 0],
];

describe("computeDrivingScore", () => {
  it("matches Driven's October drill-downs (Marc 95, Troy 93)", () => {
    expect(computeDrivingScore(month(MARC), "2026-10")).toEqual({ score: 95, days: 16, trips: 16, hardBrakes: 12, hardAccels: 2 });
    expect(computeDrivingScore(month(TROY), "2026-10")).toEqual({ score: 93, days: 15, trips: 15, hardBrakes: 11, hardAccels: 4 });
  });

  it("matches Driven's Oct 1–13 export (Marc 93, Troy 89)", () => {
    expect(computeDrivingScore(month(MARC.filter(([dd]) => dd <= "13")), "2026-10").score).toBe(93);
    expect(computeDrivingScore(month(TROY.filter(([dd]) => dd <= "13")), "2026-10").score).toBe(89);
  });

  it("averages days, not trips or miles: a short bad day weighs as much as a long clean one", () => {
    const r = computeDrivingScore([
      trip({ start: "2026-10-01T15:00:00Z", seconds: 3600, hb: 1 }),      // 1 event in 1 h → 76
      trip({ start: "2026-10-02T15:00:00Z", seconds: 4 * 3600 }),         // clean → 100
      trip({ start: "2026-10-02T20:00:00Z", seconds: 4 * 3600 }),
    ]);
    expect(r).toEqual({ score: 88, days: 2, trips: 3, hardBrakes: 1, hardAccels: 0 });
  });

  it("is null when the tech didn't drive", () => {
    expect(computeDrivingScore([]).score).toBeNull();
    expect(computeDrivingScore(month(MARC), "2026-09").score).toBeNull();
  });

  it("puts a trip on its local day, so an evening trip on Sep 30 isn't October", () => {
    const lateSep = trip({ start: "2026-10-01T01:30:00Z", seconds: 600, hb: 2 }); // 7:30 pm Sep 30 in Boise
    expect(tripDay(lateSep)).toBe("2026-09-30");
    expect(computeDrivingScore([lateSep, ...month(MARC)], "2026-10").hardBrakes).toBe(12);
  });
});

describe("dayScore", () => {
  it("takes 24 points per event per hour, floored at 0", () => {
    expect(dayScore(0, 5)).toBe(100);
    expect(dayScore(2, 4)).toBe(88);
    expect(dayScore(10, 1)).toBe(0);
  });
});

describe("tripDay", () => {
  it("uses the trip's own offset (Portland is an hour behind Boise)", () => {
    expect(tripDay(trip({ start: "2026-10-02T06:30:00Z", seconds: 60, tz: "-0700" }))).toBe("2026-10-01");
    expect(tripDay(trip({ start: "2026-10-02T06:30:00Z", seconds: 60 }))).toBe("2026-10-02");
  });
});

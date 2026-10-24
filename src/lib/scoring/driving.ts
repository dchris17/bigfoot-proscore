/**
 * Driven-style "Average Driving Score". Checked against Driven's leaderboard for Sep 2026,
 * its Oct 1–13 export and Oct to date: 21 of 24 exact for the 8 techs Driven has Bouncie
 * data for. Its drill-downs (Marc, Troy, Arturo, Larry, Calvert) have the same hard brake
 * and rapid accel counts as our trips, and each of the 3 misses is a data difference:
 * - Larry Oct (96 vs 95) and Arturo Sep (93 vs 92): Driven has 1 Idle Event we can't see.
 *   From Troy's and Arturo's, one costs about 12 points on its day (11.4–12).
 * - Calvert Sep (93 vs 94): Driven has 10 hard brakes, Bouncie's trips have 11.
 *
 * - Each day the tech drove gets a score: 100 − 24 × hard events per hour of trip time,
 *   where trip time is start to end of every trip that day (idling included).
 *   Hard events are Bouncie's hard brakes plus hard accelerations, weighted the same.
 * - The month is the plain average of those day scores, rounded. Days with no trips
 *   don't count either way.
 * - Days follow the trip's own local time (Bouncie's timeZone on the trip).
 * - Not modelled: Driven's Idle Event. Bouncie's trip API only gives total idle time per
 *   trip (no point timestamps), and no threshold on that matches Driven's counts: Arturo's
 *   Sep event has no trip over 32 min of idle, while Lucca's 44 min trip isn't one.
 *   Speed Alerts are 0 for everyone in Driven.
 * - Driven shows 100 when it has no Bouncie data for a tech (Jake, Noah Walters in Oct
 *   2026). We score their trucks instead.
 */

/** Points off a day's score per hard event per hour of driving. */
export const POINTS_PER_EVENT_HOUR = 24;

export type DrivingTrip = {
  startedAt: Date;
  endedAt: Date;
  hardBrakes: number;
  hardAccels: number;
  rawJson: unknown;
};

export interface DrivingTotals {
  /** Rounded 0–100, or null when the tech didn't drive */
  score: number | null;
  days: number;
  trips: number;
  hardBrakes: number;
  hardAccels: number;
}

/** "-0600" → -360 minutes. Falls back to Boise daylight time, which is what the sync assumed. */
function offsetMinutes(rawJson: unknown): number {
  const tz = (rawJson as { timeZone?: unknown } | null)?.timeZone;
  const m = typeof tz === "string" ? /^([+-])(\d{2}):?(\d{2})$/.exec(tz) : null;
  if (!m) return -360;
  return (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]));
}

/** The trip's local start date, "YYYY-MM-DD". */
export function tripDay(t: Pick<DrivingTrip, "startedAt" | "rawJson">): string {
  return new Date(t.startedAt.getTime() + offsetMinutes(t.rawJson) * 60000).toISOString().slice(0, 10);
}

export function dayScore(events: number, hours: number): number {
  if (hours <= 0) return 100;
  return Math.max(0, 100 - (POINTS_PER_EVENT_HOUR * events) / hours);
}

/** One tech's trips → Driven's average driving score. `month` ("YYYY-MM") keeps only trips that start that month, local time. */
export function computeDrivingScore(trips: DrivingTrip[], month?: string): DrivingTotals {
  const days = new Map<string, { events: number; ms: number }>();
  let count = 0, hardBrakes = 0, hardAccels = 0;

  for (const t of trips) {
    const day = tripDay(t);
    if (month && !day.startsWith(month)) continue;
    count++;
    hardBrakes += t.hardBrakes;
    hardAccels += t.hardAccels;
    const d = days.get(day) ?? { events: 0, ms: 0 };
    d.events += t.hardBrakes + t.hardAccels;
    d.ms += Math.max(0, t.endedAt.getTime() - t.startedAt.getTime());
    days.set(day, d);
  }

  if (days.size === 0) return { score: null, days: 0, trips: 0, hardBrakes: 0, hardAccels: 0 };
  let sum = 0;
  for (const d of days.values()) sum += dayScore(d.events, d.ms / 3600000);
  return { score: Math.round(sum / days.size), days: days.size, trips: count, hardBrakes, hardAccels };
}

/** "12 hard brakes and 2 rapid accelerations over 16 days of driving." */
export function drivingDetail(d: DrivingTotals): string | undefined {
  if (d.score === null) return undefined;
  const n = (v: number, one: string, many: string) => `${v} ${v === 1 ? one : many}`;
  return `${n(d.hardBrakes, "hard brake", "hard brakes")} and ${n(d.hardAccels, "rapid acceleration", "rapid accelerations")} over ${n(d.days, "day", "days")} of driving.`;
}

/** Widen a month's trip query by a day each side; computeDrivingScore then keeps the local-time month. */
export function drivingTripWindow(monthStart: Date, monthEnd: Date) {
  const DAY = 24 * 3600 * 1000;
  return { gte: new Date(monthStart.getTime() - DAY), lt: new Date(monthEnd.getTime() + DAY) };
}

export const DRIVING_TRIP_SELECT = {
  startedAt: true, endedAt: true, hardBrakes: true, hardAccels: true, rawJson: true,
} as const;

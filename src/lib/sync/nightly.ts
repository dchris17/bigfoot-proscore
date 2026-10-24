import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { syncFieldRoutesAppointments, type FieldRoutesSyncResult } from "./fieldroutes";
import { syncBouncieTrips, type BouncieSyncResult } from "./bouncie";

const TIMEZONE = process.env.APP_TIMEZONE || "America/Boise";

// Re-sync this many days before the current month too, so the first nights of a
// month still pick up late check-outs and status changes from the end of last month.
const LOOKBACK_DAYS = 3;

export interface NightlyWindow {
  timezone: string;
  dateStart: string; // YYYY-MM-DD in TIMEZONE, inclusive
  dateEnd: string;   // YYYY-MM-DD in TIMEZONE (today), inclusive
  startsAt: Date;    // midnight of dateStart in TIMEZONE
  endsAt: Date;      // now
}

/** Current month (in Boise time) plus the previous LOOKBACK_DAYS days, through today. */
export function nightlyWindow(now: Date = new Date()): NightlyWindow {
  const today = formatInTimeZone(now, TIMEZONE, "yyyy-MM-dd");
  const monthStart = `${today.slice(0, 7)}-01`;
  const [y, m, d] = today.split("-").map(Number);
  const lookback = new Date(Date.UTC(y, m - 1, d - LOOKBACK_DAYS)).toISOString().slice(0, 10);
  const dateStart = lookback < monthStart ? lookback : monthStart;
  return {
    timezone: TIMEZONE,
    dateStart,
    dateEnd: today,
    startsAt: fromZonedTime(`${dateStart}T00:00:00`, TIMEZONE),
    endsAt: now,
  };
}

export interface NightlySyncResult {
  ok: boolean;
  window: { timezone: string; dateStart: string; dateEnd: string };
  fieldroutes: FieldRoutesSyncResult | { error: string };
  bouncie: BouncieSyncResult | { error: string };
  durationSeconds: number;
}

let inFlight: Promise<NightlySyncResult> | null = null;

/**
 * Sync FieldRoutes appointments and Bouncie trips for the nightly window.
 * The two sources run independently so one failing doesn't block the other.
 * Concurrent calls in the same process share one run.
 */
export function runNightlySync(now: Date = new Date()): Promise<NightlySyncResult> {
  inFlight ??= doNightlySync(now).finally(() => { inFlight = null; });
  return inFlight;
}

async function doNightlySync(now: Date): Promise<NightlySyncResult> {
  const started = Date.now();
  const w = nightlyWindow(now);
  const label = `${w.dateStart}..${w.dateEnd}`;
  const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

  let ok = true;

  let fieldroutes: NightlySyncResult["fieldroutes"];
  try {
    fieldroutes = await syncFieldRoutesAppointments([{ label, dateStart: w.dateStart, dateEnd: w.dateEnd }]);
    if (fieldroutes.errors.length > 0) ok = false;
  } catch (e) {
    fieldroutes = { error: message(e) };
    ok = false;
  }

  let bouncie: NightlySyncResult["bouncie"];
  try {
    bouncie = await syncBouncieTrips(w.startsAt, w.endsAt);
  } catch (e) {
    bouncie = { error: message(e) };
    ok = false;
  }

  if ("errors" in fieldroutes) fieldroutes = { ...fieldroutes, errors: fieldroutes.errors.slice(0, 10) };

  return {
    ok,
    window: { timezone: w.timezone, dateStart: w.dateStart, dateEnd: w.dateEnd },
    fieldroutes,
    bouncie,
    durationSeconds: Math.round((Date.now() - started) / 1000),
  };
}

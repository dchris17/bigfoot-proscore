import { prisma } from "@/lib/prisma";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// FieldRoutes allows 60 reads/min per key, shared with anything else using it.
// When we hit that, wait out the minute and retry instead of dropping the batch.
const RATE_LIMIT_RE = /maximum number of .*requests/i;
const RATE_LIMIT_RETRIES = 4;

export async function frGet(entity: string, action: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url.toString(), { next: { revalidate: 0 } });
    const data = await res.json();
    const rateLimited = data?.success === false && RATE_LIMIT_RE.test(String(data.errorMessage ?? ""));
    if (!rateLimited || attempt >= RATE_LIMIT_RETRIES) return data;
    await delay(65_000);
  }
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** "2026-10" → first and last day of that month as YYYY-MM-DD. */
export function monthRange(month: string): { dateStart: string; dateEnd: string } {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const mm = String(mon).padStart(2, "0");
  return { dateStart: `${year}-${mm}-01`, dateEnd: `${year}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

// FieldRoutes appointment statuses: 0 Pending, 1 Completed, 2 No-show, -1 Cancelled, -2 Re-scheduled.
// Driven's reservice denominator counts every scheduled appointment, so sync them all;
// KPIs that only want completed work filter status = 1.
export const ALL_STATUSES = ["1", "2", "0", "-1", "-2"];

/** FR sends "0" or null for "no employee". */
function employeeId(v: unknown): number | null {
  const n = typeof v === "string" ? parseInt(v) : NaN;
  return n > 0 ? n : null;
}

/** routeID → route.assignedTech, fetched in batches and cached for the run. */
async function loadRouteTechs(routeIds: string[], cache: Map<string, number | null>, errors: string[], label: string) {
  const missing = [...new Set(routeIds)].filter(id => id && id !== "0" && !cache.has(id));
  for (const rBatch of chunks(missing, 100)) {
    const rRes = await frGet("route", "get", { routeIDs: rBatch.join(",") }) as {
      success: boolean;
      propertyName?: string;
      errorMessage?: string;
      [key: string]: unknown;
    };
    if (!rRes.success) {
      errors.push(`${label} routes: get failed — ${rRes.errorMessage ?? "unknown"}`);
      continue;
    }
    const raw = rRes[rRes.propertyName ?? "routes"];
    const routes = (Array.isArray(raw) ? raw : Object.values(raw ?? {})) as Array<{ routeID: string; assignedTech: string }>;
    for (const r of routes) cache.set(r.routeID, employeeId(r.assignedTech));
  }
}

interface FRAppointment {
  appointmentID: string;
  officeID: string;
  customerID: string;
  subscriptionID: string;
  serviceTypeID: string;
  ticketID: string;
  date: string;
  status: string;
  type: string;
  employeeID: string;
  servicedBy: string | null;
  routeID: string;
  productionValue: string;
  checkIn: string | null;
  checkOut: string | null;
  timeIn: string | null;
  timeOut: string | null;
  duration: string;
  [key: string]: unknown;
}

export interface FieldRoutesRange {
  label: string;     // key in the byRange counts, e.g. "2026-10"
  dateStart: string; // YYYY-MM-DD, inclusive
  dateEnd: string;   // YYYY-MM-DD, inclusive
}

export interface FieldRoutesSyncResult {
  synced: number;
  skipped: number;
  byRange: Record<string, number>;
  errors: string[];
}

export class BranchNotFoundError extends Error {
  constructor() {
    super("Branch not found — run /setup/employees first");
  }
}

/**
 * Pull appointments (every status by default) for each date range from FieldRoutes
 * and upsert them into Appointment. Records a SyncRun row (source "fieldroutes").
 */
export async function syncFieldRoutesAppointments(
  ranges: FieldRoutesRange[],
  { statuses = ALL_STATUSES }: { statuses?: string[] } = {},
): Promise<FieldRoutesSyncResult> {
  // Look up branch
  const branch = await prisma.branch.findFirst({ where: { fieldroutesOfficeId: 1 } });
  if (!branch) throw new BranchNotFoundError();

  const syncRun = await prisma.syncRun.create({
    data: {
      source: "fieldroutes",
      startedAt: new Date(),
      status: "running",
    },
  });

  let totalSynced = 0;
  let totalSkipped = 0;
  const errors: string[] = [];
  const rangeCounts: Record<string, number> = {};
  const routeTechs = new Map<string, number | null>();

  try {
    for (const { label, dateStart, dateEnd } of ranges) {
      const allIds: number[] = [];
      for (const status of statuses) {
        const searchRes = await frGet("appointment", "search", {
          status,
          dateStart,
          dateEnd,
        }) as { success: boolean; appointmentIDs?: number[]; errorMessage?: string };

        if (!searchRes.success) {
          errors.push(`${label} status=${status}: search failed — ${searchRes.errorMessage ?? "unknown"}`);
          continue;
        }
        allIds.push(...(searchRes.appointmentIDs ?? []));
      }

      const ids = [...new Set(allIds)];
      let rangeCount = 0;

      // Fetch in batches of 200 (larger batches fail) with 4s pacing; frGet retries if we still hit 60/min
      for (const batch of chunks(ids, 200)) {
        await delay(4000);
        const getRes = await frGet("appointment", "get", {
          appointmentIDs: batch.join(","),
        }) as { success: boolean; propertyName?: string; errorMessage?: string };

        if (!getRes.success) {
          errors.push(`${label} batch: get failed — ${getRes.errorMessage ?? "unknown"}`);
          continue;
        }

        const prop = getRes.propertyName ?? "appointments";
        const apptMap = (getRes as Record<string, unknown>)[prop];
        if (!apptMap) continue;

        const appts = Object.values(apptMap as Record<string, unknown>) as FRAppointment[];

        // Fetch ticket data for completed appointments to get actual serviceCharge
        const ticketIds = appts
          .filter(a => a.status === "1" && a.ticketID && a.ticketID !== "0")
          .map(a => a.ticketID as string);
        const ticketChargeMap = new Map<string, number>();
        if (ticketIds.length > 0) {
          for (const tBatch of chunks(ticketIds, 100)) {
            const tRes = await frGet("ticket", "get", { ticketIDs: tBatch.join(",") }) as {
              success: boolean;
              propertyName?: string;
              [key: string]: unknown;
            };
            if (!tRes.success) {
              errors.push(`${label} tickets: get failed — ${String(tRes.errorMessage ?? "unknown")}`);
            } else {
              const tProp = tRes.propertyName ?? "tickets";
              const ticketArr = tRes[tProp] as Array<{ ticketID: string; serviceCharge: string }> | undefined;
              if (ticketArr) {
                for (const t of ticketArr) {
                  const charge = parseFloat(t.serviceCharge);
                  if (charge >= 0) ticketChargeMap.set(t.ticketID, charge);
                }
              }
            }
          }
        }

        // The tech who ran the route. Non-completed appointments have servicedBy "0",
        // and employeeID is whoever booked it, so the route is the only reliable tech.
        await loadRouteTechs(appts.map(a => a.routeID), routeTechs, errors, label);

        for (const a of appts) {
          try {
            const apptDate = new Date(a.date);
            // Use ticket serviceCharge as production value; FR's own productionValue is always -1.00
            const ticketCharge = a.ticketID ? ticketChargeMap.get(a.ticketID as string) : undefined;
            const production = ticketCharge !== undefined ? ticketCharge : null;

            const parseTs = (s: string | null) =>
              s && !s.startsWith("0000") ? new Date(s.replace(" ", "T") + "-06:00") : null;
            const checkIn = parseTs(a.checkIn);
            const checkOut = parseTs(a.checkOut);

            const isReservice = a.type === "3"; // service type 3 = Reservice (RS)

            const servicedBy = employeeId(a.servicedBy);
            const assignedTech = routeTechs.get(a.routeID) ?? servicedBy ?? employeeId(a.employeeID) ?? 0;

            const fields = {
              rawJson: a as object,
              date: apptDate,
              status: parseInt(a.status),
              assignedEmployeeId: assignedTech,
              servicedByEmployeeId: servicedBy,
              isReservice,
              productionValue: production,
              checkIn,
              checkOut,
              customerId: a.customerID ? parseInt(a.customerID) : null,
              subscriptionId: a.subscriptionID ? parseInt(a.subscriptionID) : null,
              officeId: a.officeID ? parseInt(a.officeID) : null,
              branchId: branch.id,
            };

            await prisma.appointment.upsert({
              where: { id: parseInt(a.appointmentID) },
              update: fields,
              create: { id: parseInt(a.appointmentID), serviceTypeId: null, ...fields },
            });

            rangeCount++;
            totalSynced++;
          } catch (e) {
            totalSkipped++;
            errors.push(`appt ${a.appointmentID}: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }

      rangeCounts[label] = rangeCount;
    }
  } catch (e) {
    // Network or API failure mid-run: close out the SyncRun instead of leaving it "running"
    errors.push(`aborted: ${e instanceof Error ? e.message : String(e)}`);
  }

  await prisma.syncRun.update({
    where: { id: syncRun.id },
    data: {
      finishedAt: new Date(),
      status: errors.length > 0 ? "error" : "success",
      counts: { synced: totalSynced, skipped: totalSkipped, byMonth: rangeCounts },
      errors: errors.slice(0, 50),
    },
  });

  return { synced: totalSynced, skipped: totalSkipped, byRange: rangeCounts, errors };
}

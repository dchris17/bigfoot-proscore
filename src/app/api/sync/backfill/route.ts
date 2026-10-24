import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(entity: string, action: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

function monthRange(month: string): { dateStart: string; dateEnd: string } {
  const [year, mon] = month.split("-").map(Number);
  const start = new Date(year, mon - 1, 1);
  const end = new Date(year, mon, 0); // last day of month
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { dateStart: fmt(start), dateEnd: fmt(end) };
}

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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
  servicedBy: string;
  productionValue: string;
  checkIn: string | null;
  checkOut: string | null;
  timeIn: string | null;
  timeOut: string | null;
  duration: string;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { months?: string[] };
  const months = body.months ?? ["2026-08", "2026-09", "2026-10"];

  // Look up branch
  const branch = await prisma.branch.findFirst({ where: { fieldroutesOfficeId: 1 } });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found — run /setup/employees first" }, { status: 400 });
  }

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
  const monthCounts: Record<string, number> = {};

  for (const month of months) {
    const { dateStart, dateEnd } = monthRange(month);

    // Search for completed (1) and cancelled/no-show (2) appointments
    const allIds: number[] = [];
    for (const status of ["1", "2"]) {
      const searchRes = await frGet("appointment", "search", {
        status,
        dateStart,
        dateEnd,
      }) as { success: boolean; appointmentIDs?: number[]; errorMessage?: string };

      if (!searchRes.success) {
        errors.push(`${month} status=${status}: search failed — ${searchRes.errorMessage ?? "unknown"}`);
        continue;
      }
      allIds.push(...(searchRes.appointmentIDs ?? []));
    }

    const ids = [...new Set(allIds)];
    let monthCount = 0;
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Fetch in batches of 100 with rate-limit pacing (4s between batches keeps ~30 calls/min)
    for (const batch of chunks(ids, 100)) {
      await delay(4000);
      const getRes = await frGet("appointment", "get", {
        appointmentIDs: batch.join(","),
      }) as { success: boolean; propertyName?: string; errorMessage?: string };

      if (!getRes.success) {
        errors.push(`${month} batch: get failed — ${(getRes as { errorMessage?: string }).errorMessage ?? "unknown"}`);
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
          if (tRes.success) {
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

          await prisma.appointment.upsert({
            where: { id: parseInt(a.appointmentID) },
            update: {
              rawJson: a as object,
              date: apptDate,
              status: parseInt(a.status),
              assignedEmployeeId: parseInt(a.employeeID),
              servicedByEmployeeId: a.servicedBy ? parseInt(a.servicedBy) : null,
              isReservice,
              productionValue: production,
              checkIn,
              checkOut,
              customerId: a.customerID ? parseInt(a.customerID) : null,
              subscriptionId: a.subscriptionID ? parseInt(a.subscriptionID) : null,
              officeId: a.officeID ? parseInt(a.officeID) : null,
              branchId: branch.id,
            },
            create: {
              id: parseInt(a.appointmentID),
              rawJson: a as object,
              date: apptDate,
              status: parseInt(a.status),
              assignedEmployeeId: parseInt(a.employeeID),
              servicedByEmployeeId: a.servicedBy ? parseInt(a.servicedBy) : null,
              serviceTypeId: null,
              isReservice,
              productionValue: production,
              checkIn,
              checkOut,
              customerId: a.customerID ? parseInt(a.customerID) : null,
              subscriptionId: a.subscriptionID ? parseInt(a.subscriptionID) : null,
              officeId: a.officeID ? parseInt(a.officeID) : null,
              branchId: branch.id,
            },
          });

          monthCount++;
          totalSynced++;
        } catch (e) {
          totalSkipped++;
          errors.push(`appt ${a.appointmentID}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    monthCounts[month] = monthCount;
  }

  await prisma.syncRun.update({
    where: { id: syncRun.id },
    data: {
      finishedAt: new Date(),
      status: errors.length > 0 ? "error" : "success",
      counts: { synced: totalSynced, skipped: totalSkipped, byMonth: monthCounts },
      errors: errors.slice(0, 50),
    },
  });

  return NextResponse.json({
    ok: true,
    synced: totalSynced,
    skipped: totalSkipped,
    byMonth: monthCounts,
    errors: errors.slice(0, 10),
  });
}

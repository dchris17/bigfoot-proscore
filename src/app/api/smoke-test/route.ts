import { NextResponse } from "next/server";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(entity: string, action: string, params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

export async function GET() {
  // Step 1: search for a small batch of October appointment IDs
  const search = await frGet("appointment", "search", {
    status: "1",
    dateStart: "2026-10-01",
    dateEnd: "2026-10-01",
  }) as { success: boolean; appointmentIDs?: number[] };

  const ids = (search.appointmentIDs ?? []).slice(0, 10);

  if (ids.length === 0) {
    return NextResponse.json({ error: "No appointment IDs from search" });
  }

  // Step 2: try appointment/get with those IDs
  const detail = await frGet("appointment", "get", {
    appointmentIDs: ids.join(","),
  }) as {
    success: boolean;
    count: number;
    propertyName?: string;
    errorMessage?: string;
    appointments?: Record<string, unknown>;
  };

  const prop = detail.propertyName ?? "appointments";
  const apptMap = (detail as Record<string, unknown>)[prop];
  const appts = apptMap
    ? (Object.values(apptMap as Record<string, unknown>) as Record<string, unknown>[])
    : [];

  const sample = appts[0];

  return NextResponse.json({
    search_ids: ids,
    get_success: detail.success,
    get_count: detail.count,
    get_error: detail.errorMessage ?? null,
    sample_keys: sample ? Object.keys(sample) : [],
    sample: sample
      ? {
          appointmentID: sample.appointmentID,
          date: sample.date,
          status: sample.status,
          assignedEmployeeID: sample.assignedEmployeeID,
          servicedByEmployeeID: sample.servicedByEmployeeID,
          serviceTypeID: sample.serviceTypeID,
          duration: sample.duration,
          productionValue: sample.productionValue,
          checkIn: sample.checkIn,
          checkOut: sample.checkOut,
          officeID: sample.officeID,
          customerID: sample.customerID,
        }
      : null,
  });
}

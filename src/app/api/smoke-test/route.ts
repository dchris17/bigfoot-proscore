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
  // 1. Get active employee IDs
  const search = await frGet("employee", "search", { status: "1" });
  if (!search.success) {
    return NextResponse.json({ error: "search failed", errorMessage: search.errorMessage }, { status: 500 });
  }
  const ids: number[] = search.employeeIDs ?? [];
  const sampleId = String(ids[0]);

  // 2. Try to get a single employee via search with employeeID filter
  const byId = await frGet("employee", "search", { employeeID: sampleId });
  const byIdKeys = Object.keys(byId);

  // 3. Also try 'get' action and 'getAllActive' action
  const getAction = await frGet("employee", "get", { employeeID: sampleId });
  const getAllActive = await frGet("employee", "getAllActive", {});

  // 4. Inspect the appointment search to confirm we can at least sync appointments
  const apptSearch = await frGet("appointment", "search", {
    status: "1",
    dateStart: "2026-10-01",
    dateEnd: "2026-10-15",
  });

  return NextResponse.json({
    employee_count: ids.length,
    sample_id: sampleId,
    // What does search by employeeID return?
    byId_success: byId.success,
    byId_keys: byIdKeys,
    byId_propertyName: byId.propertyName,
    // get action
    get_success: getAction.success,
    get_error: getAction.errorMessage,
    // getAllActive action
    getAllActive_success: getAllActive.success,
    getAllActive_error: getAllActive.errorMessage,
    getAllActive_propertyName: getAllActive.propertyName,
    getAllActive_keys: Object.keys(getAllActive),
    // appointment check
    appt_success: apptSearch.success,
    appt_error: apptSearch.errorMessage,
    appt_count: apptSearch.appointmentIDs?.length ?? 0,
  });
}

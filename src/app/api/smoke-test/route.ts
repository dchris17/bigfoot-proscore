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

  // 2. employee/get — the action that returned success:true
  const getResult = await frGet("employee", "get", { employeeID: sampleId });
  const getPropName: string = getResult.propertyName ?? "employees";
  const getKeys = Object.keys(getResult);
  // Try to extract one employee object
  const empObj = getResult[getPropName]
    ? Object.values(getResult[getPropName] as Record<string, unknown>)[0] as Record<string, unknown>
    : null;

  // 3. Try batch get with comma-separated IDs
  const batchIds = ids.slice(0, 5).join(",");
  const batchGet = await frGet("employee", "get", { employeeID: batchIds });
  const batchPropName: string = batchGet.propertyName ?? "employees";
  const batchCount = batchGet[batchPropName]
    ? Object.keys(batchGet[batchPropName] as Record<string, unknown>).length
    : 0;

  // 4. Appointment count for Oct 2026
  const apptSearch = await frGet("appointment", "search", {
    status: "1",
    dateStart: "2026-10-01",
    dateEnd: "2026-10-15",
  });

  return NextResponse.json({
    employee_count: ids.length,
    sample_id: sampleId,
    // get action result
    get_success: getResult.success,
    get_propertyName: getPropName,
    get_keys: getKeys,
    get_sample_employee: empObj
      ? { id: empObj.employeeID, name: `${empObj.fname} ${empObj.lname}`, type: empObj.type, officeID: empObj.officeID }
      : null,
    // batch get
    batch_get_success: batchGet.success,
    batch_get_propertyName: batchPropName,
    batch_count: batchCount,
    // appointments
    appt_count: apptSearch.appointmentIDs?.length ?? 0,
  });
}

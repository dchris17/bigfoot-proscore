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

  // 2. employee/get with employeeID param — check ignoredParams
  const getResult = await frGet("employee", "get", { employeeID: sampleId });
  const getPropName: string = getResult.propertyName ?? "employees";

  // 3. employee/get with no params — does it return all?
  const getAll = await frGet("employee", "get", {});
  const getAllPropName: string = getAll.propertyName ?? "employees";
  const getAllCount = getAll[getAllPropName]
    ? Object.keys(getAll[getAllPropName] as Record<string, unknown>).length
    : 0;

  // First employee from getAll (if any)
  const firstEmp = getAllCount > 0
    ? (Object.values(getAll[getAllPropName] as Record<string, unknown>)[0] as Record<string, unknown>)
    : null;

  return NextResponse.json({
    employee_count: ids.length,
    sample_id: sampleId,
    // With employeeID param
    get_success: getResult.success,
    get_count: getResult.count,
    get_ignoredParams: getResult.ignoredParams,
    get_propName: getPropName,
    // Without params
    getAll_success: getAll.success,
    getAll_count: getAllCount,
    getAll_ignoredParams: getAll.ignoredParams,
    first_employee: firstEmp ? {
      id: firstEmp.employeeID,
      fname: firstEmp.fname,
      lname: firstEmp.lname,
      type: firstEmp.type,
      officeID: firstEmp.officeID,
    } : null,
    // Appointment count
    appt_count: (await frGet("appointment", "search", {
      status: "1",
      dateStart: "2026-10-01",
      dateEnd: "2026-10-15",
    })).appointmentIDs?.length ?? 0,
  });
}

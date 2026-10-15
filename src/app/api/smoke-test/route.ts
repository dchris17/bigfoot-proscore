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
  // 1. Search active employees
  const search = await frGet("employee", "search", { status: "1" });
  if (!search.success) {
    return NextResponse.json({
      error: "FieldRoutes employee search failed",
      errorMessage: search.errorMessage,
    }, { status: 500 });
  }

  const ids: number[] = search.employeeIDs ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: "No employees returned" }, { status: 500 });
  }

  // 2. Fetch employee details — FieldRoutes uses getByEmployeeID (singular)
  const batch = ids.slice(0, 50).join(",");
  const records = await frGet("employee", "getByEmployeeID", { employeeID: batch });

  if (!records.success) {
    // Try alternate param name
    const alt = await frGet("employee", "getByEmployeeID", { employeeIDs: batch });
    return NextResponse.json({
      employee_count: ids.length,
      getByEmployeeID_error: records.errorMessage,
      alt_getByEmployeeID_success: alt.success,
      alt_getByEmployeeID_error: alt.errorMessage,
      alt_propertyName: alt.propertyName,
    });
  }

  const propName: string = records.propertyName ?? "employees";
  const employees = (records[propName]
    ? Object.values(records[propName] as Record<string, unknown>)
    : []) as Record<string, unknown>[];

  const techs = employees.map((e) => ({
    id: e.employeeID,
    name: `${e.fname} ${e.lname}`.trim(),
    type: e.type,
    officeID: e.officeID,
    active: e.active,
  }));

  // 3. Service types
  const stSearch = await frGet("serviceType", "search", {});
  const stIds: number[] = stSearch.serviceTypeIDs ?? [];
  const stBatch = stIds.slice(0, 50).join(",");
  const stRecords = stIds.length
    ? await frGet("serviceType", "getByServiceTypeID", { serviceTypeID: stBatch })
    : { success: false };
  const stPropName: string = stRecords.propertyName ?? "serviceTypes";
  const serviceTypes = (stRecords.success && stRecords[stPropName]
    ? Object.values(stRecords[stPropName] as Record<string, unknown>)
    : []) as Record<string, unknown>[];

  return NextResponse.json({
    employee_count: ids.length,
    techs,
    service_type_count: stIds.length,
    service_types: serviceTypes.slice(0, 20).map((s) => ({
      id: s.serviceTypeID,
      description: s.description,
      category: s.category,
    })),
  });
}

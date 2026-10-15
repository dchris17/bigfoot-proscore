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

  // 2. Try getByEmployeeIDs with just one ID to see the error
  const singleId = String(ids[0]);
  const single = await frGet("employee", "getByEmployeeIDs", { employeeIDs: singleId });

  // 3. If that fails, return diagnostic info
  if (!single.success) {
    return NextResponse.json({
      employee_count: ids.length,
      sample_id: singleId,
      getByEmployeeIDs_error: single.errorMessage,
      getByEmployeeIDs_success: single.success,
      getByEmployeeIDs_requestAPIKeyType: single.requestAPIKeyType,
      getByEmployeeIDs_keys: Object.keys(single),
      service_type_count: (await frGet("serviceType", "search", {})).serviceTypeIDs?.length ?? 0,
    });
  }

  // 4. Full batch if single ID worked
  const batch = ids.slice(0, 50).join(",");
  const records = await frGet("employee", "getByEmployeeIDs", { employeeIDs: batch });
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

  // 5. Service types
  const stSearch = await frGet("serviceType", "search", {});
  const stIds: number[] = stSearch.serviceTypeIDs ?? [];
  const stBatch = stIds.slice(0, 50).join(",");
  const stRecords = stIds.length
    ? await frGet("serviceType", "getByServiceTypeIDs", { serviceTypeIDs: stBatch })
    : { success: false };
  const stPropName: string = stRecords.propertyName ?? "serviceTypes";
  const serviceTypes = (stRecords[stPropName]
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

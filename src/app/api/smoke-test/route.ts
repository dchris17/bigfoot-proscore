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
  // 1. List active employees
  const search = await frGet("employee", "search", { status: "1" });
  if (!search.success) {
    return NextResponse.json({ error: "FieldRoutes search failed", detail: search }, { status: 500 });
  }

  const ids: number[] = search.employeeIDs ?? [];
  if (!ids.length) {
    return NextResponse.json({ error: "No employees returned" }, { status: 500 });
  }

  // 2. Fetch full records in one batch
  const batch = ids.slice(0, 50).join(",");
  const records = await frGet("employee", "getByEmployeeIDs", { employeeIDs: batch });
  const employees: Record<string, unknown>[] = records.success
    ? Object.values(records[records.propertyName ?? "employees"] ?? {})
    : [];

  const techs = employees.map((e: Record<string, unknown>) => ({
    id: e.employeeID,
    name: `${e.fname} ${e.lname}`.trim(),
    type: e.type,
    officeID: e.officeID,
    active: e.active,
  }));

  // 3. List service types
  const stSearch = await frGet("serviceType", "search", {});
  const stIds: number[] = stSearch.serviceTypeIDs ?? [];
  const stRecords = stIds.length
    ? await frGet("serviceType", "getByServiceTypeIDs", { serviceTypeIDs: stIds.slice(0, 100).join(",") })
    : {};
  const serviceTypes: Record<string, unknown>[] = stRecords.success
    ? Object.values(stRecords[stRecords.propertyName ?? "serviceTypes"] ?? {})
    : [];

  return NextResponse.json({
    employee_count: ids.length,
    techs,
    service_type_count: stIds.length,
    service_types: serviceTypes.map((s: Record<string, unknown>) => ({
      id: s.serviceTypeID,
      description: s.description,
      category: s.category,
      reservice: s.isReservice ?? s.reservice,
    })),
  });
}

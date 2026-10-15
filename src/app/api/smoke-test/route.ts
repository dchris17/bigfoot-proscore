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
  // 1. Search active employees with includeData to get full records in one call
  const search = await frGet("employee", "search", { status: "1", includeData: "1" });
  if (!search.success) {
    return NextResponse.json({
      error: "FieldRoutes employee search failed",
      errorMessage: search.errorMessage,
      keys: Object.keys(search),
    }, { status: 500 });
  }

  const ids: number[] = search.employeeIDs ?? [];
  const propertyName: string = search.propertyName ?? "employees";
  const rawEmployees: Record<string, unknown>[] = search[propertyName]
    ? Object.values(search[propertyName] as Record<string, unknown>)
    : [];

  const techs = rawEmployees.map((e: Record<string, unknown>) => ({
    id: e.employeeID,
    name: `${e.fname} ${e.lname}`.trim(),
    type: e.type,
    officeID: e.officeID,
    active: e.active,
  }));

  // 2. Search service types with includeData
  const stSearch = await frGet("serviceType", "search", { includeData: "1" });
  const stIds: number[] = stSearch.serviceTypeIDs ?? [];
  const stPropertyName: string = stSearch.propertyName ?? "serviceTypes";
  const rawServiceTypes: Record<string, unknown>[] = stSearch[stPropertyName]
    ? Object.values(stSearch[stPropertyName] as Record<string, unknown>)
    : [];

  const serviceTypes = rawServiceTypes.map((s: Record<string, unknown>) => ({
    id: s.serviceTypeID,
    description: s.description,
    category: s.category,
    reservice: s.isReservice ?? s.reservice,
  }));

  return NextResponse.json({
    employee_count: ids.length,
    employee_propertyName: propertyName,
    techs,
    service_type_count: stIds.length,
    st_propertyName: stPropertyName,
    service_types: serviceTypes.slice(0, 20),
  });
}

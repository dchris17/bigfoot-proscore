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
  // 1. Full search response — what keys does it actually have?
  const search = await frGet("employee", "search", { status: "1" });
  if (!search.success) {
    return NextResponse.json({ error: "search failed", errorMessage: search.errorMessage }, { status: 500 });
  }

  const searchKeys = Object.keys(search);
  const ids: number[] = search.employeeIDs ?? [];

  // 2. Try search with a specific employeeID filter (another common PestRoutes pattern)
  const singleId = String(ids[0]);
  const filtered = await frGet("employee", "search", { employeeID: singleId });
  const filteredKeys = Object.keys(filtered);
  // Does this return employee objects or just IDs?
  const filteredSample = filtered.employees
    ? Object.values(filtered.employees as Record<string, unknown>)[0]
    : filtered.employee ?? null;

  return NextResponse.json({
    employee_count: ids.length,
    search_keys: searchKeys,
    search_propertyName: search.propertyName,
    // first ID from search
    sample_id: ids[0],
    // filtered search result
    filtered_success: filtered.success,
    filtered_keys: filteredKeys,
    filtered_propertyName: filtered.propertyName,
    filtered_sample: filteredSample,
    // service type check
    service_type_count: (await frGet("serviceType", "search", {})).serviceTypeIDs?.length ?? 0,
  });
}

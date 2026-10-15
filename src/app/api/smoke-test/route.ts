import { NextResponse } from "next/server";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(entity: string, action: string, params: Record<string, string>, keyOverride?: { key: string; token: string }) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", keyOverride?.key ?? process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", keyOverride?.token ?? process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

function extractEmployees(result: Record<string, unknown>): Array<Record<string, unknown>> {
  if (!result.success) return [];
  const propName = (result.propertyName as string) ?? "employees";
  const data = result[propName];
  if (!data) return [];
  return Object.values(data as Record<string, unknown>) as Array<Record<string, unknown>>;
}

export async function GET() {
  // Try employee/get with officeID=1 (existing key)
  const getOffice1 = await frGet("employee", "get", { officeID: "1" });
  const emps1 = extractEmployees(getOffice1);

  // Also try employee/search with officeID=1 to see if it adds data
  const searchOffice1 = await frGet("employee", "search", { status: "1", officeID: "1" });
  const searchOffice1Ids: number[] = searchOffice1.employeeIDs ?? [];

  // Try Office 2 key if available
  const key2 = process.env.FIELDROUTES_AUTH_KEY_2;
  const token2 = process.env.FIELDROUTES_AUTH_TOKEN_2;
  let emps2: Array<Record<string, unknown>> = [];
  let search2Ids: number[] = [];
  if (key2 && token2) {
    const getOffice2 = await frGet("employee", "get", { officeID: "2" }, { key: key2, token: token2 });
    emps2 = extractEmployees(getOffice2);
    const search2 = await frGet("employee", "search", { status: "1" }, { key: key2, token: token2 });
    search2Ids = search2.employeeIDs ?? [];
  }

  const allEmps = [...emps1, ...emps2].map((e) => ({
    id: e.employeeID,
    name: `${e.fname} ${e.lname}`.trim(),
    type: e.type,
    officeID: e.officeID,
    active: e.active,
  }));

  return NextResponse.json({
    office1_get_success: getOffice1.success,
    office1_get_count: emps1.length,
    office1_search_count: searchOffice1Ids.length,
    office2_key_configured: !!(key2 && token2),
    office2_get_count: emps2.length,
    office2_search_count: search2Ids.length,
    total_employee_count: allEmps.length,
    employees: allEmps,
  });
}

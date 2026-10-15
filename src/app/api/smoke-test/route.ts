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
  const empSearch = await frGet("employee", "search", { status: "1" });
  if (!empSearch.success) {
    return NextResponse.json({ error: "FieldRoutes employee search failed", detail: empSearch.errorMessage }, { status: 500 });
  }
  const empIds: number[] = empSearch.employeeIDs ?? [];

  const stSearch = await frGet("serviceType", "search", {});
  const stIds: number[] = stSearch.serviceTypeIDs ?? [];

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const today = now.toISOString().slice(0, 10);
  const apptSearch = await frGet("appointment", "search", {
    status: "1",
    dateStart: monthStart,
    dateEnd: today,
  });
  const apptIds: number[] = apptSearch.appointmentIDs ?? [];

  return NextResponse.json({
    ok: true,
    fieldroutes_subdomain: process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest",
    active_employee_count: empIds.length,
    service_type_count: stIds.length,
    completed_appts_this_month: apptIds.length,
    appt_date_range: { from: monthStart, to: today },
  });
}

import { NextResponse } from "next/server";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

export async function GET() {
  const url = new URL(`${BASE_URL}/employee/search`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  url.searchParams.set("status", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  const data = await res.json() as { success: boolean; employeeIDs?: number[]; errorMessage?: string };

  if (!data.success) {
    return NextResponse.json({ error: data.errorMessage ?? "FieldRoutes error" }, { status: 502 });
  }

  return NextResponse.json({ ids: data.employeeIDs ?? [] });
}

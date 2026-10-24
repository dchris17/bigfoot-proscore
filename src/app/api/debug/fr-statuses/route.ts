import { NextResponse } from "next/server";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/appointment/search`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

async function frGetAppts(params: Record<string, string>) {
  const url = new URL(`${BASE_URL}/appointment/get`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

export async function GET() {
  // Get status=0 IDs
  const s0 = await frGet({ status: "0", dateStart: "2026-10-01", dateEnd: "2026-10-16" }) as { success: boolean; appointmentIDs?: number[] };
  const ids = (s0.appointmentIDs ?? []).slice(0, 20);
  
  // Fetch first 20 to inspect dates
  let sample: { date: string; status: string; employeeID: string }[] = [];
  if (ids.length > 0) {
    const getRes = await frGetAppts({ appointmentIDs: ids.join(",") }) as { success: boolean; appointments?: Record<string, { date: string; status: string; employeeID: string }> };
    if (getRes.success && getRes.appointments) {
      sample = Object.values(getRes.appointments).map(a => ({ date: a.date, status: a.status, employeeID: a.employeeID }));
    }
  }
  
  // Count by date (past vs today)
  const today = "2026-10-16";
  const pastDue = sample.filter(a => a.date < today).length;
  const todayAppts = sample.filter(a => a.date === today).length;
  
  return NextResponse.json({ 
    totalStatus0: s0.appointmentIDs?.length ?? 0,
    sampleSize: sample.length,
    pastDueInSample: pastDue,
    todayInSample: todayAppts,
    sample 
  });
}

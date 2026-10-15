import { NextResponse } from "next/server";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(entity: string, action: string, params: Record<string, string>, key?: string, token?: string) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", key ?? process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", token ?? process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

export async function GET() {
  // Try appointment/get with officeID — maybe that unlocks it
  const apptGet = await frGet("appointment", "get", {
    officeID: "1",
    dateStart: "2026-10-14",
    dateEnd: "2026-10-14",
  });
  const apptProp = (apptGet.propertyName as string) ?? "appointments";
  const apptObjs = apptGet[apptProp]
    ? Object.values(apptGet[apptProp] as Record<string, unknown>) as Array<Record<string, unknown>>
    : [];

  // Pull first few appointments and show all their keys + relevant fields
  const sampleAppts = apptObjs.slice(0, 3).map((a) => ({
    appointmentID: a.appointmentID,
    assignedEmployeeID: a.assignedEmployeeID,
    servicedByEmployeeID: a.servicedByEmployeeID,
    techName: a.techName,
    employeeName: a.employeeName,
    techFirstName: a.techFirstName,
    techLastName: a.techLastName,
    allKeys: Object.keys(a),
  }));

  // Also try serviceType/get with officeID (for curiosity)
  const stGet = await frGet("serviceType", "get", { officeID: "1" });
  const stProp = (stGet.propertyName as string) ?? "serviceTypes";
  const stObjs = stGet[stProp]
    ? Object.values(stGet[stProp] as Record<string, unknown>) as Array<Record<string, unknown>>
    : [];
  const sampleSt = stObjs[0];

  return NextResponse.json({
    appt_get_success: apptGet.success,
    appt_get_count: apptObjs.length,
    appt_get_propertyName: apptGet.propertyName,
    sample_appointments: sampleAppts,
    st_get_success: stGet.success,
    st_get_count: stObjs.length,
    sample_service_type: sampleSt ? {
      id: sampleSt.serviceTypeID,
      description: sampleSt.description,
      category: sampleSt.category,
      keys: Object.keys(sampleSt),
    } : null,
  });
}

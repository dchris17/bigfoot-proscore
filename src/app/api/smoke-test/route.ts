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
  // 1. Confirm employee count
  const empSearch = await frGet("employee", "search", { status: "1" });
  const empIds: number[] = empSearch.employeeIDs ?? [];

  // 2. Get a sample appointment to see full data structure
  const apptSearch = await frGet("appointment", "search", {
    status: "1",
    dateStart: "2026-10-14",
    dateEnd: "2026-10-14",
  });
  const apptIds: number[] = apptSearch.appointmentIDs ?? [];

  // 3. Fetch one appointment using 'get' action
  let sampleAppt: Record<string, unknown> | null = null;
  let apptGetError = null;
  if (apptIds.length > 0) {
    const apptGet = await frGet("appointment", "get", { appointmentID: String(apptIds[0]) });
    const propName: string = apptGet.propertyName ?? "appointments";
    if (apptGet.success && apptGet[propName]) {
      const appts = Object.values(apptGet[propName] as Record<string, unknown>);
      if (appts.length > 0) {
        const a = appts[0] as Record<string, unknown>;
        sampleAppt = {
          appointmentID: a.appointmentID,
          assignedEmployeeID: a.assignedEmployeeID,
          servicedByEmployeeID: a.servicedByEmployeeID,
          techName: a.techName,
          employeeName: a.employeeName,
          date: a.date,
          status: a.status,
          type: a.type,
          serviceType: a.serviceType,
          duration: a.duration,
          allKeys: Object.keys(a),
        };
      }
    } else {
      apptGetError = { success: apptGet.success, error: apptGet.errorMessage, propName };
    }
  }

  // 4. Service type search
  const stSearch = await frGet("serviceType", "search", {});
  const stIds: number[] = stSearch.serviceTypeIDs ?? [];

  // 5. Try serviceType/get
  const stGet = stIds.length > 0
    ? await frGet("serviceType", "get", { serviceTypeID: String(stIds[0]) })
    : null;
  const stPropName = stGet?.propertyName ?? "serviceTypes";
  const stSample = stGet?.success && stGet?.[stPropName]
    ? Object.values(stGet[stPropName] as Record<string, unknown>)[0]
    : null;

  return NextResponse.json({
    employee_count: empIds.length,
    appt_count_oct14: apptIds.length,
    sample_appointment: sampleAppt,
    appt_get_error: apptGetError,
    service_type_count: stIds.length,
    service_type_get_success: stGet?.success,
    service_type_sample: stSample,
  });
}

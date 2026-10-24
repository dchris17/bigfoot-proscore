import { NextResponse } from "next/server";

const BASE_URL = `https://${process.env.FIELDROUTES_SUBDOMAIN ?? "aversepest"}.pestroutes.com/api`;

async function frGet(entity: string, action: string, params: Record<string, string> = {}) {
  const url = new URL(`${BASE_URL}/${entity}/${action}`);
  url.searchParams.set("authenticationKey", process.env.FIELDROUTES_AUTH_KEY ?? "");
  url.searchParams.set("authenticationToken", process.env.FIELDROUTES_AUTH_TOKEN ?? "");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString(), { next: { revalidate: 0 } });
  return res.json();
}

export async function GET() {
  try {
    const res = await frGet("serviceType", "get");
    const keys = Object.keys(res);
    const prop = res.propertyName;
    const sampleData = prop && res[prop] ? Object.values(res[prop] as object).slice(0, 2) : null;
    return NextResponse.json({ keys, propertyName: prop, success: res.success, sampleData, count: prop && res[prop] ? Object.keys(res[prop] as object).length : 0 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

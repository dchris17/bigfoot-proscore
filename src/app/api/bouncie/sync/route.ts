import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/pin/actions";
import { syncBouncieTrips } from "@/lib/sync/bouncie";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const body = await req.json() as { month?: string };
  const now = new Date();
  const year = now.getFullYear();
  const mon = now.getMonth() + 1;
  const monthStr = body.month ?? `${year}-${String(mon).padStart(2, "0")}`;
  const [y, m] = monthStr.split("-").map(Number);
  const monthStart = new Date(y, m - 1, 1);
  const monthEnd = new Date(y, m, 1);

  const result = await syncBouncieTrips(monthStart, monthEnd);

  return NextResponse.json({ ok: true, month: monthStr, ...result });
}

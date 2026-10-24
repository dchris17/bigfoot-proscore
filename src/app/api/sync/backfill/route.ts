import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/app/pin/actions";
import { BranchNotFoundError, monthRange, syncFieldRoutesAppointments } from "@/lib/sync/fieldroutes";

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const body = await req.json() as { months?: string[] };
  const months = body.months ?? ["2026-08", "2026-09", "2026-10"];

  try {
    const result = await syncFieldRoutesAppointments(
      months.map(month => ({ label: month, ...monthRange(month) }))
    );
    return NextResponse.json({
      ok: true,
      synced: result.synced,
      skipped: result.skipped,
      byMonth: result.byRange,
      errors: result.errors.slice(0, 10),
    });
  } catch (e) {
    if (e instanceof BranchNotFoundError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

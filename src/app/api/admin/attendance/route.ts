import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

interface AttendanceRow {
  techId: string;
  callouts: number;
  workingDays: number;
  notes?: string;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const body = await req.json() as { year: number; month: number; rows: AttendanceRow[] };
  const { year, month, rows } = body;

  if (!year || !month || !Array.isArray(rows)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  for (const row of rows) {
    await db.attendance.upsert({
      where: { techId_year_month: { techId: row.techId, year, month } },
      update: {
        callouts: row.callouts,
        workingDays: row.workingDays,
        notes: row.notes ?? null,
      },
      create: {
        techId: row.techId,
        year,
        month,
        callouts: row.callouts,
        workingDays: row.workingDays,
        notes: row.notes ?? null,
      },
    });
  }

  return NextResponse.json({ ok: true, saved: rows.length });
}

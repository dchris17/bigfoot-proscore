import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

// Stamps isReservice on Appointment rows.
// Type 3 = "Reservice" (abbreviation: RS, category: GENERAL) — confirmed from FR service type list.
// Add additional reservice type IDs here if needed (e.g. Follow-Up type 242).
const RESERVICE_TYPE_IDS = ["3"];

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  try {
    const typeList = RESERVICE_TYPE_IDS.map(id => `'${id}'`).join(",");

    const setReservice = await prisma.$executeRawUnsafe(`
      UPDATE "Appointment"
      SET "isReservice" = true
      WHERE "rawJson"->>'type' IN (${typeList})
    `);

    const clearReservice = await prisma.$executeRawUnsafe(`
      UPDATE "Appointment"
      SET "isReservice" = false
      WHERE "rawJson"->>'type' NOT IN (${typeList})
    `);

    const counts = await prisma.appointment.groupBy({
      by: ["isReservice"],
      _count: { id: true },
    });

    return NextResponse.json({
      ok: true,
      setReservice,
      clearReservice,
      counts,
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

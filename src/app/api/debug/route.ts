import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const techCount = await prisma.tech.count();
    const apptCount = await prisma.appointment.count();
    const branchCount = await prisma.branch.count();

    // Sample distinct type values and reserviceReasonID values
    const typeValues = await prisma.$queryRaw<{ type: string; cnt: bigint }[]>`
      SELECT "rawJson"->>'type' as type, COUNT(*) as cnt
      FROM "Appointment"
      GROUP BY "rawJson"->>'type'
      ORDER BY cnt DESC
      LIMIT 10
    `;
    const reserviceReasonValues = await prisma.$queryRaw<{ rrId: string; cnt: bigint }[]>`
      SELECT "rawJson"->>'reserviceReasonID' as "rrId", COUNT(*) as cnt
      FROM "Appointment"
      GROUP BY "rawJson"->>'reserviceReasonID'
      ORDER BY cnt DESC
      LIMIT 10
    `;
    // Also sample a few appointments that might be reservices
    const origApptSample = await prisma.$queryRaw<{ oid: string; cnt: bigint }[]>`
      SELECT "rawJson"->>'originalAppointmentID' as oid, COUNT(*) as cnt
      FROM "Appointment"
      WHERE ("rawJson"->>'originalAppointmentID') IS NOT NULL
        AND ("rawJson"->>'originalAppointmentID') <> '0'
      GROUP BY "rawJson"->>'originalAppointmentID'
      LIMIT 5
    `;

    // October-specific breakdown
    const octTypes = await prisma.$queryRaw<{ type: string; cnt: bigint; isres: boolean }[]>`
      SELECT "rawJson"->>'type' as type, COUNT(*) as cnt, bool_or("isReservice") as isres
      FROM "Appointment"
      WHERE date >= '2026-10-01' AND date < '2026-11-01'
        AND status = 1
      GROUP BY "rawJson"->>'type'
      ORDER BY cnt DESC
    `;
    const octTotal = octTypes.reduce((s, r) => s + Number(r.cnt), 0);

    return NextResponse.json({
      ok: true, techCount, apptCount, branchCount,
      typeValues: typeValues.map(r => ({ type: r.type, cnt: Number(r.cnt) })),
      reserviceReasonValues: reserviceReasonValues.map(r => ({ rrId: r.rrId, cnt: Number(r.cnt) })),
      origApptNonZeroCount: origApptSample.length,
      octTotal,
      octTypes: octTypes.map(r => ({ type: r.type, cnt: Number(r.cnt), isReservice: r.isres })),
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

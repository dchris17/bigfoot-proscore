import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const latest = await prisma.appointment.findFirst({
    where: { status: 1 },
    orderBy: { date: "desc" },
    select: { date: true, id: true },
  });

  const oct1 = new Date(2026, 9, 1);
  const nov1 = new Date(2026, 10, 1);

  const octCount = await prisma.appointment.count({
    where: { date: { gte: oct1, lt: nov1 }, status: 1 },
  });

  // Count by day for October to see if any days are missing
  const octByDay = await prisma.$queryRaw<{ day: string; cnt: number }[]>`
    SELECT DATE("date") as day, COUNT(*)::int as cnt
    FROM "Appointment"
    WHERE "date" >= ${oct1} AND "date" < ${nov1} AND "status" = 1
    GROUP BY DATE("date")
    ORDER BY day DESC
  `;

  return NextResponse.json({ latest, octCount, octByDay });
}

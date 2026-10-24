import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Distribution of subscriptionId values across all appointments
  const dist = await prisma.$queryRaw<{ bucket: string; cnt: number }[]>`
    SELECT
      CASE
        WHEN "subscriptionId" IS NULL THEN 'null'
        WHEN "subscriptionId" = -1    THEN '-1 (stand-alone/reservice)'
        WHEN "subscriptionId" = 0     THEN '0'
        ELSE 'real subscription'
      END as bucket,
      COUNT(*)::int as cnt
    FROM "Appointment"
    WHERE "status" = 1
    GROUP BY 1
    ORDER BY cnt DESC
  `;

  // October regular (non-reservice) breakdown by subscription bucket
  const oct1 = new Date(2026, 9, 1);
  const nov1 = new Date(2026, 10, 1);
  const octRegDist = await prisma.$queryRaw<{ bucket: string; cnt: number }[]>`
    SELECT
      CASE
        WHEN "subscriptionId" IS NULL THEN 'null'
        WHEN "subscriptionId" = -1    THEN '-1 (stand-alone)'
        WHEN "subscriptionId" = 0     THEN '0'
        ELSE 'real subscription'
      END as bucket,
      COUNT(*)::int as cnt
    FROM "Appointment"
    WHERE "status" = 1
      AND "isReservice" = false
      AND "date" >= ${oct1} AND "date" < ${nov1}
    GROUP BY 1
    ORDER BY cnt DESC
  `;

  return NextResponse.json({ allCompleted: dist, octRegular: octRegDist });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getVehicles, getTrips } from "@/lib/bouncie/client";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

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

  // 1. Fetch all Bouncie vehicles and sync Truck records
  const vehicles = await getVehicles();
  for (const v of vehicles) {
    await db.truck.upsert({
      where: { bouncieImei: v.imei },
      update: { nickname: v.nickName },
      create: { bouncieImei: v.imei, nickname: v.nickName },
    });
  }

  // 2. Load all techs to match by name
  const techs = await db.tech.findMany({
    where: { included: true, active: true },
    select: { id: true, name: true },
  }) as { id: string; name: string }[];

  // 3. Build imei→techId map by matching vehicle displayName to tech name (case-insensitive)
  const imeiToTech = new Map<string, string>();
  for (const v of vehicles) {
    const displayLower = v.nickName.toLowerCase().trim();
    const lastName = displayLower.split(" ").slice(-1)[0];
    // Match by full name first, then fall back to last name only (catches Jake vs Jacob etc.)
    const match = techs.find(t => t.name.toLowerCase().trim() === displayLower)
      ?? techs.find(t => t.name.toLowerCase().trim().endsWith(" " + lastName));
    if (match) imeiToTech.set(v.imei, match.id);
  }

  // 4. Sync trips for each matched vehicle
  let totalTrips = 0;
  const unmatched: string[] = [];
  const matched: string[] = [];

  for (const v of vehicles) {
    const techId = imeiToTech.get(v.imei);
    if (!techId) {
      unmatched.push(v.nickName);
      continue;
    }
    matched.push(v.nickName);

    const trips = await getTrips(v.imei, monthStart, monthEnd);
    for (const trip of trips) {
      await db.trip.upsert({
        where: { id: trip.transactionId },
        update: {
          distanceMiles: trip.distance,
          hardBrakes: trip.hardBrakingCount,
          hardAccels: trip.hardAccelerationCount,
          speedingSeconds: 0,
          attributedTechId: techId,
          rawJson: trip as object,
        },
        create: {
          id: trip.transactionId,
          imei: trip.imei,
          startedAt: new Date(trip.startTime),
          endedAt: new Date(trip.endTime),
          distanceMiles: trip.distance,
          hardBrakes: trip.hardBrakingCount,
          hardAccels: trip.hardAccelerationCount,
          speedingSeconds: 0,
          attributedTechId: techId,
          rawJson: trip as object,
        },
      });
      totalTrips++;
    }
  }

  return NextResponse.json({
    ok: true,
    month: monthStr,
    vehicles: vehicles.length,
    matched: matched.length,
    unmatched,
    tripsUpserted: totalTrips,
  });
}

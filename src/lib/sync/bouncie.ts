import { prisma } from "@/lib/prisma";
import { getVehicles, getTrips } from "@/lib/bouncie/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export interface BouncieSyncResult {
  vehicles: number;
  matched: number;
  unmatched: string[];
  tripsUpserted: number;
}

async function syncTrips(startsAfter: Date, endsBefore: Date): Promise<BouncieSyncResult> {
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

    const trips = await getTrips(v.imei, startsAfter, endsBefore);
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

  return {
    vehicles: vehicles.length,
    matched: matched.length,
    unmatched,
    tripsUpserted: totalTrips,
  };
}

/**
 * Sync Bouncie vehicles into Truck and trips in [startsAfter, endsBefore) into Trip.
 * Records a SyncRun row (source "bouncie"). Throws if Bouncie is not connected or the API fails.
 */
export async function syncBouncieTrips(startsAfter: Date, endsBefore: Date): Promise<BouncieSyncResult> {
  const syncRun = await prisma.syncRun.create({
    data: { source: "bouncie", startedAt: new Date(), status: "running" },
  });
  try {
    const result = await syncTrips(startsAfter, endsBefore);
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        finishedAt: new Date(),
        status: "success",
        counts: {
          from: startsAfter.toISOString(),
          to: endsBefore.toISOString(),
          vehicles: result.vehicles,
          matched: result.matched,
          trips: result.tripsUpserted,
        },
        errors: result.unmatched.length > 0 ? [`unmatched vehicles: ${result.unmatched.join(", ")}`] : [],
      },
    });
    return result;
  } catch (e) {
    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        finishedAt: new Date(),
        status: "error",
        errors: [e instanceof Error ? e.message : String(e)],
      },
    });
    throw e;
  }
}

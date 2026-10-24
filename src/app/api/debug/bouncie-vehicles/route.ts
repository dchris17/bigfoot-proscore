import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const API_URL = "https://api.bouncie.dev/v1";

  // Get token from settings
  const rows = await db.setting.findMany({
    where: { key: { in: ["bouncie_access_token", "bouncie_token_expires_at"] } },
  });
  const map = Object.fromEntries(rows.map((r: { key: string; value: string }) => [r.key, r.value]));
  if (!map.bouncie_access_token) {
    return NextResponse.json({ error: "Not connected" });
  }

  const vehicleRes = await fetch(`${API_URL}/vehicles`, {
    headers: { Authorization: map.bouncie_access_token },
  });
  const vehicles = await vehicleRes.json();
  const firstImei = Array.isArray(vehicles) ? vehicles[0]?.imei : null;

  // Try trips endpoint with first vehicle to see what params it wants
  const tripsUrl = new URL(`${API_URL}/trips`);
  const tripsU = new URL(`${API_URL}/trips`);
  tripsU.searchParams.set("imei", firstImei!);
  tripsU.searchParams.set("starts-after", "2026-10-01T00:00:00.000Z");
  tripsU.searchParams.set("ends-before", "2026-10-04T00:00:00.000Z");
  tripsU.searchParams.set("gps-format", "polyline");
  const tripsR = await fetch(tripsU.toString(), { headers: { Authorization: map.bouncie_access_token } });
  const tripsData = await tripsR.json();
  const firstTrip = Array.isArray(tripsData) && tripsData.length > 0 ? tripsData[0] : tripsData;
  // Strip GPS polyline from display
  if (firstTrip && typeof firstTrip === "object") delete (firstTrip as Record<string,unknown>).gps;

  return NextResponse.json({
    vehicleStatus: vehicleRes.status,
    firstImei,
    tripsStatus: tripsR.status,
    tripKeys: firstTrip && typeof firstTrip === "object" ? Object.keys(firstTrip) : [],
    firstTrip,
  });
}

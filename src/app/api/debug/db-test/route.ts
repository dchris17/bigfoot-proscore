import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  const results: Record<string, unknown> = {};

  for (const [name, fn] of [
    ["tech.count", () => db.tech.count()],
    ["appointment.count", () => prisma.appointment.count()],
    ["trip.count", () => db.trip.count()],
    ["attendance.count", () => db.attendance.count()],
  ] as [string, () => Promise<unknown>][]) {
    try {
      results[name] = await fn();
    } catch (e) {
      results[name] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  try {
    results["branches"] = await db.branch.findMany({ select: { id: true, name: true } });
    results["techs.branch"] = await db.tech.findMany({ select: { name: true, branch: { select: { name: true } } } });
  } catch (e) {
    results["branches"] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(results);
}

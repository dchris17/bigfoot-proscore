import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getGoals } from "@/lib/goals";
import { GOALS } from "@/lib/scoring/engine";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function GET() {
  return NextResponse.json({ goals: await getGoals() });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }

  const body = await req.json() as Record<string, unknown>;
  const goals: Record<string, number> = {};
  for (const key of Object.keys(GOALS)) {
    const v = Number(body[key]);
    if (!Number.isFinite(v) || v < 0) {
      return NextResponse.json({ error: `Invalid value for ${key}` }, { status: 400 });
    }
    goals[key] = v;
  }

  const value = JSON.stringify(goals);
  await db.setting.upsert({
    where: { key: "goals" },
    create: { key: "goals", value },
    update: { value },
  });
  return NextResponse.json({ ok: true, goals });
}

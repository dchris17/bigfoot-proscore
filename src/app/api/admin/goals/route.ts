import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GOALS } from "@/lib/scoring/engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

async function ensureSettingTable() {
  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Setting" (
      "key" TEXT PRIMARY KEY,
      "value" TEXT NOT NULL
    )
  `);
}

export async function GET() {
  try {
    await ensureSettingTable();
    const rows = await db.$queryRawUnsafe(
      `SELECT key, value FROM "Setting" WHERE key = 'goals'`
    ) as { key: string; value: string }[];
    if (rows.length > 0) {
      return NextResponse.json({ goals: JSON.parse(rows[0].value) });
    }
    return NextResponse.json({ goals: { ...GOALS } });
  } catch (e) {
    return NextResponse.json({ goals: { ...GOALS } });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, number>;
  await ensureSettingTable();
  await db.$executeRawUnsafe(
    `INSERT INTO "Setting" (key, value) VALUES ('goals', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
    JSON.stringify(body)
  );
  return NextResponse.json({ ok: true });
}

import { GOALS } from "@/lib/scoring/engine";

export type GoalsMap = typeof GOALS;

export async function getGoals(): Promise<GoalsMap> {
  try {
    const { prisma } = await import("@/lib/prisma");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Setting" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL
      )
    `);
    const rows = await db.$queryRawUnsafe(
      `SELECT value FROM "Setting" WHERE key = 'goals'`
    ) as { value: string }[];
    if (rows.length > 0) {
      const parsed = JSON.parse(rows[0].value);
      return { ...GOALS, ...parsed };
    }
  } catch {
    // DB error — fall back to defaults
  }
  return { ...GOALS };
}

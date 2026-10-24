import { GOALS } from "@/lib/scoring/engine";

export type GoalsMap = typeof GOALS;

export async function getGoals(): Promise<GoalsMap> {
  try {
    const { prisma } = await import("@/lib/prisma");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = prisma as any;
    const row = await db.setting.findUnique({ where: { key: "goals" } }) as { value: string } | null;
    if (row) return { ...GOALS, ...JSON.parse(row.value) };
  } catch {
    // DB unavailable — fall back to defaults
  }
  return { ...GOALS };
}

// Command-line sync runs with production env loaded:
//   npm run worker                                     same nightly sync as POST /api/cron/sync
//   npm run worker -- backfill 2026-01-01 2026-09-30   FieldRoutes appointments (all statuses) for a date range, then service types
//   npm run worker -- service-types                    service types only
import { prisma } from "@/lib/prisma";
import { runNightlySync } from "@/lib/sync/nightly";
import { syncFieldRoutesAppointments } from "@/lib/sync/fieldroutes";
import { syncServiceTypes } from "@/lib/sync/serviceTypes";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function backfill(dateStart: string, dateEnd: string) {
  if (!DATE_RE.test(dateStart) || !DATE_RE.test(dateEnd)) {
    throw new Error("usage: npm run worker -- backfill YYYY-MM-DD YYYY-MM-DD");
  }
  const started = Date.now();
  const fieldroutes = await syncFieldRoutesAppointments([{ label: `${dateStart}..${dateEnd}`, dateStart, dateEnd }]);
  const { upserted } = await syncServiceTypes();
  return {
    ok: fieldroutes.errors.length === 0,
    fieldroutes: { ...fieldroutes, errors: fieldroutes.errors.slice(0, 10) },
    serviceTypes: { upserted },
    durationSeconds: Math.round((Date.now() - started) / 1000),
  };
}

async function main() {
  const [mode, ...args] = process.argv.slice(2);
  const result =
    mode === "backfill" ? await backfill(args[0], args[1])
    : mode === "service-types" ? { ok: true, serviceTypes: { upserted: (await syncServiceTypes()).upserted } }
    : await runNightlySync();
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
  process.exit(result.ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});

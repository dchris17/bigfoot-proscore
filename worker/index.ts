// Runs the nightly FieldRoutes + Bouncie sync once from the command line (`npm run worker`).
// Same code path as POST /api/cron/sync; useful for catch-up runs with production env loaded.
import { prisma } from "@/lib/prisma";
import { runNightlySync } from "@/lib/sync/nightly";

async function main() {
  const result = await runNightlySync();
  console.log(JSON.stringify(result, null, 2));
  await prisma.$disconnect();
  process.exit(result.ok ? 0 : 1);
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});

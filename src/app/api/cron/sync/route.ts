import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runNightlySync } from "@/lib/sync/nightly";

// Called nightly by the n8n "Footprint Nightly Sync" workflow (n8n-workflow-nightly-sync.json).
// Takes a few minutes; the response is the run summary so n8n's execution log shows it.

function hasCronSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET;
  const given = req.headers.get("x-footprint-cron-secret");
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  if (!hasCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runNightlySync();
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}

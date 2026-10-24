import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json() as { techId: string | null };

  await db.$executeRawUnsafe(
    `UPDATE "Review" SET "attributedTechId" = $1, "matchMethod" = $2 WHERE id = $3`,
    body.techId ?? null,
    body.techId ? "manual" : "unmatched",
    id,
  );

  return NextResponse.json({ ok: true });
}

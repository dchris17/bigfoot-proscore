import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  try {
    // Add column if it doesn't exist using raw SQL
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "Tech" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT`
    );
    return NextResponse.json({ ok: true, message: "Column added (or already existed)" });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

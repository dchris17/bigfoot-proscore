import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
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

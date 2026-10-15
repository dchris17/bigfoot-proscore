import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const techCount = await prisma.tech.count();
    const apptCount = await prisma.appointment.count();
    const branchCount = await prisma.branch.count();
    return NextResponse.json({ ok: true, techCount, apptCount, branchCount });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

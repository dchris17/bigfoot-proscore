import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sample = await prisma.appointment.findFirst({
    where: { status: 1, date: { gte: new Date("2026-10-01") } },
    select: { id: true, rawJson: true, productionValue: true },
  });
  return NextResponse.json(sample);
}

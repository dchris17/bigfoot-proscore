import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST(req: NextRequest) {
  const { name, photoUrl } = await req.json() as { name: string; photoUrl: string };
  const result = await db.tech.updateMany({
    where: { name: { contains: name, mode: "insensitive" } },
    data: { photoUrl },
  });
  return NextResponse.json({ updated: result.count });
}

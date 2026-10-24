import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const { name, photoUrl } = await req.json() as { name: string; photoUrl: string };
  const result = await db.tech.updateMany({
    where: { name: { contains: name, mode: "insensitive" } },
    data: { photoUrl },
  });
  return NextResponse.json({ updated: result.count });
}

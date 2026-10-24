import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const body = await req.json() as {
    name: string;
    firstName: string;
    fieldroutesEmployeeId: number;
    branchId: string;
    nicknames?: string[];
  };

  if (!body.name || !body.firstName || !body.fieldroutesEmployeeId || !body.branchId) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  try {
    const tech = await db.tech.create({
      data: {
        name: body.name,
        firstName: body.firstName,
        fieldroutesEmployeeId: body.fieldroutesEmployeeId,
        branchId: body.branchId,
        nicknames: body.nicknames ?? [],
        active: true,
        included: true,
      },
      select: {
        id: true, name: true, firstName: true, fieldroutesEmployeeId: true,
        active: true, included: true, branch: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json({ tech });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ error: "A technician with that FieldRoutes Employee ID already exists." }, { status: 409 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const body = await req.json() as { id: string; active?: boolean; included?: boolean };
  if (!body.id) return NextResponse.json({ error: "Missing id." }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (body.active !== undefined) data.active = body.active;
  if (body.included !== undefined) data.included = body.included;

  await db.tech.update({ where: { id: body.id }, data });
  return NextResponse.json({ ok: true });
}

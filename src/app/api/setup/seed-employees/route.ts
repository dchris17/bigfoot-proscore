import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/app/pin/actions";

type Role = "technician" | "admin" | "manager";

interface EmployeeInput {
  frId: number;
  name: string;
  firstName: string;
  role: Role;
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const body = await req.json() as { employees: EmployeeInput[] };
  const employees = body.employees ?? [];

  if (employees.length === 0) {
    return NextResponse.json({ error: "No employees provided" }, { status: 400 });
  }

  // Ensure the Bigfoot branch exists
  const branch = await prisma.branch.upsert({
    where: { fieldroutesOfficeId: 1 },
    update: {},
    create: {
      name: "Bigfoot Pest Control",
      timezone: "America/Boise",
      fieldroutesOfficeId: 1,
    },
  });

  // Upsert each employee into the Tech table
  const results = await Promise.all(
    employees.map((emp) =>
      prisma.tech.upsert({
        where: { fieldroutesEmployeeId: emp.frId },
        update: {
          name: emp.name.trim(),
          firstName: emp.firstName.trim(),
          active: true,
          included: emp.role === "technician",
        },
        create: {
          fieldroutesEmployeeId: emp.frId,
          name: emp.name.trim(),
          firstName: emp.firstName.trim(),
          nicknames: [],
          branchId: branch.id,
          active: true,
          included: emp.role === "technician",
        },
      })
    )
  );

  return NextResponse.json({ saved: results.length });
}

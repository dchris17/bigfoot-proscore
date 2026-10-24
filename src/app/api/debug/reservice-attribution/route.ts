import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // October 2026 reservice appointments
    const oct = await prisma.appointment.findMany({
      where: {
        date: { gte: new Date(2026, 9, 1), lt: new Date(2026, 10, 1) },
        status: 1,
        isReservice: true,
      },
      select: { id: true, customerId: true, assignedEmployeeId: true, servicedByEmployeeId: true, rawJson: true },
    });

    // For each, check if we can find a prior regular service
    const lookbackStart = new Date(2026, 3, 1); // April 2026
    const monthStart = new Date(2026, 9, 1);

    const customerIds = [...new Set(oct.map(a => a.customerId).filter(Boolean) as number[])];
    const customerIdsFromRaw = [...new Set(
      oct.map(a => {
        const raw = a.rawJson as Record<string, unknown>;
        return raw.customerID ? parseInt(raw.customerID as string) : null;
      }).filter(Boolean) as number[]
    )];

    // Look up prior regular services using DB column
    const priorViaColumn = await prisma.appointment.findMany({
      where: {
        date: { gte: lookbackStart, lt: monthStart },
        status: 1,
        isReservice: false,
        customerId: { in: customerIds },
      },
      select: { customerId: true, assignedEmployeeId: true, servicedByEmployeeId: true, date: true },
      orderBy: { date: "desc" },
    });

    const matchedCustomers = new Set(priorViaColumn.map(a => a.customerId));
    const unmatchedCustomers = customerIds.filter(id => !matchedCustomers.has(id));

    // Check how many reservice appts have customerId populated vs null
    const nullCustomerId = oct.filter(a => !a.customerId).length;
    const hasCustomerIdColumn = oct.filter(a => a.customerId).length;
    const hasCustomerIdRaw = oct.filter(a => {
      const raw = a.rawJson as Record<string, unknown>;
      return raw.customerID && raw.customerID !== "0";
    }).length;

    // Earliest date in our DB
    const earliest = await prisma.appointment.findFirst({
      where: { isReservice: false },
      orderBy: { date: "asc" },
      select: { date: true },
    });

    return NextResponse.json({
      octReservices: oct.length,
      nullCustomerIdColumn: nullCustomerId,
      hasCustomerIdColumn,
      hasCustomerIdRaw,
      uniqueCustomersFromColumn: customerIds.length,
      uniqueCustomersFromRaw: customerIdsFromRaw.length,
      matchedToOriginalTech: matchedCustomers.size,
      unmatchedCount: unmatchedCustomers.length,
      earliestRegularAppt: earliest?.date,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

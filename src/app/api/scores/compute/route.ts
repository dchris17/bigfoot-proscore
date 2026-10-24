import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeProScore, GOALS, KpiInput } from "@/lib/scoring/engine";
import { computeReservices, reservicePctFor } from "@/lib/scoring/reservice";
import { computeProdHr, prodHrFor } from "@/lib/scoring/prodHr";
import { isAdmin } from "@/app/pin/actions";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function daysElapsed(year: number, month: number): number {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  if (isCurrentMonth) return today.getDate();
  return daysInMonth(year, month);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Manager PIN required" }, { status: 401 });
  }
  const body = await req.json() as { month?: string };
  const month = body.month ?? new Date().toISOString().slice(0, 7); // "2026-10"
  const [year, mon] = month.split("-").map(Number);

  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 1);

  // All completed appointments in the month
  const appts = await prisma.appointment.findMany({
    where: {
      date: { gte: monthStart, lt: monthEnd },
      status: 1,
    },
    select: {
      id: true,
      status: true,
      date: true,
      assignedEmployeeId: true,
      servicedByEmployeeId: true,
      productionValue: true,
      rawJson: true,
    },
  });

  // All included techs
  const techs = await prisma.tech.findMany({
    where: { included: true, active: true },
    select: { id: true, name: true, firstName: true, fieldroutesEmployeeId: true },
  });

  const dm = daysInMonth(year, mon);
  const de = daysElapsed(year, mon);
  const reservices = await computeReservices(monthStart, monthEnd);
  const prodHrs = computeProdHr(appts);

  const techScores = techs.map((tech) => {
    const frId = tech.fieldroutesEmployeeId;

    // Appointments assigned to this tech
    const assigned = appts.filter((a) => a.assignedEmployeeId === frId);
    // Appointments serviced by this tech (they did the work)
    const serviced = appts.filter((a) => (a.servicedByEmployeeId ?? a.assignedEmployeeId) === frId);

    // --- Completion % ---
    // assigned count vs completed (status=1 so all are completed)
    const completePct = assigned.length > 0 ? 100 : null;
    // All fetched are status=1 (completed), so completion = 100% if they have any.
    // For a more accurate picture we'd need total scheduled — skipping for now, null = no data.
    // We'll compute this properly once we sync all statuses.

    // --- Production / hr ---
    const { prodHr, production: totalProdValue, workMinutes } = prodHrFor(prodHrs, frId);
    const totalHours = workMinutes / 60;

    // --- Reservice % ---
    const { pct: reservicePct, count: reserviceCount } = reservicePctFor(reservices, frId);

    // Build KPI inputs
    const kpiInputs: KpiInput[] = [
      { key: "driving",   actual: null,         goal: GOALS.driving },
      { key: "reservice", actual: reservicePct, goal: GOALS.reservice, curve: "goal_over_actual" },
      { key: "prod_hr",   actual: prodHr,       goal: GOALS.prod_hr },
      { key: "attendance", actual: null,          goal: GOALS.attendance },
      { key: "stars",     actual: null,         goal: GOALS.stars, daysElapsed: de, daysInMonth: dm },
    ];

    const result = computeProScore(kpiInputs);

    return {
      techId: tech.id,
      name: tech.name,
      firstName: tech.firstName,
      frId,
      month,
      appointmentsAssigned: assigned.length,
      appointmentsServiced: serviced.length,
      reserviceCount,
      reservicePct: reservicePct !== null ? Math.round(reservicePct * 10) / 10 : null,
      prodHr: prodHr !== null ? Math.round(prodHr * 100) / 100 : null,
      totalHours: Math.round(totalHours * 10) / 10,
      totalProdValue: Math.round(totalProdValue * 100) / 100,
      proscore: result.proscore,
      proscoreRaw: Math.round(result.proscoreRaw * 100) / 100,
      kpis: result.kpiResults.map((k) => ({
        key: k.key,
        actual: k.actual,
        goal: k.goal,
        progress: k.progress !== null ? Math.round(k.progress * 1000) / 1000 : null,
      })),
    };
  });

  // Sort by proscore desc
  techScores.sort((a, b) => b.proscoreRaw - a.proscoreRaw);

  return NextResponse.json({ month, daysElapsed: de, daysInMonth: dm, techs: techScores });
}

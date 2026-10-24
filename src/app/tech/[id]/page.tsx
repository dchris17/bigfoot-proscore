export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeProScore, GOALS, type KpiInput, denseRank } from "@/lib/scoring/engine";
import { getGoals } from "@/lib/goals";
import { computeDrivingScore } from "@/lib/bouncie/client";
import {
  FootprintShell,
  TechCard,
  toFpKpis,
  type FpTech,
  type FpHistoryPoint,
} from "@/components/footprint";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function daysInMonth(year: number, mon: number) { return new Date(year, mon, 0).getDate(); }
function daysElapsed(year: number, mon: number) {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() + 1 === mon
    ? today.getDate() : daysInMonth(year, mon);
}

type TechRow = {
  id: string;
  name: string;
  firstName: string;
  fieldroutesEmployeeId: number;
  included: boolean;
  active: boolean;
  photoUrl: string | null;
};

async function getTechData(techId: string, year: number, mon: number, goals: typeof GOALS) {
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd   = new Date(year, mon, 1);
  const dm = daysInMonth(year, mon);
  const de = daysElapsed(year, mon);

  const tech: TechRow | null = await db.tech.findUnique({
    where: { id: techId },
    select: { id: true, name: true, firstName: true, fieldroutesEmployeeId: true, included: true, active: true, photoUrl: true },
  });
  if (!tech || !tech.included || !tech.active) return null;

  const allTechs: { id: string; fieldroutesEmployeeId: number }[] = await db.tech.findMany({
    where: { included: true, active: true },
    select: { id: true, fieldroutesEmployeeId: true },
  });

  const [appts, attendanceRow, techTrips, historyRows, starsRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: monthStart, lt: monthEnd }, status: 1 },
      select: {
        assignedEmployeeId: true, servicedByEmployeeId: true,
        productionValue: true, checkIn: true, checkOut: true, rawJson: true,
        date: true, isReservice: true, customerId: true,
      },
    }),
    db.attendance.findFirst({
      where: { techId, year, month: mon },
      select: { callouts: true, workingDays: true },
    }) as Promise<{ callouts: number; workingDays: number } | null>,
    db.trip.findMany({
      where: { attributedTechId: techId, startedAt: { gte: monthStart, lt: monthEnd } },
      select: { distanceMiles: true, hardBrakes: true, hardAccels: true },
    }) as Promise<{ distanceMiles: number; hardBrakes: number; hardAccels: number }[]>,
    db.monthlyScore.findMany({
      where: { techId },
      orderBy: [{ month: "desc" }],
      take: 7,
      select: { month: true, proscore: true },
    }) as Promise<{ month: string; proscore: number }[]>,
    db.$queryRawUnsafe(
      `SELECT COUNT(*)::int as count FROM "Review"
       WHERE "reviewDate" >= $1 AND "reviewDate" < $2 AND rating = 5 AND "attributedTechId" = $3`,
      monthStart.toISOString(), monthEnd.toISOString(), techId
    ).catch(() => [{ count: 0 }]) as Promise<{ count: number }[]>,
  ]);

  // Rank: compute all techs this month
  function calcScore(frId: number) {
    const serviced = appts.filter(a => (a.servicedByEmployeeId ?? a.assignedEmployeeId) === frId);
    let totalProd = 0, totalHrs = 0;
    for (const a of serviced) {
      if (a.checkIn && a.checkOut) {
        const hrs = (a.checkOut.getTime() - a.checkIn.getTime()) / 3600000;
        if (hrs > 0 && hrs < 24) { totalHrs += hrs; totalProd += a.productionValue ? parseFloat(a.productionValue.toString()) : 0; }
      }
    }
    const prodHr = totalHrs > 0 ? totalProd / totalHrs : null;
    const reserviceCount = serviced.filter(a => a.isReservice).length;
    const denominator = serviced.filter(a => !a.isReservice).length;
    const reservicePct = denominator > 0 ? (reserviceCount / denominator) * 100 : null;
    const { proscoreRaw, proscore } = computeProScore([
      { key: "driving",    actual: null,         goal: goals.driving },
      { key: "reservice",  actual: reservicePct, goal: goals.reservice, curve: "goal_over_actual" },
      { key: "prod_hr",    actual: prodHr,       goal: goals.prod_hr },
      { key: "attendance", actual: null,          goal: goals.attendance },
      { key: "stars",      actual: null,         goal: goals.stars, daysElapsed: de, daysInMonth: dm },
    ]);
    return { proscoreRaw, proscore };
  }

  const allScores = allTechs.map(t => ({ id: t.id, ...calcScore(t.fieldroutesEmployeeId) }));
  allScores.sort((a, b) => b.proscoreRaw - a.proscoreRaw);
  const ranks = denseRank(allScores.map(s => s.proscore));
  const myIdx = allScores.findIndex(s => s.id === techId);
  const rank = ranks[myIdx] ?? 1;
  const totalTechs = allTechs.length;

  // This tech's full KPI data
  const frId = tech.fieldroutesEmployeeId;
  const serviced = appts.filter(a => (a.servicedByEmployeeId ?? a.assignedEmployeeId) === frId);
  let totalProd = 0, totalHrs = 0;
  for (const a of serviced) {
    if (a.checkIn && a.checkOut) {
      const hrs = (a.checkOut.getTime() - a.checkIn.getTime()) / 3600000;
      if (hrs > 0 && hrs < 24) { totalHrs += hrs; totalProd += a.productionValue ? parseFloat(a.productionValue.toString()) : 0; }
    }
  }
  const prodHr = totalHrs > 0 ? totalProd / totalHrs : null;

  const reserviceAppts = serviced.filter(a => a.isReservice);
  const regularAppts = serviced.filter(a => !a.isReservice);
  const reservicePct = regularAppts.length > 0 ? (reserviceAppts.length / regularAppts.length) * 100 : null;

  const att = attendanceRow;
  const attendancePct = att && att.workingDays > 0
    ? ((att.workingDays - att.callouts) / att.workingDays) * 100
    : null;

  const totalMiles = techTrips.reduce((s, t) => s + Number(t.distanceMiles), 0);
  const totalHardBrakes = techTrips.reduce((s, t) => s + t.hardBrakes, 0);
  const totalHardAccels = techTrips.reduce((s, t) => s + t.hardAccels, 0);
  const drivingScore = techTrips.length > 0
    ? computeDrivingScore(totalHardBrakes, totalHardAccels, totalMiles)
    : null;

  const starsCount: number | null = starsRows[0]?.count > 0 ? starsRows[0].count : null;

  const inputs: KpiInput[] = [
    { key: "driving",    actual: drivingScore,  goal: goals.driving },
    { key: "reservice",  actual: reservicePct,  goal: goals.reservice, curve: "goal_over_actual" },
    { key: "prod_hr",    actual: prodHr,         goal: goals.prod_hr },
    { key: "attendance", actual: attendancePct,  goal: goals.attendance },
    { key: "stars",      actual: starsCount,     goal: goals.stars, daysElapsed: de, daysInMonth: dm },
  ];

  const { proscore, kpiResults } = computeProScore(inputs);

  // Reservice drill table: list each reservice appointment
  const reserviceDrillRows = reserviceAppts.map(a => {
    const raw = a.rawJson as Record<string, unknown>;
    const acctNo = raw.customerID ? String(raw.customerID) : "—";
    const dateStr = a.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const origId = raw.originalAppointmentID ? String(raw.originalAppointmentID) : "—";
    return [dateStr, acctNo, origId];
  });

  const kpis = toFpKpis(kpiResults, undefined, {
    reservice: {
      detail: reservicePct !== null
        ? `${reserviceAppts.length} reservice${reserviceAppts.length !== 1 ? "s" : ""} on ${regularAppts.length} completed services this month.`
        : undefined,
      drill: reserviceAppts.length > 0 ? {
        title: `${reserviceAppts.length} reservice${reserviceAppts.length !== 1 ? "s" : ""} charged to you`,
        columns: ["Date", "Account #", "Original Appt ID"],
        rows: reserviceDrillRows,
        note: "Attributed using Driven methodology: the tech who ran the most recent general service for this customer.",
      } : undefined,
    },
    prod_hr: {
      detail: prodHr !== null
        ? `$${Math.round(totalProd).toLocaleString()} production across ${totalHrs.toFixed(1)} on-site hours.`
        : undefined,
    },
    attendance: {
      detail: att
        ? `${att.callouts} call-out${att.callouts !== 1 ? "s" : ""} out of ${att.workingDays} scheduled working days.`
        : undefined,
    },
  });

  // 6-month history (exclude current month — it's live)
  const currentMonthStr = `${year}-${String(mon).padStart(2, "0")}`;
  const history: FpHistoryPoint[] = historyRows
    .filter(r => r.month !== currentMonthStr)
    .slice(0, 6)
    .reverse()
    .map(r => {
      const monIdx = parseInt(r.month.split("-")[1]) - 1;
      return { label: SHORT_MONTHS[monIdx], score: r.proscore };
    });

  return { tech, rank, totalTechs, proscore, kpis, history };
}

export default async function TechPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const now = new Date();
  const year = now.getFullYear();
  const mon  = now.getMonth() + 1;
  const monthLabel = `${MONTH_NAMES[mon - 1]} ${year}`;

  const goals = await getGoals();
  const data = await getTechData(id, year, mon, goals);
  if (!data) notFound();

  const { tech, rank, totalTechs, proscore, kpis, history } = data;

  const fpTech: FpTech = {
    id: tech.id,
    name: tech.name,
    photoUrl: tech.photoUrl,
    rank,
    proscore,
    kpis,
    history,
  };

  return (
    <FootprintShell periodLabel={monthLabel}>
      <TechCard tech={fpTech} totalTechs={totalTechs} monthLabel={monthLabel} />
    </FootprintShell>
  );
}

export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computeProScore, GOALS, type KpiInput, denseRank } from "@/lib/scoring/engine";
import { getGoals } from "@/lib/goals";
import { computeDrivingScore, drivingDetail, drivingTripWindow, DRIVING_TRIP_SELECT, type DrivingTrip } from "@/lib/scoring/driving";
import { computeReservices, reservicePctFor } from "@/lib/scoring/reservice";
import { computeProdHr, formatWorkTime, prodHrFor, PROD_HR_SELECT } from "@/lib/scoring/prodHr";
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

  const allTechs: { id: string; name: string; fieldroutesEmployeeId: number }[] = await db.tech.findMany({
    where: { included: true, active: true },
    select: { id: true, name: true, fieldroutesEmployeeId: true },
  });

  const [appts, reservices, attendanceRow, techTrips, historyRows, starsRows] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: monthStart, lt: monthEnd }, status: 1 },
      select: PROD_HR_SELECT,
    }),
    computeReservices(monthStart, monthEnd),
    db.attendance.findFirst({
      where: { techId, year, month: mon },
      select: { callouts: true, workingDays: true },
    }) as Promise<{ callouts: number; workingDays: number } | null>,
    db.trip.findMany({
      where: { attributedTechId: techId, startedAt: drivingTripWindow(monthStart, monthEnd) },
      select: DRIVING_TRIP_SELECT,
    }) as Promise<DrivingTrip[]>,
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

  const prodHrs = computeProdHr(appts);

  // Rank: compute all techs this month
  function calcScore(frId: number) {
    const { prodHr } = prodHrFor(prodHrs, frId);
    const reservicePct = reservicePctFor(reservices, frId).pct;
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
  const { prodHr, production: totalProd, workMinutes } = prodHrFor(prodHrs, frId);

  const { pct: reservicePct, count: reserviceCount, scheduled } = reservicePctFor(reservices, frId);
  const charged = reservices?.charges.get(frId) ?? [];

  const att = attendanceRow;
  const attendancePct = att && att.workingDays > 0
    ? ((att.workingDays - att.callouts) / att.workingDays) * 100
    : null;

  const driving = computeDrivingScore(techTrips, `${year}-${String(mon).padStart(2, "0")}`);
  const drivingScore = driving.score;

  const starsCount: number | null = starsRows[0]?.count > 0 ? starsRows[0].count : null;

  const inputs: KpiInput[] = [
    { key: "driving",    actual: drivingScore,  goal: goals.driving },
    { key: "reservice",  actual: reservicePct,  goal: goals.reservice, curve: "goal_over_actual" },
    { key: "prod_hr",    actual: prodHr,         goal: goals.prod_hr },
    { key: "attendance", actual: attendancePct,  goal: goals.attendance },
    { key: "stars",      actual: starsCount,     goal: goals.stars, daysElapsed: de, daysInMonth: dm },
  ];

  const { proscore, kpiResults } = computeProScore(inputs);

  // Reservice drill table: each reservice charged to this tech, newest first
  const shortDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  const techName = (id: number) => id === frId ? "You" : allTechs.find(t => t.fieldroutesEmployeeId === id)?.name ?? "Other tech";
  const reserviceDrillRows = [...charged]
    .sort((a, b) => b.reserviceDate.getTime() - a.reserviceDate.getTime())
    .map(c => [shortDate(c.reserviceDate), String(c.customerId), shortDate(c.originalDate), c.category, techName(c.reservicedById)]);

  const kpis = toFpKpis(kpiResults, undefined, {
    driving: { detail: drivingDetail(driving) },
    reservice: {
      detail: reservicePct !== null
        ? `${reserviceCount} reservice${reserviceCount !== 1 ? "s" : ""} charged to you on ${scheduled} scheduled appointments this month.`
        : undefined,
      drill: reserviceCount > 0 ? {
        title: `${reserviceCount} reservice${reserviceCount !== 1 ? "s" : ""} charged to you`,
        columns: ["Reservice", "Account #", "Your service", "Category", "Reserviced by"],
        rows: reserviceDrillRows,
        note: "Each reservice is charged to the tech who did the customer's last service in the same category. The rate divides by every appointment scheduled for you this month.",
      } : undefined,
    },
    prod_hr: {
      detail: prodHr !== null
        ? `$${totalProd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} production across ${formatWorkTime(workMinutes)} of work time.`
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

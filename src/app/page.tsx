export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { computeProScore, GOALS, type KpiInput, denseRank } from "@/lib/scoring/engine";
import { getGoals } from "@/lib/goals";
import { computeDrivingScore } from "@/lib/bouncie/client";
import { computeReservices, reservicePctFor } from "@/lib/scoring/reservice";
import {
  FootprintShell,
  Leaderboard,
  MonthPicker,
  toFpKpis,
  type FpTech,
} from "@/components/footprint";
import { isAdmin } from "@/app/pin/actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function daysInMonth(year: number, mon: number) { return new Date(year, mon, 0).getDate(); }
function daysElapsed(year: number, mon: number) {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() + 1 === mon
    ? today.getDate() : daysInMonth(year, mon);
}

async function getLeaderboard(year: number, mon: number, goals: typeof GOALS) {
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd   = new Date(year, mon, 1);
  const dm = daysInMonth(year, mon);
  const de = daysElapsed(year, mon);

  const [monthAppts, reservices, attendanceRows, techs, monthTrips, fiveStarReviews] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: monthStart, lt: monthEnd }, status: 1 },
      select: {
        assignedEmployeeId: true, servicedByEmployeeId: true,
        productionValue: true, checkIn: true, checkOut: true,
      },
    }),
    computeReservices(monthStart, monthEnd),
    db.attendance.findMany({
      where: { year, month: mon },
      select: { techId: true, callouts: true, workingDays: true },
    }) as Promise<{ techId: string; callouts: number; workingDays: number }[]>,
    db.tech.findMany({
      where: { included: true, active: true },
      select: { id: true, name: true, firstName: true, fieldroutesEmployeeId: true, photoUrl: true, branch: { select: { name: true } } },
    }) as Promise<{ id: string; name: string; firstName: string; fieldroutesEmployeeId: number; photoUrl: string | null; branch: { name: string } }[]>,
    db.trip.findMany({
      where: { startedAt: { gte: monthStart, lt: monthEnd } },
      select: { attributedTechId: true, distanceMiles: true, hardBrakes: true, hardAccels: true },
    }) as Promise<{ attributedTechId: string | null; distanceMiles: number; hardBrakes: number; hardAccels: number }[]>,
    db.$queryRawUnsafe(
      `SELECT "attributedTechId", COUNT(*)::int as count FROM "Review"
       WHERE "reviewDate" >= $1 AND "reviewDate" < $2 AND rating = 5 AND "attributedTechId" IS NOT NULL
       GROUP BY "attributedTechId"`,
      monthStart.toISOString(), monthEnd.toISOString()
    ).catch(() => []) as Promise<{ attributedTechId: string; count: number }[]>,
  ]);

  const BRANCH_ABBR: Record<string, string> = { Boise: "BOI", "Bigfoot Pest Control": "BOI", Portland: "PDX" };

  const rows = techs.map((tech: { id: string; name: string; firstName: string; fieldroutesEmployeeId: number; photoUrl: string | null; branch: { name: string } }) => {
    const frId = tech.fieldroutesEmployeeId;
    const serviced = monthAppts.filter(
      (a) => (a.servicedByEmployeeId ?? a.assignedEmployeeId) === frId
    );

    let totalProd = 0, totalHrs = 0;
    for (const a of serviced) {
      if (a.checkIn && a.checkOut) {
        const hrs = (a.checkOut.getTime() - a.checkIn.getTime()) / 3600000;
        if (hrs > 0 && hrs < 24) {
          totalHrs += hrs;
          totalProd += a.productionValue ? parseFloat(a.productionValue.toString()) : 0;
        }
      }
    }
    const prodHr = totalHrs > 0 ? totalProd / totalHrs : null;

    const { pct: reservicePct, count: reserviceCount, scheduled } = reservicePctFor(reservices, frId);

    const att = attendanceRows.find(a => a.techId === tech.id);
    const attendancePct = att && att.workingDays > 0
      ? ((att.workingDays - att.callouts) / att.workingDays) * 100
      : null;

    const techTrips = monthTrips.filter(t => t.attributedTechId === tech.id);
    const totalMiles = techTrips.reduce((s, t) => s + Number(t.distanceMiles), 0);
    const totalHardBrakes = techTrips.reduce((s, t) => s + t.hardBrakes, 0);
    const totalHardAccels = techTrips.reduce((s, t) => s + t.hardAccels, 0);
    const drivingScore = techTrips.length > 0
      ? computeDrivingScore(totalHardBrakes, totalHardAccels, totalMiles)
      : null;

    const starsCount = fiveStarReviews.find(s => s.attributedTechId === tech.id)?.count ?? null;

    const inputs: KpiInput[] = [
      { key: "driving",    actual: drivingScore,   goal: goals.driving },
      { key: "reservice",  actual: reservicePct,   goal: goals.reservice, curve: "goal_over_actual" },
      { key: "prod_hr",    actual: prodHr,          goal: goals.prod_hr },
      { key: "attendance", actual: attendancePct,   goal: goals.attendance },
      { key: "stars",      actual: starsCount,      goal: goals.stars, daysElapsed: de, daysInMonth: dm },
    ];

    const { proscore, proscoreRaw, kpiResults } = computeProScore(inputs);

    const kpis = toFpKpis(kpiResults, undefined, {
      reservice: {
        detail: reservicePct !== null
          ? `${reserviceCount} reservice${reserviceCount !== 1 ? "s" : ""} charged to you on ${scheduled} scheduled appointments.`
          : undefined,
      },
    });

    return { tech, proscore, proscoreRaw, kpis };
  });

  rows.sort((a: { proscoreRaw: number }, b: { proscoreRaw: number }) => b.proscoreRaw - a.proscoreRaw);
  const ranks = denseRank(rows.map((r: { proscore: number }) => r.proscore));

  return rows.map((r: typeof rows[0], i: number): FpTech => ({
    id: r.tech.id,
    name: r.tech.name,
    photoUrl: r.tech.photoUrl,
    branch: BRANCH_ABBR[r.tech.branch.name] ?? r.tech.branch.name,
    rank: ranks[i],
    proscore: r.proscore,
    kpis: r.kpis,
  }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let mon  = now.getMonth() + 1;

  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number);
    if (y >= 2024 && m >= 1 && m <= 12) { year = y; mon = m; }
  }

  const de = daysElapsed(year, mon);
  const dm = daysInMonth(year, mon);
  const monthName = MONTH_NAMES[mon - 1];
  const isCurrentMonth = year === now.getFullYear() && mon === now.getMonth() + 1;
  const periodLabel = `${monthName} ${year} · Day ${de} of ${dm}`;

  const prevMon = mon === 1 ? 12 : mon - 1;
  const prevYear = mon === 1 ? year - 1 : year;
  const prevHref = `/?month=${prevYear}-${String(prevMon).padStart(2, "0")}`;
  const nextHref = isCurrentMonth ? null : `/?month=${year === now.getFullYear() && mon === now.getMonth() ? year : (mon === 12 ? year + 1 : year)}-${String(mon === 12 ? 1 : mon + 1).padStart(2, "0")}`;

  let techs: FpTech[] = [];
  let dbError = false;
  const goals = await getGoals();
  const [leaderboardResult, admin] = await Promise.allSettled([
    getLeaderboard(year, mon, goals),
    isAdmin(),
  ]);
  if (leaderboardResult.status === "fulfilled") {
    techs = leaderboardResult.value;
  } else {
    dbError = true;
  }
  const manager = admin.status === "fulfilled" && admin.value;

  return (
    <FootprintShell
      activeTab="leaderboard"
      periodLabel={periodLabel}
      updatedLabel={isCurrentMonth ? "Live" : undefined}
      isManager={manager}
    >
      <MonthPicker
        label={`${monthName} ${year}`}
        prevHref={prevHref}
        nextHref={nextHref}
      />
      {dbError ? (
        <div className="fp-empty">Could not load scores — database may be initializing.</div>
      ) : (
        <Leaderboard techs={techs} branches={["BOI", "PDX"]} />
      )}
    </FootprintShell>
  );
}

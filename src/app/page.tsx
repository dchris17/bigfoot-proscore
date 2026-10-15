import { prisma } from "@/lib/prisma";
import { computeProScore, GOALS, KpiInput } from "@/lib/scoring/engine";
import { denseRank } from "@/lib/scoring/engine";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), mon: now.getMonth() + 1 };
}

function daysInMonth(year: number, mon: number) {
  return new Date(year, mon, 0).getDate();
}

function daysElapsed(year: number, mon: number) {
  const today = new Date();
  const isCurrent = today.getFullYear() === year && today.getMonth() + 1 === mon;
  return isCurrent ? today.getDate() : daysInMonth(year, mon);
}

function scoreColor(score: number) {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function scoreBg(score: number) {
  if (score >= 80) return "bg-emerald-50 border-emerald-200";
  if (score >= 60) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function rankBadge(rank: number) {
  if (rank === 1) return "bg-yellow-400 text-yellow-900";
  if (rank === 2) return "bg-gray-300 text-gray-800";
  if (rank === 3) return "bg-amber-600 text-amber-50";
  return "bg-gray-100 text-gray-500";
}

interface KpiPill {
  label: string;
  value: string | null;
  goal: string;
  good: boolean | null;
}

async function getLeaderboard(year: number, mon: number) {
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 1);
  const dm = daysInMonth(year, mon);
  const de = daysElapsed(year, mon);

  const [appts, techs] = await Promise.all([
    prisma.appointment.findMany({
      where: { date: { gte: monthStart, lt: monthEnd }, status: 1 },
      select: {
        assignedEmployeeId: true,
        servicedByEmployeeId: true,
        productionValue: true,
        checkIn: true,
        checkOut: true,
        rawJson: true,
      },
    }),
    prisma.tech.findMany({
      where: { included: true, active: true },
      select: { id: true, name: true, firstName: true, fieldroutesEmployeeId: true },
    }),
  ]);

  const rows = techs.map((tech) => {
    const frId = tech.fieldroutesEmployeeId;
    const serviced = appts.filter(
      (a) => (a.servicedByEmployeeId ?? a.assignedEmployeeId) === frId
    );

    // Prod/hr
    let totalProd = 0;
    let totalHrs = 0;
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

    // Reservice %
    const reserviceCount = serviced.filter((a) => {
      const raw = a.rawJson as Record<string, unknown>;
      return raw.originalAppointmentID && raw.originalAppointmentID !== "0";
    }).length;
    const reservicePct =
      serviced.length > 0 ? (reserviceCount / serviced.length) * 100 : null;

    const inputs: KpiInput[] = [
      { key: "driving",   actual: null,         goal: GOALS.driving },
      { key: "reservice", actual: reservicePct, goal: GOALS.reservice, curve: "goal_over_actual" },
      { key: "prod_hr",   actual: prodHr,       goal: GOALS.prod_hr },
      { key: "complete",  actual: null,         goal: GOALS.complete },
      { key: "stars",     actual: null,         goal: GOALS.stars, daysElapsed: de, daysInMonth: dm },
    ];

    const result = computeProScore(inputs);

    const kpis: KpiPill[] = [
      {
        label: "Drive",
        value: null,
        goal: `${GOALS.driving}`,
        good: null,
      },
      {
        label: "Reservice",
        value: reservicePct !== null ? `${reservicePct.toFixed(1)}%` : null,
        goal: `≤${GOALS.reservice}%`,
        good: reservicePct !== null ? reservicePct <= GOALS.reservice : null,
      },
      {
        label: "Prod/hr",
        value: prodHr !== null ? `$${Math.round(prodHr)}` : null,
        goal: `$${GOALS.prod_hr}`,
        good: prodHr !== null ? prodHr >= GOALS.prod_hr : null,
      },
      {
        label: "Complete",
        value: null,
        goal: `${GOALS.complete}%`,
        good: null,
      },
      {
        label: "Stars",
        value: null,
        goal: `${GOALS.stars}/mo`,
        good: null,
      },
    ];

    return {
      techId: tech.id,
      name: tech.name,
      firstName: tech.firstName,
      apptCount: serviced.length,
      proscore: result.proscore,
      proscoreRaw: result.proscoreRaw,
      kpis,
    };
  });

  // Sort by score desc, rank
  rows.sort((a, b) => b.proscoreRaw - a.proscoreRaw);
  const ranks = denseRank(rows.map((r) => r.proscore));

  return rows.map((r, i) => ({ ...r, rank: ranks[i] }));
}

export default async function DashboardPage() {
  const { year, mon } = currentMonth();
  const de = daysElapsed(year, mon);
  const dm = daysInMonth(year, mon);
  const label = `${MONTH_NAMES[mon - 1]} ${year}`;

  let rows: Awaited<ReturnType<typeof getLeaderboard>> = [];
  let dbError = false;

  try {
    rows = await getLeaderboard(year, mon);
  } catch {
    dbError = true;
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              🦶 ProScore
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">{label}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            Day {de} of {dm}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {dbError && (
          <div className="p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm mb-4">
            Could not load scores — database may be initializing.
          </div>
        )}

        {!dbError && rows.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg">No techs found.</p>
            <p className="text-sm mt-1">
              Run <a href="/setup/employees" className="underline text-blue-400">/setup/employees</a> first.
            </p>
          </div>
        )}

        {/* KPI legend — only shown when scoring is partial */}
        {rows.length > 0 && (
          <p className="text-xs text-gray-500 mb-3">
            Reservice % and Prod/hr from FieldRoutes data. Driving, Completion, and Stars pending sync.
          </p>
        )}

        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.techId}
              className={`rounded-xl border p-4 ${scoreBg(row.proscore)}`}
            >
              <div className="flex items-center gap-3">
                {/* Rank badge */}
                <span
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${rankBadge(row.rank)}`}
                >
                  {row.rank}
                </span>

                {/* Name + appt count */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{row.name}</p>
                  <p className="text-xs text-gray-500">{row.apptCount} appts serviced</p>
                </div>

                {/* Score */}
                <div className="text-right flex-shrink-0">
                  <span className={`text-3xl font-black ${scoreColor(row.proscore)}`}>
                    {row.proscore}
                  </span>
                </div>
              </div>

              {/* KPI pills */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {row.kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`text-xs px-2 py-1 rounded-full border font-medium ${
                      kpi.value === null
                        ? "bg-gray-100 border-gray-200 text-gray-400"
                        : kpi.good
                        ? "bg-emerald-100 border-emerald-200 text-emerald-700"
                        : "bg-red-100 border-red-200 text-red-700"
                    }`}
                  >
                    {kpi.label}{kpi.value ? `: ${kpi.value}` : " —"}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

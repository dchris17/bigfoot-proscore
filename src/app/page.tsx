import { prisma } from "@/lib/prisma";
import { computeProScore, GOALS, KpiInput, denseRank } from "@/lib/scoring/engine";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Team color palettes — cycles through for non-podium techs
const CARD_PALETTES = [
  { top: "from-blue-700 to-blue-900",   accent: "#1d4ed8" },
  { top: "from-violet-700 to-violet-900", accent: "#6d28d9" },
  { top: "from-teal-700 to-teal-900",   accent: "#0f766e" },
  { top: "from-rose-700 to-rose-900",   accent: "#be123c" },
  { top: "from-orange-600 to-orange-900", accent: "#c2410c" },
  { top: "from-cyan-700 to-cyan-900",   accent: "#0e7490" },
  { top: "from-indigo-700 to-indigo-900", accent: "#4338ca" },
  { top: "from-emerald-700 to-emerald-900", accent: "#047857" },
];

function cardPalette(rank: number, idx: number) {
  if (rank === 1) return { top: "from-yellow-500 to-yellow-700", accent: "#b45309" };
  if (rank === 2) return { top: "from-slate-400 to-slate-600",   accent: "#475569" };
  if (rank === 3) return { top: "from-amber-600 to-amber-800",   accent: "#92400e" };
  return CARD_PALETTES[idx % CARD_PALETTES.length];
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

function currentMonth() {
  const now = new Date();
  return { year: now.getFullYear(), mon: now.getMonth() + 1 };
}
function daysInMonth(year: number, mon: number) { return new Date(year, mon, 0).getDate(); }
function daysElapsed(year: number, mon: number) {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() + 1 === mon
    ? today.getDate() : daysInMonth(year, mon);
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
        assignedEmployeeId: true, servicedByEmployeeId: true,
        productionValue: true, checkIn: true, checkOut: true, rawJson: true,
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

    const reserviceCount = serviced.filter((a) => {
      const raw = a.rawJson as Record<string, unknown>;
      return raw.originalAppointmentID && raw.originalAppointmentID !== "0";
    }).length;
    const reservicePct = serviced.length > 0 ? (reserviceCount / serviced.length) * 100 : null;

    const inputs: KpiInput[] = [
      { key: "driving",   actual: null,         goal: GOALS.driving },
      { key: "reservice", actual: reservicePct, goal: GOALS.reservice, curve: "goal_over_actual" },
      { key: "prod_hr",   actual: prodHr,       goal: GOALS.prod_hr },
      { key: "complete",  actual: null,         goal: GOALS.complete },
      { key: "stars",     actual: null,         goal: GOALS.stars, daysElapsed: de, daysInMonth: dm },
    ];

    return {
      techId: tech.id,
      name: tech.name,
      firstName: tech.firstName,
      apptCount: serviced.length,
      reservicePct,
      prodHr,
      proscore: computeProScore(inputs).proscore,
      proscoreRaw: computeProScore(inputs).proscoreRaw,
    };
  });

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
  try { rows = await getLeaderboard(year, mon); } catch { dbError = true; }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">🦶 ProScore</h1>
            <p className="text-xs text-gray-400">{label} · Day {de}/{dm}</p>
          </div>
          <div className="text-xs text-gray-500 text-right">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" />
            Live
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-5">
        {dbError && (
          <div className="p-4 bg-red-900/40 border border-red-700 rounded-lg text-red-300 text-sm mb-4">
            Could not load scores — database may be initializing.
          </div>
        )}

        {!dbError && rows.length === 0 && (
          <div className="text-center py-20 text-gray-500">
            <p>No techs found.</p>
            <p className="text-sm mt-1">
              Run <a href="/setup/employees" className="underline text-blue-400">/setup/employees</a> first.
            </p>
          </div>
        )}

        {/* Card grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rows.map((row, idx) => {
            const palette = cardPalette(row.rank, idx);
            const resGood = row.reservicePct !== null && row.reservicePct <= GOALS.reservice;
            const prodGood = row.prodHr !== null && row.prodHr >= GOALS.prod_hr;

            return (
              <div
                key={row.techId}
                className="rounded-2xl overflow-hidden shadow-lg border border-white/10 flex flex-col"
                style={{ background: "#1a1a2e" }}
              >
                {/* Card top — photo area */}
                <div className={`bg-gradient-to-b ${palette.top} relative flex flex-col items-center pt-5 pb-3 px-3`}>
                  {/* Rank badge */}
                  <span className="absolute top-2 left-2 text-xs font-black text-white/80">
                    #{row.rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white shadow-lg border-2 border-white/30"
                    style={{ background: "rgba(0,0,0,0.25)" }}
                  >
                    {initials(row.name)}
                  </div>

                  {/* ProScore — big like a batting average */}
                  <div className="mt-2 text-4xl font-black text-white tracking-tight leading-none">
                    {row.proscore}
                  </div>
                  <div className="text-xs text-white/60 uppercase tracking-widest mt-0.5">
                    ProScore
                  </div>
                </div>

                {/* Card bottom — name + stats */}
                <div className="flex-1 px-3 py-2 flex flex-col gap-2">
                  {/* Name */}
                  <div className="text-center">
                    <p className="text-sm font-bold text-white leading-tight">{row.firstName}</p>
                    <p className="text-xs text-gray-400 leading-tight">
                      {row.name.split(" ").slice(1).join(" ")}
                    </p>
                  </div>

                  {/* Stats grid */}
                  <div className="border-t border-white/10 pt-2 grid grid-cols-2 gap-x-2 gap-y-1.5">
                    <div className="text-center">
                      <p className={`text-sm font-bold ${row.reservicePct !== null ? (resGood ? "text-emerald-400" : "text-red-400") : "text-gray-600"}`}>
                        {row.reservicePct !== null ? `${row.reservicePct.toFixed(1)}%` : "—"}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Reservice</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-bold ${row.prodHr !== null ? (prodGood ? "text-emerald-400" : "text-red-400") : "text-gray-600"}`}>
                        {row.prodHr !== null ? `$${Math.round(row.prodHr)}` : "—"}
                      </p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Prod/hr</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-600">—</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Drive</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-gray-600">—</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">Stars</p>
                    </div>
                  </div>

                  {/* Appt count */}
                  <p className="text-center text-[10px] text-gray-600 border-t border-white/5 pt-1.5">
                    {row.apptCount} appts
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { computeProScore, GOALS, KpiInput, denseRank } from "@/lib/scoring/engine";

// Brand colors
const GREEN  = "#255b49";
const ORANGE = "#e54900";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Card gradient for each rank/slot
function cardGradient(rank: number, idx: number): string {
  if (rank === 1) return `linear-gradient(160deg, #e54900 0%, #a33200 100%)`; // orange — top dog
  if (rank === 2) return `linear-gradient(160deg, #255b49 0%, #163d30 100%)`; // brand green
  if (rank === 3) return `linear-gradient(160deg, #1e4a3a 0%, #122e24 100%)`; // darker green
  // Remaining: alternate between two green shades so the grid feels cohesive
  return idx % 2 === 0
    ? `linear-gradient(160deg, #1a3d30 0%, #0f2620 100%)`
    : `linear-gradient(160deg, #163328 0%, #0c1f18 100%)`;
}

function scoreTextColor(score: number): string {
  if (score >= 80) return ORANGE;   // high scores pop in brand orange
  if (score >= 60) return "#f59e0b"; // amber warning
  return "#f87171";                  // red for low
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
  const monthEnd   = new Date(year, mon, 1);
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

    const { proscore, proscoreRaw } = computeProScore(inputs);
    return { techId: tech.id, name: tech.name, firstName: tech.firstName,
             apptCount: serviced.length, reservicePct, prodHr, proscore, proscoreRaw };
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
    <div className="min-h-screen" style={{ background: "#0a1a14" }}>

      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10"
           style={{ background: GREEN }}>
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-black tracking-tight text-white">
              🦶 ProScore
            </h1>
            <p className="text-xs text-white/60">{label} · Day {de} of {dm}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <span className="w-2 h-2 rounded-full animate-pulse"
                  style={{ background: ORANGE }} />
            Live
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-5">
        {dbError && (
          <div className="p-4 rounded-xl text-sm mb-4 border"
               style={{ background: "#1a0a0a", borderColor: "#7f1d1d", color: "#fca5a5" }}>
            Could not load scores — database may be initializing.
          </div>
        )}

        {!dbError && rows.length === 0 && (
          <div className="text-center py-20" style={{ color: "#4a7a65" }}>
            <p className="text-lg">No techs found.</p>
            <p className="text-sm mt-1">
              Run{" "}
              <a href="/setup/employees" className="underline" style={{ color: ORANGE }}>
                /setup/employees
              </a>{" "}
              first.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {rows.map((row, idx) => {
            const resGood  = row.reservicePct !== null && row.reservicePct <= GOALS.reservice;
            const prodGood = row.prodHr !== null && row.prodHr >= GOALS.prod_hr;
            const gradient = cardGradient(row.rank, idx);

            return (
              <div
                key={row.techId}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{
                  background: gradient,
                  boxShadow: row.rank === 1
                    ? `0 0 0 2px ${ORANGE}, 0 8px 24px rgba(229,73,0,0.3)`
                    : "0 4px 16px rgba(0,0,0,0.4)",
                }}
              >
                {/* Top section */}
                <div className="flex flex-col items-center pt-5 pb-3 px-3 relative">
                  {/* Rank */}
                  <span className="absolute top-2.5 left-3 text-xs font-black"
                        style={{ color: "rgba(255,255,255,0.5)" }}>
                    #{row.rank}
                  </span>

                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-black text-white border-2"
                    style={{
                      background: "rgba(0,0,0,0.3)",
                      borderColor: row.rank === 1 ? ORANGE : "rgba(255,255,255,0.2)",
                    }}
                  >
                    {initials(row.name)}
                  </div>

                  {/* ProScore */}
                  <div
                    className="mt-2 text-4xl font-black leading-none"
                    style={{ color: scoreTextColor(row.proscore) }}
                  >
                    {row.proscore}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest mt-0.5"
                       style={{ color: "rgba(255,255,255,0.4)" }}>
                    ProScore
                  </div>
                </div>

                {/* Bottom section */}
                <div
                  className="flex-1 px-3 py-2.5 flex flex-col gap-2"
                  style={{ background: "rgba(0,0,0,0.35)" }}
                >
                  {/* Name */}
                  <div className="text-center">
                    <p className="text-sm font-bold text-white leading-tight">{row.firstName}</p>
                    <p className="text-[11px] leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>
                      {row.name.split(" ").slice(1).join(" ")}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="border-t pt-2 grid grid-cols-2 gap-x-2 gap-y-2"
                       style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                    {[
                      {
                        label: "Reservice",
                        value: row.reservicePct !== null ? `${row.reservicePct.toFixed(1)}%` : null,
                        good: row.reservicePct !== null ? resGood : null,
                      },
                      {
                        label: "Prod/hr",
                        value: row.prodHr !== null ? `$${Math.round(row.prodHr)}` : null,
                        good: row.prodHr !== null ? prodGood : null,
                      },
                      { label: "Drive",  value: null, good: null },
                      { label: "Stars",  value: null, good: null },
                    ].map((stat) => (
                      <div key={stat.label} className="text-center">
                        <p
                          className="text-sm font-bold"
                          style={{
                            color: stat.value === null
                              ? "rgba(255,255,255,0.18)"
                              : stat.good
                              ? "#4ade80"
                              : "#f87171",
                          }}
                        >
                          {stat.value ?? "—"}
                        </p>
                        <p className="text-[9px] uppercase tracking-wide"
                           style={{ color: "rgba(255,255,255,0.3)" }}>
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Appt count footer */}
                  <p className="text-center text-[10px] border-t pt-1.5"
                     style={{ color: "rgba(255,255,255,0.2)", borderColor: "rgba(255,255,255,0.07)" }}>
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

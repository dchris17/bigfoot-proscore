/**
 * Formatting helpers for The Footprint kit.
 * `toFpKpis()` turns the scoring engine's KpiResult[] (src/lib/scoring/engine.ts) into FpKpi[].
 */
import type { FpKpi, FpStatus, FpTech } from "./types";

/** Status bands used for every score and KPI: 90+ on target, 75 to 89 close, under 75 needs work. */
export function statusOf(points: number | null | undefined): FpStatus {
  if (points === null || points === undefined || Number.isNaN(points)) return "none";
  if (points >= 90) return "good";
  if (points >= 75) return "warn";
  return "bad";
}

export const STATUS_LABEL: Record<FpStatus, string> = {
  good: "On target",
  warn: "Close",
  bad: "Needs work",
  none: "No data yet",
};

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

/** Encode a /public path that may contain spaces, e.g. "/photos/Larry Alexander.jpg". */
export function photoSrc(url?: string | null): string | null {
  if (!url) return null;
  return url.startsWith("data:") || url.startsWith("http") ? url : encodeURI(url);
}

interface KpiMeta {
  label: string;
  short: string;
  abbr: string;
  source: string;
  format: (v: number) => string;
  goal: (g: number) => string;
}

/** Display rules per KPI key. Add a key here when a new KPI is added to the engine. */
export const KPI_META: Record<string, KpiMeta> = {
  driving: { label: "Driving Score", short: "Driving", abbr: "Drive", source: "Bouncie", format: (v) => `${Math.round(v)}`, goal: (g) => `${g}` },
  reservice: { label: "Reservice Rate", short: "Reservice", abbr: "Resv", source: "FieldRoutes", format: (v) => `${v.toFixed(1)}%`, goal: (g) => `≤ ${g.toFixed(1)}%` },
  // Floored, like Driven's leaderboard ($150.59 shows as $150)
  prod_hr: { label: "Production / Hour", short: "Prod/Hr", abbr: "$/Hr", source: "FieldRoutes", format: (v) => `$${Math.floor(v)}`, goal: (g) => `$${g}` },
  completion: { label: "Completion", short: "Complete", abbr: "Done", source: "FieldRoutes", format: (v) => `${Math.round(v)}%`, goal: (g) => `${g}%` },
  attendance: { label: "Attendance", short: "Attend", abbr: "Attend", source: "Attendance log", format: (v) => `${Math.round(v)}%`, goal: (g) => `${g}%` },
  stars: { label: "5-Star Reviews", short: "Stars", abbr: "Stars", source: "Reviews", format: (v) => `${Math.round(v)}`, goal: (g) => `${g}/mo` },
};

/** Minimal shape of the engine's KpiResult, so this file has no import dependency on it. */
export interface EngineKpiResult {
  key: string;
  actual: number | null;
  goal: number;
  pacedGoal: number | null;
  progress: number | null;
  pointsOutOf100: number | null;
}

/**
 * Build card-ready KPIs from engine results.
 * @param results  computeProScore(...).kpiResults
 * @param weights  weight per KPI key in percent (defaults to an even split)
 * @param extras   optional detail sentence, drill-down and privacy flag per key
 */
export function toFpKpis(
  results: EngineKpiResult[],
  weights?: Record<string, number>,
  extras?: Record<string, Partial<Pick<FpKpi, "detail" | "drill" | "private" | "source">>>,
): FpKpi[] {
  const even = results.length ? Math.round(100 / results.length) : 0;
  return results.map((r) => {
    const meta = KPI_META[r.key] ?? {
      label: r.key, short: r.key, abbr: r.key, source: "", format: (v: number) => `${v}`, goal: (g: number) => `${g}`,
    };
    const pacedNote =
      r.pacedGoal !== null && r.pacedGoal < r.goal ? ` · ${r.pacedGoal.toFixed(1)} by today` : "";
    return {
      key: r.key,
      label: meta.label,
      short: meta.short,
      abbr: meta.abbr,
      source: extras?.[r.key]?.source ?? meta.source,
      display: r.actual === null ? "—" : meta.format(r.actual),
      goalDisplay: `goal ${meta.goal(r.goal)}${pacedNote}`,
      points: r.pointsOutOf100 === null ? null : Math.max(0, Math.min(100, r.pointsOutOf100)),
      weight: weights?.[r.key] ?? even,
      detail: extras?.[r.key]?.detail,
      drill: extras?.[r.key]?.drill,
      private: extras?.[r.key]?.private,
    };
  });
}

/** The KPI where hitting goal adds the most ProScore points, or null if every KPI is at goal. */
export function biggestOpportunity(tech: Pick<FpTech, "kpis">): { kpi: FpKpi; gain: number } | null {
  const scored = tech.kpis.filter((k) => k.points !== null);
  const totalWeight = scored.reduce((s, k) => s + k.weight, 0);
  if (!totalWeight) return null;
  let best: { kpi: FpKpi; gain: number } | null = null;
  for (const k of scored) {
    const gain = (k.weight * (100 - (k.points as number))) / totalWeight;
    if (!best || gain > best.gain) best = { kpi: k, gain };
  }
  return best && best.gain >= 0.5 ? best : null;
}

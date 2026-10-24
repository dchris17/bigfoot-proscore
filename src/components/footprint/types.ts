/**
 * Data shapes for The Footprint design kit.
 * Components are presentational: pages fetch data, shape it into these types, and pass it in.
 * Use `toFpKpis()` in ./format.ts to build FpKpi[] straight from the scoring engine's KpiResult[].
 */

export type FpStatus = "good" | "warn" | "bad" | "none";

/** Records behind a KPI number, shown in the expandable drill-down. */
export interface FpDrill {
  /** Summary line, e.g. "See the 3 reservices charged to you". */
  title: string;
  columns: string[];
  /** Cells are pre-formatted strings or numbers. Numbers right-align. */
  rows: (string | number)[][];
  note?: string;
}

export interface FpKpi {
  key: string;
  /** Full name on the tech card, e.g. "Reservice Rate". */
  label: string;
  /** Short name for leaderboard columns, e.g. "Reservice". */
  short: string;
  /** Tiny label for phone KPI chips, e.g. "Resv". Defaults to short. */
  abbr?: string;
  /** Where the number comes from, e.g. "FieldRoutes". */
  source?: string;
  /** Formatted actual, e.g. "4.5%", "$164", "93". "—" when there is no data. */
  display: string;
  /** Formatted goal, e.g. "≤ 10.0%", "$200", "7 / month". */
  goalDisplay: string;
  /** Points earned, 0 to 100. null = no data yet (drops out of ProScore). */
  points: number | null;
  /** Weight in percent, e.g. 20. */
  weight: number;
  /** One plain sentence explaining the number, e.g. "3 reservices on 66 services". */
  detail?: string;
  drill?: FpDrill;
  /** Counts toward ProScore but hidden from the team leaderboard columns. */
  private?: boolean;
}

export interface FpHistoryPoint {
  /** Short month label, e.g. "Aug". */
  label: string;
  score: number;
}

export interface FpTech {
  id: string;
  name: string;
  photoUrl?: string | null;
  branch?: string;
  role?: string;
  rank: number;
  proscore: number;
  kpis: FpKpi[];
  /** Link to the tech card. Defaults to /tech/{id}. */
  href?: string;
  /** Last few months, oldest first, for the trend chart. */
  history?: FpHistoryPoint[];
}

export interface FpMonthNav {
  /** e.g. "October 2026" */
  label: string;
  /** e.g. "Day 17 of 31". Omit for closed months. */
  progress?: string;
  prevHref?: string | null;
  nextHref?: string | null;
}

export type FpTabKey = "leaderboard" | "reviews" | "settings" | "driven";

export interface FpReview {
  id: string;
  source: string;
  location?: string;
  author?: string;
  stars: number;
  /** Pre-formatted date, e.g. "Oct 11". */
  date: string;
  text: string;
  /** Tech id the system matched automatically, if any. */
  autoTechId?: string | null;
  /** Why it matched or didn't, e.g. "Name in review", "Names Marcus and Eli". */
  autoReason: string;
  /** Manager's pick: a tech id, "none" for not a tech review, or null for no manual pick. */
  manualTechId?: string | null;
}

export interface FpKpiSetting {
  key: string;
  label: string;
  source: string;
  /** e.g. "higher is better", "lower is better", "monthly total, paced". */
  rule: string;
  enabled: boolean;
  goal: number;
  weight: number;
  /** Hide from leaderboard columns (still counts toward ProScore). */
  private?: boolean;
}

export interface FpParityRow {
  techId: string;
  name: string;
  ours: number;
  driven: number | null;
}

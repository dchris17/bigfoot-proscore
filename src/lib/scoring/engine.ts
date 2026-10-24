/**
 * Bigfoot ProScore scoring engine.
 * Port of reference/proscore_reference.py - keep these functions pure and tested.
 */

export const GOALS = {
  driving: 90,
  reservice: 10.0,
  prod_hr: 200,
  attendance: 100,
  stars: 7,
} as const;

export type KpiKey = keyof typeof GOALS;

export type ReserveCurve = "goal_over_actual" | "linear";

/** Higher-is-better KPI: progress = min(1, actual / goal) */
export function progressUp(actual: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.max(0, Math.min(1, actual / goal));
}

/** Lower-is-better KPI (reservice): 1.0 at or under goal, curve above goal */
export function progressDown(
  actual: number,
  goal: number,
  curve: ReserveCurve = "goal_over_actual"
): number {
  if (actual <= goal) return 1.0;
  if (curve === "goal_over_actual") return goal / actual;
  if (curve === "linear") return Math.max(0, 1 - (actual - goal) / goal);
  throw new Error(`Unknown curve: ${curve}`);
}

/** Paced count KPI (stars): progress against calendar-day-paced goal */
export function progressCountPaced(
  count: number,
  monthlyGoal: number,
  daysElapsed: number,
  daysInMonth: number
): number {
  const paced = monthlyGoal * (daysElapsed / daysInMonth);
  if (paced <= 0) return 1.0;
  return Math.min(1, count / paced);
}

/** Round half-up (matches Driven's rounding behavior) */
export function roundHalfUp(x: number): number {
  return Math.floor(x + 0.5);
}

export interface KpiInput {
  key: KpiKey;
  actual: number | null; // null = no data yet
  goal: number;
  /** For stars: provide these for mid-month pacing */
  daysElapsed?: number;
  daysInMonth?: number;
  /** Reservice curve config */
  curve?: ReserveCurve;
}

export interface KpiResult {
  key: KpiKey;
  actual: number | null;
  goal: number;
  pacedGoal: number | null;
  progress: number | null; // null = no data
  pointsOutOf100: number | null;
}

export function computeKpiResult(input: KpiInput): KpiResult {
  const { key, actual, goal } = input;

  if (actual === null) {
    return { key, actual: null, goal, pacedGoal: null, progress: null, pointsOutOf100: null };
  }

  let progress: number;
  let pacedGoal: number | null = null;

  if (key === "reservice") {
    progress = progressDown(actual, goal, input.curve ?? "goal_over_actual");
  } else if (key === "stars") {
    const de = input.daysElapsed ?? 31;
    const dm = input.daysInMonth ?? 31;
    pacedGoal = goal * (de / dm);
    progress = progressCountPaced(actual, goal, de, dm);
  } else {
    progress = progressUp(actual, goal);
  }

  return {
    key,
    actual,
    goal,
    pacedGoal,
    progress,
    pointsOutOf100: Math.round(progress * 100 * 100) / 100,
  };
}

export interface ProScoreResult {
  proscoreRaw: number;
  proscore: number;
  kpiResults: KpiResult[];
}

/**
 * Compute ProScore from KPI inputs.
 * KPIs with null actual are excluded from the average (weight redistributed).
 */
export function computeProScore(
  inputs: KpiInput[],
  weights?: number[]
): ProScoreResult {
  const results = inputs.map(computeKpiResult);
  const w = weights ?? inputs.map(() => 1);

  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < results.length; i++) {
    if (results[i].progress !== null) {
      weightedSum += results[i].progress! * w[i];
      totalWeight += w[i];
    }
  }

  const proscoreRaw = totalWeight > 0 ? (100 * weightedSum) / totalWeight : 0;
  const proscore = roundHalfUp(proscoreRaw);

  return { proscoreRaw, proscore, kpiResults: results };
}

/** Dense rank: ties share a rank, next rank is +1 (not +ties) */
export function denseRank(scores: number[]): number[] {
  const unique = [...new Set(scores)].sort((a, b) => b - a);
  return scores.map((s) => unique.indexOf(s) + 1);
}

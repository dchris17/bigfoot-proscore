/**
 * One tech's scorecard: sticker photo, ProScore dial, rank, biggest opportunity,
 * one row per KPI with an expandable drill-down, and a ProScore trend.
 * Works in server components (drill-downs use native <details>).
 */
import Link from "next/link";
import { biggestOpportunity, statusOf, STATUS_LABEL } from "./format";
import { ChevronLeft, ChevronRight, SparkIcon } from "./Icons";
import { TechPhoto } from "./Photo";
import { ScoreDial } from "./ScoreDial";
import type { FpDrill, FpHistoryPoint, FpKpi, FpTech } from "./types";

export interface TechCardProps {
  tech: FpTech;
  /** Total techs ranked this month, for "Rank 3 of 12". */
  totalTechs: number;
  /** e.g. "October 2026" */
  monthLabel: string;
  backHref?: string;
}

function DrillTable({ drill }: { drill: FpDrill }) {
  return (
    <details className="fp-drill">
      <summary><ChevronRight />{drill.title}</summary>
      {drill.note ? <p className="fp-drill-note">{drill.note}</p> : null}
      {drill.rows.length ? (
        <div className="fp-tablewrap">
          <table className="fp-table">
            <thead>
              <tr>{drill.columns.map((c) => <th key={c}>{c}</th>)}</tr>
            </thead>
            <tbody>
              {drill.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => <td key={j} className={typeof cell === "number" ? "is-num" : undefined}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="fp-drill-note">Nothing here this month.</p>}
    </details>
  );
}

export function KpiRow({ kpi }: { kpi: FpKpi }) {
  const status = statusOf(kpi.points);
  return (
    <div className="fp-kpi">
      <div>
        <div className="fp-kpi-name">{kpi.label}</div>
        <div className="fp-kpi-src">{kpi.source}{kpi.private ? " · not shown on team board" : ""}</div>
      </div>
      <div className="fp-kpi-vals">
        <b className={`fp-num is-${status}-text`}>{kpi.display}</b>
        <span>{kpi.goalDisplay}</span>
      </div>
      <div className="fp-kpi-bar" aria-hidden="true">
        <i style={{ width: `${kpi.points ?? 0}%`, background: `var(--fp-${status === "none" ? "faint" : status})` }} />
      </div>
      <div className="fp-kpi-foot fp-num">
        <span>{kpi.points === null ? "No data yet, not counted" : `${Math.round(kpi.points)} of 100 points`}</span>
        <span>weight {kpi.weight}%</span>
      </div>
      {kpi.detail ? <div className="fp-kpi-detail">{kpi.detail}</div> : null}
      {kpi.drill ? <DrillTable drill={kpi.drill} /> : null}
    </div>
  );
}

export function TrendChart({ points }: { points: FpHistoryPoint[] }) {
  if (points.length < 2) return null;
  const lo = Math.max(0, Math.min(...points.map((p) => p.score), 70) - 5);
  const x = (i: number) => 4 + (i * 92) / (points.length - 1);
  const y = (s: number) => 24 + ((100 - s) * 68) / (100 - lo);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(2)},${y(p.score).toFixed(2)}`).join(" ");
  const area = `${line} L${x(points.length - 1).toFixed(2)},100 L${x(0).toFixed(2)},100 Z`;
  return (
    <div className="fp-trend" role="img" aria-label={`ProScore by month: ${points.map((p) => `${p.label} ${p.score}`).join(", ")}`}>
      <div className="fp-trend-plot">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[90, 75].filter((g) => g > lo).map((g) => (
            <line key={g} x1="0" x2="100" y1={y(g)} y2={y(g)} className="fp-trend-grid" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={area} className="fp-trend-area" />
          <path d={line} className="fp-trend-line" vectorEffect="non-scaling-stroke" />
        </svg>
        {points.map((p, i) => (
          <span key={p.label + i} className={`fp-trend-pt${i === points.length - 1 ? " is-last" : ""}`} style={{ left: `${x(i)}%`, top: `${y(p.score)}%` }}>
            <b>{p.score}</b>
          </span>
        ))}
      </div>
      <div className="fp-trend-axis" aria-hidden="true">
        {points.map((p, i) => <span key={p.label + i} style={{ left: `${x(i)}%` }}>{p.label}</span>)}
      </div>
    </div>
  );
}

export function TechCard({ tech, totalTechs, monthLabel, backHref = "/" }: TechCardProps) {
  const status = statusOf(tech.proscore);
  const opp = biggestOpportunity(tech);
  return (
    <>
      <Link href={backHref} className="fp-back"><ChevronLeft />Leaderboard</Link>

      <section className="fp-hero" aria-label={`${tech.name} scorecard`}>
        <div className="fp-hero-band" />
        <div className="fp-hero-body">
          <TechPhoto name={tech.name} photoUrl={tech.photoUrl} size="lg" />
          <div className="fp-hero-info">
            <div className="fp-hero-rank">Rank {tech.rank} of {totalTechs} · {monthLabel}</div>
            <h1 className="fp-hero-name">{tech.name}</h1>
            <div className="fp-hero-tags">
              <span className={`fp-pill is-${status}`}>{STATUS_LABEL[status]}</span>
              <span>{[tech.branch, tech.role].filter(Boolean).join(" · ") || "Technician"}</span>
            </div>
          </div>
          <ScoreDial score={tech.proscore} />
        </div>
        <div className="fp-opportunity">
          <SparkIcon />
          <span>
            {opp
              ? <>Biggest opportunity: <strong>{opp.kpi.label}</strong>. Hitting goal adds {opp.gain.toFixed(1)} points.</>
              : <>Every KPI is at goal. Keep it there.</>}
          </span>
        </div>
      </section>

      <h2 className="fp-section-title">This month <span>Open the details under a KPI to see the jobs behind it</span></h2>
      <div className="fp-kpis-list">
        {tech.kpis.map((k) => <KpiRow key={k.key} kpi={k} />)}
      </div>

      {tech.history && tech.history.length > 1 ? (
        <>
          <h2 className="fp-section-title">ProScore trend <span>Last {tech.history.length} months</span></h2>
          <TrendChart points={tech.history} />
        </>
      ) : null}
    </>
  );
}

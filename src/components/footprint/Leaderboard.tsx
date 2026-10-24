"use client";
/**
 * Team leaderboard: podium for the top 3, then every tech as a row.
 * Desktop shows one column per KPI (sortable). Phones stack the KPIs under each name.
 * Private KPIs (FpKpi.private) count toward ProScore but get no column.
 */
import Link from "next/link";
import { useMemo, useState } from "react";
import { statusOf } from "./format";
import { TechPhoto } from "./Photo";
import type { FpKpi, FpTech } from "./types";

export interface LeaderboardProps {
  techs: FpTech[];
  /** Branch names for the filter, e.g. ["Boise", "Portland"]. Hidden when fewer than 2. */
  branches?: string[];
  /** Show the top-3 podium above the list. Default true. */
  podium?: boolean;
}

type SortKey = "proscore" | string;

function denseRank(scores: number[]): number[] {
  const order = [...new Set(scores)].sort((a, b) => b - a);
  return scores.map((s) => order.indexOf(s) + 1);
}

function Cell({ kpi }: { kpi: FpKpi | undefined }) {
  const status = statusOf(kpi?.points ?? null);
  return (
    <div className="fp-cell" title={kpi ? `${kpi.label}: ${kpi.display} (${kpi.points === null ? "no data" : Math.round(kpi.points) + " pts"})` : undefined}>
      <span className="fp-cell-label">{kpi?.abbr ?? kpi?.short}</span>
      <div className={`fp-cell-val fp-num is-${status}-text`}>{kpi?.display ?? "—"}</div>
      <div className={`fp-cell-bar is-${status}-text`} aria-hidden="true">
        <i style={{ width: `${kpi?.points ?? 0}%` }} />
      </div>
    </div>
  );
}

export function Leaderboard({ techs, branches, podium = true }: LeaderboardProps) {
  const [branch, setBranch] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("proscore");

  const columns = useMemo(() => {
    const first = techs[0]?.kpis ?? [];
    return first.filter((k) => !k.private).map((k) => ({ key: k.key, short: k.short, goal: k.goalDisplay.replace(/^goal /, "").split(" · ")[0] }));
  }, [techs]);

  const ranked = useMemo(() => {
    const pool = branch === "All" ? techs : techs.filter((t) => t.branch === branch);
    const byScore = [...pool].sort((a, b) => b.proscore - a.proscore);
    const ranks = denseRank(byScore.map((t) => t.proscore));
    const withRank = byScore.map((t, i) => ({ ...t, rank: ranks[i] }));
    if (sort === "proscore") return withRank;
    const pts = (t: FpTech) => t.kpis.find((k) => k.key === sort)?.points ?? -1;
    return [...withRank].sort((a, b) => pts(b) - pts(a) || b.proscore - a.proscore);
  }, [techs, branch, sort]);

  const showPodium = podium && sort === "proscore" && ranked.length >= 3;
  const top = showPodium ? ranked.slice(0, 3) : [];
  const hiddenNames = (techs[0]?.kpis ?? []).filter((k) => k.private).map((k) => k.label);

  return (
    <>
      <div className="fp-toolbar">
        {branches && branches.length > 1 ? (
          <div className="fp-seg" role="group" aria-label="Branch">
            {["All", ...branches].map((b) => (
              <button key={b} type="button" aria-pressed={branch === b} onClick={() => setBranch(b)}>{b}</button>
            ))}
          </div>
        ) : <span />}
        <label className="fp-sr" htmlFor="fp-sort">Sort by</label>
        <select id="fp-sort" className="fp-select" value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="proscore">Sort by ProScore</option>
          {columns.map((c) => <option key={c.key} value={c.key}>Sort by {c.short}</option>)}
        </select>
      </div>

      {showPodium ? (
        <div className="fp-podium">
          {top.map((t, i) => (
            <Link key={t.id} href={t.href ?? `/tech/${t.id}`} className={`fp-podium-card is-${i + 1}`}>
              <span className={`fp-medal is-${Math.min(t.rank, 3)}`}>{t.rank}</span>
              <TechPhoto name={t.name} photoUrl={t.photoUrl} size="md" />
              <span className="fp-podium-name">{t.name.split(" ").length > 1 ? <><span>{t.name.split(" ")[0]}</span><span>{t.name.split(" ").slice(1).join(" ")}</span></> : t.name}</span>
              <span className={`fp-podium-score fp-num is-${statusOf(t.proscore)}-text`}>
                {t.proscore}
                <small>ProScore</small>
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="fp-board" style={{ ["--fp-cols" as string]: columns.length }}>
        <div className="fp-board-head" role="row">
          <span>#</span>
          <span />
          <span className="is-left">Technician</span>
          {columns.map((c) => (
            <button key={c.key} type="button" onClick={() => setSort(sort === c.key ? "proscore" : c.key)} aria-sort={sort === c.key ? "descending" : undefined}>
              {c.short}{sort === c.key ? " ↓" : ""}
              <small>{c.goal}</small>
            </button>
          ))}
          <button type="button" onClick={() => setSort("proscore")} aria-sort={sort === "proscore" ? "descending" : undefined} style={{ textAlign: "right" }}>
            ProScore
          </button>
        </div>
        {ranked.length === 0 ? (
          <div className="fp-empty" style={{ border: 0, borderRadius: 0 }}>No techs in {branch} yet.</div>
        ) : null}
        {ranked.map((t) => (
          <Link key={t.id} href={t.href ?? `/tech/${t.id}`} className="fp-row">
            <span className="fp-rank fp-num">{t.rank}</span>
            <TechPhoto name={t.name} photoUrl={t.photoUrl} />
            <div className="fp-who">
              <div className="fp-who-name">{t.name}</div>
              <div className="fp-who-sub">{[t.branch, t.role].filter(Boolean).join(" · ") || "Technician"}</div>
            </div>
            <div className="fp-kpis">
              {columns.map((c) => <Cell key={c.key} kpi={t.kpis.find((k) => k.key === c.key)} />)}
            </div>
            <span className={`fp-score fp-num is-${statusOf(t.proscore)}`}>{t.proscore}</span>
          </Link>
        ))}
        {hiddenNames.length ? (
          <div className="fp-board-note">{hiddenNames.join(" and ")} count toward ProScore but stay off this board.</div>
        ) : null}
      </div>
    </>
  );
}

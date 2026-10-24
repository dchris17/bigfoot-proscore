"use client";
/**
 * Side-by-side check against Driven: ours vs Driven per tech, gap colors, and a verdict.
 * Upload a Driven export (handled by onUpload on the server) or type scores in.
 */
import { useState } from "react";
import type { FpParityRow } from "./types";

export interface DrivenCheckProps {
  monthLabel: string;
  rows: FpParityRow[];
  /** Parse a Driven .xlsx export on the server. Driven names files one month behind the page. */
  onUpload?: (file: File) => Promise<void>;
  /** Save a typed-in Driven score (null clears it). */
  onSetDriven?: (techId: string, value: number | null) => Promise<void>;
  canEdit?: boolean;
}

const gapClass = (g: number) => (Math.abs(g) <= 3 ? "fp-gap-good" : Math.abs(g) <= 6 ? "fp-gap-warn" : "fp-gap-bad");

export function DrivenCheck({ monthLabel, rows, onUpload, onSetDriven, canEdit = true }: DrivenCheckProps) {
  const [vals, setVals] = useState<Record<string, number | null>>(() => Object.fromEntries(rows.map((r) => [r.techId, r.driven])));
  const [msg, setMsg] = useState<string | null>(null);
  const filled = rows.filter((r) => vals[r.techId] !== null && vals[r.techId] !== undefined);
  const within = filled.filter((r) => Math.abs(r.ours - (vals[r.techId] as number)) <= 3).length;

  return (
    <>
      <div>
        <h1 className="fp-h2">Driven Check · {monthLabel}</h1>
        <p className="fp-lede">Upload Driven&apos;s export for this month, or type each tech&apos;s Driven ProScore. Every tech within 3 points for two months in a row is the bar for canceling Driven.</p>
      </div>
      {onUpload && canEdit ? (
        <div className="fp-drop">
          <label htmlFor="fp-driven-file"><strong>Upload Driven export (.xlsx)</strong></label><br />
          <input id="fp-driven-file" type="file" accept=".xlsx" onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setMsg("Reading file…");
            try { await onUpload(f); setMsg("Imported. Scores below are updated."); } catch { setMsg("Couldn't read that file. Make sure it's the Tech Metrics export from Driven."); }
          }} />
          {msg ? <p className="fp-drill-note" role="status">{msg}</p> : null}
        </div>
      ) : null}
      <div className="fp-tablewrap" style={{ background: "var(--fp-surface)" }}>
        <table className="fp-table">
          <thead><tr><th>Tech</th><th className="is-num">Ours</th><th className="is-num">Driven</th><th className="is-num">Gap</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const d = vals[r.techId];
              const gap = d === null || d === undefined ? null : r.ours - d;
              return (
                <tr key={r.techId}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td className="is-num">{r.ours}</td>
                  <td className="is-num">
                    <input className="fp-input" style={{ width: 76, textAlign: "right" }} type="number" min={0} max={100} aria-label={`Driven score for ${r.name}`}
                      value={d ?? ""} disabled={!canEdit || !onSetDriven}
                      onChange={(e) => { const v = e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value))); setVals((m) => ({ ...m, [r.techId]: v })); void onSetDriven?.(r.techId, v); }} />
                  </td>
                  <td className={`is-num ${gap === null ? "" : gapClass(gap)}`}>{gap === null ? "—" : `${gap > 0 ? "+" : ""}${gap}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="fp-verdict">
        <b className={filled.length && within === rows.length ? "is-good-text" : filled.length ? "is-warn-text" : "is-none-text"}>
          {!filled.length ? "Waiting on Driven scores" : within === rows.length ? "Matching this month" : `${within} of ${rows.length} within 3 points`}
        </b>
      </div>
    </>
  );
}

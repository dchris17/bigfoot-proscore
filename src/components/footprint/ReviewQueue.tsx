"use client";
/**
 * Manager review queue: every review with full text, why it matched (or didn't),
 * and a tech dropdown. A manual pick always beats the automatic match.
 */
import { useMemo, useState } from "react";
import type { FpReview } from "./types";

export interface ReviewQueueProps {
  reviews: FpReview[];
  techs: { id: string; name: string }[];
  /** Save a pick: tech id, "none" (not a tech review), or null to go back to the auto match. */
  onAssign: (reviewId: string, techId: string | null) => Promise<void>;
  canEdit?: boolean;
}

type Filter = "need" | "all" | "manual";

function effective(r: FpReview) {
  if (r.manualTechId) return { techId: r.manualTechId === "none" ? null : r.manualTechId, manual: true, none: r.manualTechId === "none" };
  return { techId: r.autoTechId ?? null, manual: false, none: false };
}

export function ReviewQueue({ reviews, techs, onAssign, canEdit = true }: ReviewQueueProps) {
  const [filter, setFilter] = useState<Filter>("need");
  const [local, setLocal] = useState<Record<string, string | null | undefined>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nameOf = (id: string | null | undefined) => techs.find((t) => t.id === id)?.name;

  const merged = useMemo(
    () => reviews.map((r) => (r.id in local ? { ...r, manualTechId: local[r.id] } : r)),
    [reviews, local],
  );
  const needCount = merged.filter((r) => { const e = effective(r); return !e.techId && !e.none; }).length;
  const shown = merged.filter((r) => {
    const e = effective(r);
    return filter === "all" ? true : filter === "manual" ? e.manual : !e.techId && !e.none;
  });

  async function assign(id: string, value: string | null) {
    setLocal((m) => ({ ...m, [id]: value }));
    setSaving(id); setError(null);
    try { await onAssign(id, value); }
    catch { setError("Couldn't save that pick. Check your connection and try again."); setLocal((m) => { const n = { ...m }; delete n[id]; return n; }); }
    finally { setSaving(null); }
  }

  return (
    <>
      <div>
        <h1 className="fp-h2">Reviews</h1>
        <p className="fp-lede">FieldRoutes reviews carry the tech from the appointment. Google reviews match when exactly one tech&apos;s name appears. Everything else waits here for you to pick the tech.</p>
      </div>
      <div className="fp-chips" role="group" aria-label="Filter reviews">
        <button type="button" className="fp-chip" aria-pressed={filter === "need"} onClick={() => setFilter("need")}>Needs a tech{needCount ? <span className="fp-badge">{needCount}</span> : null}</button>
        <button type="button" className="fp-chip" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All reviews</button>
        <button type="button" className="fp-chip" aria-pressed={filter === "manual"} onClick={() => setFilter("manual")}>Assigned by hand</button>
      </div>
      {error ? <div className="fp-card is-attention" role="alert">{error}</div> : null}
      <div className="fp-list">
        {shown.length === 0 ? (
          <div className="fp-empty">{filter === "need" ? "Every review is tied to a tech or marked as not a tech review." : "Nothing here yet."}</div>
        ) : shown.map((r) => {
          const e = effective(r);
          const needs = !e.techId && !e.none;
          const tag = e.manual
            ? <span className="fp-tag is-manual">{e.none ? "Not a tech review" : "Assigned by hand"}</span>
            : e.techId ? <span className="fp-tag">{r.autoReason}</span>
            : <span className="fp-tag is-need">Needs a tech · {r.autoReason}</span>;
          return (
            <article key={r.id} className={`fp-card${needs ? " is-attention" : ""}`}>
              <div className="fp-card-meta">
                <span className="fp-stars" aria-label={`${r.stars} stars`}>{"★".repeat(r.stars)}{"☆".repeat(Math.max(0, 5 - r.stars))}</span>
                <span>{r.source}{r.location ? ` · ${r.location}` : ""}</span>
                {r.author ? <span>{r.author}</span> : null}
                <span>{r.date}</span>
              </div>
              <div>{tag}</div>
              <p className="fp-quote">{r.text}</p>
              <div className="fp-assign">
                <label htmlFor={`fp-assign-${r.id}`}>Tech</label>
                <select
                  id={`fp-assign-${r.id}`}
                  className="fp-select"
                  disabled={!canEdit || saving === r.id}
                  value={r.manualTechId ?? ""}
                  onChange={(ev) => assign(r.id, ev.target.value || null)}
                >
                  <option value="">{r.autoTechId ? `Auto: ${nameOf(r.autoTechId) ?? "matched"}` : "Pick a tech…"}</option>
                  {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  <option value="none">Not a tech review</option>
                </select>
                {e.manual && canEdit ? <button type="button" className="fp-linkbtn" onClick={() => assign(r.id, null)}>Use auto match</button> : null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

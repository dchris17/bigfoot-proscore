"use client";
/** Manager settings for the KPI library: on/off, goal, weight, and team-board visibility. */
import { useState } from "react";
import type { FpKpiSetting } from "./types";

export interface KpiSettingsProps {
  settings: FpKpiSetting[];
  onSave: (settings: FpKpiSetting[]) => Promise<void>;
  canEdit?: boolean;
}

export function KpiSettings({ settings, onSave, canEdit = true }: KpiSettingsProps) {
  const [rows, setRows] = useState<FpKpiSetting[]>(settings);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const on = rows.filter((r) => r.enabled);
  const total = on.reduce((s, r) => s + (r.weight || 0), 0);
  const dirty = JSON.stringify(rows) !== JSON.stringify(settings);

  const update = (key: string, patch: Partial<FpKpiSetting>) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setStatus("idle");
  };

  const scaleTo100 = () => {
    if (!total) return;
    let acc = 0;
    const enabledKeys = on.map((r) => r.key);
    setRows((rs) => rs.map((r) => {
      if (!r.enabled) return r;
      const last = r.key === enabledKeys[enabledKeys.length - 1];
      const w = last ? 100 - acc : Math.round((r.weight / total) * 100);
      acc += last ? 0 : w;
      return { ...r, weight: w };
    }));
  };

  async function save() {
    setStatus("saving");
    try { await onSave(rows); setStatus("saved"); } catch { setStatus("error"); }
  }

  return (
    <>
      <div>
        <h1 className="fp-h2">KPIs &amp; Weights</h1>
        <p className="fp-lede">Turn KPIs on or off and set each goal and weight. Weights of the KPIs that are on should add up to 100. Private KPIs still count toward ProScore but get no column on the team board.</p>
      </div>
      <div className="fp-list">
        {rows.map((r) => (
          <div key={r.key} className={`fp-setrow${r.enabled ? "" : " is-off"}`}>
            <input type="checkbox" className="fp-switch" id={`fp-on-${r.key}`} checked={r.enabled} disabled={!canEdit} onChange={(e) => update(r.key, { enabled: e.target.checked })} aria-label={`Use ${r.label}`} />
            <label className="fp-setrow-name" htmlFor={`fp-on-${r.key}`}>{r.label}<small>{r.source} · {r.rule}</small></label>
            <div className="fp-setrow-nums">
              <label htmlFor={`fp-goal-${r.key}`}>Goal</label>
              <input id={`fp-goal-${r.key}`} className="fp-input" type="number" step="any" min={0} value={r.goal} disabled={!canEdit} onChange={(e) => update(r.key, { goal: Number(e.target.value) })} />
              <label htmlFor={`fp-w-${r.key}`}>Weight</label>
              <input id={`fp-w-${r.key}`} className="fp-input" type="number" min={0} max={100} value={r.weight} disabled={!canEdit || !r.enabled} onChange={(e) => update(r.key, { weight: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
              <label><input type="checkbox" checked={!r.private} disabled={!canEdit} onChange={(e) => update(r.key, { private: !e.target.checked })} /> Team board</label>
            </div>
          </div>
        ))}
      </div>
      <div className={`fp-total${total === 100 ? "" : " is-off"}`}>
        {on.length} KPIs on · total weight {total}{total === 100 ? " ✓" : ". Scale to 100 so each weight reads as a percent."}
      </div>
      <div className="fp-actions">
        <button type="button" className="fp-btn is-primary" onClick={save} disabled={!canEdit || !dirty || status === "saving"}>
          {status === "saving" ? "Saving…" : status === "saved" && !dirty ? "Saved" : "Save changes"}
        </button>
        <button type="button" className="fp-btn" onClick={scaleTo100} disabled={!canEdit || total === 100 || !total}>Scale weights to 100</button>
        {status === "error" ? <span className="is-bad-text" role="alert">Couldn&apos;t save. Try again.</span> : null}
      </div>
    </>
  );
}

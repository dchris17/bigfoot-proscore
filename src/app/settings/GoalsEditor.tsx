"use client";

import { useState } from "react";

type GoalRow = {
  key: string;
  label: string;
  unit: string;
  rule: string;
  value: number;
  step: number;
};

const META: Record<string, { label: string; unit: string; rule: string; step: number }> = {
  driving:    { label: "Driving Score",       unit: "pts",  rule: "higher is better",     step: 1 },
  reservice:  { label: "Reservice Rate",      unit: "%",    rule: "lower is better",       step: 0.5 },
  prod_hr:    { label: "Production / Hour",   unit: "$",    rule: "higher is better",     step: 5 },
  attendance: { label: "Attendance",          unit: "%",    rule: "higher is better",     step: 1 },
  stars:      { label: "5-Star Reviews",      unit: "/mo",  rule: "monthly target",        step: 1 },
};

export function GoalsEditor({ initialGoals }: { initialGoals: Record<string, number> }) {
  const [goals, setGoals] = useState<Record<string, number>>(initialGoals);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(key: string, value: number) {
    setGoals(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goals),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Save failed (${res.status})`);
      }
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const rows: GoalRow[] = Object.keys(META).map(key => ({
    key,
    ...META[key],
    value: goals[key] ?? 0,
  }));

  return (
    <section>
      <h2 className="fp-h2">KPI Goals</h2>
      <p className="fp-lede">These goals are used in scoring. Changes take effect immediately for new score calculations.</p>
      <div className="fp-list">
        {rows.map(r => (
          <div key={r.key} className="fp-setrow">
            <span />
            <span className="fp-setrow-name">
              {r.label}
              <small>{r.rule}</small>
            </span>
            <div className="fp-setrow-nums" style={{ alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "var(--fp-muted)", fontSize: "12px" }}>{r.unit}</span>
              <input
                type="number"
                value={r.value}
                step={r.step}
                min={0}
                onChange={e => update(r.key, parseFloat(e.target.value) || 0)}
                style={{
                  width: "80px",
                  textAlign: "right",
                  background: "var(--fp-surface-2)",
                  color: "var(--fp-ink)",
                  border: "1px solid var(--fp-line)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "14px",
                  fontVariantNumeric: "tabular-nums",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="fp-actions" style={{ marginTop: "1rem" }}>
        <button
          onClick={save}
          disabled={saving}
          className="fp-btn is-primary"
        >
          {saving ? "Saving…" : "Save Goals"}
        </button>
        {saved && <span style={{ color: "var(--fp-pine)", fontSize: "13px" }}>Saved ✓</span>}
        {error && <span style={{ color: "#f87171", fontSize: "13px" }}>{error}</span>}
      </div>
    </section>
  );
}

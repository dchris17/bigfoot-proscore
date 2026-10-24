"use client";

import { useState } from "react";

type Row = {
  techId: string;
  name: string;
  callouts: number;
  workingDays: number;
  notes: string;
};

export default function AttendanceForm({
  rows: initial,
  year,
  month,
}: {
  rows: Row[];
  year: number;
  month: number;
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update(techId: string, field: keyof Row, value: string | number) {
    setRows(prev =>
      prev.map(r => r.techId === techId ? { ...r, [field]: value } : r)
    );
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, rows }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="rounded-xl overflow-hidden border mb-4" style={{ borderColor: "#1e1e2e" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#0e0e18" }}>
              <th className="px-4 py-3 text-left" style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Technician</th>
              <th className="px-4 py-3 text-center" style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Working Days</th>
              <th className="px-4 py-3 text-center" style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Call-Outs</th>
              <th className="px-4 py-3 text-center" style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Score</th>
              <th className="px-4 py-3 text-left" style={{ color: "#4b5563", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const score = row.workingDays > 0
                ? Math.round(((row.workingDays - row.callouts) / row.workingDays) * 1000) / 10
                : null;
              const isEven = i % 2 === 0;
              return (
                <tr key={row.techId} style={{ background: isEven ? "#111118" : "#0e0e16" }}>
                  <td className="px-4 py-3 border-b font-semibold" style={{ borderColor: "#1a1a24", color: "#f1f5f9" }}>
                    {row.name}
                  </td>
                  <td className="px-4 py-3 border-b text-center" style={{ borderColor: "#1a1a24" }}>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={row.workingDays}
                      onChange={e => update(row.techId, "workingDays", parseInt(e.target.value) || 0)}
                      className="w-16 text-center rounded px-2 py-1 text-sm tabular-nums"
                      style={{ background: "#1e1e2e", color: "#e2e8f0", border: "1px solid #374151", outline: "none" }}
                    />
                  </td>
                  <td className="px-4 py-3 border-b text-center" style={{ borderColor: "#1a1a24" }}>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={row.callouts}
                      onChange={e => update(row.techId, "callouts", parseInt(e.target.value) || 0)}
                      className="w-16 text-center rounded px-2 py-1 text-sm tabular-nums"
                      style={{ background: "#1e1e2e", color: row.callouts > 0 ? "#f87171" : "#e2e8f0", border: "1px solid #374151", outline: "none" }}
                    />
                  </td>
                  <td className="px-4 py-3 border-b text-center tabular-nums font-semibold" style={{ borderColor: "#1a1a24", color: score === null ? "#374151" : score >= 95 ? "#34d399" : score >= 85 ? "#fbbf24" : "#f87171" }}>
                    {score !== null ? `${score}%` : "—"}
                  </td>
                  <td className="px-4 py-3 border-b" style={{ borderColor: "#1a1a24" }}>
                    <input
                      type="text"
                      value={row.notes}
                      placeholder="optional"
                      onChange={e => update(row.techId, "notes", e.target.value)}
                      className="w-full rounded px-2 py-1 text-sm"
                      style={{ background: "#1e1e2e", color: "#94a3b8", border: "1px solid #374151", outline: "none" }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg text-sm font-semibold"
          style={{ background: saving ? "#1e1e2e" : "#6366f1", color: "#fff", cursor: saving ? "not-allowed" : "pointer" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {saved && <span className="text-sm" style={{ color: "#34d399" }}>Saved ✓</span>}
        {error && <span className="text-sm" style={{ color: "#f87171" }}>{error}</span>}
      </div>
    </div>
  );
}

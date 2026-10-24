"use client";

import { useState } from "react";

type Tech = {
  id: string;
  name: string;
  firstName: string;
  fieldroutesEmployeeId: number;
  active: boolean;
  included: boolean;
  branch: { id: string; name: string };
};

type Branch = { id: string; name: string };

const ABBR: Record<string, string> = { Boise: "BOI", Portland: "PDX" };

export function TechManager({ techs: initial, branches }: { techs: Tech[]; branches: Branch[] }) {
  const [techs, setTechs] = useState<Tech[]>(initial);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", firstName: "", fieldroutesEmployeeId: "", branchId: branches[0]?.id ?? "", nicknames: "" });
  const [status, setStatus] = useState<string | null>(null);

  async function toggle(id: string, field: "active" | "included", value: boolean) {
    const res = await fetch("/api/admin/techs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: value }),
    });
    if (res.ok) {
      setTechs((ts) => ts.map((t) => t.id === id ? { ...t, [field]: value } : t));
    }
  }

  async function addTech() {
    setStatus(null);
    const frId = parseInt(form.fieldroutesEmployeeId);
    if (!form.name || !form.firstName || !frId || !form.branchId) {
      setStatus("Fill in all required fields.");
      return;
    }
    const nicknames = form.nicknames.split(",").map((n) => n.trim()).filter(Boolean);
    const res = await fetch("/api/admin/techs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: form.name, firstName: form.firstName, fieldroutesEmployeeId: frId, branchId: form.branchId, nicknames }),
    });
    const data = await res.json();
    if (!res.ok) { setStatus(data.error ?? "Save failed."); return; }
    setTechs((ts) => [...ts, data.tech]);
    setAdding(false);
    setForm({ name: "", firstName: "", fieldroutesEmployeeId: "", branchId: branches[0]?.id ?? "", nicknames: "" });
    setStatus("Technician added.");
  }

  return (
    <section>
      <h2 className="fp-h2">Technicians</h2>
      <p className="fp-lede">Toggle a tech off to hide them from scoring without deleting their history. &ldquo;On board&rdquo; means they appear in the leaderboard; &ldquo;Scored&rdquo; means their data is counted.</p>

      <div className="fp-list" style={{ marginBottom: "1rem" }}>
        {techs.map((t) => (
          <div key={t.id} className={`fp-setrow${t.active && t.included ? "" : " is-off"}`}>
            <span className="fp-setrow-name">
              {t.name}
              <small>{ABBR[t.branch.name] ?? t.branch.name} · FR ID {t.fieldroutesEmployeeId}</small>
            </span>
            <div className="fp-setrow-nums" style={{ gap: "1.5rem" }}>
              <label>
                <input type="checkbox" checked={t.active} onChange={(e) => toggle(t.id, "active", e.target.checked)} />
                {" "}Active
              </label>
              <label>
                <input type="checkbox" checked={t.included} onChange={(e) => toggle(t.id, "included", e.target.checked)} />
                {" "}On board
              </label>
            </div>
          </div>
        ))}
      </div>

      {!adding ? (
        <button type="button" className="fp-btn" onClick={() => setAdding(true)}>+ Add technician</button>
      ) : (
        <div className="fp-card" style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <strong>New technician</strong>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <label className="fp-label">
              Full name *
              <input className="fp-input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Larry Alexander" />
            </label>
            <label className="fp-label">
              First name *
              <input className="fp-input" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} placeholder="Larry" />
            </label>
            <label className="fp-label">
              FieldRoutes Employee ID *
              <input className="fp-input" type="number" value={form.fieldroutesEmployeeId} onChange={(e) => setForm((f) => ({ ...f, fieldroutesEmployeeId: e.target.value }))} placeholder="12345" />
            </label>
            <label className="fp-label">
              Branch *
              <select className="fp-select" value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}>
                {branches.map((b) => <option key={b.id} value={b.id}>{ABBR[b.name] ?? b.name}</option>)}
              </select>
            </label>
            <label className="fp-label" style={{ gridColumn: "1 / -1" }}>
              Nicknames for review matching (comma-separated)
              <input className="fp-input" value={form.nicknames} onChange={(e) => setForm((f) => ({ ...f, nicknames: e.target.value }))} placeholder="Larry, L. Alexander" />
            </label>
          </div>
          <div className="fp-actions">
            <button type="button" className="fp-btn is-primary" onClick={addTech}>Save technician</button>
            <button type="button" className="fp-btn" onClick={() => { setAdding(false); setStatus(null); }}>Cancel</button>
          </div>
          {status && <p className="fp-lede" style={{ margin: 0 }}>{status}</p>}
        </div>
      )}
      {status && !adding && <p className="fp-lede" style={{ marginTop: "0.5rem" }}>{status}</p>}
    </section>
  );
}

"use client";

import { useState, useEffect } from "react";

type Role = "technician" | "admin" | "manager" | "skip";

interface EmployeeRow {
  frId: number;
  name: string;
  firstName: string;
  role: Role;
}

// Pre-populated from FieldRoutes employee list (Oct 2026)
const KNOWN: Record<number, { name: string; firstName: string; defaultRole: Role }> = {
  10583: { name: "Aaron Fuller",         firstName: "Aaron",   defaultRole: "skip" },
  10372: { name: "Aldo Guerrero",        firstName: "Aldo",    defaultRole: "technician" },
  10580: { name: "Arturo Lopez",         firstName: "Arturo",  defaultRole: "technician" },
  10316: { name: "Cameron Smith",        firstName: "Cameron", defaultRole: "skip" },
  10358: { name: "Chris Bogardus",       firstName: "Chris",   defaultRole: "technician" },
  10366: { name: "Clark Steele",         firstName: "Clark",   defaultRole: "skip" },
  10051: { name: "Dan Christensen",      firstName: "Dan",     defaultRole: "admin" },
  10050: { name: "Daniel Christensen",   firstName: "Daniel",  defaultRole: "technician" },
  10008: { name: "Daniel Schofield",     firstName: "Daniel",  defaultRole: "skip" },
  10360: { name: "David Cox",            firstName: "David",   defaultRole: "technician" },
  10354: { name: "Eden Watkins",         firstName: "Eden",    defaultRole: "skip" },
  10495: { name: "Grant Christensen",    firstName: "Grant",   defaultRole: "skip" },
  10352: { name: "Jake Rowe",            firstName: "Jake",    defaultRole: "technician" },
  10591: { name: "Jenn Roberts",         firstName: "Jenn",    defaultRole: "skip" },
  10363: { name: "Justin Montgomery",    firstName: "Justin",  defaultRole: "technician" },
  10203: { name: "Kelly Rindone",        firstName: "Kelly",   defaultRole: "skip" },
  10307: { name: "Larry Alexander",      firstName: "Larry",   defaultRole: "technician" },
  10361: { name: "Lori Clicki",          firstName: "Lori",    defaultRole: "skip" },
  10590: { name: "Lucca Dianda-Guiod",   firstName: "Lucca",   defaultRole: "technician" },
  10148: { name: "Marc Rodriguez",       firstName: "Marc",    defaultRole: "technician" },
  10355: { name: "Noah Calvert",         firstName: "Noah",    defaultRole: "technician" },
  10578: { name: "Noah Walters",         firstName: "Noah",    defaultRole: "technician" },
  10342: { name: "Spencer R Teuscher",   firstName: "Spencer", defaultRole: "skip" },
  10367: { name: "Troy Winter",          firstName: "Troy",    defaultRole: "technician" },
};

const ROLE_LABELS: Record<Role, string> = {
  technician: "Technician",
  admin: "Admin",
  manager: "Manager",
  skip: "Skip",
};

const ROLE_COLORS: Record<Role, string> = {
  technician: "bg-green-100 text-green-800",
  admin: "bg-blue-100 text-blue-800",
  manager: "bg-purple-100 text-purple-800",
  skip: "bg-gray-100 text-gray-500",
};

export default function SetupEmployeesPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/setup/employee-ids")
      .then((r) => r.json())
      .then((data: { ids: number[] }) => {
        const sorted = [...data.ids].sort((a, b) => {
          const nameA = KNOWN[a]?.name ?? `zzz${a}`;
          const nameB = KNOWN[b]?.name ?? `zzz${b}`;
          return nameA.localeCompare(nameB);
        });
        setRows(
          sorted.map((id) => ({
            frId: id,
            name: KNOWN[id]?.name ?? "",
            firstName: KNOWN[id]?.firstName ?? "",
            role: KNOWN[id]?.defaultRole ?? "skip",
          }))
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load employee IDs from FieldRoutes.");
        setLoading(false);
      });
  }, []);

  function updateRow(frId: number, field: "name" | "firstName" | "role", value: string) {
    setRows((prev) =>
      prev.map((r) => (r.frId === frId ? { ...r, [field]: value } : r))
    );
  }

  async function handleSubmit() {
    const toSave = rows.filter((r) => r.role !== "skip");
    const missing = toSave.filter((r) => !r.name.trim());
    if (missing.length > 0) {
      setError(`Please fill in names for all non-skip employees (${missing.length} missing).`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/setup/seed-employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees: toSave }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Unknown error");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save employees.");
    } finally {
      setSubmitting(false);
    }
  }

  const techCount = rows.filter((r) => r.role === "technician").length;
  const adminCount = rows.filter((r) => r.role === "admin").length;
  const managerCount = rows.filter((r) => r.role === "manager").length;
  const skipCount = rows.filter((r) => r.role === "skip").length;

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl shadow p-10 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Roster Saved</h1>
          <p className="text-gray-600">
            {techCount} technician{techCount !== 1 ? "s" : ""},{" "}
            {adminCount} admin{adminCount !== 1 ? "s" : ""}, and{" "}
            {managerCount} manager{managerCount !== 1 ? "s" : ""} added to the database.
          </p>
          <p className="mt-4 text-sm text-gray-500">Phase 0 complete — ready for sync backfill.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Employee Roster Setup</h1>
          <p className="text-gray-600 mt-1">
            Review each employee and assign a role. Names are pre-filled from FieldRoutes — correct
            any that are wrong. Skip anyone who should not appear in ProScore.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading employees from FieldRoutes…</div>
        ) : (
          <>
            {/* Summary bar */}
            <div className="flex gap-3 mb-4 flex-wrap">
              {[
                { role: "technician" as Role, count: techCount },
                { role: "admin" as Role, count: adminCount },
                { role: "manager" as Role, count: managerCount },
                { role: "skip" as Role, count: skipCount },
              ].map(({ role, count }) => (
                <span
                  key={role}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${ROLE_COLORS[role]}`}
                >
                  {count} {ROLE_LABELS[role]}
                </span>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-20">FR ID</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Full Name</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-32">First Name</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium w-36">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr
                      key={row.frId}
                      className={row.role === "skip" ? "opacity-40" : ""}
                    >
                      <td className="px-4 py-2 text-gray-400 font-mono">{row.frId}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={row.name}
                          onChange={(e) => updateRow(row.frId, "name", e.target.value)}
                          placeholder="Full name"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={row.firstName}
                          onChange={(e) => updateRow(row.frId, "firstName", e.target.value)}
                          placeholder="First"
                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={row.role}
                          onChange={(e) => updateRow(row.frId, "role", e.target.value as Role)}
                          className={`w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${ROLE_COLORS[row.role]}`}
                        >
                          <option value="technician">Technician</option>
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="skip">Skip</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex items-center gap-4">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Saving…" : `Save Roster (${techCount + adminCount + managerCount} people)`}
              </button>
              <p className="text-sm text-gray-500">
                {skipCount} employee{skipCount !== 1 ? "s" : ""} will be skipped.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

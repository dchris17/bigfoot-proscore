"use client";

import { useState } from "react";

interface BackfillResult {
  ok: boolean;
  synced: number;
  skipped: number;
  byMonth: Record<string, number>;
  errors: string[];
  error?: string;
}

const MONTHS = ["2026-08", "2026-09", "2026-10"];

export default function BackfillPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BackfillResult | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/sync/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ months: MONTHS }),
      });
      const data = await res.json() as BackfillResult;
      setResult(data);
    } catch {
      setResult({ ok: false, synced: 0, skipped: 0, byMonth: {}, errors: [], error: "Network error" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl shadow p-10 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">FieldRoutes Backfill</h1>
        <p className="text-gray-600 text-sm mb-6">
          Pulls all completed appointments from Aug, Sep, and Oct 2026 and stores
          them in the database. Takes ~60–90 seconds.
        </p>

        {!result && (
          <button
            onClick={run}
            disabled={running}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Syncing — this takes a minute…
              </span>
            ) : (
              "Run Backfill"
            )}
          </button>
        )}

        {result && (
          <div className="space-y-4">
            {result.error || !result.ok ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {result.error ?? "Backfill failed"}
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="text-green-800 font-semibold text-lg mb-2">
                  ✅ {result.synced.toLocaleString()} appointments synced
                </div>
                <table className="text-sm text-green-700 w-full">
                  <tbody>
                    {MONTHS.map((m) => (
                      <tr key={m}>
                        <td className="py-0.5">{m}</td>
                        <td className="py-0.5 text-right font-mono">
                          {(result.byMonth[m] ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.skipped > 0 && (
                  <p className="mt-2 text-sm text-yellow-700">{result.skipped} skipped (see errors)</p>
                )}
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-800 mb-1">Errors (first 10)</p>
                <ul className="text-xs text-yellow-700 space-y-0.5">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </div>
            )}

            <button
              onClick={run}
              disabled={running}
              className="w-full py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Run Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

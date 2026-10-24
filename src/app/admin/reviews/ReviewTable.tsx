"use client";

import { useState } from "react";

type ReviewRow = {
  id: string;
  authorName: string;
  rating: number;
  text: string | null;
  reviewDate: string;
  locationName: string;
  attributedTechId: string | null;
  matchMethod: string;
};

type Tech = { id: string; name: string };

const STARS = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];

export function ReviewTable({ reviews: initial, techs }: { reviews: ReviewRow[]; techs: Tech[] }) {
  const [reviews, setReviews] = useState(initial);
  const [saving, setSaving] = useState<string | null>(null);

  async function assign(reviewId: string, techId: string | null) {
    setSaving(reviewId);
    await fetch(`/api/reviews/${reviewId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ techId }),
    });
    setReviews(prev =>
      prev.map(r =>
        r.id === reviewId
          ? { ...r, attributedTechId: techId, matchMethod: techId ? "manual" : "unmatched" }
          : r
      )
    );
    setSaving(null);
  }

  if (reviews.length === 0) {
    return <div className="fp-empty">No reviews yet. Use the sync endpoint or add reviews manually.</div>;
  }

  return (
    <div className="fp-board" style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "var(--fp-surface-2)" }}>
            {["Date", "Location", "Author", "Rating", "Review", "Assigned to"].map(h => (
              <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--fp-muted)", whiteSpace: "nowrap", borderBottom: "1px solid var(--fp-line)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reviews.map((r, i) => (
            <tr key={r.id} style={{ background: i % 2 === 0 ? "var(--fp-surface)" : "var(--fp-surface-2)", borderBottom: "1px solid var(--fp-line)" }}>
              <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--fp-muted)" }}>
                {new Date(r.reviewDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </td>
              <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "var(--fp-muted)", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis" }}>
                {r.locationName || "—"}
              </td>
              <td style={{ padding: "10px 14px", fontWeight: 600, color: "var(--fp-ink)", whiteSpace: "nowrap" }}>
                {r.authorName}
              </td>
              <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: r.rating === 5 ? "#f59e0b" : "var(--fp-muted)" }}>
                {STARS[r.rating] ?? r.rating}
              </td>
              <td style={{ padding: "10px 14px", color: "var(--fp-muted)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.text ?? <em>No text</em>}
              </td>
              <td style={{ padding: "8px 14px" }}>
                <select
                  value={r.attributedTechId ?? ""}
                  disabled={saving === r.id}
                  onChange={e => assign(r.id, e.target.value || null)}
                  className="fp-select"
                  style={{ minWidth: "140px", fontSize: "13px", padding: "6px 10px", minHeight: "36px" }}
                >
                  <option value="">— Unassigned —</option>
                  {techs.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {r.matchMethod === "auto_name" && r.attributedTechId && (
                  <span style={{ display: "block", fontSize: "10px", color: "var(--fp-muted)", marginTop: "2px" }}>auto-matched</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

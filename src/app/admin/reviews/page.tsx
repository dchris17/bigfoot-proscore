export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { FootprintShell } from "@/components/footprint";
import { ReviewTable } from "./ReviewTable";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = prisma as any;

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const now = new Date();
  let year = now.getFullYear();
  let mon = now.getMonth() + 1;

  if (sp.month && /^\d{4}-\d{2}$/.test(sp.month)) {
    const [y, m] = sp.month.split("-").map(Number);
    if (y >= 2024 && m >= 1 && m <= 12) { year = y; mon = m; }
  }

  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 1);
  const filterUnmatched = sp.filter === "unmatched";

  const [reviews, techs] = await Promise.all([
    db.$queryRawUnsafe(
      filterUnmatched
        ? `SELECT id, "authorName", rating, text, "reviewDate", "locationName", "attributedTechId", "matchMethod"
           FROM "Review"
           WHERE "reviewDate" >= $1 AND "reviewDate" < $2 AND "attributedTechId" IS NULL
           ORDER BY "reviewDate" DESC`
        : `SELECT id, "authorName", rating, text, "reviewDate", "locationName", "attributedTechId", "matchMethod"
           FROM "Review"
           WHERE "reviewDate" >= $1 AND "reviewDate" < $2
           ORDER BY "reviewDate" DESC`,
      monthStart.toISOString(),
      monthEnd.toISOString(),
    ).catch(() => []),
    db.tech.findMany({
      where: { active: true, included: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const monthLabel = now.toLocaleString("default", { month: "long" }) + " " + year;
  const prevMon = mon === 1 ? 12 : mon - 1;
  const prevYear = mon === 1 ? year - 1 : year;
  const nextMon = mon === 12 ? 1 : mon + 1;
  const nextYear = mon === 12 ? year + 1 : year;
  const isCurrentMonth = year === now.getFullYear() && mon === now.getMonth() + 1;

  return (
    <FootprintShell activeTab="reviews" isManager periodLabel={monthLabel}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", paddingBottom: "3rem" }}>

        {/* Controls */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <a href={`?month=${prevYear}-${String(prevMon).padStart(2, "0")}${filterUnmatched ? "&filter=unmatched" : ""}`} className="fp-btn" style={{ minHeight: "36px", padding: "6px 12px" }}>← Prev</a>
            <span style={{ fontWeight: 700, fontSize: "16px", alignSelf: "center" }}>{monthLabel}</span>
            {!isCurrentMonth && <a href={`?month=${nextYear}-${String(nextMon).padStart(2, "0")}${filterUnmatched ? "&filter=unmatched" : ""}`} className="fp-btn" style={{ minHeight: "36px", padding: "6px 12px" }}>Next →</a>}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <a href={`?month=${year}-${String(mon).padStart(2, "0")}`} className="fp-btn" aria-pressed={!filterUnmatched} style={{ minHeight: "36px", padding: "6px 12px", ...(filterUnmatched ? {} : { background: "var(--fp-pine)", color: "#fff", borderColor: "var(--fp-pine)" }) }}>All</a>
            <a href={`?month=${year}-${String(mon).padStart(2, "0")}&filter=unmatched`} className="fp-btn" aria-pressed={filterUnmatched} style={{ minHeight: "36px", padding: "6px 12px", ...(filterUnmatched ? { background: "var(--fp-pine)", color: "#fff", borderColor: "var(--fp-pine)" } : {}) }}>Unassigned only</a>
          </div>
        </div>

        <ReviewTable reviews={reviews as Parameters<typeof ReviewTable>[0]["reviews"]} techs={techs} />

      </div>
    </FootprintShell>
  );
}

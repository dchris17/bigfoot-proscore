"use client";
import { DrivenCheck, FootprintShell, KpiSettings, ReviewQueue } from "@/components/footprint";
import { SAMPLE_MONTH, SAMPLE_PARITY, SAMPLE_REVIEWS, SAMPLE_SETTINGS, SAMPLE_TECHS } from "@/components/footprint/sample";

const wait = () => new Promise<void>((r) => setTimeout(r, 300));

/** Preview only: every save is a no-op. */
export default function DesignPreviewManager() {
  return (
    <FootprintShell
      activeTab="reviews"
      periodLabel={SAMPLE_MONTH.period}
      updatedLabel={SAMPLE_MONTH.updated}
      isManager
      reviewsWaiting={3}
      hrefs={{ leaderboard: "/design-preview", reviews: "/design-preview/manager#reviews", settings: "/design-preview/manager#settings", driven: "/design-preview/manager#driven" }}
    >
      <section id="reviews" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <ReviewQueue reviews={SAMPLE_REVIEWS} techs={SAMPLE_TECHS.map((t) => ({ id: t.id, name: t.name }))} onAssign={wait} />
      </section>
      <section id="settings" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
        <KpiSettings settings={SAMPLE_SETTINGS} onSave={wait} />
      </section>
      <section id="driven" style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 24 }}>
        <DrivenCheck monthLabel="September 2026" rows={SAMPLE_PARITY} onUpload={wait} onSetDriven={wait} />
      </section>
    </FootprintShell>
  );
}

import { notFound } from "next/navigation";
import { FootprintShell, TechCard } from "@/components/footprint";
import { SAMPLE_MONTH, SAMPLE_TECHS } from "@/components/footprint/sample";

export function generateStaticParams() {
  return SAMPLE_TECHS.map((t) => ({ id: t.id }));
}

export default async function DesignPreviewTech({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tech = SAMPLE_TECHS.find((t) => t.id === id);
  if (!tech) notFound();
  return (
    <FootprintShell periodLabel={SAMPLE_MONTH.period} updatedLabel={SAMPLE_MONTH.updated} hrefs={{ leaderboard: "/design-preview" }}>
      <TechCard tech={tech} totalTechs={SAMPLE_TECHS.length} monthLabel={SAMPLE_MONTH.label} backHref="/design-preview" />
    </FootprintShell>
  );
}

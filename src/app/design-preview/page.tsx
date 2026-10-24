import Link from "next/link";
import { FootprintShell, Leaderboard, MonthPicker } from "@/components/footprint";
import { SAMPLE_MONTH, SAMPLE_TECHS } from "@/components/footprint/sample";

export const metadata = { title: "The Footprint · Design preview" };

export default function DesignPreviewLeaderboard() {
  return (
    <FootprintShell
      activeTab="leaderboard"
      periodLabel={SAMPLE_MONTH.period}
      updatedLabel={SAMPLE_MONTH.updated}
      isManager
      reviewsWaiting={3}
      hrefs={{ leaderboard: "/design-preview", reviews: "/design-preview/manager#reviews", settings: "/design-preview/manager#settings", driven: "/design-preview/manager#driven" }}
    >
      <p className="fp-lede">
        Design preview with Driven&apos;s October 1 to 14 numbers. Also see the <Link href="/design-preview/pin" style={{ textDecoration: "underline" }}>PIN screen</Link> and the{" "}
        <Link href="/design-preview/manager" style={{ textDecoration: "underline" }}>manager screens</Link>.
      </p>
      <div className="fp-toolbar">
        <MonthPicker label={SAMPLE_MONTH.label} prevHref="/design-preview" nextHref={null} />
      </div>
      <Leaderboard techs={SAMPLE_TECHS} branches={["Boise", "Portland"]} />
    </FootprintShell>
  );
}

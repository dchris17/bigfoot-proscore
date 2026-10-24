/**
 * Page frame: top bar with the wordmark, month and sync freshness, plus the tab bar.
 * Wrap every Footprint page in <FootprintShell>. Works in server components.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import "./footprint.css";
import { fpFontVars } from "./fonts";
import { FootprintBadge, LockIcon } from "./Icons";
import type { FpTabKey } from "./types";

export interface FootprintShellProps {
  children: ReactNode;
  /** Which tab is highlighted. Omit on pages like the tech card. */
  activeTab?: FpTabKey;
  /** e.g. "October 2026 · Day 17 of 31" */
  periodLabel?: string;
  /** e.g. "Updated 9:05 AM" */
  updatedLabel?: string;
  /** Turns the live dot amber when the last sync is old or failed. */
  stale?: boolean;
  /** Show the manager tabs (Reviews, Settings, Driven Check). */
  isManager?: boolean;
  /** Count shown on the Reviews tab. */
  reviewsWaiting?: number;
  /** Force a theme. Omit to follow the phone's light or dark setting. */
  theme?: "light" | "dark";
  hrefs?: Partial<Record<FpTabKey, string>>;
}

const DEFAULT_HREFS: Record<FpTabKey, string> = {
  leaderboard: "/",
  reviews: "/reviews",
  settings: "/settings",
  driven: "/driven-check",
};

export function FootprintShell(props: FootprintShellProps) {
  const hrefs = { ...DEFAULT_HREFS, ...props.hrefs };
  const tab = (key: FpTabKey, label: string, managerOnly = false, badge?: number) => (
    <Link key={key} href={hrefs[key]} className="fp-tab" aria-current={props.activeTab === key ? "page" : undefined}>
      {managerOnly ? <LockIcon className="fp-lock" /> : null}
      {label}
      {badge ? <span className="fp-badge">{badge}</span> : null}
    </Link>
  );

  return (
    <div className={`fp ${fpFontVars}`} data-theme={props.theme}>
      <header className="fp-top">
        <div className="fp-wrap fp-top-in">
          <Link href={hrefs.leaderboard} className="fp-brand" aria-label="The Footprint home">
            <FootprintBadge />
            <span className="fp-wordmark">
              The Footprint
              <small>Bigfoot Pest Control</small>
            </span>
          </Link>
          <div className="fp-meta">
            {props.periodLabel ? <span>{props.periodLabel}</span> : null}
            {props.updatedLabel ? (
              <span className={`fp-live${props.stale ? " is-stale" : ""}`}>
                <i aria-hidden="true" />
                {props.updatedLabel}
              </span>
            ) : null}
          </div>
        </div>
      </header>
      <nav className="fp-tabs" aria-label="Sections">
        <div className="fp-wrap fp-tabs-in">
          {tab("leaderboard", "Leaderboard")}
          {props.isManager ? tab("reviews", "Reviews", true, props.reviewsWaiting) : null}
          {props.isManager ? tab("driven", "Driven Check", true) : null}
        </div>
      </nav>
      <main className="fp-wrap fp-main">{props.children}</main>
      {props.isManager ? (
        <footer className="fp-footer">
          <div className="fp-wrap fp-footer-in">
            <Link href={hrefs.settings} className="fp-footer-link">
              <LockIcon className="fp-lock" />
              Settings
            </Link>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

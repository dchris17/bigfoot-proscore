import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "./Icons";
import type { FpMonthNav } from "./types";

/** Previous / next month switcher. Pass hrefs like "/?month=2026-09"; null disables an arrow. */
export function MonthPicker(props: FpMonthNav) {
  const arrow = (href: string | null | undefined, label: string, icon: ReactNode) =>
    href ? (
      <Link href={href} className="fp-iconbtn" aria-label={label}>{icon}</Link>
    ) : (
      <span className="fp-iconbtn" aria-disabled="true" aria-label={label}>{icon}</span>
    );
  return (
    <div className="fp-month">
      {arrow(props.prevHref, "Previous month", <ChevronLeft />)}
      <span className="fp-month-label">{props.label}</span>
      {arrow(props.nextHref, "Next month", <ChevronRight />)}
    </div>
  );
}

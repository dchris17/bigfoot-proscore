/** Small inline icons for The Footprint. All use currentColor. */

export function FootprintMark(props: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={props.className} aria-hidden={props.title ? undefined : true} role={props.title ? "img" : undefined}>
      {props.title ? <title>{props.title}</title> : null}
      <g fill="currentColor">
        <path d="M15.6 12.2c4.3 0 7.4 2.6 7.4 6.5 0 3-1.6 4.3-1.6 6.7 0 3.1-2.3 5.1-5.3 5.1-3.6 0-6-2.6-6-6.6 0-2.6 1-4 1-6.4 0-3 1.9-5.3 4.5-5.3z" />
        <circle cx="8.6" cy="10.4" r="2.1" />
        <circle cx="11.4" cy="6.3" r="2.3" />
        <circle cx="16" cy="4.3" r="2.5" />
        <circle cx="20.7" cy="5.6" r="2.2" />
        <circle cx="23.9" cy="9.3" r="1.9" />
      </g>
    </svg>
  );
}

/** The wordmark mark: Bigfoot logo. */
export function FootprintBadge(props: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="" aria-hidden="true" className={props.className} width={40} height={40} style={{ borderRadius: "50%", display: "block" }} />;
}

export function ChevronLeft() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12.5 4.5 7 10l5.5 5.5" />
    </svg>
  );
}

export function ChevronRight() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7.5 4.5 13 10l-5.5 5.5" />
    </svg>
  );
}

export function LockIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className={props.className} aria-hidden="true">
      <rect x="3" y="7" width="10" height="7" rx="1.6" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
    </svg>
  );
}

export function SparkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 1.8l1.9 5.1 5.3.3-4.1 3.4 1.4 5.2L10 12.9l-4.5 2.9 1.4-5.2-4.1-3.4 5.3-.3z" />
    </svg>
  );
}

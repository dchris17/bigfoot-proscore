import { statusOf } from "./format";

const R = 52;
const C = 2 * Math.PI * R;

/** Circular ProScore gauge. Ring color follows the status bands. */
export function ScoreDial(props: { score: number | null; label?: string }) {
  const s = props.score ?? 0;
  const status = statusOf(props.score);
  const offset = C * (1 - Math.max(0, Math.min(100, s)) / 100);
  return (
    <div className="fp-dial" role="img" aria-label={`${props.label ?? "ProScore"} ${props.score ?? "not available"}`}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="12" className="fp-dial-track" />
        <circle
          cx="60" cy="60" r={R} fill="none" strokeWidth="12" strokeLinecap="round"
          className="fp-dial-ring"
          style={{ stroke: `var(--fp-${status === "none" ? "faint" : status})` }}
          strokeDasharray={C.toFixed(1)}
          strokeDashoffset={offset.toFixed(1)}
        />
      </svg>
      <div className="fp-dial-num">
        <b className={`is-${status}-text`}>{props.score ?? "—"}</b>
        <small>{props.label ?? "ProScore"}</small>
      </div>
    </div>
  );
}

"use client";
/**
 * Team PIN entry with a big phone keypad. Also accepts the keyboard.
 * Render it on its own (no Shell). On success the parent redirects or refreshes.
 */
import { useCallback, useEffect, useState } from "react";
import "./footprint.css";
import { fpFontVars } from "./fonts";
import { FootprintBadge } from "./Icons";

export interface PinScreenProps {
  /** Check the PIN on the server. Return ok, or an error message to show. */
  onSubmit: (pin: string) => Promise<{ ok: boolean; error?: string }>;
  length?: number;
  /** Font CSS variables. Defaults to the kit fonts. */
  fontClassName?: string;
  theme?: "light" | "dark";
}

export function PinScreen({ onSubmit, length = 4, fontClassName = fpFontVars, theme }: PinScreenProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = useCallback(async (value: string) => {
    setBusy(true);
    try {
      const res = await onSubmit(value);
      if (!res.ok) {
        setError(res.error ?? "That PIN didn't work. Try again.");
        setPin("");
      }
    } catch {
      setError("Couldn't check the PIN. Check your connection and try again.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }, [onSubmit]);

  const press = useCallback((d: string) => {
    if (busy) return;
    setError(null);
    setPin((p) => {
      if (p.length >= length) return p;
      const next = p + d;
      if (next.length === length) void submit(next);
      return next;
    });
  }, [busy, length, submit]);

  const back = useCallback(() => { if (!busy) setPin((p) => p.slice(0, -1)); }, [busy]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, back]);

  return (
    <div className={`fp ${fontClassName}`} data-theme={theme}>
      <div className="fp-pin">
        <div className="fp-pin-card">
          <FootprintBadge className="fp-pin-logo" />
          <div className="fp-pin-title">The Footprint</div>
          <p className="fp-pin-sub">Enter the team PIN to see the scorecard.</p>
          <div className={`fp-pin-dots${error ? " is-error" : ""}`} aria-label={`${pin.length} of ${length} digits entered`}>
            {Array.from({ length }, (_, i) => <i key={i} className={i < pin.length ? "is-on" : undefined} />)}
          </div>
          <div className="fp-pin-msg" role="alert">{error ?? (busy ? "Checking…" : "")}</div>
          <div className="fp-keypad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} type="button" className="fp-key" onClick={() => press(d)} disabled={busy}>{d}</button>
            ))}
            <span />
            <button type="button" className="fp-key" onClick={() => press("0")} disabled={busy}>0</button>
            <button type="button" className="fp-key is-ghost" onClick={back} disabled={busy || !pin}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

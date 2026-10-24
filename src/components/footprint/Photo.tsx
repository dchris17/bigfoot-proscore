import { initials, photoSrc } from "./format";

/** Sticker photo on Bigfoot orange. Falls back to initials when there's no photo. */
export function TechPhoto(props: { name: string; photoUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const src = photoSrc(props.photoUrl);
  return (
    <div className={`fp-photo is-${props.size ?? "sm"}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={props.name} loading="lazy" />
      ) : (
        <span className="fp-initials" aria-label={props.name}>{initials(props.name)}</span>
      )}
    </div>
  );
}

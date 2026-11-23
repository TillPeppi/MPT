import type { BlockProps } from "./types";

export function Marquee({ block }: BlockProps<"marquee">) {
  const items = block.props.items ?? [];
  const track = [...items, ...items];
  return (
    <div className={`marquee ${block.variant === "tilted" ? "tilted" : ""}`} aria-hidden="true">
      <div className="marquee-track">
        {track.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}

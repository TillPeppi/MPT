import { CtaButton } from "@/components/shared/cta-button";
import { rich } from "@/components/shared/rich";
import { bg } from "@/lib/style";
import type { BlockProps } from "./types";

export function TextMedia({ block, ctx }: BlockProps<"textmedia">) {
  const p = block.props;
  const bullets = p.bullets ?? [];
  const text = (
    <>
      {p.eyebrow && <span className="eyebrow">{rich(p.eyebrow)}</span>}
      {p.title && <h2 className="display">{rich(p.title)}</h2>}
      {p.text && <p>{rich(p.text)}</p>}
      {bullets.length > 0 && (
        <div className="bullets">
          {bullets.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      )}
      <CtaButton label={p.ctaLabel} href={p.ctaHref} className="btn-primary" anchors={ctx.anchors} />
    </>
  );
  if (block.variant === "overlay") {
    return (
      <div className="tm-overlay">
        <div className="bg" style={bg(p.image)} />
        <div className="wrap">
          <div className="inner reveal">{text}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="sec">
      <div className={`wrap tm-split ${block.variant === "split-rev" ? "rev" : ""}`}>
        <div className="reveal">{text}</div>
        <div className={`tm-img reveal ${p.image ? "" : "ph-img"}`} style={bg(p.image)} role={p.image ? "img" : undefined} aria-label={p.image ? "Studio" : undefined} />
      </div>
    </div>
  );
}

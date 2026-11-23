import Image from "next/image";
import { LiveStatus } from "@/components/client/hours-views";
import { CtaButton } from "@/components/shared/cta-button";
import { rich } from "@/components/shared/rich";
import { bg } from "@/lib/style";
import type { BlockProps } from "./types";

export function Hero({ block, ctx }: BlockProps<"hero">) {
  const { variant, props: p } = block;
  const hours = ctx.site.settings.hours;
  const ctas = (
    <>
      <CtaButton label={p.cta1Label} href={p.cta1Href} className="btn-primary" anchors={ctx.anchors} />
      <CtaButton label={p.cta2Label} href={p.cta2Href} className="btn-ghost" anchors={ctx.anchors} />
    </>
  );
  const hasCtas = !!(p.cta1Label || p.cta2Label);
  const eyebrow = p.eyebrow && <span className="eyebrow">{rich(p.eyebrow)}</span>;
  const lead = p.text && <p className="lead">{rich(p.text)}</p>;
  const bgImage = p.image && (
    <div className="hero-bg">
      <Image src={p.image} alt="" fill priority sizes="100vw" />
    </div>
  );

  if (variant === "split") {
    return (
      <div className="hero hero-split">
        <div className="wrap grid">
          <div>
            {eyebrow}
            {p.title && <h1 className="display">{rich(p.title)}</h1>}
            {lead}
            <div className="hero-actions">{ctas}</div>
            {p.showStatus && (
              <div style={{ marginTop: 28 }}>
                <LiveStatus hours={hours} />
              </div>
            )}
          </div>
          <div className={`img ${p.image ? "" : "ph-img"}`} style={bg(p.image)} role={p.image ? "img" : undefined} aria-label={p.image ? p.title?.replace(/\n/g, " ").replace(/\*/g, "") : undefined} />
        </div>
      </div>
    );
  }

  if (variant === "poster") {
    const titleLines = String(p.title ?? "").split("\n");
    return (
      <div className="hero hero-poster">
        <div className="wrap" style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="photo" style={bg(p.image)} />
          <h1 className="display">
            {titleLines.map((l, i) => (
              <span key={i} className={i === 0 ? "outline" : undefined} style={{ display: "block", textAlign: i % 2 ? "right" : undefined }}>
                {rich(l)}
              </span>
            ))}
          </h1>
        </div>
        <div className="wrap">
          <div className="foot">
            {lead}
            {p.showStatus ? <LiveStatus hours={hours} /> : <span />}
            <div className="hero-actions" style={{ margin: 0 }}>
              {ctas}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="hero hero-compact">
        {bgImage}
        <div className="wrap">
          {eyebrow}
          {p.title && <h1 className="display">{rich(p.title)}</h1>}
          <div className="hero-row">
            {lead}
            {p.showStatus && <LiveStatus hours={hours} />}
          </div>
          {hasCtas && <div className="hero-actions">{ctas}</div>}
        </div>
      </div>
    );
  }

  // fullbleed (Standard)
  return (
    <div className="hero hero-fullbleed">
      {bgImage}
      <div className="wrap">
        {eyebrow}
        {p.title && <h1 className="display">{rich(p.title)}</h1>}
        <div className="hero-row">
          <div>
            {lead}
            <div className="hero-actions">{ctas}</div>
          </div>
          {p.showStatus && <LiveStatus hours={hours} />}
        </div>
      </div>
    </div>
  );
}

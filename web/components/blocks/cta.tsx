import { CtaButton } from "@/components/shared/cta-button";
import { rich } from "@/components/shared/rich";
import type { BlockProps } from "./types";

export function Cta({ block, ctx }: BlockProps<"cta">) {
  const p = block.props;
  if (block.variant === "outline") {
    return (
      <div className="sec cta-outline">
        <div className="wrap">
          <div className="box reveal">
            <div>
              {p.title && <h2 className="display">{rich(p.title)}</h2>}
              {p.text && <p>{rich(p.text)}</p>}
            </div>
            <CtaButton label={p.ctaLabel} href={p.ctaHref} className="btn-primary" anchors={ctx.anchors} />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="cta-orange">
      <div className="wrap reveal">
        {p.title && <h2 className="display">{rich(p.title)}</h2>}
        {p.text && <p>{rich(p.text)}</p>}
        <CtaButton label={p.ctaLabel} href={p.ctaHref} className="" anchors={ctx.anchors} />
      </div>
    </div>
  );
}

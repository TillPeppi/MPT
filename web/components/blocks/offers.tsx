import { rich } from "@/components/shared/rich";
import { SectionHead } from "@/components/shared/section-head";
import { SmartLink } from "@/components/shared/smart-link";
import { resolveHref } from "@/lib/href";
import { cssVars } from "@/lib/style";
import type { BlockProps } from "./types";

export function Offers({ block, ctx }: BlockProps<"offers">) {
  const p = block.props;
  const tags = p.tags ?? [];
  return (
    <div className="sec alt">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className={`${block.variant === "cards" ? "offer-cards" : "offer-grid"} reveal`}>
          {(p.items ?? []).map((it, i) => (
            <SmartLink
              key={i}
              href={resolveHref(it.href || "#kontakt", ctx.anchors)}
              className={`offer ${it.image ? "img" : ""}`.trim()}
              style={it.image ? cssVars({ "--img": `url('${it.image}')` }) : undefined}
            >
              {it.tag && <span className="tag">{it.tag}</span>}
              <h3>{rich(it.title)}</h3>
              <p>{rich(it.text)}</p>
              <div className="meta">
                <span>{it.meta}</span>
                <span className="arrow" aria-hidden="true">→</span>
              </div>
            </SmartLink>
          ))}
        </div>
        {tags.length > 0 && (
          <div className="chips">
            {tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { CopyCode } from "@/components/client/copy-code";
import { CtaButton } from "@/components/shared/cta-button";
import { rich } from "@/components/shared/rich";
import { SectionHead } from "@/components/shared/section-head";
import { lines } from "@/lib/format";
import type { BlockProps } from "./types";

export function Pricing({ block, ctx }: BlockProps<"pricing">) {
  const p = block.props;
  const items = p.items ?? [];
  const codes = p.codes ?? [];
  const head = <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />;
  const codeList = codes.length > 0 && (
    <div className="codes">
      {codes.map((c) => (
        <span key={c.code}>
          <CopyCode code={c.code} /> {c.text}
        </span>
      ))}
    </div>
  );
  const note = p.note && <p className="note">{p.note}</p>;

  if (block.variant === "compact") {
    return (
      <div className="sec">
        <div className="wrap">
          {head}
          <div className="price-list reveal">
            {items.map((it, i) => (
              <div key={i} className={`pr ${it.highlight ? "hot" : ""}`}>
                <h4>{rich(it.name)}</h4>
                <span className="f">{lines(it.features).join(" · ")}</span>
                <span className="amount">
                  {it.pricePrefix ? `${it.pricePrefix} ` : ""}
                  {it.price}
                </span>
                <CtaButton label={it.ctaLabel} href={it.ctaHref} className={it.highlight ? "btn-primary btn-sm" : "btn-ghost btn-sm"} anchors={ctx.anchors} />
              </div>
            ))}
          </div>
          {codeList}
          {note}
        </div>
      </div>
    );
  }

  return (
    <div className="sec" id="preise">
      <div className="wrap">
        {head}
        <div className="price-grid reveal">
          {items.map((it, i) => (
            <div key={i} className={`price ${it.highlight ? "hot" : ""}`}>
              {it.badge && <span className="badge">{it.badge}</span>}
              <h4>{rich(it.name)}</h4>
              <div className="amount">
                {it.pricePrefix && <small>{it.pricePrefix} </small>}
                <span>{it.price}</span>
                {it.unit && <small> {it.unit}</small>}
              </div>
              <div className="old">{it.old ? `statt ${it.old}` : ""}</div>
              {p.featuresTitle && <p className="features-title">{p.featuresTitle}</p>}
              <ul>
                {lines(it.features).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <CtaButton label={it.ctaLabel} href={it.ctaHref} className={it.highlight ? "btn-primary" : "btn-ghost"} anchors={ctx.anchors} />
            </div>
          ))}
        </div>
        {codeList}
        {note}
      </div>
    </div>
  );
}

import { rich } from "@/components/shared/rich";
import { SectionHead } from "@/components/shared/section-head";
import type { BlockProps } from "./types";

export function Steps({ block }: BlockProps<"steps">) {
  const p = block.props;
  const items = p.items ?? [];
  if (block.variant === "timeline") {
    return (
      <div className="sec">
        <div className="wrap" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 50, alignItems: "start" }}>
          <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
          <div className="steps-tl reveal">
            {items.map((it, i) => (
              <div key={i} className="st" data-n={i + 1}>
                <h3>{rich(it.title)}</h3>
                <p>{rich(it.text)}</p>
                {it.meta && <span className="pill">{it.meta}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="sec alt">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="steps-num reveal">
          {items.map((it, i) => (
            <div key={i} className="st">
              <div className="n">{i + 1}</div>
              <h3>{rich(it.title)}</h3>
              <p>{rich(it.text)}</p>
              {it.meta && <span className="pill">{it.meta}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

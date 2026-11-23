import { rich } from "@/components/shared/rich";
import { SectionHead } from "@/components/shared/section-head";
import { pad } from "@/lib/format";
import type { BlockProps } from "./types";

export function Usp({ block }: BlockProps<"usp">) {
  const p = block.props;
  const items = p.items ?? [];
  const isList = block.variant === "list";
  return (
    <div className="sec">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className={`${isList ? "usp-list" : "usp-grid"} reveal`}>
          {items.map((it, i) =>
            isList ? (
              <div key={i} className="row usp">
                <span className="num">{pad(i + 1)}</span>
                <h3>{rich(it.title)}</h3>
                <p>{rich(it.text)}</p>
              </div>
            ) : (
              <div key={i} className="usp">
                <div className="num">{pad(i + 1)}</div>
                <h3>{rich(it.title)}</h3>
                <p>{rich(it.text)}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

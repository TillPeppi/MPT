import { SectionHead } from "@/components/shared/section-head";
import { bg } from "@/lib/style";
import type { BlockProps } from "./types";

export function Gallery({ block }: BlockProps<"gallery">) {
  const p = block.props;
  return (
    <div className="sec">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="gallery reveal">
          {(p.images ?? []).slice(0, 3).map((x, i) => (
            <div key={i} style={bg(x)} role="img" aria-label={`Studio-Impression ${i + 1}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

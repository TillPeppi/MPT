import { rich } from "@/components/shared/rich";
import { SmartLink } from "@/components/shared/smart-link";
import { bg } from "@/lib/style";
import type { BlockProps } from "./types";

export function Instagram({ block }: BlockProps<"instagram">) {
  const p = block.props;
  const link = p.link || "#";
  return (
    <div className="sec">
      <div className="wrap">
        <div className="section-head reveal">
          <div>
            {p.eyebrow && <span className="eyebrow">{rich(p.eyebrow)}</span>}
            {p.title && <h2 className="display">{rich(p.title)}</h2>}
          </div>
          <SmartLink className="btn btn-ghost" href={link}>
            Auf Instagram folgen →
          </SmartLink>
        </div>
        <div className={`${block.variant === "reels" ? "ig-reels" : "ig-grid"} reveal`}>
          {(p.items ?? []).map((it, i) => (
            <SmartLink key={i} href={it.href || link} data-cap={it.caption} style={bg(it.image)} aria-label={it.caption || "Instagram-Beitrag"}>
              {it.type === "reel" && <span className="play" aria-hidden="true">▶</span>}
            </SmartLink>
          ))}
        </div>
        <p className="ig-consent">Vorschau aus gepflegten Beiträgen. Der Live-Feed wird erst nach Zustimmung von Instagram geladen (DSGVO).</p>
      </div>
    </div>
  );
}

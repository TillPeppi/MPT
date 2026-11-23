import { GiftAmounts } from "@/components/client/gift-amounts";
import { rich } from "@/components/shared/rich";
import { SmartLink } from "@/components/shared/smart-link";
import { resolveHref } from "@/lib/href";
import { bg } from "@/lib/style";
import type { BlockProps } from "./types";

export function Gift({ block, ctx }: BlockProps<"gift">) {
  const p = block.props;
  return (
    <div className="sec">
      <div className="wrap">
        <div className={`gift ${block.variant === "dark" ? "dark" : ""} reveal`}>
          <div>
            {p.title && <h2 className="display">{rich(p.title)}</h2>}
            {p.text && <p>{rich(p.text)}</p>}
            <GiftAmounts amounts={p.amounts ?? []} />
            <SmartLink className="btn btn-dark" href={resolveHref("#kontakt", ctx.anchors)}>
              {p.ctaLabel || "Gutschein anfragen"}
            </SmartLink>
          </div>
          <div className={`gimg ${p.image ? "" : "ph-img"}`} style={bg(p.image)} />
        </div>
      </div>
    </div>
  );
}

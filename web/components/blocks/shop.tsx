import { ShopGrid } from "@/components/client/shop-grid";
import { SectionHead } from "@/components/shared/section-head";
import { toPublicProduct } from "@/lib/products";
import type { BlockProps } from "./types";

export function Shop({ block, ctx }: BlockProps<"shop">) {
  const p = block.props;
  const { settings, collections } = ctx.site;
  const products = collections.products
    .filter((x) => x.active !== false && (!p.category || x.category === p.category))
    .slice(0, p.limit || 99)
    // Preise gehören nicht in den Seiten-Payload (sie kommen nach dem Login über GET /api/member/shop)
    .map(toPublicProduct);
  return (
    <div className="sec" id="shop">
      <div className="wrap">
        <SectionHead eyebrow={p.eyebrow} title={p.title} text={p.text} />
        <div className="reveal">
          <ShopGrid products={products} variant={block.variant} currency={settings.shop.currency} />
        </div>
        {settings.shop.pickupNote && <p className="note shop-note">{settings.shop.pickupNote}</p>}
      </div>
    </div>
  );
}

import { anchorsOf } from "@/lib/href";
import type { Page, SiteData } from "@/types/site";
import { RenderBlock } from "./blocks/render-block";
import { PageShell } from "./layout/page-shell";
import { JsonLd } from "./shared/json-ld";
import { businessJsonLd } from "@/lib/seo";

/** Rendert eine Seite aus ihrer Blockliste (in Reihenfolge, `hidden` wird übersprungen). */
export function PageView({ site, page }: { site: SiteData; page: Page }) {
  const blocks = page.blocks.filter((b) => !b.hidden);
  const ctx = { site, anchors: anchorsOf(page) };
  return (
    <PageShell site={site} activeSlug={page.slug} firstBlock={blocks[0]}>
      <JsonLd data={businessJsonLd(site)} />
      {blocks.length ? (
        blocks.map((b) => (
          <section key={b.id} className="blk" data-type={b.type}>
            <RenderBlock block={b} ctx={ctx} />
          </section>
        ))
      ) : (
        <div className="empty-page">Diese Seite hat noch keine Inhalte.</div>
      )}
    </PageShell>
  );
}

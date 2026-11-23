import { PageShell } from "@/components/layout/page-shell";
import { Body } from "@/components/shared/mini-markdown";
import type { SiteData } from "@/types/site";

/** Rechtstext (Impressum, Datenschutz, AGB, Widerruf) aus den Einstellungen; im Admin unter Einstellungen > Rechtstexte pflegbar. */
export function LegalPage({ site, title, text }: { site: SiteData; title: string; text: string }) {
  return (
    <PageShell site={site} activeSlug="rechtliches">
      <article className="article legal">
        <div className="wrap">
          <h1 className="display">{title}</h1>
          <div className="content">{text.trim() ? <Body text={text} /> : <p>Dieser Text wird noch ergänzt.</p>}</div>
        </div>
      </article>
    </PageShell>
  );
}

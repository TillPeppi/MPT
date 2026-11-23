import type { ReactNode } from "react";
import { RevealObserver } from "@/components/client/reveal-observer";
import { SiteHeader, type NavItem } from "@/components/client/site-header";
import { resolveHref } from "@/lib/href";
import type { Block, SiteData } from "@/types/site";
import { SiteFooter } from "./site-footer";

interface Props {
  site: SiteData;
  /** Slug der aktuellen Seite (für die aktive Navigation), '' = Start */
  activeSlug: string;
  /** Erster sichtbarer Block der Seite bestimmt den Header-Stil */
  firstBlock?: Block;
  children: ReactNode;
}

/** Rahmen jeder Seite: Header, Hauptbereich, Footer. */
export function PageShell({ site, activeSlug, firstBlock, children }: Props) {
  const { settings, pages } = site;
  const hd = settings.header;
  const nav: NavItem[] = pages
    .filter((p) => p.nav)
    .map((p) => ({ href: `/${p.slug}`, label: p.title, active: p.slug === activeSlug }));
  const mode = firstBlock?.type === "hero" && firstBlock.variant === "fullbleed" ? "overlay" : firstBlock?.type === "hero" && firstBlock.variant === "poster" ? "plain" : "solid";
  const ctaHref = resolveHref(hd.ctaHref || "#kontakt");

  return (
    <>
      <a className="skip-link" href="#main">
        Zum Inhalt springen
      </a>
      <SiteHeader
        short={settings.short}
        name={settings.name}
        nav={nav}
        memberLabel={hd.memberLabel || "Mitglieder"}
        ctaLabel={hd.ctaLabel || "Online buchen"}
        ctaHref={ctaHref}
        mode={mode}
      />
      <main id="main">{children}</main>
      <SiteFooter settings={settings} pages={pages} ctaHref={ctaHref} />
      <RevealObserver />
    </>
  );
}

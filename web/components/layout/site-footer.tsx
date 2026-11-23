import Link from "next/link";
import { NewsletterForm } from "@/components/client/newsletter-form";
import { SmartLink } from "@/components/shared/smart-link";
import type { Page, SiteSettings } from "@/types/site";

interface Props {
  settings: SiteSettings;
  pages: Page[];
  ctaHref: string;
}

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M14 9V7c0-1 .5-1.5 1.5-1.5H17V2h-2.5C11.5 2 10 4 10 6.5V9H8v3.5h2V22h4v-9.5h2.5L17 9h-3z" />
  </svg>
);

export function SiteFooter({ settings, pages, ctaHref }: Props) {
  const nav = pages.filter((p) => p.nav);
  return (
    <>
      <footer className="site-footer">
        <div className="wrap">
          <div className="foot">
            <Link href="/" className="logo">
              <span>{"//"}</span>
              {settings.short}
            </Link>
            <NewsletterForm />
            <div className="social">
              {settings.social.instagram && (
                <SmartLink href={settings.social.instagram} aria-label="Instagram">
                  <InstagramIcon />
                </SmartLink>
              )}
              {settings.social.facebook && (
                <SmartLink href={settings.social.facebook} aria-label="Facebook">
                  <FacebookIcon />
                </SmartLink>
              )}
            </div>
          </div>
          <div className="foot foot-row">
            <div className="foot-links">
              {nav.map((p) => (
                <Link key={p.id} href={`/${p.slug}`}>
                  {p.title}
                </Link>
              ))}
              <Link href="/impressum">Impressum</Link>
              <Link href="/datenschutz">Datenschutz</Link>
              <Link href="/agb">AGB</Link>
              <Link href="/widerruf">Widerruf</Link>
            </div>
            <span className="foot-copy">
              © {new Date().getFullYear()} {settings.name} · {settings.contact.city}
            </span>
          </div>
          {settings.demoNote && <p className="demo">{settings.demoNote}</p>}
        </div>
      </footer>
      <div className="sticky-cta">
        <SmartLink className="btn btn-primary" href={ctaHref}>
          Termin buchen
        </SmartLink>
        <a className="btn btn-ghost" href={`tel:${settings.contact.phone.replace(/\s/g, "")}`}>
          Anrufen
        </a>
      </div>
    </>
  );
}

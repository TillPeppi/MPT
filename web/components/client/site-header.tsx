"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { SmartLink } from "@/components/shared/smart-link";
import { useMember } from "@/hooks/use-session";
import { cartCount } from "@/lib/cart";
import { ThemeToggle, toggleTheme } from "./theme-toggle";

export interface NavItem {
  href: string;
  label: string;
  active: boolean;
}

interface Props {
  short: string;
  name: string;
  nav: NavItem[];
  memberLabel: string;
  ctaLabel: string;
  ctaHref: string;
  /** overlay = transparent über Vollbild-Hero, plain = transparent, solid = immer mit Hintergrund */
  mode: "overlay" | "plain" | "solid";
}

function subscribeScroll(cb: () => void): () => void {
  window.addEventListener("scroll", cb, { passive: true });
  return () => window.removeEventListener("scroll", cb);
}
const scrolledSnapshot = (): boolean => window.scrollY > 40;
const scrolledServer = (): boolean => false;

export function SiteHeader({ short, name, nav, memberLabel, ctaLabel, ctaHref, mode }: Props) {
  const scrolled = useSyncExternalStore(subscribeScroll, scrolledSnapshot, scrolledServer);
  const [open, setOpen] = useState(false);
  const { session, cart, openCart } = useMember();
  const count = cartCount(cart);
  const label = session ? session.firstName : memberLabel;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const cls = ["site-header", mode === "overlay" ? "overlay" : "", mode === "solid" || open ? "solid" : "", scrolled ? "scrolled" : ""]
    .filter(Boolean)
    .join(" ");
  const close = () => setOpen(false);

  return (
    <>
      <header className={cls} id="hdr">
        <div className="wrap nav">
          <Link href="/" className="logo" onClick={close}>
            <span>{"//"}</span>
            {short}
            <small>{name}</small>
          </Link>
          <nav className="nav-links" aria-label="Hauptnavigation">
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className={n.active ? "on" : ""} aria-current={n.active ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="nav-cta">
            <ThemeToggle />
            {session && (
              <button type="button" className="cart-btn" aria-label={`Anfrage-Warenkorb, ${count} Artikel`} onClick={openCart}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 4h2l2.2 11h10.6L20 7H6.2M9 20h.01M17 20h.01" />
                </svg>
                {count > 0 && <span className="cart-count">{count}</span>}
              </button>
            )}
            <Link className="btn btn-ghost btn-sm member-btn" href="/mitglieder">
              {label}
            </Link>
            <SmartLink className="btn btn-primary btn-sm" href={ctaHref}>
              {ctaLabel}
            </SmartLink>
            <button
              type="button"
              className="burger"
              aria-label={open ? "Menü schließen" : "Menü öffnen"}
              aria-expanded={open}
              aria-controls="mm"
              onClick={() => setOpen((o) => !o)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </header>
      <nav className={`mobile-menu${open ? " open" : ""}`} id="mm" aria-label="Mobile Navigation">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={n.active ? "on" : ""} onClick={close}>
            {n.label}
          </Link>
        ))}
        <Link href="/mitglieder" onClick={close}>
          {label}
        </Link>
        {session && (
          <button
            type="button"
            className="mm-theme"
            onClick={() => {
              close();
              openCart();
            }}
          >
            Anfrage
            <small>{count > 0 ? `${count} im Warenkorb` : "Warenkorb leer"}</small>
          </button>
        )}
        <button type="button" className="mm-theme" onClick={toggleTheme}>
          Design
          <small>Hell / Dunkel umschalten</small>
        </button>
      </nav>
    </>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";

export function AdminTitle({ title, text, crumbs }: { title: string; text?: string; crumbs?: { href?: string; label: string }[] }) {
  return (
    <>
      {crumbs && (
        <nav className="adm-crumbs" aria-label="Pfad">
          {crumbs.map((c, i) => (
            <span key={i}>
              {i > 0 && " / "}
              {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
            </span>
          ))}
        </nav>
      )}
      <h1 className="adm-h1">{title}</h1>
      {text && <p className="adm-lead">{text}</p>}
    </>
  );
}

export function AdminTabs({ tabs, current }: { tabs: { href: string; label: string; key: string; badge?: number }[]; current: string }) {
  return (
    <nav className="adm-tabs" aria-label="Bereiche">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} className={t.key === current ? "on" : ""} aria-current={t.key === current ? "page" : undefined}>
          {t.label}
          {t.badge ? <span className="dot-badge">{t.badge}</span> : null}
        </Link>
      ))}
    </nav>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`adm-card ${className}`.trim()}>
      {(title || action) && (
        <header>
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ThemeToggle } from "@/components/client/theme-toggle";
import { adminApi } from "./api";

const ITEMS = [
  { href: "/admin", label: "Übersicht", exact: true },
  { href: "/admin/inhalte", label: "Inhalte (Website)" },
  { href: "/admin/sammlungen", label: "Sammlungen" },
  { href: "/admin/buchungen", label: "Kurse & Buchungen" },
  { href: "/admin/termine", label: "Termine (PT & Check-up)" },
  { href: "/admin/kunden", label: "Kunden" },
  { href: "/admin/anfragen", label: "Shop-Anfragen" },
  { href: "/admin/einstellungen", label: "Einstellungen" },
];

export function AdminNav({ name }: { name: string }) {
  const path = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const on = (i: (typeof ITEMS)[number]) => (i.exact ? path === i.href : path === i.href || path.startsWith(`${i.href}/`));

  async function logout() {
    setBusy(true);
    await adminApi("POST", "/api/admin/logout", {}).catch(() => undefined);
    router.replace("/admin/login");
    router.refresh();
  }

  const links = ITEMS.map((i) => (
    <Link key={i.href} href={i.href} className={on(i) ? "on" : ""} aria-current={on(i) ? "page" : undefined}>
      {i.label}
    </Link>
  ));

  return (
    <>
      <aside className="adm-side">
        <div className="adm-brand">
          <span>{"//"}</span>MPT <small>ADMIN</small>
        </div>
        <nav className="adm-nav" aria-label="Admin">
          {links}
        </nav>
        <div className="adm-side-foot">
          <span className="who">Angemeldet als {name}</span>
          <div className="row">
            <ThemeToggle />
            <Link className="btn btn-ghost adm-b sm" href="/" target="_blank" rel="noopener">
              Website
            </Link>
            <button type="button" className="btn btn-ghost adm-b sm" onClick={logout} disabled={busy}>
              Abmelden
            </button>
          </div>
        </div>
      </aside>
      <header className="adm-top">
        <nav aria-label="Admin">{links}</nav>
        <ThemeToggle />
        <button type="button" className="btn btn-ghost adm-b sm" onClick={logout} disabled={busy}>
          Abmelden
        </button>
      </header>
    </>
  );
}
